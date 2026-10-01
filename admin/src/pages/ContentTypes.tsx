import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { ContentType } from '../../../shared/contentTypes';

/**
 * Lista de tipos de contenido (Proyectos, Servicios, Equipo...).
 * Desde aquí se gestionan sus entradas o se edita su estructura de campos.
 */
export function ContentTypes() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/content-types')
      .then(({ data }) => setTypes(data))
      .catch(() => toast.error('No se pudieron cargar los tipos de contenido'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">Tipos de contenido</h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Estructuras con campos propios: proyectos, servicios, equipo...
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/content-types/new')}
          className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
        >
          <i className="fi fi-rr-plus mr-2"></i>
          Nuevo tipo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-[2.5rem] bg-[#141414]">
          <i className="fi fi-rr-layers text-6xl text-white/10"></i>
          <p className="text-gray-400 mt-4">Aún no hay tipos de contenido.</p>
          <p className="text-gray-600 text-sm mt-1">Crea uno para publicar proyectos, servicios, testimonios o lo que necesites.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {types.map((type) => (
            <div key={type.id} className="bg-[#141414] border border-white/5 rounded-[2rem] p-6 hover:border-primary/30 transition-all flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white text-xl font-bold">{type.name}</h3>
                  <code className="text-primary text-xs">{type.url_prefix}</code>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{type.fields.length} campos</span>
              </div>
              {type.description && <p className="text-gray-400 text-sm mt-3 line-clamp-2">{type.description}</p>}
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                <Link
                  to={`/dashboard/content/${type.slug}`}
                  className="flex-1 text-center bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
                >
                  Entradas
                </Link>
                <Link
                  to={`/dashboard/content-types/${type.id}`}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-300 border border-white/10 hover:border-white/30 transition-colors"
                >
                  Estructura
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
