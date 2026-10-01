import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import FieldInput from '../components/FieldInput';
import { apiErrorBody, apiErrorMessage } from '../lib/errors';
import type { FieldDefinition } from '../../../shared/contentTypes';

interface PluginInfo {
  name: string;
  enabled: boolean;
  loaded: boolean;
  error: string | null;
  settings: Record<string, unknown>;
  manifest: {
    title: string;
    version: string;
    description?: string;
    author?: string;
    settings: FieldDefinition[];
    data: Array<{ collection: string; title: string; columns?: string[] }>;
  } | null;
}

interface ThemeInfo {
  name: string;
  active: boolean;
  error: string | null;
  manifest: { title: string; version: string; description?: string; author?: string; plugins: string[] } | null;
}

interface ApplyReport {
  templates: number;
  contentTypesCreated: string[];
  contentTypesSkipped: string[];
  pagesCreated: string[];
  pagesSkipped: string[];
  pluginsEnabled: string[];
  warnings: string[];
}

const cardClass = 'bg-[#141414] border border-white/5 rounded-[2rem] p-6';

// ----------------------------------------------------------------------------
// Ajustes de un plugin: formulario generado desde plugin.json
// ----------------------------------------------------------------------------
function PluginSettings({ plugin, onSaved }: { plugin: PluginInfo; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(plugin.settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.put(`/extensions/plugins/${plugin.name}/settings`, values);
      toast.success('Ajustes guardados');
      onSaved();
    } catch (error) {
      const details = apiErrorBody(error).details?.data as Record<string, string[]> | undefined;
      if (details) setErrors(Object.fromEntries(Object.entries(details).map(([key, messages]) => [key, messages[0] ?? ''])));
      toast.error(apiErrorMessage(error, 'No se pudieron guardar los ajustes'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/5 space-y-5">
      {plugin.manifest?.settings.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
        />
      ))}
      <button onClick={save} disabled={saving} className="bg-primary text-black px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar ajustes'}
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Datos que guarda un plugin (ej: mensajes del formulario de contacto)
// ----------------------------------------------------------------------------
function PluginData({ plugin, collection }: { plugin: string; collection: { collection: string; title: string; columns?: string[] } }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>> | null>(null);

  useEffect(() => {
    api.get(`/extensions/plugins/${plugin}/data/${collection.collection}`)
      .then(({ data }) => setRows(data))
      .catch(() => setRows([]));
  }, [plugin, collection.collection]);

  const columns = collection.columns ?? (rows?.[0] ? Object.keys(rows[0]).filter((key) => key !== 'id') : []);

  if (rows === null) return <p className="text-gray-500 text-sm mt-4">Cargando...</p>;
  if (rows.length === 0) return <p className="text-gray-500 text-sm mt-4">Todavía no hay registros.</p>;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-[10px] uppercase tracking-widest text-gray-400">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            {columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t border-white/5 align-top">
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{String(row.created_at ?? '').slice(0, 16).replace('T', ' ')}</td>
              {columns.map((column) => (
                <td key={column} className="px-4 py-3 text-gray-200 max-w-md whitespace-pre-wrap break-words">{String(row[column] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Página
// ----------------------------------------------------------------------------
export function Extensions() {
  const [tab, setTab] = useState<'plugins' | 'themes'>('plugins');
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const [openData, setOpenData] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<{ theme: string; report: ApplyReport } | null>(null);

  const load = async () => {
    try {
      const [pluginsRes, themesRes] = await Promise.all([api.get('/extensions/plugins'), api.get('/extensions/themes')]);
      setPlugins(pluginsRes.data);
      setThemes(themesRes.data);
    } catch {
      toast.error('No se pudieron cargar las extensiones');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePlugin = async (plugin: PluginInfo) => {
    setBusy(plugin.name);
    try {
      const action = plugin.enabled ? 'disable' : 'enable';
      const { data } = await api.post(`/extensions/plugins/${plugin.name}/${action}`);
      toast.success(data.message);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo cambiar el estado del plugin'));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const applyTheme = async (theme: ThemeInfo) => {
    const plugins = theme.manifest?.plugins.length ? `\n• Activa los plugins: ${theme.manifest.plugins.join(', ')}` : '';
    const confirmed = window.confirm(
      `¿Aplicar el tema "${theme.manifest?.title}"?\n\n`
      + '• Instala sus plantillas y las usa como header/footer del sitio\n'
      + '• Cambia los colores y fuentes del Design System\n'
      + '• Crea sus tipos de contenido y páginas solo si no existen (no sobrescribe tu contenido)'
      + plugins,
    );
    if (!confirmed) return;

    setBusy(theme.name);
    try {
      const { data } = await api.post(`/extensions/themes/${theme.name}/apply`);
      setReport({ theme: theme.manifest?.title ?? theme.name, report: data.report });
      toast.success('Tema aplicado');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo aplicar el tema'));
    } finally {
      setBusy(null);
    }
  };

  const tabClass = (active: boolean) =>
    `px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${active ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">Extensiones</h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Plugins y temas instalados en el servidor
          </p>
        </div>
        <div className="flex gap-2 bg-[#141414] border border-white/5 rounded-full p-1">
          <button className={tabClass(tab === 'plugins')} onClick={() => setTab('plugins')}>Plugins</button>
          <button className={tabClass(tab === 'themes')} onClick={() => setTab('themes')}>Temas</button>
        </div>
      </div>

      {tab === 'plugins' && (
        <div className="space-y-4">
          {plugins.length === 0 && (
            <p className="text-gray-500 text-center py-16">No hay plugins. Copia la carpeta de un plugin en <code className="text-primary">/plugins</code>.</p>
          )}
          {plugins.map((plugin) => (
            <div key={plugin.name} className={cardClass}>
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white text-lg font-bold">{plugin.manifest?.title ?? plugin.name}</h3>
                    {plugin.manifest && <span className="text-[10px] text-gray-500">v{plugin.manifest.version}</span>}
                    {plugin.enabled && plugin.loaded && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Activo</span>
                    )}
                  </div>
                  {plugin.manifest?.description && <p className="text-gray-400 text-sm mt-2 max-w-3xl">{plugin.manifest.description}</p>}
                  {plugin.error && <p className="text-red-400 text-sm mt-2">⚠ {plugin.error}</p>}
                  <div className="flex gap-4 mt-4">
                    {plugin.manifest && plugin.manifest.settings.length > 0 && (
                      <button onClick={() => setOpenSettings(openSettings === plugin.name ? null : plugin.name)} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                        Ajustes
                      </button>
                    )}
                    {plugin.manifest?.data.map((collection) => (
                      <button
                        key={collection.collection}
                        onClick={() => setOpenData(openData === `${plugin.name}:${collection.collection}` ? null : `${plugin.name}:${collection.collection}`)}
                        className="text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-primary"
                      >
                        {collection.title}
                      </button>
                    ))}
                  </div>
                </div>

                {plugin.manifest && (
                  <button
                    onClick={() => togglePlugin(plugin)}
                    disabled={busy === plugin.name}
                    title={plugin.enabled ? 'Desactivar' : 'Activar'}
                    className={`shrink-0 w-14 h-8 rounded-full relative transition-colors disabled:opacity-50 ${plugin.enabled ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-1 w-6 h-6 rounded-full transition-all ${plugin.enabled ? 'left-7 bg-black' : 'left-1 bg-white'}`}></span>
                  </button>
                )}
              </div>

              {openSettings === plugin.name && <PluginSettings plugin={plugin} onSaved={load} />}
              {plugin.manifest?.data.map((collection) => openData === `${plugin.name}:${collection.collection}` && (
                <PluginData key={collection.collection} plugin={plugin.name} collection={collection} />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'themes' && (
        <div className="space-y-6">
          {report && (
            <div className="p-6 rounded-[2rem] bg-primary/10 border border-primary/20 text-sm text-gray-200 space-y-1">
              <p className="text-primary font-bold">Tema «{report.theme}» aplicado</p>
              <p>Plantillas instaladas: {report.report.templates}</p>
              {report.report.contentTypesCreated.length > 0 && <p>Tipos de contenido creados: {report.report.contentTypesCreated.join(', ')}</p>}
              {report.report.pagesCreated.length > 0 && <p>Páginas creadas: {report.report.pagesCreated.join(', ')}</p>}
              {report.report.pagesSkipped.length > 0 && <p className="text-gray-400">Páginas que ya existían (no se tocaron): {report.report.pagesSkipped.join(', ')}</p>}
              {report.report.pluginsEnabled.length > 0 && <p>Plugins activados: {report.report.pluginsEnabled.join(', ')}</p>}
              {report.report.warnings.map((warning) => <p key={warning} className="text-orange-300">⚠ {warning}</p>)}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {themes.length === 0 && (
              <p className="text-gray-500 text-center py-16 md:col-span-2">No hay temas. Copia la carpeta de un tema en <code className="text-primary">/themes</code>.</p>
            )}
            {themes.map((theme) => (
              <div key={theme.name} className={`${cardClass} flex flex-col`}>
                <div className="flex items-center gap-3">
                  <h3 className="text-white text-xl font-bold">{theme.manifest?.title ?? theme.name}</h3>
                  {theme.manifest && <span className="text-[10px] text-gray-500">v{theme.manifest.version}</span>}
                  {theme.active && <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Activo</span>}
                </div>
                {theme.manifest?.description && <p className="text-gray-400 text-sm mt-3 flex-1">{theme.manifest.description}</p>}
                {theme.error && <p className="text-red-400 text-sm mt-3">⚠ {theme.error}</p>}
                {theme.manifest && (
                  <button
                    onClick={() => applyTheme(theme)}
                    disabled={busy === theme.name}
                    className="mt-6 self-start bg-primary text-black px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {busy === theme.name ? 'Aplicando...' : theme.active ? 'Reaplicar' : 'Aplicar tema'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
