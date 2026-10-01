import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { apiErrorBody, apiErrorMessage } from '../lib/errors';
import FieldInput from '../components/FieldInput';
import MediaPicker from '../components/MediaPicker';
import {
  buildEntryDataSchema, toSlug,
  type ContentType, type Entry,
} from '../../../shared/contentTypes';

interface EntryForm {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  data: Record<string, unknown>;
  meta_title: string;
  meta_description: string;
  og_image_id: number | null;
}

const EMPTY_FORM: EntryForm = {
  title: '',
  slug: '',
  status: 'draft',
  data: {},
  meta_title: '',
  meta_description: '',
  og_image_id: null,
};

const inputClass = 'w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-primary outline-none';

/**
 * Editor de una entrada. El formulario se genera a partir de los campos del tipo
 * y se valida con el mismo schema que usa la API (shared/contentTypes.ts).
 */
export default function EntryEditor() {
  const { typeSlug, id } = useParams<{ typeSlug: string; id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [type, setType] = useState<ContentType | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: types } = await api.get<ContentType[]>('/content-types');
        const current = types.find((item) => item.slug === typeSlug);
        if (!current) {
          toast.error('Ese tipo de contenido no existe');
          navigate('/dashboard/content-types');
          return;
        }
        setType(current);

        if (isEditing) {
          const { data: entry } = await api.get<Entry>(`/entries/${id}`);
          setForm({
            title: entry.title,
            slug: entry.slug,
            status: entry.status,
            data: entry.data,
            meta_title: entry.meta_title ?? '',
            meta_description: entry.meta_description ?? '',
            og_image_id: entry.og_image_id,
          });
        }
      } catch {
        toast.error('No se pudo cargar la entrada');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [typeSlug, id, isEditing, navigate]);

  const setField = (key: string, value: unknown) => {
    setForm((current) => ({ ...current, data: { ...current.data, [key]: value } }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleTitle = (title: string) =>
    setForm((current) => ({ ...current, title, slug: autoSlug ? toSlug(title) : current.slug }));

  const handleSave = async () => {
    if (!type) return;
    if (!form.title.trim()) {
      setFieldErrors({ title: 'El título es obligatorio' });
      return;
    }

    // Validación local con el schema del tipo: errores al lado de cada campo
    const validation = buildEntryDataSchema(type.fields).safeParse(form.data);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0]);
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      toast.error('Revisa los campos marcados');
      return;
    }

    setFieldErrors({});
    setSaving(true);
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      status: form.status,
      data: form.data,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      og_image_id: form.og_image_id,
    };

    try {
      if (isEditing) {
        const { data } = await api.put<Entry>(`/entries/${id}`, payload);
        setForm((current) => ({ ...current, slug: data.slug, data: data.data }));
        toast.success('Entrada actualizada');
      } else {
        const { data } = await api.post<Entry>('/entries', { ...payload, type_id: type.id });
        toast.success('Entrada creada');
        navigate(`/dashboard/content/${type.slug}/edit/${data.id}`, { replace: true });
      }
    } catch (error) {
      const serverErrors = apiErrorBody(error).details?.data as Record<string, string[]> | undefined;
      if (serverErrors) {
        setFieldErrors(Object.fromEntries(Object.entries(serverErrors).map(([key, messages]) => [key, messages[0] ?? ''])));
      }
      toast.error(apiErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !type) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
      </div>
    );
  }

  const publicUrl = `${type.url_prefix}/${form.slug}`;

  return (
    <div className="flex gap-6 animate-in fade-in duration-500">
      {/* Columna principal */}
      <div className="flex-1 space-y-6 min-w-0">
        <Link to={`/dashboard/content/${type.slug}`} className="text-xs text-gray-500 hover:text-primary">← {type.name}</Link>

        <div>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder={`Título del ${type.singular_name.toLowerCase()}`}
            className="w-full bg-[#1a1a1a] border border-white/10 text-white text-3xl font-bold px-6 py-4 rounded-xl focus:border-primary outline-none"
          />
          {fieldErrors.title && <p className="text-xs text-red-400 mt-2">{fieldErrors.title}</p>}
        </div>

        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-6 py-3 focus-within:border-primary">
          <span className="text-gray-500 font-mono text-sm">{type.url_prefix}/</span>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => { setAutoSlug(false); setForm({ ...form, slug: e.target.value }); }}
            placeholder="slug"
            className="flex-1 bg-transparent text-primary font-mono outline-none"
          />
        </div>

        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-[2rem] p-6 space-y-6">
          {type.fields.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Este tipo no tiene campos.{' '}
              <Link to={`/dashboard/content-types/${type.id}`} className="text-primary">Añadir campos</Link>
            </p>
          ) : (
            type.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={form.data[field.key]}
                error={fieldErrors[field.key]}
                onChange={(value) => setField(field.key, value)}
              />
            ))
          )}
        </div>
      </div>

      {/* Barra lateral */}
      <div className="w-80 space-y-6 shrink-0">
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest">Estado</h3>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as EntryForm['status'] })}
            className={inputClass}
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
          {isEditing && form.status === 'published' && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-2">
              Ver en el sitio <i className="fi fi-rr-arrow-up-right-from-square"></i>
            </a>
          )}
        </div>

        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest">SEO</h3>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-2 block">Meta title</label>
            <input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder={form.title} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-2 block">Meta description</label>
            <textarea
              rows={3}
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              className={`${inputClass} resize-none`}
            />
            <p className={`text-[10px] mt-1 ${form.meta_description.length > 160 ? 'text-orange-400' : 'text-gray-600'}`}>
              {form.meta_description.length}/160
            </p>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-2 block">Imagen para redes sociales</label>
            <MediaPicker value={form.og_image_id} onChange={(og_image_id) => setForm({ ...form, og_image_id })} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-black px-6 py-4 rounded-xl uppercase tracking-widest text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  );
}
