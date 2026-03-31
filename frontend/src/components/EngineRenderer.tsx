import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div class="text-white p-8">Cargando motor Tailwind JIT...</div>');
  const [currentSlug, setCurrentSlug] = useState<string>('/');
  const [isTailwindReady, setIsTailwindReady] = useState(false);

  useEffect(() => {
    // Obtener el slug de la URL actual
    const path = window.location.pathname;
    // Normalizar slug: '/' para home, o el path sin slashes iniciales/finales
    const slug = path === '/' ? '/' : path.replace(/^\/|\/$/g, '') || '/';
    setCurrentSlug(slug);
  }, []);

  useEffect(() => {
    // Cargar Tailwind primero
    const scriptCDN = document.createElement('script');
    scriptCDN.src = "https://cdn.tailwindcss.com";
    scriptCDN.onload = () => setIsTailwindReady(true);
    document.head.appendChild(scriptCDN);

    return () => {
      // Cleanup opcional
    };
  }, []);

  useEffect(() => {
    if (!isTailwindReady || !currentSlug) return;

    const initEngine = async () => {
      try {
        // 1. Obtener el Design System
        const { data: settings } = await axios.get(`${CORE_URL}/theme-settings`);

        // Configurar Tailwind con los colores del tema
        if ((window as any).tailwind) {
          (window as any).tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: settings.primary_color || '#C2F86C',
                  fondo: settings.bg_color || '#141414'
                },
                fontFamily: {
                  sans: [settings.font_family || 'Inter', 'sans-serif']
                }
              }
            }
          };
        }

        // 2. Obtener la página por slug (codificar para manejar '/' correctamente)
        const encodedSlug = encodeURIComponent(currentSlug);
        const { data: page } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!page) {
          setHtmlContent('<div class="text-white p-8 text-center">Página no encontrada (404)</div>');
          return;
        }

        // 3. Compilar y renderizar header, content y footer
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

        // 4. Forzar a Tailwind a escanear el nuevo contenido
        setTimeout(() => {
          if ((window as any).tailwind) {
            (window as any).tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    primary: settings.primary_color || '#C2F86C',
                    fondo: settings.bg_color || '#141414'
                  },
                  fontFamily: {
                    sans: [settings.font_family || 'Inter', 'sans-serif']
                  }
                }
              }
            };
          }
        }, 100);

      } catch (error: any) {
        console.error('Error en el Motor:', error);
        if (error.response?.status === 404) {
          setHtmlContent('<div class="text-white p-8 text-center"><h1 class="text-4xl font-bold mb-4">404</h1><p>Página no encontrada</p></div>');
        } else {
          setHtmlContent('<div class="text-red-500 p-8">Error de conexión con el Core.</div>');
        }
      }
    };

    initEngine();
  }, [isTailwindReady, currentSlug]);

  return (
    <div
      className="min-h-screen bg-fondo font-sans"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
