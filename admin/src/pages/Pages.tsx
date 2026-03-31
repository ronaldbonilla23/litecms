import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Page {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  created_at: string;
}

export function Pages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPages = async () => {
    try {
      setLoading(false); // temporary to show we started
      const res = await api.get('/pages');
      setPages(res.data);
    } catch (err) {
      console.error("Error cargando páginas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const deletePage = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar esta página?")) return;
    try {
      await api.delete(`/pages/${id}`);
      fetchPages();
      toast.success('Página eliminada');
    } catch (err) {
      toast.error("Error al eliminar la página");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">Site Pages</h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">Manage your content</p>
        </div>

        <button
          onClick={() => navigate('/dashboard/pages/new')}
          className="bg-primary text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <i className="fi fi-rr-plus text-xl mt-1"></i>
          CREATE NEW PAGE
        </button>
      </div>

      <div className="bg-[#131313] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-8 py-6 font-headline font-bold text-xl text-white">Title</th>
              <th className="px-8 py-6 font-headline font-bold text-xl text-white">Slug</th>
              <th className="px-8 py-6 font-headline font-bold text-xl text-white">Status</th>
              <th className="px-8 py-6 font-headline font-bold text-xl text-white text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse border-b border-white/5">
                  <td colSpan={4} className="px-8 py-6 h-20">
                    <div className="h-8 bg-white/5 rounded-xl w-full"></div>
                  </td>
                </tr>
              ))
            ) : pages.length > 0 ? (
              pages.map((page) => (
                <tr key={page.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="text-white font-bold text-lg group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/pages/edit/${page.id}`)}>
                      {page.title}
                    </div>
                    <div className="text-[#adaaaa] text-[10px] uppercase tracking-widest mt-1">
                      Created: {new Date(page.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[#adaaaa] font-mono text-sm">/{page.slug}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${page.status === 'published'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                      }`}>
                      {page.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => navigate(`/dashboard/pages/edit/${page.id}`)}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white hover:bg-primary hover:text-black transition-all"
                        title="Edit Page"
                      >
                        <i className="fi fi-rr-edit text-lg mt-1"></i>
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white hover:bg-red-500 transition-all"
                        title="Delete Page"
                      >
                        <i className="fi fi-rr-trash text-lg mt-1"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <i className="fi fi-rr-document text-5xl text-white/10"></i>
                    <p className="text-[#adaaaa] text-sm">No pages found yet. Create your first one!</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
