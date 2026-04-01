import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dynamic from 'react/dynamic';
import api from '../api/axios';
import toast from 'react-hot-toast';

// React Quill dinámico (solo cliente)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
}

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [postData, setPostData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image_id: '',
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    meta_title: '',
    meta_description: '',
    category_ids: [] as number[],
    tag_ids: [] as number[]
  });

  // Cargar categorías y tags
  useEffect(() => {
    const loadTaxonomies = async () => {
      try {
        const [catsRes, tagsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/tags')
        ]);
        setCategories(catsRes.data);
        setTags(tagsRes.data);
      } catch (error) {
        console.error('Error cargando taxonomías:', error);
      }
    };
    loadTaxonomies();
  }, []);

  // Cargar post si estamos editando
  useEffect(() => {
    if (isEditing) {
      const fetchPost = async () => {
        try {
          const { data } = await api.get(`/posts/${id}`);
          setPostData({
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            featured_image_id: data.featured_image_id || '',
            status: data.status || 'draft',
            meta_title: data.meta_title || '',
            meta_description: data.meta_description || '',
            category_ids: data.categories?.map((c: Category) => c.id) || [],
            tag_ids: data.tags?.map((t: Tag) => t.id) || []
          });
        } catch (error) {
          console.error('Error cargando post:', error);
          toast.error('Error al cargar el post');
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    }
  }, [id]);

  // Generar slug automático
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!postData.title || !postData.content) {
      toast.error('Título y contenido son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...postData,
        slug: postData.slug || generateSlug(postData.title),
        featured_image_id: postData.featured_image_id || null,
        category_ids: postData.category_ids,
        tag_ids: postData.tag_ids
      };

      if (isEditing) {
        await api.put(`/posts/${id}`, payload);
        toast.success('Post actualizado 🚀');
      } else {
        const { data } = await api.post('/posts', payload);
        toast.success('Post creado 🚀');
        navigate(`/dashboard/posts/edit/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error guardando post:', error);
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setPostData({ ...postData, title });
    // Auto-generar slug si está vacío
    if (!postData.slug) {
      setPostData({ ...postData, slug: generateSlug(title) });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-primary mb-3"></i>
          <p className="text-gray-400">Cargando post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Columna Principal - Editor */}
      <div className="flex-1 space-y-6">
        {/* Título */}
        <input
          type="text"
          value={postData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Título del post"
          className="w-full bg-[#1a1a1a] border border-white/10 text-white text-3xl font-bold px-6 py-4 rounded-xl focus:border-primary outline-none"
        />

        {/* Slug */}
        <input
          type="text"
          value={postData.slug}
          onChange={(e) => setPostData({ ...postData, slug: e.target.value })}
          placeholder="slug-del-post"
          className="w-full bg-[#1a1a1a] border border-white/10 text-primary font-mono px-6 py-3 rounded-xl focus:border-primary outline-none"
        />

        {/* Extracto */}
        <textarea
          value={postData.excerpt}
          onChange={(e) => setPostData({ ...postData, excerpt: e.target.value })}
          placeholder="Extracto corto (opcional)"
          rows={3}
          className="w-full bg-[#1a1a1a] border border-white/10 text-white px-6 py-4 rounded-xl focus:border-primary outline-none resize-none"
        />

        {/* Editor WYSIWYG */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <ReactQuill
            theme="snow"
            value={postData.content}
            onChange={(content) => setPostData({ ...postData, content })}
            placeholder="Escribe el contenido de tu post..."
            className="bg-[#141414]"
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ color: [] }, { background: [] }],
                ['link', 'image'],
                ['clean']
              ]
            }}
            formats={[
              'header', 'bold', 'italic', 'underline', 'strike',
              'list', 'bullet', 'color', 'background', 'link', 'image'
            ]}
          />
        </div>
      </div>

      {/* Sidebar - Configuración */}
      <div className="w-80 space-y-6">
        {/* Estado */}
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
            Estado
          </h3>
          <select
            value={postData.status}
            onChange={(e) => setPostData({ ...postData, status: e.target.value as any })}
            className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-primary outline-none"
          >
            <option value="draft">📝 Borrador</option>
            <option value="published">✅ Publicado</option>
            <option value="scheduled">⏰ Programado</option>
          </select>
        </div>

        {/* Categorías */}
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
            Categorías
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postData.category_ids.includes(cat.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPostData({
                        ...postData,
                        category_ids: [...postData.category_ids, cat.id]
                      });
                    } else {
                      setPostData({
                        ...postData,
                        category_ids: postData.category_ids.filter(id => id !== cat.id)
                      });
                    }
                  }}
                  className="rounded bg-[#141414] border-white/10 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-300">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
            Tags
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postData.tag_ids.includes(tag.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPostData({
                        ...postData,
                        tag_ids: [...postData.tag_ids, tag.id]
                      });
                    } else {
                      setPostData({
                        ...postData,
                        tag_ids: postData.tag_ids.filter(id => id !== tag.id)
                      });
                    }
                  }}
                  className="rounded bg-[#141414] border-white/10 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-300">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-4">
            SEO
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-2 block">
                Meta Title
              </label>
              <input
                type="text"
                value={postData.meta_title}
                onChange={(e) => setPostData({ ...postData, meta_title: e.target.value })}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-2 block">
                Meta Description
              </label>
              <textarea
                value={postData.meta_description}
                onChange={(e) => setPostData({ ...postData, meta_description: e.target.value })}
                rows={3}
                className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-primary outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-black px-6 py-4 rounded-xl uppercase tracking-widest text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <i className="fi fi-rr-spinner animate-spin"></i>
              Guardando...
            </span>
          ) : isEditing ? (
            'Actualizar Post 🚀'
          ) : (
            'Publicar Post 🚀'
          )}
        </button>
      </div>
    </div>
  );
}
