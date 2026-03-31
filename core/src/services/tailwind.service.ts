// tailwind.service.ts
// Tailwind CSS v4 - Usamos @tailwindcss/postcss

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
  try {
    // Dynamic require para Tailwind CSS v4
    const postcss = require('postcss');
    const tailwindcss = require('@tailwindcss/postcss');
    const autoprefixer = require('autoprefixer');

    const config = {
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
    };

    // CSS base con Tailwind CSS v4
    const cssInput = `
      @import "tailwindcss";
      
      @theme {
        --color-primary: ${themeSettings.primary_color || '#C2F86C'};
        --color-secondary: ${themeSettings.secondary_color || '#3B82F6'};
        --color-accent: ${themeSettings.accent_color || '#F59E0B'};
        --color-fondo: ${themeSettings.background_color || '#141414'};
        --font-sans: ${themeSettings.body_font || 'Inter'}, sans-serif;
        --font-header: ${themeSettings.header_font || 'Plus Jakarta Sans'}, sans-serif;
      }
    `;

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
