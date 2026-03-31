// tailwind.service.ts
// Servicio de compilación Tailwind CSS v3 - Genera TODAS las utilidades

export const compileTailwindCSS = async (htmlContent: string, themeSettings: any): Promise<string> => {
  try {
    const postcss = require('postcss');
    const tailwindcss = require('tailwindcss');
    const autoprefixer = require('autoprefixer');

    // Extraer clases únicas del HTML
    const classes = extractClasses(htmlContent);
    console.log('[Tailwind Service] Clases encontradas:', classes.length);

    // Configurar Tailwind con tema personalizado
    const config = {
      // Incluir TODAS las utilidades, no solo las usadas
      content: [],
      safelist: [
        // Layout
        'flex', 'grid', 'block', 'inline-block', 'inline',
        'justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly',
        'items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch',
        'flex-col', 'flex-row', 'flex-wrap', 'flex-nowrap',
        'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8', 'gap-10', 'gap-12',
        // Spacing
        'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-10', 'p-12',
        'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-6', 'px-8', 'px-10', 'px-12',
        'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-6', 'py-8', 'py-10', 'py-12',
        'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-6', 'm-8', 'm-10', 'm-12',
        'mx-auto', 'my-auto',
        // Sizing
        'w-full', 'w-screen', 'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
        'h-full', 'h-screen', 'h-auto', 'min-h-screen', 'max-h-screen',
        'max-w-none', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl',
        // Typography
        'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl',
        'font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black',
        'text-left', 'text-center', 'text-right', 'text-justify',
        'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
        'tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest',
        'uppercase', 'lowercase', 'capitalize', 'normal-case',
        'truncate', 'overflow-ellipsis', 'text-clip',
        // Colors
        'text-primary', 'text-secondary', 'text-accent', 'text-fondo', 'text-white', 'text-black', 'text-gray-400', 'text-gray-500', 'text-red-500',
        'bg-primary', 'bg-secondary', 'bg-accent', 'bg-fondo', 'bg-white', 'bg-black', 'bg-transparent',
        // Borders
        'border', 'border-0', 'border-2', 'border-4', 'border-8',
        'border-primary', 'border-secondary', 'border-white', 'border-black', 'border-transparent',
        'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
        // Effects
        'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-none',
        'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
        // Position
        'relative', 'absolute', 'fixed', 'sticky', 'static',
        'inset-0', 'inset-x-0', 'inset-y-0', 'top-0', 'right-0', 'bottom-0', 'left-0',
        'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto',
        // Interactivity
        'cursor-pointer', 'cursor-default', 'cursor-text', 'cursor-not-allowed',
        'pointer-events-none', 'pointer-events-auto',
        'select-none', 'select-text', 'select-all', 'select-auto',
        // Transitions
        'transition', 'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform',
        'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000',
        'ease-linear', 'ease-in', 'ease-out', 'ease-in-out',
        // Transform
        'scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125', 'scale-150',
        'rotate-0', 'rotate-45', 'rotate-90', 'rotate-180',
        'translate-x-0', 'translate-x-full', '-translate-x-full',
        'translate-y-0', 'translate-y-full', '-translate-y-full',
        // Visibility
        'visible', 'invisible',
        // Overflow
        'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll',
        'overflow-x-auto', 'overflow-y-auto',
        // Display
        'hidden', 'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid',
      ],
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
        preflight: false,
      },
    };

    // CSS con directivas de Tailwind v3
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
    if (match[1]) {
      const classNames = match[1].split(' ');
      classNames.forEach(cls => classes.add(cls));
    }
  }

  return Array.from(classes);
}
