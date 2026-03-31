import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Drop existing table to recreate with new structure
    await knex.schema.dropTableIfExists('theme_settings');
    
    return knex.schema.createTable('theme_settings', (table) => {
        table.increments('id').primary();
        
        // Colores Globales
        table.string('primary_color').defaultTo('#C2F86C');
        table.string('secondary_color').defaultTo('#3B82F6');
        table.string('accent_color').defaultTo('#F59E0B');
        table.string('background_color').defaultTo('#141414');
        
        // Tipografía - Headers
        table.string('header_font').defaultTo('Plus Jakarta Sans');
        table.string('header_font_weight').defaultTo('700');
        
        // Tipografía - Body
        table.string('body_font').defaultTo('Inter');
        table.string('body_font_weight').defaultTo('400');
        table.string('body_line_height').defaultTo('1.6');
        
        // Botones - Primary
        table.string('button_primary_bg').defaultTo('#C2F86C');
        table.string('button_primary_color').defaultTo('#141414');
        table.string('button_primary_radius').defaultTo('8');
        table.string('button_primary_border').defaultTo('0');
        
        // Botones - Secondary
        table.string('button_secondary_bg').defaultTo('transparent');
        table.string('button_secondary_color').defaultTo('#C2F86C');
        table.string('button_secondary_radius').defaultTo('8');
        table.string('button_secondary_border').defaultTo('1');
        
        // Logo y Favicon
        table.string('logo_url').nullable();
        table.string('favicon_url').nullable();
        
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('theme_settings');
}
