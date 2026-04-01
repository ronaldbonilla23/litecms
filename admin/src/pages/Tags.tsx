import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  post_count?: number;
}

export function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    color: '#C2F86C'
  });

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags?include_posts=true');
      setTags(res.data);
    } catch (error) {
      console.error('Error cargando tags:', error);
      toast.error('Error al cargar tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      const payload = {
        ...formData,
        color: formData.color
      };

      if (editingTag) {
        await api.put(`/tags/${editingTag.id}`, payload);
        toast.success('Tag actualizado');
      } else {
        await api.post('/tags', payload);
        toast.success('Tag creado');
      }

      setShowModal(false);
      setEditingTag(null);
      setFormData({ name: '', slug: '', color: '#C2F86C' });
      fetchTags();
    } catch (error) {
      toast.error('Error al guardar tag');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      color: tag.color
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este tag?')) return;
    try {
      await api.delete(`/tags/${id}`);
      toast.success('Tag eliminado');
      fetchTags();
    } catch (error) {
      toast.error('Error al eliminar tag');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">
            Tags
          </h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Etiquetas para clasificación transversal
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTag(null);
            setFormData({ name: '', slug: '', color: '#C2F86C' });
            setShowModal(true);
          }}
          className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
        >
          <i className="fi fi-rr-plus mr-2"></i>
          Nuevo Tag
        </button>
      </div>

      {/* Grid de Tags */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#1a1a1a]/30">
          <i className="fi fi-rr-tag text-6xl text-white/10 mb-4"></i>
          <p className="text-gray-400">No hay tags creados</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group relative bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-all"
            >
              {/* Color indicator */}
              <div
                className="absolute top-4 right-4 w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />

              {/* Nombre */}
              <h3 className="text-white font-bold text-lg mb-2">{tag.name}</h3>
              <p className="text-gray-500 text-xs font-mono mb-4">/{tag.slug}</p>

              {/* Posts count */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <i className="fi fi-rr-document"></i>
                <span>{tag.post_count || 0} posts</span>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(tag)}
                  className="flex-1 w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                >
                  <i className="fi fi-rr-edit"></i>
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="flex-1 w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                >
                  <i className="fi fi-rr-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          
          <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingTag ? 'Editar Tag' : 'Nuevo Tag'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 rounded-lg focus:border-primary outline-none"
                  placeholder="Ej: React"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-primary font-mono px-4 py-3 rounded-lg focus:border-primary outline-none"
                  placeholder="react"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 rounded-lg focus:border-primary outline-none font-mono"
                    placeholder="#C2F86C"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white/5 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-black px-6 py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                {editingTag ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
