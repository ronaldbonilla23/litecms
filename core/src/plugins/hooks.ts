/**
 * ============================================================================
 * HOOKS (estilo WordPress)
 * ============================================================================
 * - Filtros: transforman un valor. Cada callback recibe el valor actual y
 *   devuelve el nuevo.        applyFilters('render.head', [], contexto)
 * - Acciones: avisan de que algo pasó. Sin valor de retorno.
 *                            doAction('entry.saved', entrada)
 * Cada registro guarda el plugin dueño para poder quitarlo al desactivarlo.
 * Un callback que falla se registra en consola y se ignora: un plugin roto
 * nunca debe tumbar el sitio.
 * ============================================================================
 */

export const FILTER_HOOKS = {
    'render.head': 'Etiquetas extra para el <head> (array de strings HTML)',
    'render.bodyEnd': 'HTML extra antes de </body> (array de strings HTML)',
    'render.html': 'Documento HTML final completo (string)',
} as const;

export const ACTION_HOOKS = {
    'content.changed': 'Cualquier escritura exitosa en la API ({ method, path })',
    'entry.saved': 'Entrada de un tipo de contenido creada o editada (entrada)',
    'entry.deleted': 'Entrada eliminada ({ id })',
} as const;

export type FilterHook = keyof typeof FILTER_HOOKS;
export type ActionHook = keyof typeof ACTION_HOOKS;

type Callback = (value: any, context?: any) => unknown | Promise<unknown>;

interface Registration {
    plugin: string;
    priority: number;
    callback: Callback;
}

const filters = new Map<string, Registration[]>();
const actions = new Map<string, Registration[]>();

const register = (store: Map<string, Registration[]>, hook: string, registration: Registration) => {
    const list = store.get(hook) ?? [];
    list.push(registration);
    // Menor prioridad se ejecuta antes (como WordPress, por defecto 10)
    list.sort((a, b) => a.priority - b.priority);
    store.set(hook, list);
};

export const addFilter = (plugin: string, hook: FilterHook, callback: Callback, priority = 10): void => {
    if (!(hook in FILTER_HOOKS)) throw new Error(`Filtro desconocido: ${hook}`);
    register(filters, hook, { plugin, priority, callback });
};

export const addAction = (plugin: string, hook: ActionHook, callback: Callback, priority = 10): void => {
    if (!(hook in ACTION_HOOKS)) throw new Error(`Acción desconocida: ${hook}`);
    register(actions, hook, { plugin, priority, callback });
};

export const applyFilters = async <T>(hook: FilterHook, value: T, context?: unknown): Promise<T> => {
    let current = value;
    for (const { plugin, callback } of filters.get(hook) ?? []) {
        try {
            const result = await callback(current, context);
            if (result !== undefined) current = result as T;
        } catch (error: any) {
            console.error(`[Plugin ${plugin}] Error en el filtro ${hook}:`, error.message);
        }
    }
    return current;
};

export const doAction = async (hook: ActionHook, payload?: unknown): Promise<void> => {
    for (const { plugin, callback } of actions.get(hook) ?? []) {
        try {
            await callback(payload);
        } catch (error: any) {
            console.error(`[Plugin ${plugin}] Error en la acción ${hook}:`, error.message);
        }
    }
};

// Las acciones no deben retrasar la respuesta HTTP: se lanzan sin esperar
export const fireAction = (hook: ActionHook, payload?: unknown): void => {
    void doAction(hook, payload);
};

export const removePluginHooks = (plugin: string): void => {
    for (const store of [filters, actions]) {
        for (const [hook, list] of store) {
            store.set(hook, list.filter((registration) => registration.plugin !== plugin));
        }
    }
};
