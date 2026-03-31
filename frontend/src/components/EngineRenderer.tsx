import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('<div style="color:white; padding: 2rem;">Cargando...</div>');
  const [cssContent, setCssContent] = useState<string>('');
  const [currentSlug, setCurrentSlug] = useState<string>('/');

  useEffect(() => {
    // Obtener el slug de la URL actual
    const path = window.location.pathname;
    const slug = path === '/' ? '/' : path.replace(/^\/|\/$/g, '') || '/';
    setCurrentSlug(slug);
  }, []);

  useEffect(() => {
    if (!currentSlug) return;

    const initEngine = async () => {
      try {
        // 1. Obtener la página por slug
        const encodedSlug = encodeURIComponent(currentSlug);
        const { data: page } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!page) {
          setHtmlContent('<div style="color:white; padding: 2rem; text-align:center;">Página no encontrada (404)</div>');
          return;
        }

        // 2. Compilar y renderizar header, content y footer
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

        setHtmlContent(finalHtml || '<div style="color:white; padding: 2rem;">Contenido vacío</div>');

        // 3. Inyectar CSS compilado (por ahora vacío, luego vendrá de la BD)
        // setCssContent(page.compiled_css || '');

      } catch (error: any) {
        console.error('Error en el Motor:', error);
        if (error.response?.status === 404) {
          setHtmlContent('<div style="color:white; padding: 2rem; text-align:center;"><h1 style="font-size:2rem; margin-bottom:1rem;">404</h1><p>Página no encontrada</p></div>');
        } else {
          setHtmlContent('<div style="color:red; padding: 2rem;">Error de conexión con el Core.</div>');
        }
      }
    };

    initEngine();
  }, [currentSlug]);

  return (
    <>
      {/* Inyectamos el CSS estático compilado en el backend */}
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}
