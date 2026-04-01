import { useEffect, useState } from 'react';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';
// Definimos la URL de tu servidor backend donde se guardan los archivos físicos
const SERVER_URL = 'http://localhost:3000';

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('');
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
        // El backend devuelve el HTML ensamblado
        const { data: pageData } = await axios.get(`${CORE_URL}/pages/slug/${encodedSlug}`);

        if (!pageData) {
          setHtmlContent('<div class="p-8 text-center text-white">Página no encontrada</div>');
          return;
        }

        // 1. Limpiar cualquier CSS maestro anterior que hayamos inyectado
        document.querySelectorAll('link[data-master-css]').forEach(el => el.remove());

        // 2. Crear y enviar el CSS al <head> como archivo externo (.css)
        if (pageData.id) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          // Buscamos el archivo físico generado por el backend y evitamos la caché con Date.now()
          link.href = `${SERVER_URL}/css/page-master-${pageData.id}.css?t=${Date.now()}`;
          link.setAttribute('data-master-css', 'true');
          document.head.appendChild(link);
        }

        // 3. Compilar el HTML unificado con Handlebars
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

  // Cleanup: Limpiar el <link> del head si el usuario cambia de página
  useEffect(() => {
    return () => {
      document.querySelectorAll('link[data-master-css]').forEach(el => el.remove());
    };
  }, []);

  return (
    // ¡Adiós al <style> en el body! Solo escupimos el HTML puro.
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}