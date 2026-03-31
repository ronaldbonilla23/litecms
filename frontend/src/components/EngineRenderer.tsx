import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [cssContent, setCssContent] = useState<string>('');
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

        // 1. Combinar CSS: página + header + footer
        let allCss = page.compiled_css || '';

        // 2. Compilar HTML con Handlebars
        let finalHtml = '';

        // Header
        if (page.header_id) {
          const { data: header } = await axios.get(`${CORE_URL}/templates/${page.header_id}`);
          if (header?.content) {
            finalHtml += Handlebars.compile(header.content)({ page });
            // Agregar CSS del header si existe
            if (header.compiled_css) {
              allCss += '\n' + header.compiled_css;
            }
          }
        }

        // Contenido principal
        if (page.content) {
          finalHtml += Handlebars.compile(page.content)({ page });
        }

        // Footer
        if (page.footer_id) {
          const { data: footer } = await axios.get(`${CORE_URL}/templates/${page.footer_id}`);
          if (footer?.content) {
            finalHtml += Handlebars.compile(footer.content)({ page });
            // Agregar CSS del footer si existe
            if (footer.compiled_css) {
              allCss += '\n' + footer.compiled_css;
            }
          }
        }

        // 3. Inyectar CSS combinado
        setCssContent(allCss);
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
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}
