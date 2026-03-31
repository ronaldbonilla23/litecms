// tailwind.service.ts
// Servicio de compilación Tailwind CSS - Usando @tailwindcss/postcss (v4)

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
  try {
    const postcss = require('postcss');
    // Usar @tailwindcss/postcss en lugar de tailwindcss directamente
    const tailwindcss = require('@tailwindcss/postcss');
    const autoprefixer = require('autoprefixer');

    // Extraer clases únicas del HTML
    const classes = extractClasses(htmlContent);
    console.log('[Tailwind Service] Clases encontradas:', classes.length);

    // Configurar tema personalizado
    const customTheme = Object.entries({
      '--color-primary': themeSettings.primary_color || '#C2F86C',
      '--color-secondary': themeSettings.secondary_color || '#3B82F6',
      '--color-accent': themeSettings.accent_color || '#F59E0B',
      '--color-fondo': themeSettings.background_color || '#141414',
      '--font-sans': `${themeSettings.body_font || 'Inter'}, sans-serif`,
      '--font-header': `${themeSettings.header_font || 'Plus Jakarta Sans'}, sans-serif`,
    }).map(([key, value]) => `${key}: ${value};`).join('\n      ');

    // CSS con Tailwind v4 - usando @import y @theme
    const cssInput = `
      @import "tailwindcss";
      
      @theme {
        ${customTheme}
      }
    `;

    const result = await postcss([
      tailwindcss.default || tailwindcss,
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
    if (match[1]) {
      const classNames = match[1].split(' ');
      classNames.forEach(cls => classes.add(cls));
    }
  }

  return Array.from(classes);
}
