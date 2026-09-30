import sanitizeHtml from 'sanitize-html';

/**
 * ============================================================================
 * SANITIZADO DE CONTENIDO
 * ============================================================================
 * El contenido de los posts viene del editor enriquecido (Quill) y se inserta
 * en la plantilla con {{{content}}} (sin escapar). Aquí se eliminan scripts,
 * eventos (onclick...) y URLs javascript: antes de guardarlo.
 *
 * Las plantillas y páginas del constructor NO pasan por aquí: las diseña el
 * administrador (como un tema de WordPress) y pueden necesitar HTML completo.
 * ============================================================================
 */

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'img', 'figure', 'figcaption', 'h1', 'h2', 'span', 'iframe', 'video', 'source',
    ],
    allowedAttributes: {
        '*': ['class', 'id', 'dir'],
        a: ['href', 'name', 'target', 'rel', 'title'],
        img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'style'],
        iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title'],
        video: ['src', 'controls', 'width', 'height', 'poster'],
        source: ['src', 'type'],
        ol: ['start'],
        td: ['colspan', 'rowspan'],
        th: ['colspan', 'rowspan'],
    },
    // quill-blot-formatter guarda el tamaño/alineación de imágenes como estilos en línea
    allowedStyles: {
        img: {
            width: [/^\d+(\.\d+)?(px|%)$/],
            height: [/^\d+(\.\d+)?(px|%)$|^auto$/],
            float: [/^(left|right|none)$/],
            display: [/^(block|inline|inline-block)$/],
            margin: [/^[\d\s.pxautoem%-]+$/],
        },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Videos incrustados solo desde proveedores conocidos
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    transformTags: {
        // Enlaces que abren otra pestaña: evitar acceso a window.opener
        a: (tagName, attribs) => ({
            tagName,
            attribs: attribs.target === '_blank'
                ? { ...attribs, rel: 'noopener noreferrer' }
                : attribs,
        }),
    },
};

export const sanitizeRichText = (html: string): string => sanitizeHtml(html, RICH_TEXT_OPTIONS);

// Texto plano (extractos, descripciones): sin ninguna etiqueta HTML
export const toPlainText = (html: string): string =>
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
