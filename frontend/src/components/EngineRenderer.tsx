import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import Handlebars from 'handlebars';

const CORE_URL = 'http://localhost:3000/api';
// Definimos la URL de tu servidor backend donde se guardan los archivos físicos
const SERVER_URL = 'http://localhost:3000';

interface PageData {
  id: number;
  title: string;
  slug: string;
  full_html: string;
  master_css: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_image_url?: string | null;
  content?: string;
  [key: string]: any;
}

export default function EngineRenderer() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [currentSlug] = useState<string>(() => {
    let path = window.location.pathname;
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  });

  useEffect(() => {
    if (!currentSlug) return;

    const loadPage = async () => {
      try {
        const encodedSlug = encodeURIComponent(currentSlug);
        // El backend devuelve el HTML ensamblado usando un query parametro seguro
        const { data: pageData } = await axios.get(`${CORE_URL}/pages/by-slug?url=${encodedSlug}`);

        if (!pageData) {
          setHtmlContent('<div class="p-8 text-center text-white">Página no encontrada</div>');
          setPageData(null);
          return;
        }

        // Guardar datos de la página para SEO
        setPageData(pageData);

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
        setPageData(null);
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

  // Preparar datos SEO
  const currentUrl = window.location.href;
  const isHomePage = currentSlug === '/' || currentSlug === '';
  const seoTitle = pageData?.meta_title || pageData?.title || 'LiteCMS';
  const seoDescription = pageData?.meta_description || pageData?.content?.replace(/<[^>]*>/g, '').substring(0, 160) || 'LiteCMS - Content Management System';
  const ogImageUrl = pageData?.og_image_url || null;

  return (
    <>
      {/* SEO Helmet */}
      {pageData && (
        <Helmet>
          {/* Basic SEO */}
          <title>{seoTitle}</title>
          <meta name="description" content={seoDescription} />
          <link rel="canonical" href={pageData.canonical_url || currentUrl} />

          {/* Open Graph */}
          <meta property="og:title" content={seoTitle} />
          <meta property="og:description" content={seoDescription} />
          <meta property="og:type" content={isHomePage ? 'website' : 'article'} />
          <meta property="og:url" content={currentUrl} />
          {ogImageUrl && (
            <meta property="og:image" content={ogImageUrl} />
          )}

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoTitle} />
          <meta name="twitter:description" content={seoDescription} />
          {ogImageUrl && (
            <meta name="twitter:image" content={ogImageUrl} />
          )}
        </Helmet>
      )}

      {/* ¡Adiós al <style> en el body! Solo escupimos el HTML puro. */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}