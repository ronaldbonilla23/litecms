import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div style="color: white; padding: 2rem;">Conectando motores...</div>');

  useEffect(() => {
    const initEngine = async () => {
      try {
        // 1. Obtener y aplicar el Design System global
        const { data: settings } = await axios.get(`${CORE_URL}/theme-settings`);
        const root = document.documentElement;
        if (settings.primary_color) root.style.setProperty('--theme-primary', settings.primary_color);
        if (settings.bg_color) root.style.setProperty('--theme-bg', settings.bg_color);
        if (settings.font_family) root.style.setProperty('--theme-font', settings.font_family);

        // 2. Obtener las plantillas
        const { data: templates } = await axios.get(`${CORE_URL}/templates`);
        
        // Buscamos la que acabamos de crear o la primera disponible
        const activeTemplate = templates.find((t: any) => t.name === 'Global Header') || templates[0];

        if (activeTemplate) {
          // 3. Compilar con Handlebars inyectando datos reales
          const template = Handlebars.compile(activeTemplate.content);
          
          // Simulación de datos que luego vendrán de la base de datos
          const data = {
            site: { name: 'LiteCMS Public Engine' }
          };
          
          const compiledHtml = template(data);
          setHtmlContent(compiledHtml);
        } else {
          setHtmlContent('<div style="color: white; padding: 2rem;">No hay plantillas publicadas.</div>');
        }
      } catch (error) {
        console.error('Error en el Motor de Temas:', error);
        setHtmlContent('<div style="color: red; padding: 2rem;">Error de conexión con el Core (Puerto 3000).</div>');
      }
    };

    initEngine();
  }, []);

  return (
    <div 
      className="min-h-screen" 
      style={{ backgroundColor: 'var(--theme-bg)' }}
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  );
}
