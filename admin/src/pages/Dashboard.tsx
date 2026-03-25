import { useEffect, useState } from 'react';
import api from '../api/axios';

interface Page {
  id: number;
  title: string;
  slug: string;
  is_published: boolean | number;
}

export function Dashboard() {
  const [pages, setPages] = useState<Page[]>([]);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pagesRes, mediaRes] = await Promise.all([
          api.get('/pages'),
          api.get('/media')
        ]);
        
        const pagesData = Array.isArray(pagesRes.data) ? pagesRes.data : (pagesRes.data.data || []);
        const mediaData = Array.isArray(mediaRes.data) ? mediaRes.data : (mediaRes.data.data || []);

        // Mostrar solo los 5 más recientes
        setPages(pagesData.slice(0, 5));
        setMediaCount(mediaData.length);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Tarjeta Principal Hero */}
      <div className="bg-primary p-8 rounded-[2rem] min-h-[200px] flex flex-col justify-between relative overflow-hidden">
        <div className="z-10">
          <span className="bg-black text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">System Active</span>
          <h2 className="text-black font-headline text-5xl font-black tracking-tighter mt-4">Dashboard<br />Overview</h2>
        </div>
        <div className="absolute right-10 top-[15%] opacity-20">
          <i className="fi fi-rr-chart-histogram text-[120px] text-black"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Pages */}
        <div className="bg-[#131313] border border-white/5 p-6 rounded-[2rem]">
          <h3 className="font-headline font-bold text-xl text-white">Recent Pages</h3>
          {loading ? (
            <div className="animate-pulse space-y-4 mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[72px] bg-white/5 rounded-2xl w-full"></div>
              ))}
            </div>
          ) : pages.length > 0 ? (
            <div className="mt-6 flex flex-col space-y-3">
              {pages.map(page => (
                <div key={page.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#C2F86C]/10 border border-[#C2F86C]/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <i className="fi fi-rr-document text-lg leading-none"></i>
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{page.title}</h4>
                      <p className="text-xs text-[#adaaaa]">/{page.slug}</p>
                    </div>
                  </div>
                  <div>
                    <span 
                      className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${
                        page.is_published 
                          ? 'bg-[#C2F86C]/10 border border-[#C2F86C]/20 text-[#C2F86C]' 
                          : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                      }`}
                    >
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#adaaaa] text-sm mt-6 bg-white/5 p-4 rounded-2xl text-center">No pages found yet. Let's create one!</p>
          )}
        </div>

        {/* Media Usage */}
        <div className="bg-[#131313] border border-white/5 p-6 rounded-[2rem]">
          <h3 className="font-headline font-bold text-xl text-white">Media Library</h3>
          <div className="mt-6">
            {loading ? (
              <div className="animate-pulse h-24 bg-white/5 rounded-2xl w-full"></div>
            ) : (
              <div className="flex items-center space-x-5 p-6 bg-white/5 border border-white/5 rounded-2xl">
                <div className="w-14 h-14 bg-[#C2F86C]/10 border border-[#C2F86C]/20 text-[#C2F86C] rounded-xl flex flex-col items-center justify-center shrink-0 shadow-[0_0_20px_rgba(194,248,108,0.1)]">
                  <i className="fi fi-rr-picture text-2xl m-auto mt-4"></i>
                </div>
                <div>
                  <h4 className="text-white font-black text-4xl tracking-tighter">{mediaCount}</h4>
                  <p className="text-[10px] text-[#adaaaa] font-bold tracking-widest uppercase mt-1">Archivos subidos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
