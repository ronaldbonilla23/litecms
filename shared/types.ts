import { z } from 'zod';

/**
 * --- USER INTERFACE ---
 * Represents a user within the LiteCMS system.
 */
export interface User {
    /** Unique user identifier */
    readonly id: number;
    /** Full name of the user */
    name: string;
    /** Unique email address used for login */
    email: string;
    /** User role (typically 'admin' for this project) */
    role: 'admin' | string;
    /** Date when the user was created */
    created_at: string;
    /** Date of the last update to the user record */
    updated_at: string;
}

/**
 * --- PAGE INTERFACE ---
 * Represents a page and its dynamic content blocks.
 */
export interface Page {
    /** Unique page identifier */
    readonly id: number;
    /** Human-readable title of the page */
    title: string;
    /** SEO-friendly URL slug */
    slug: string;
    /** Dynamic content fields (blocks, JSON structure) */
    fields: any;
    /** Page visibility status */
    status: 'draft' | 'published';
    /** ID of the user who created/owns this page */
    author_id?: number | null;
    /** ID of the header template to use */
    header_id?: string | null;
    /** ID of the footer template to use */
    footer_id?: string | null;
    /** HTML content for the page */
    content?: string | null;
    /** Date when the page was created */
    created_at: string;
    /** Date of the last update to the page */
    updated_at: string;
}

/**
 * --- MEDIA INTERFACE ---
 * Represents an uploaded asset in the Media Library.
 */
export interface Media {
    /** Unique asset identifier */
    readonly id: number;
    /** Physical filename on the server disk */
    filename: string;
    /** Original name of the file when uploaded */
    original_name: string;
    /** MIME type (e.g., image/jpeg, image/png) */
    mimetype: string;
    /** File size in bytes */
    size: number;
    /** Relative or absolute storage path */
    path: string;
    /** Alternative text for accessibility (SEO) */
    alt_text?: string | null;
    /** SEO optimized title for the image */
    seo_title?: string | null;
    /** Upload timestamp */
    created_at: string;
    /** Last metadata update timestamp */
    updated_at: string;
}

// --- ZOD SCHEMAS FOR VALIDATION ---

export const UserSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: z.enum(['admin']).default('admin'),
});

export const LoginSchema = UserSchema.pick({ email: true, password: true });


export const PageSchema = z.object({
    title: z.string().min(1, 'El título es obligatorio'),
    slug: z.string().min(1, 'El slug es obligatorio'),
    fields: z.any().optional(),
    status: z.enum(['draft', 'published']).default('draft'),
    author_id: z.number().int().optional().nullable(),
    header_id: z.string().optional().nullable(),
    footer_id: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
});

export const MediaSchema = z.object({
    alt_text: z.string().max(255).optional().nullable(),
    seo_title: z.string().max(255).optional().nullable(),
});

export type UserInput = z.infer<typeof UserSchema>;
export type PageInput = z.infer<typeof PageSchema>;
export type MediaUpdateInput = z.infer<typeof MediaSchema>;
