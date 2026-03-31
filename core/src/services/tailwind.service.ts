// tailwind.service.ts
// Nota: Usamos require para evitar problemas de tipos con Tailwind CSS v3
const path = require('path');

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
  // Dynamic require para evitar problemas de compilación TypeScript
  const postcss = require('postcss');
  const tailwindcss = require('tailwindcss');
  const autoprefixer = require('autoprefixer');

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
    corePlugins: {
      preflight: false, // Desactivamos reset para evitar conflictos
    },
  };

  // CSS base con las directivas de Tailwind
  const cssInput = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  `;

  try {
    const result = await postcss([
      tailwindcss(config),
      autoprefixer
    ]).process(cssInput, { from: undefined });

    return result.css;
  } catch (error: any) {
    console.error('[Tailwind Service] Error compilando:', error.message);
    console.error('[Tailwind Service] Stack:', error.stack);
    return '';
  }
};
