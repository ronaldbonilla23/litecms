import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [cssFileUrl, setCssFileUrl] = useState<string>('');
  const [currentSlug, setCurrentSlug] = useState<string>('/');

  useEffect(() => {
    const path = window.location.pathname;
    const slug = path === '/' ? '/' : path.replace(/^\/|\/$/g, '') || '/';
    setCurrentSlug(slug);
  }, []);

  useEffect(() => {
    if (!currentSlug) return;

    const loadPage = async () => {
      try {
        const encodedSlug = encodeURIComponent(currentSlug);
        const { data: page } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!page) {
          setHtmlContent('<div class="p-8 text-center">Página no encontrada</div>');
          return;
        }

        // 1. URL del archivo CSS compilado
        if (page.id) {
          setCssFileUrl(`http://localhost:3000/css/page-${page.id}.css`);
        }

        // 2. Compilar HTML con Handlebars
        let finalHtml = '';

        // Contexto para las plantillas
        const templateContext = {
          page,
          site: {
            name: 'LiteCMS',
            url: window.location.origin
          }
        };

        // Header
        if (page.header_id) {
          const { data: header } = await axios.get(`${CORE_URL}/templates/${page.header_id}`);
          if (header?.content) {
            finalHtml += Handlebars.compile(header.content)(templateContext);
          }
        }

        // Contenido principal
        if (page.content) {
          finalHtml += Handlebars.compile(page.content)(templateContext);
        }

        // Footer
        if (page.footer_id) {
          const { data: footer } = await axios.get(`${CORE_URL}/templates/${page.footer_id}`);
          if (footer?.content) {
            finalHtml += Handlebars.compile(footer.content)(templateContext);
          }
        }

        setHtmlContent(finalHtml || '<div class="p-8 text-center">Sin contenido</div>');

      } catch (error: any) {
        console.error('Error:', error);
        setHtmlContent(`<div class="p-8 text-center text-red-500">Error: ${error.message}</div>`);
      }
    };

    loadPage();
  }, [currentSlug]);

  return (
    <>
      {/* CSS externo compilado */}
      {cssFileUrl && <link rel="stylesheet" href={cssFileUrl} />}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}
