// URL base del servidor LiteCMS. Vacía = mismo origen (admin servido desde core en /admin,
// o Vite en desarrollo con proxy). Solo se define si la API vive en otro dominio.
export const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? '').replace(/\/$/, '');

export const API_URL = `${SERVER_URL}/api`;

// URL pública de un archivo subido a la librería de medios
export const uploadUrl = (filename: string): string => `${SERVER_URL}/uploads/${filename}`;
