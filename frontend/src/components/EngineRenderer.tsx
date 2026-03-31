import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div class="text-white p-8">Cargando motor Tailwind JIT...</div>');
  const [currentSlug, setCurrentSlug] = useState<string>('/');

  useEffect(() => {
    // Obtener el slug de la URL actual
    const path = window.location.pathname;
    const slug = path === '/' ? '/' : path.replace(/^\/|\/$/g, '');
    setCurrentSlug(slug || '/');
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      try {
        // 1. Obtener el Design System
        const { data: settings } = await axios.get(`${CORE_URL}/theme-settings`);

        // Inyectar configuración dinámica de Tailwind
        const scriptConfig = document.createElement('script');
        scriptConfig.innerHTML = `
          tailwind = {
            config: {
              theme: {
                extend: {
                  colors: {
                    primary: '${settings.primary_color || '#C2F86C'}',
                    fondo: '${settings.bg_color || '#141414'}'
                  },
                  fontFamily: {
                    sans: ['${settings.font_family || 'Inter'}', 'sans-serif']
                  }
                }
              }
            }
          }
        `;
        document.head.appendChild(scriptConfig);

        // 2. Inyectar el compilador JIT de Tailwind
        const scriptCDN = document.createElement('script');
        scriptCDN.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(scriptCDN);

        // 3. Obtener la página por slug
        const { data: page } = await axios.get(`${CORE_URL}/pages/${currentSlug}`);

        if (!page) {
          setHtmlContent('<div class="text-white p-8 text-center">Página no encontrada (404)</div>');
          return;
        }

        // 4. Compilar y renderizar header, content y footer
        let finalHtml = '';

        // Renderizar header si existe
        if (page.header_id) {
          const { data: headerTemplate } = await axios.get(`${CORE_URL}/templates/${page.header_id}`);
          if (headerTemplate && headerTemplate.content) {
            const headerTpl = Handlebars.compile(headerTemplate.content);
            finalHtml += headerTpl({ site: { name: 'LiteCMS' }, page });
          }
        }

        // Renderizar contenido de la página
        if (page.content) {
          const contentTpl = Handlebars.compile(page.content);
          finalHtml += contentTpl({ site: { name: 'LiteCMS' }, page });
        } else if (page.fields && typeof page.fields === 'string') {
          // Soporte para contenido legacy (Craft.js)
          finalHtml += page.fields;
        }

        // Renderizar footer si existe
        if (page.footer_id) {
          const { data: footerTemplate } = await axios.get(`${CORE_URL}/templates/${page.footer_id}`);
          if (footerTemplate && footerTemplate.content) {
            const footerTpl = Handlebars.compile(footerTemplate.content);
            finalHtml += footerTpl({ site: { name: 'LiteCMS' }, page });
          }
        }

        setHtmlContent(finalHtml || '<div class="text-white p-8">Contenido vacío</div>');

      } catch (error: any) {
        console.error('Error en el Motor:', error);
        if (error.response?.status === 404) {
          setHtmlContent('<div class="text-white p-8 text-center"><h1 class="text-4xl font-bold mb-4">404</h1><p>Página no encontrada</p></div>');
        } else {
          setHtmlContent('<div class="text-red-500 p-8">Error de conexión con el Core.</div>');
        }
      }
    };

    if (currentSlug) {
      initEngine();
    }
  }, [currentSlug]);

  return (
    <div
      className="min-h-screen bg-fondo font-sans"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
