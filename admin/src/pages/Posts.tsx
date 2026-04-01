import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  author_name: string;
  published_at: string;
  view_count: number;
  categories?: string;
  tags?: string;
}

export function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('published');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts', {
        params: { status: filter, include_posts: true }
      });
      setPosts(res.data.posts || []);
    } catch (error) {
      console.error('Error cargando posts:', error);
      toast.error('Error al cargar los posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const deletePost = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      fetchPosts();
      toast.success('Post eliminado');
    } catch (error) {
      toast.error('Error al eliminar el post');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      published: 'bg-green-500/20 text-green-400 border-green-500/30',
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      archived: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return badges[status] || badges.draft;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      published: 'fi-rr-check-circle',
      draft: 'fi-rr-edit',
      scheduled: 'fi-rr-clock',
      archived: 'fi-rr-folder'
    };
    return icons[status] || icons.draft;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">
            Blog Posts
          </h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            Gestiona el contenido de tu blog
          </p>
        </div>

        <div className="flex gap-3">
          {/* Filtro por estado */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 text-white px-4 py-2 rounded-lg text-sm focus:border-primary outline-none"
          >
            <option value="published">Publicados</option>
            <option value="draft">Borradores</option>
            <option value="scheduled">Programados</option>
            <option value="archived">Archivados</option>
          </select>

          <button
            onClick={() => navigate('/dashboard/posts/new')}
            className="bg-primary text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <i className="fi fi-rr-plus mr-2"></i>
            Nuevo Post
          </button>
        </div>
      </div>

      {/* Lista de Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#1a1a1a]/30">
          <i className="fi fi-rr-document text-6xl text-white/10 mb-4"></i>
          <p className="text-gray-400">No hay posts en esta categoría</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-6 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Contenido */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1 ${getStatusBadge(post.status)}`}>
                      <i className={`fi ${getStatusIcon(post.status)}`}></i>
                      {post.status}
                    </span>
                    {post.categories && (
                      <span className="text-[10px] text-gray-500">
                        {post.categories}
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {post.excerpt || 'Sin resumen'}
                  </p>

                  <div className="flex items-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <i className="fi fi-rr-user"></i>
                      {post.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fi fi-rr-clock"></i>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('es-ES') : 'No publicado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fi fi-rr-eye"></i>
                      {post.view_count} vistas
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/posts/edit/${post.id}`)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                  >
                    <i className="fi fi-rr-edit"></i>
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                  >
                    <i className="fi fi-rr-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
