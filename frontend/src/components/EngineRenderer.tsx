import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div class="text-white p-8">Cargando motor Tailwind JIT...</div>');
  const [isTailwindLoaded, setIsTailwindLoaded] = useState(false);

  useEffect(() => {
    const loadTailwindJIT = (settings: any) => {
      // 1. Inyectar configuración dinámica de Tailwind conectada a SQLite
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
      scriptCDN.onload = () => setIsTailwindLoaded(true);
      document.head.appendChild(scriptCDN);
    };

    const initEngine = async () => {
      try {
        // Obtener el Design System
        const { data: settings } = await axios.get(`${CORE_URL}/theme-settings`);
        loadTailwindJIT(settings);

        // Obtener las plantillas
        const { data: templates } = await axios.get(`${CORE_URL}/templates`);
        const activeTemplate = templates.find((t: any) => t.name === 'Global Header') || templates[0];

        if (activeTemplate) {
          const template = Handlebars.compile(activeTemplate.content);
          const data = { site: { name: 'LiteCMS Public Engine' } };
          setHtmlContent(template(data));
        } else {
          setHtmlContent('<div class="text-white p-8">No hay plantillas publicadas.</div>');
        }
      } catch (error) {
        console.error('Error en el Motor:', error);
        setHtmlContent('<div class="text-red-500 p-8">Error de conexión con el Core.</div>');
      }
    };

    initEngine();
  }, []);

  return (
    <div
      className="min-h-screen bg-fondo font-sans"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
