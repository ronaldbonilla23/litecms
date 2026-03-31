const db = require('../database').default;
const { compileTailwindCSS } = require('../services/tailwind.service');

async function recompileAllPages() {
  try {
    console.log('[SCRIPT] Buscando páginas y templates...');
    
    // Obtener theme settings
    const themeSettings = await db('theme_settings').first() || {};
    console.log('[SCRIPT] Theme settings:', {
      primary: themeSettings.primary_color,
      bg: themeSettings.background_color
    });
    
    // Actualizar páginas
    const pages = await db('pages').select('id', 'title', 'content');
    console.log(`[SCRIPT] Encontradas ${pages.length} páginas`);
    
    for (const page of pages) {
      if (page.content) {
        console.log(`\n[SCRIPT] Procesando página: ${page.title}`);
        const css = await compileTailwindCSS(page.content, themeSettings);
        
        if (css && css.length > 0) {
          await db('pages').where({ id: page.id }).update({ 
            compiled_css: css,
            updated_at: db.fn.now()
          });
          console.log(`[SCRIPT] ✅ CSS guardado: ${css.length} bytes`);
        } else {
          console.log(`[SCRIPT] ⚠️ CSS vacío para ${page.title}`);
        }
      }
    }
    
    // Actualizar templates
    const templates = await db('templates').select('id', 'name', 'content');
    console.log(`\n[SCRIPT] Encontradas ${templates.length} templates`);
    
    for (const template of templates) {
      if (template.content) {
        console.log(`\n[SCRIPT] Procesando template: ${template.name}`);
        const css = await compileTailwindCSS(template.content, themeSettings);
        
        if (css && css.length > 0) {
          await db('templates').where({ id: template.id }).update({ 
            compiled_css: css,
            updated_at: db.fn.now()
          });
          console.log(`[SCRIPT] ✅ CSS guardado: ${css.length} bytes`);
        } else {
          console.log(`[SCRIPT] ⚠️ CSS vacío para ${template.name}`);
        }
      }
    }
    
    console.log('\n[SCRIPT] ✅ ¡Proceso completado!');
    process.exit(0);
  } catch (error) {
    console.error('[SCRIPT ERROR]', error);
    process.exit(1);
  }
}

recompileAllPages();
