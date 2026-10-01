import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Verificamos si ya existe para evitar errores en recreaciones
  const exists = await knex('templates').where('id', 'tmpl_blog_001').first();
  
  if (!exists) {
    await knex('templates').insert({
      id: 'tmpl_blog_001',
      name: 'Plantilla Estándar de Artículos',
      type: 'blog_single',
      content: `<article class="max-w-4xl mx-auto py-12 px-4">
     <header class="mb-8">
       <h1 class="text-4xl font-bold text-primary mb-4">\{{title}}</h1>
       <div class="flex items-center text-gray-500 text-sm">
         <span>Por \{{author_name}}</span>
         <span class="mx-2">•</span>
         <span>\{{published_at}}</span>
       </div>
       \{{#if featured_image}}
         <img src="\{{featured_image}}" class="w-full h-96 object-cover rounded-xl mt-6 shadow-xl" />
       \{{/if}}
     </header>
     
     <div class="ql-editor prose prose-lg prose-invert max-w-none">
       \{{{content}}}
     </div>
     
     <footer class="mt-12 pt-8 border-t border-white/10">
        <!-- Renderiza aquí una sección de categorías y tags si quieres -->
     </footer>
   </article>`,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  return knex('templates').where('id', 'tmpl_blog_001').delete();
}

