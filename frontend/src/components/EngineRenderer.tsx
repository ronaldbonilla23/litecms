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
    setCurrentSlug(path === '/' ? '/' : path.replace(/^\/|\/$/g, '') || '/');
  }, []);

  useEffect(() => {
    if (!currentSlug) return;

    const loadPage = async () => {
      try {
        const encodedSlug = encodeURIComponent(currentSlug);
        // Ahora esta llamada devuelve el HTML ensamblado y el CSS unificado
        const { data: pageData } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!pageData) {
          setHtmlContent('<div class="p-8 text-center text-white">Página no encontrada</div>');
          return;
        }

        // 1. Establecer el CSS maestro
        setCssContent(pageData.master_css || '');

        // 2. Compilar el HTML unificado con Handlebars
        const templateContext = {
          page: pageData,
          site: { name: 'LiteCMS', url: window.location.origin }
        };

        const compiledHtml = Handlebars.compile(pageData.full_html)(templateContext);
        setHtmlContent(compiledHtml);

      } catch (error: any) {
        console.error('Error cargando la vista:', error);
        setHtmlContent(`<div class="p-8 text-center text-red-500">Error: ${error.message}</div>`);
      }
    };

    loadPage();
  }, [currentSlug]);

  return (
    <>
      {/* Se inyecta el único CSS necesario para toda la vista */}
      <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      {/* Se inyecta el HTML ya ensamblado y procesado */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}
