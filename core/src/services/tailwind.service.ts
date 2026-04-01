// tailwind.service.ts
// Servicio de compilación Tailwind CSS v3 - Con guardado a archivo

import * as fs from 'fs';
import * as path from 'path';

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any, pageId?: string): Promise<string> => {
  try {
    const postcss = require('postcss');
    const tailwindcss = require('tailwindcss');
    const autoprefixer = require('autoprefixer');

    const config = {
      content: [{ raw: htmlContent, extension: 'html' }],
      safelist: [
        // Layout
        'flex', 'flex-col', 'flex-row', 'flex-wrap', 'flex-nowrap', 'inline-flex',
        'block', 'inline-block', 'inline', 'grid', 'hidden',
        // Responsive prefixes
        'md:flex', 'md:flex-col', 'md:flex-row', 'md:flex-wrap', 'md:flex-nowrap',
        'md:block', 'md:inline-block', 'md:hidden', 'md:grid',
        'lg:flex', 'lg:flex-col', 'lg:flex-row', 'lg:flex-wrap', 'lg:flex-nowrap',
        'lg:block', 'lg:inline-block', 'lg:hidden', 'lg:grid',
        'sm:flex', 'sm:flex-col', 'sm:flex-row',
        'sm:block', 'sm:hidden',
        // Alignment
        'items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch',
        'justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly',
        // Position
        'relative', 'absolute', 'fixed', 'sticky', 'static',
        'top-0', 'top-4', 'top-full', 'bottom-0', 'left-0', 'right-0',
        'inset-0', 'inset-x-0', 'inset-y-0',
        // Z-index
        'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto',
        // Spacing
        'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12',
        'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12',
        'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8', 'py-10', 'py-12',
        'ps-0', 'ps-1', 'ps-2', 'ps-3', 'ps-4', 'ps-5', 'ps-6',
        'pe-0', 'pe-1', 'pe-2', 'pe-3', 'pe-4', 'pe-5', 'pe-6',
        'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-6', 'm-8', 'm-auto',
        'mx-0', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-6', 'mx-auto',
        'my-0', 'my-1', 'my-2', 'my-3', 'my-4', 'my-6', 'my-auto',
        'mt-0', 'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mt-6', 'mt-8', 'mt-10', 'mt-12', 'mt-auto',
        'mb-0', 'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-5', 'mb-6', 'mb-8', 'mb-10', 'mb-12',
        'ms-0', 'ms-1', 'ms-2', 'ms-3', 'ms-4', 'ms-auto',
        'me-0', 'me-1', 'me-2', 'me-3', 'me-4', 'me-auto',
        // Sizing
        'w-full', 'w-screen', 'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
        'h-full', 'h-screen', 'h-auto', 'min-h-screen', 'max-h-screen',
        'max-w-none', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl',
        // Transform
        'transform', 'translate-x-0', 'translate-y-0', '-translate-x-full', '-translate-y-full',
        'rotate-0', 'rotate-45', 'rotate-90', 'rotate-180',
        'scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110',
        // Transitions
        'transition', 'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform',
        'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000',
        'ease-linear', 'ease-in', 'ease-out', 'ease-in-out',
        // Effects
        'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
        'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-none',
        // Overflow
        'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll',
        'overflow-x-auto', 'overflow-y-auto',
        // Border
        'border', 'border-0', 'border-2', 'border-4', 'border-t', 'border-b', 'border-l', 'border-r',
        'border-s', 'border-e',
        'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
        'rounded-none', 'rounded-sm', 'rounded-t-xl', 'rounded-b-xl',
        // Pseudo-elements
        'before:absolute', 'before:inset-0', 'before:-top-full', 'before:start-0', 'before:mx-auto',
        'before:h-5', 'before:w-full', 'before:max-w-5xl', 'before:rounded', 'before:border',
        'after:absolute', 'after:bottom-0', 'after:start-4', 'after:top-8', 'after:border-s',
        // Group
        'group', 'group-hover:translate-x-0', 'group-hover:opacity-100',
        'group-focus:translate-x-0', 'group-focus:opacity-100',
      ],
      theme: {
        extend: {
          colors: {
            primary: themeSettings?.primary_color || '#C2F86C',
            secondary: themeSettings?.secondary_color || '#3B82F6',
            accent: themeSettings?.accent_color || '#F59E0B',
            fondo: themeSettings?.background_color || '#141414',
            // Colores adicionales para templates
            navbar: '#1a1a1a',
            'navbar-line': '#333',
          },
          fontFamily: {
            sans: [themeSettings?.body_font || 'Inter', 'sans-serif'],
            header: [themeSettings?.header_font || 'Plus Jakarta Sans', 'sans-serif'],
          },
        },
      },
      corePlugins: { preflight: true }, // Activado: ahora solo hay UN CSS por vista
    };

    const cssInput = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';

    const result = await postcss([tailwindcss(config), autoprefixer]).process(cssInput, { from: undefined });

    const css = result.css;

    console.log('[Tailwind] CSS generado:', css ? css.length : 0, 'bytes');
    console.log('[Tailwind] Page ID:', pageId);

    // Guardar CSS en archivo si hay pageId
    if (pageId && css && css.length > 0) {
      console.log('[Tailwind] Intentando guardar CSS en archivo...');
      saveCssToFile(css, pageId);
    } else {
      console.log('[Tailwind] No se guarda el archivo: pageId=', pageId, 'css.length=', css ? css.length : 0);
    }

    return css;
  } catch (error: any) {
    console.error('[Tailwind] Error:', error.message);
    return '';
  }
};

/**
 * Guarda el CSS compilado en un archivo público
 */
const saveCssToFile = (css: string, pageId: string): void => {
  try {
    // Ruta al directorio público de CSS (usando process.cwd() para mayor confiabilidad)
    const publicCssDir = path.join(process.cwd(), 'public', 'css');

    // Crear directorio si no existe
    if (!fs.existsSync(publicCssDir)) {
      fs.mkdirSync(publicCssDir, { recursive: true });
    }

    // Nombre del archivo: page-{id}.css
    const filePath = path.join(publicCssDir, `page-${pageId}.css`);

    // Escribir archivo
    fs.writeFileSync(filePath, css, 'utf8');

    console.log(`[Tailwind] CSS guardado en: ${filePath}`);
  } catch (error: any) {
    console.error('[Tailwind] Error guardando archivo CSS:', error.message);
  }
};
