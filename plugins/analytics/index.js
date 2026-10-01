/**
 * Analítica para LiteCMS: inserta el script del proveedor en el <head>
 * mediante el filtro render.head. Sin ajustes válidos no inserta nada.
 */

const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

exports.register = async (api) => {
  const settings = await api.settings.get();

  api.addFilter('render.head', (tags, context) => {
    // Las 404 no se miden (bots y enlaces rotos ensuciarían los datos)
    if (context && context.kind === '404') return tags;

    if (settings.provider === 'Google Analytics 4' && GA_ID.test(settings.measurement_id || '')) {
      const id = settings.measurement_id;
      return [
        ...tags,
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
        `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`,
      ];
    }

    if (settings.provider === 'Plausible' && DOMAIN.test(settings.plausible_domain || '')) {
      return [...tags, `<script defer data-domain="${settings.plausible_domain}" src="https://plausible.io/js/script.js"></script>`];
    }

    return tags;
  });
};
