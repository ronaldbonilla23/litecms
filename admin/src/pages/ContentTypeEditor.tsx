import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { apiErrorMessage, apiErrorStatus } from '../lib/errors';
import {
  ContentTypeSchema, FIELD_TYPES, FIELD_TYPE_LABELS, toFieldKey, toSlug,
  type ContentTypeInput, type FieldDefinition, type FieldType,
} from '../../../shared/contentTypes';

interface TemplateOption {
  id: string;
  name: string;
  type: string;
}

const EMPTY_TYPE: ContentTypeInput = {
  name: '',
  singular_name: '',
  slug: '',
  description: '',
  url_prefix: '',
  has_archive: true,
  fields: [],
  single_template_id: null,
  archive_template_id: null,
  header_id: null,
  footer_id: null,
};

const inputClass = 'w-full bg-[#141414] border border-white/10 text-white px-4 py-3 rounded-xl focus:border-primary outline-none';
const labelClass = 'text-[10px] text-gray-400 uppercase tracking-widest mb-2 block';
const cardClass = 'bg-[#1a1a1a]/50 border border-white/5 rounded-[2rem] p-6';

/**
 * Opciones de un campo "lista": se escribe "Residencial, Comercial".
 * Conserva el texto tal cual mientras se escribe (si se reconstruyera desde el
 * array, la coma recién tecleada desaparecería).
 */
function OptionsInput({ options, onChange, className }: { options: string[]; onChange: (options: string[]) => void; className: string }) {
  const [text, setText] = useState(options.join(', '));
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(',').map((option) => option.trim()).filter(Boolean));
      }}
      placeholder="Opciones separadas por coma: Residencial, Comercial"
      className={className}
    />
  );
}

/**
 * Editor de la estructura de un tipo de contenido: datos generales,
 * constructor de campos y plantillas con las que se publica.
 */
export default function ContentTypeEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [type, setType] = useState<ContentTypeInput>(EMPTY_TYPE);
  // Identificadores estables de cada fila de campo (React key) al añadir, borrar o reordenar
  const [fieldUids, setFieldUids] = useState<number[]>([]);
  const nextUid = useRef(0);
  const newUid = () => (nextUid.current += 1);
  // Mientras se crea, slug y prefijo se derivan del nombre hasta que el usuario los toca
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data)).catch(() => undefined);
    if (!isEditing) return;

    api.get(`/content-types/${id}`)
      .then(({ data }) => {
        setType({ ...EMPTY_TYPE, ...data });
        setFieldUids((data.fields ?? []).map(() => newUid()));
      })
      .catch(() => {
        toast.error('No se pudo cargar el tipo de contenido');
        navigate('/dashboard/content-types');
      })
      .finally(() => setLoading(false));
  }, [id, isEditing, navigate]);

  const update = (changes: Partial<ContentTypeInput>) => setType((current) => ({ ...current, ...changes }));

  const handleNameChange = (name: string) => {
    if (autoSlug) {
      const slug = toSlug(name);
      update({ name, slug, url_prefix: slug ? `/${slug}` : '' });
    } else {
      update({ name });
    }
  };

  // ---- Constructor de campos ----
  const updateField = (index: number, changes: Partial<FieldDefinition>) =>
    update({ fields: type.fields.map((field, i) => (i === index ? { ...field, ...changes } : field)) });

  const addField = () => {
    update({ fields: [...type.fields, { key: '', label: '', type: 'text', required: false }] });
    setFieldUids((uids) => [...uids, newUid()]);
  };

  const removeField = (index: number) => {
    update({ fields: type.fields.filter((_, i) => i !== index) });
    setFieldUids((uids) => uids.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= type.fields.length) return;
    const fields = [...type.fields];
    [fields[index], fields[target]] = [fields[target]!, fields[index]!];
    update({ fields });
    setFieldUids((uids) => {
      const next = [...uids];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const handleSave = async () => {
    // Misma validación que la API (shared/contentTypes.ts) antes de enviar
    const validation = ContentTypeSchema.safeParse(type);
    if (!validation.success) {
      setErrors(validation.error.issues.map((issue) => {
        const path = issue.path.join('.');
        const fieldIndex = issue.path[0] === 'fields' ? Number(issue.path[1]) : NaN;
        const fieldName = Number.isInteger(fieldIndex) ? `Campo ${fieldIndex + 1}${type.fields[fieldIndex]?.label ? ` (${type.fields[fieldIndex]?.label})` : ''}` : path;
        return `${fieldName}: ${issue.message}`;
      }));
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/content-types/${id}`, validation.data);
        toast.success('Tipo de contenido actualizado');
      } else {
        const { data } = await api.post('/content-types', validation.data);
        toast.success('Tipo de contenido creado');
        navigate(`/dashboard/content-types/${data.id}`, { replace: true });
      }
    } catch (error) {
      setErrors([apiErrorMessage(error, 'No se pudo guardar')]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar el tipo "${type.name}"?`)) return;
    try {
      await api.delete(`/content-types/${id}`);
    } catch (error) {
      if (apiErrorStatus(error) !== 409) {
        toast.error(apiErrorMessage(error, 'No se pudo eliminar'));
        return;
      }
      // Tiene entradas: segunda confirmación explícita
      if (!window.confirm(`${apiErrorMessage(error, 'Este tipo tiene entradas.')}\n\nEsta acción no se puede deshacer.`)) return;
      await api.delete(`/content-types/${id}?force=true`);
    }
    toast.success('Tipo de contenido eliminado');
    navigate('/dashboard/content-types');
  };

  const templateSelect = (label: string, kind: string, value: string | null | undefined, onChange: (value: string | null) => void, emptyLabel: string) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={inputClass}>
        <option value="">{emptyLabel}</option>
        {templates.filter((template) => template.type === kind).map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <button onClick={() => navigate('/dashboard/content-types')} className="text-xs text-gray-500 hover:text-primary mb-2">
            ← Tipos de contenido
          </button>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">
            {isEditing ? type.name || 'Tipo de contenido' : 'Nuevo tipo de contenido'}
          </h2>
        </div>
        <div className="flex gap-3">
          {isEditing && (
            <button onClick={handleDelete} className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-red-400 border border-red-500/20 hover:bg-red-500/10">
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-1">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datos generales */}
        <div className={`${cardClass} space-y-5 lg:col-span-1`}>
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest">General</h3>
          <div>
            <label className={labelClass}>Nombre (plural)</label>
            <input value={type.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Proyectos" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nombre en singular</label>
            <input value={type.singular_name} onChange={(e) => update({ singular_name: e.target.value })} placeholder="Proyecto" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Slug (API y helper query)</label>
            <input
              value={type.slug}
              onChange={(e) => { setAutoSlug(false); update({ slug: e.target.value }); }}
              className={`${inputClass} font-mono text-primary`}
            />
          </div>
          <div>
            <label className={labelClass}>URL pública</label>
            <input
              value={type.url_prefix}
              onChange={(e) => { setAutoSlug(false); update({ url_prefix: e.target.value }); }}
              placeholder="/proyectos"
              className={`${inputClass} font-mono text-primary`}
            />
            {isEditing && <p className="text-xs text-gray-500 mt-2">Si la cambias, las URLs anteriores redirigen (301) a las nuevas.</p>}
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              rows={3}
              value={type.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Se usa en el archivo, el SEO y llms.txt"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={type.has_archive} onChange={(e) => update({ has_archive: e.target.checked })} className="accent-[#C2F86C] w-4 h-4" />
            <span className="text-sm text-gray-300">Publicar página de archivo en <code className="text-primary">{type.url_prefix || '/prefijo'}</code></span>
          </label>
        </div>

        {/* Campos */}
        <div className={`${cardClass} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-primary text-xs font-bold uppercase tracking-widest">Campos</h3>
            <span className="text-xs text-gray-500">El título y el slug ya vienen incluidos</span>
          </div>

          <div className="space-y-3">
            {type.fields.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center border border-dashed border-white/10 rounded-2xl">
                Sin campos todavía. Añade el primero.
              </p>
            )}

            {type.fields.map((field, index) => (
              <div key={fieldUids[index] ?? `field-${index}`} className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                <div className="grid gap-3 md:grid-cols-12 items-end">
                  <div className="md:col-span-4">
                    <label className={labelClass}>Etiqueta</label>
                    <input
                      value={field.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        // La clave sigue a la etiqueta mientras coincida con la generada
                        const followKey = !field.key || field.key === toFieldKey(field.label);
                        updateField(index, followKey ? { label, key: toFieldKey(label) } : { label });
                      }}
                      placeholder="Cliente"
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Clave</label>
                    <input value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} className={`${inputClass} font-mono text-primary`} />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Tipo</label>
                    <select value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FieldType })} className={inputClass}>
                      {FIELD_TYPES.map((fieldType) => (
                        <option key={fieldType} value={fieldType}>{FIELD_TYPE_LABELS[fieldType]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-end gap-1 pb-2">
                    <button type="button" onClick={() => moveField(index, -1)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-white/5" title="Subir">↑</button>
                    <button type="button" onClick={() => moveField(index, 1)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-white/5" title="Bajar">↓</button>
                    <button type="button" onClick={() => removeField(index)} className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10" title="Eliminar campo">
                      <i className="fi fi-rr-trash text-sm"></i>
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-12 mt-3 items-center">
                  <label className="md:col-span-3 flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} className="accent-[#C2F86C]" />
                    Obligatorio
                  </label>
                  <input
                    value={field.help ?? ''}
                    onChange={(e) => updateField(index, { help: e.target.value })}
                    placeholder="Ayuda para quien edita (opcional)"
                    className={`${inputClass} md:col-span-9 py-2 text-sm`}
                  />
                  {field.type === 'select' && (
                    <OptionsInput
                      options={field.options ?? []}
                      onChange={(options) => updateField(index, { options })}
                      className={`${inputClass} md:col-span-12 py-2 text-sm`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addField}
            className="mt-4 w-full py-3 rounded-2xl border border-dashed border-white/15 text-sm text-gray-300 hover:border-primary hover:text-primary transition-colors"
          >
            <i className="fi fi-rr-plus mr-2"></i>Añadir campo
          </button>
        </div>

        {/* Plantillas */}
        <div className={`${cardClass} space-y-5 lg:col-span-3`}>
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest">Plantillas</h3>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {templateSelect('Entrada', 'single', type.single_template_id, (value) => update({ single_template_id: value }), 'Plantilla por defecto')}
            {templateSelect('Archivo', 'archive', type.archive_template_id, (value) => update({ archive_template_id: value }), 'Plantilla por defecto')}
            {templateSelect('Header', 'header', type.header_id, (value) => update({ header_id: value }), 'Header activo del sitio')}
            {templateSelect('Footer', 'footer', type.footer_id, (value) => update({ footer_id: value }), 'Footer activo del sitio')}
          </div>
          <p className="text-xs text-gray-500">
            Crea plantillas de tipo «Entrada» o «Archivo» en el editor de plantillas. En la entrada usa{' '}
            <code className="text-primary">{'{{entry.title}}'}</code> y <code className="text-primary">{'{{entry.fields.clave}}'}</code>;
            en el archivo, <code className="text-primary">{'{{#each entries}}…{{/each}}'}</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
