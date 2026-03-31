const db = require('../database').default;
const { compileTailwindCSS } = require('../services/tailwind.service');

async function testCompilation() {
  try {
    console.log('[TEST] Buscando páginas...');
    const pages = await db('pages').select('id', 'title', 'content', 'compiled_css');
    
    for (const page of pages) {
      console.log(`\n[TEST] Página: ${page.title} (ID: ${page.id})`);
      console.log('[TEST] Content:', page.content ? page.content.substring(0, 80) + '...' : 'NULL');
      console.log('[TEST] compiled_css length:', page.compiled_css ? page.compiled_css.length : 0);
      
      if (page.content && (!page.compiled_css || page.compiled_css.length === 0)) {
        console.log('[TEST] Compilando CSS para esta página...');
        
        const themeSettings = await db('theme_settings').first();
        console.log('[TEST] Theme settings:', themeSettings ? 'Encontrado' : 'No encontrado');
        
        const css = await compileTailwindCSS(page.content, themeSettings || {});
        console.log('[TEST] CSS compilado length:', css ? css.length : 0);
        
        if (css && css.length > 0) {
          await db('pages').where({ id: page.id }).update({ compiled_css: css });
          console.log('[TEST] ✅ CSS guardado en database!');
        } else {
          console.log('[TEST] ❌ CSS vacío, no se guarda');
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[TEST ERROR]', error);
    process.exit(1);
  }
}

testCompilation();
