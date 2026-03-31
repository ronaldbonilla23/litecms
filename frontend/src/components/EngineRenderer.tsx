import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div style="color:white; padding: 2rem;">Cargando...</div>');
  const [cssContent, setCssContent] = useState<string>('');
  const [currentSlug, setCurrentSlug] = useState<string>('/');
  const [themeSettings, setThemeSettings] = useState<any>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const slug = path === '/' ? '/' : path.replace(/^\/|\/$/g, '') || '/';
    setCurrentSlug(slug);
  }, []);

  useEffect(() => {
    if (!currentSlug) return;

    const initEngine = async () => {
      try {
        // 1. Obtener theme settings
        const { data: settings } = await axios.get(`${CORE_URL}/theme-settings`);
        setThemeSettings(settings);

        // 2. Obtener la página por slug
        const encodedSlug = encodeURIComponent(currentSlug);
        const { data: page } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!page) {
          setHtmlContent('<div style="color:white; padding: 2rem; text-align:center;">Página no encontrada (404)</div>');
          return;
        }

        // 3. Usar CSS compilado del backend si existe
        if (page.compiled_css && page.compiled_css.length > 0) {
          console.log('[EngineRenderer] Usando CSS compilado:', page.compiled_css.length, 'bytes');
          setCssContent(page.compiled_css);
        } else {
          console.log('[EngineRenderer] CSS compilado vacío, usando CDN fallback');
          // Fallback: Inyectar Tailwind CDN con configuración del tema
          const scriptConfig = document.createElement('script');
          scriptConfig.innerHTML = `
            tailwind = {
              config: {
                theme: {
                  extend: {
                    colors: {
                      primary: '${settings.primary_color || '#C2F86C'}',
                      secondary: '${settings.secondary_color || '#3B82F6'}',
                      accent: '${settings.accent_color || '#F59E0B'}',
                      fondo: '${settings.background_color || '#141414'}'
                    },
                    fontFamily: {
                      sans: ['${settings.body_font || 'Inter'}', 'sans-serif'],
                      header: ['${settings.header_font || 'Plus Jakarta Sans'}', 'sans-serif']
                    }
                  }
                }
              }
            }
          `;
          document.head.appendChild(scriptConfig);

          const scriptCDN = document.createElement('script');
          scriptCDN.src = "https://cdn.tailwindcss.com";
          document.head.appendChild(scriptCDN);
        }

        // 4. Compilar y renderizar header, content y footer
        let finalHtml = '';

        if (page.header_id) {
          const { data: headerTemplate } = await axios.get(`${CORE_URL}/templates/${page.header_id}`);
          if (headerTemplate && headerTemplate.content) {
            const headerTpl = Handlebars.compile(headerTemplate.content);
            finalHtml += headerTpl({ site: { name: 'LiteCMS' }, page });
          }
        }

        if (page.content) {
          const contentTpl = Handlebars.compile(page.content);
          finalHtml += contentTpl({ site: { name: 'LiteCMS' }, page });
        } else if (page.fields && typeof page.fields === 'string') {
          finalHtml += page.fields;
        }

        if (page.footer_id) {
          const { data: footerTemplate } = await axios.get(`${CORE_URL}/templates/${page.footer_id}`);
          if (footerTemplate && footerTemplate.content) {
            const footerTpl = Handlebars.compile(footerTemplate.content);
            finalHtml += footerTpl({ site: { name: 'LiteCMS' }, page });
          }
        }

        setHtmlContent(finalHtml || '<div style="color:white; padding: 2rem;">Contenido vacío</div>');

      } catch (error: any) {
        console.error('Error en el Motor:', error);
        if (error.response?.status === 404) {
          setHtmlContent(`
            <div class="min-h-screen bg-[#141414] text-white flex items-center justify-center p-8">
              <div class="text-center max-w-2xl">
                <h1 class="text-6xl font-bold mb-4" style="color: #C2F86C;">404</h1>
                <h2 class="text-2xl mb-6">Página no encontrada</h2>
                <p class="text-gray-400 mb-8">
                  No hay ninguna página publicada con la ruta "${currentSlug}".
                </p>
                <div class="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-left">
                  <h3 class="font-bold mb-3" style="color: #C2F86C;">¿Cómo solucionar esto?</h3>
                  <ol class="space-y-2 text-sm text-gray-400">
                    <li class="flex items-start gap-2">
                      <span class="text-[#C2F86C] font-bold">1.</span>
                      <span>Ve al Admin Panel → Pages</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-[#C2F86C] font-bold">2.</span>
                      <span>Crea una nueva página con slug <code class="bg-[#0e0e0e] px-2 py-0.5 rounded">/</code> para el Home</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-[#C2F86C] font-bold">3.</span>
                      <span>Cambia el estado a <strong>Published</strong></span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="text-[#C2F86C] font-bold">4.</span>
                      <span>Recarga esta página</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          `);
        } else {
          setHtmlContent('<div class="min-h-screen bg-[#141414] text-white flex items-center justify-center p-8"><div class="text-center"><h1 class="text-4xl font-bold mb-4 text-red-500">Error de conexión</h1><p class="text-gray-400">No se pudo conectar con el Core API</p></div></div>');
        }
      }
    };

    initEngine();
  }, [currentSlug]);

  return (
    <>
      {/* Inyectar CSS compilado (optimizado) o usar CDN fallback */}
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}
