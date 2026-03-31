// tailwind.service.ts
// Servicio de compilación Tailwind CSS - Optimizado para producción

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
  try {
    const postcss = require('postcss');
    // Usamos tailwindcss directamente (v4)
    const tailwindcss = require('tailwindcss');
    const autoprefixer = require('autoprefixer');

    // Extraer clases únicas del HTML
    const classes = extractClasses(htmlContent);

    console.log('[Tailwind Service] Clases encontradas:', classes.length);

    const config = {
      content: [{ raw: htmlContent, extension: 'html' }],
      theme: {
        extend: {
          colors: {
            primary: themeSettings.primary_color || '#C2F86C',
            secondary: themeSettings.secondary_color || '#3B82F6',
            accent: themeSettings.accent_color || '#F59E0B',
            fondo: themeSettings.background_color || '#141414',
          },
          fontFamily: {
            sans: [themeSettings.body_font || 'Inter', 'sans-serif'],
            header: [themeSettings.header_font || 'Plus Jakarta Sans', 'sans-serif'],
          },
        },
      },
      // Solo generar CSS para las clases usadas
      corePlugins: {
        preflight: false, // Evitar reset CSS que puede causar conflictos
      },
    };

    // CSS con directivas de Tailwind v3 (compatible con v4 en modo compatible)
    const cssInput = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `;

    const result = await postcss([
      tailwindcss(config),
      autoprefixer
    ]).process(cssInput, { from: undefined });

    console.log('[Tailwind Service] CSS generado:', result.css.length, 'bytes');

    return result.css;
  } catch (error: any) {
    console.error('[Tailwind Service] Error:', error.message);
    if (error.stack) {
      console.error('[Tailwind Service] Stack:', error.stack);
    }
    return '';
  }
};

// Función auxiliar para extraer clases del HTML
function extractClasses(html: string): string[] {
  const classRegex = /class=["']([^"']+)["']/g;
  const classes = new Set<string>();
  let match;

  while ((match = classRegex.exec(html)) !== null) {
    const classNames = match[1].split(' ');
    classNames.forEach(cls => classes.add(cls));
  }

  return Array.from(classes);
}
