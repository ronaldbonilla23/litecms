const db = require('./database').default;
const { compileTailwindCSS } = require('./services/tailwind.service');

async function compileAll() {
  console.log('🔄 Compilando CSS para todas las páginas y templates...\n');
  
  const themeSettings = await db('theme_settings').first() || {};
  console.log('📋 Theme settings:', {
    primary: themeSettings.primary_color,
    bg: themeSettings.background_color
  });
  
  // Páginas
  const pages = await db('pages').select('id', 'title', 'content');
  console.log(`\n📄 Páginas encontradas: ${pages.length}`);
  
  for (const page of pages) {
    if (page.content) {
      const css = await compileTailwindCSS(page.content, themeSettings);
      await db('pages').where({ id: page.id }).update({ compiled_css: css });
      console.log(`  ✅ ${page.title}: ${css.length} bytes`);
    }
  }
  
  // Templates
  const templates = await db('templates').select('id', 'name', 'content');
  console.log(`\n🎨 Templates encontrados: ${templates.length}`);
  
  for (const template of templates) {
    if (template.content) {
      const css = await compileTailwindCSS(template.content, themeSettings);
      await db('templates').where({ id: template.id }).update({ compiled_css: css });
      console.log(`  ✅ ${template.name}: ${css.length} bytes`);
    }
  }
  
  console.log('\n✅ ¡Compilación completada!\n');
  process.exit(0);
}

compileAll();
