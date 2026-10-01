import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCompiledCss = await knex.schema.hasColumn('posts', 'compiled_css');
  if (!hasCompiledCss) {
    await knex.schema.alterTable('posts', (table) => {
      table.text('compiled_css').nullable().comment('Pre-compiled Master CSS for the blog post');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCompiledCss = await knex.schema.hasColumn('posts', 'compiled_css');
  if (hasCompiledCss) {
    await knex.schema.alterTable('posts', (table) => {
      table.dropColumn('compiled_css');
    });
  }
}
