import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
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
    corePlugins: { preflight: true }, // Incluye el reset básico de Tailwind
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
    console.error('Error compilando Tailwind:', error.message);
    return '';
  }
};
