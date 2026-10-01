/**
 * Formulario de contacto para LiteCMS.
 *
 * Uso en cualquier plantilla o página:  {{{contactForm}}}
 *
 * - Funciona sin JavaScript: el formulario hace POST y el servidor redirige de
 *   vuelta a la página con #contacto-enviado; el aviso se muestra con :target.
 * - Anti-spam: campo trampa oculto + tiempo mínimo entre cargar y enviar.
 * - Los mensajes se guardan (admin → Extensiones → Mensajes recibidos) y se
 *   reenvían opcionalmente a un webhook.
 */

const MIN_SECONDS_TO_SUBMIT = 3;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STYLES = `
<style>
  .lcms-cf { display: grid; gap: 1rem; max-width: 36rem; }
  .lcms-cf label { display: grid; gap: .4rem; font-size: .875rem; opacity: .85; }
  .lcms-cf input, .lcms-cf textarea { font: inherit; color: inherit; background: rgba(127,127,127,.08);
    border: 1px solid rgba(127,127,127,.3); border-radius: .75rem; padding: .75rem 1rem; }
  .lcms-cf input:focus, .lcms-cf textarea:focus { outline: 2px solid currentColor; outline-offset: 1px; }
  .lcms-cf button { font: inherit; font-weight: 700; cursor: pointer; border: 0; border-radius: .75rem;
    padding: .85rem 1.5rem; background: var(--lcms-accent, currentColor); color: var(--lcms-accent-text, #000); justify-self: start; }
  .lcms-cf .lcms-cf-trap { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
  .lcms-cf-msg { display: none; padding: .85rem 1rem; border-radius: .75rem; }
  .lcms-cf-msg:target { display: block; }
  .lcms-cf-ok { background: rgba(34,197,94,.15); }
  .lcms-cf-error { background: rgba(239,68,68,.15); }
</style>`;

exports.register = async (api) => {
  const settings = await api.settings.get();
  const buttonLabel = settings.button_label || 'Enviar mensaje';
  const successMessage = settings.success_message || '¡Gracias! Te responderemos pronto.';

  api.registerTemplateHelper('contactForm', () => {
    const e = api.escape;
    // La marca de tiempo se fija al renderizar. Con la caché de páginas puede ser muy
    // anterior a la visita, por eso solo se exige un tiempo mínimo (nunca un máximo).
    const renderedAt = Math.floor(Date.now() / 1000);
    return api.html(`${STYLES}
<p id="contacto-enviado" class="lcms-cf-msg lcms-cf-ok" role="status">${e(successMessage)}</p>
<p id="contacto-error" class="lcms-cf-msg lcms-cf-error" role="alert">Revisa los datos e inténtalo de nuevo.</p>
<form class="lcms-cf" method="post" action="/api/plugins/contact-form/submit">
  <label>Nombre<input name="name" required maxlength="100" autocomplete="name"></label>
  <label>Email<input name="email" type="email" required maxlength="200" autocomplete="email"></label>
  <label>Mensaje<textarea name="message" required maxlength="5000" rows="5"></textarea></label>
  <div class="lcms-cf-trap" aria-hidden="true"><label>Sitio web<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <input type="hidden" name="_ts" value="${renderedAt}">
  <button type="submit">${e(buttonLabel)}</button>
</form>`);
  });

  // Ruta pública: /api/plugins/contact-form/submit
  api.routes.post('/submit', async (req, res) => {
    const body = req.body || {};
    const wantsJson = (req.get('accept') || '').includes('application/json');

    // Volver a la página de origen (solo la ruta: nunca a otro dominio)
    let backPath = '/';
    try {
      const referer = new URL(req.get('referer') || '', api.config.siteUrl);
      if (referer.origin === new URL(api.config.siteUrl).origin || referer.host === req.get('host')) backPath = referer.pathname;
    } catch { /* sin referer válido: portada */ }

    const reply = (ok, status) => {
      if (wantsJson) return res.status(status).json(ok ? { ok: true } : { error: 'Datos inválidos' });
      return res.redirect(303, `${backPath}#${ok ? 'contacto-enviado' : 'contacto-error'}`);
    };

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const age = Math.floor(Date.now() / 1000) - Number(body._ts || 0);

    // Bot: rellenó el campo trampa o envió demasiado rápido → se finge éxito y se descarta
    if (body.website || age < MIN_SECONDS_TO_SUBMIT) return reply(true, 200);

    const valid = name.length > 0 && name.length <= 100 && EMAIL.test(email) && email.length <= 200
      && message.length > 0 && message.length <= 5000;
    if (!valid) return reply(false, 400);

    const record = { name, email, message, page: backPath };
    await api.storage.add('messages', record);

    if (settings.webhook_url) {
      // No se espera la respuesta: un webhook lento no debe retrasar al visitante
      fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, site: api.config.siteName, received_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(5000),
      }).catch((error) => api.log('Webhook falló:', error.message));
    }

    return reply(true, 200);
  }, { public: true });
};
