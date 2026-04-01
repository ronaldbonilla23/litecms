import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  post_count?: number;
  children?: Category[];
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: ''
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/tree');
      setCategories(res.data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', payload);
        toast.success('Categoría creada');
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '', parent_id: '' });
      fetchCategories();
    } catch (error) {
      toast.error('Error al guardar categoría');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Categoría eliminada');
      fetchCategories();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map((cat) => (
      <div key={cat.id}>
        <div
          className="group flex items-center justify-between bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-4 mb-3 hover:border-primary/30 transition-all"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div>
            <h3 className="text-white font-bold mb-1">{cat.name}</h3>
            <p className="text-gray-400 text-sm">{cat.description || 'Sin descripción'}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>/{cat.slug}</span>
              <span>•</span>
              <span>{cat.post_count || 0} posts</span>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEdit(cat)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
            >
              <i className="fi fi-rr-edit"></i>
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
            >
              <i className="fi fi-rr-trash"></i>
            </button>
          </div>
        </div>

        {cat.children && cat.children.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">
            Categorías
          </h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Organiza tus posts jerárquicamente
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', slug: '', description: '', parent_id: '' });
            setShowModal(true);
          }}
          className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
        >
          <i className="fi fi-rr-plus mr-2"></i>
          Nueva Categoría
        </button>
      </div>

      {/* Lista de Categorías */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
        </div>
      ) : (
        <div>{renderCategoryTree(categories)}</div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)}></div>

          <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 rounded-lg focus:border-primary outline-none"
                  placeholder="Ej: Tecnología"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-primary font-mono px-4 py-3 rounded-lg focus:border-primary outline-none"
                  placeholder="tecnologia"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 rounded-lg focus:border-primary outline-none resize-none"
                  rows={3}
                  placeholder="Descripción de la categoría"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase mb-2 block">Categoría Padre (opcional)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white px-4 py-3 rounded-lg focus:border-primary outline-none"
                >
                  <option value="">Sin categoría padre</option>
                  {categories
                    .filter(c => !editingCategory || c.id !== editingCategory.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
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
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
