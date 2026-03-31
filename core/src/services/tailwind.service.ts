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
      theme: {
        extend: {
          colors: {
            primary: themeSettings?.primary_color || '#C2F86C',
            secondary: themeSettings?.secondary_color || '#3B82F6',
            accent: themeSettings?.accent_color || '#F59E0B',
            fondo: themeSettings?.background_color || '#141414',
          },
          fontFamily: {
            sans: [themeSettings?.body_font || 'Inter', 'sans-serif'],
            header: [themeSettings?.header_font || 'Plus Jakarta Sans', 'sans-serif'],
          },
        },
      },
      corePlugins: { preflight: false },
    };

    const cssInput = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';

    const result = await postcss([tailwindcss(config), autoprefixer]).process(cssInput, { from: undefined });

    const css = result.css;

    // Guardar CSS en archivo si hay pageId
    if (pageId && css) {
      saveCssToFile(css, pageId);
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
    // Ruta al directorio público de CSS
    const publicCssDir = path.join(__dirname, '../../../public/css');

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
