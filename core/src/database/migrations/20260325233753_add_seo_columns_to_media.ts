import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable("media", (table) => {
        table.string("alt_text").nullable();
        table.string("seo_title").nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable("media", (table) => {
        table.dropColumn("alt_text");
        table.dropColumn("seo_title");
    });
}
