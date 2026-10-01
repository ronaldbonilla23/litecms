import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { ContentType, Entry } from '../../../shared/contentTypes';

/**
 * Entradas de un tipo de contenido: /dashboard/content/:typeSlug
 */
export function Entries() {
  const { typeSlug } = useParams<{ typeSlug: string }>();
  const navigate = useNavigate();
  const [type, setType] = useState<ContentType | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: types } = await api.get<ContentType[]>('/content-types');
      const current = types.find((item) => item.slug === typeSlug) ?? null;
      setType(current);
      if (current) {
        const { data } = await api.get<Entry[]>('/entries', { params: { type: current.slug } });
        setEntries(data);
      }
    } catch {
      toast.error('No se pudieron cargar las entradas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeSlug]);

  const deleteEntry = async (entry: Entry) => {
    if (!window.confirm(`¿Eliminar "${entry.title}"?`)) return;
    try {
      await api.delete(`/entries/${entry.id}`);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      toast.success('Entrada eliminada');
    } catch {
      toast.error('No se pudo eliminar la entrada');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Ese tipo de contenido no existe.</p>
        <Link to="/dashboard/content-types" className="text-primary text-sm mt-4 inline-block">← Tipos de contenido</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <Link to="/dashboard/content-types" className="text-xs text-gray-500 hover:text-primary">← Tipos de contenido</Link>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter mt-2">{type.name}</h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Publicado en <code className="normal-case text-primary">{type.url_prefix}</code>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/dashboard/content-types/${type.id}`}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-300 border border-white/10 hover:border-white/30"
          >
            Estructura
          </Link>
          <button
            onClick={() => navigate(`/dashboard/content/${type.slug}/new`)}
            className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <i className="fi fi-rr-plus mr-2"></i>
            Nuevo {type.singular_name.toLowerCase()}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-[2.5rem] bg-[#141414]">
          <i className="fi fi-rr-document text-6xl text-white/10"></i>
          <p className="text-gray-400 mt-4">Todavía no hay {type.name.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="group bg-[#1a1a1a]/50 border border-white/5 rounded-xl px-6 py-4 hover:border-primary/30 transition-all flex items-center gap-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${entry.status === 'published'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                {entry.status === 'published' ? 'Publicado' : 'Borrador'}
              </span>
              <div className="flex-1 min-w-0">
                <Link to={`/dashboard/content/${type.slug}/edit/${entry.id}`} className="text-white font-bold hover:text-primary truncate block">
                  {entry.title}
                </Link>
                <code className="text-xs text-gray-500">{type.url_prefix}/{entry.slug}</code>
              </div>
              {entry.status === 'published' && (
                <a href={`${type.url_prefix}/${entry.slug}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary" title="Ver en el sitio">
                  <i className="fi fi-rr-arrow-up-right-from-square"></i>
                </a>
              )}
              <button onClick={() => deleteEntry(entry)} className="text-gray-500 hover:text-red-400" title="Eliminar">
                <i className="fi fi-rr-trash"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
