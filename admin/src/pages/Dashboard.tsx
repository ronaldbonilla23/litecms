import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface StatsData {
  pages: number;
  assets: number;
  uptimeSeconds: number;
  recentPages: {
    id: number;
    title: string;
    slug: string;
    status: 'draft' | 'published';
    updated_at: string;
  }[];
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

      {/* Hero Banner */}
      <div className="bg-primary p-12 rounded-[3.5rem] min-h-[200px] flex flex-col justify-between relative overflow-hidden group">
        <div className="z-10">
          <span className="bg-black text-primary text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-black/10">
            System Status: Online
          </span>
          <h2 className="text-black font-headline text-6xl font-black tracking-tighter mt-6 leading-[0.9]">
            LiteCMS<br />Overview
          </h2>
        </div>
        <div className="absolute right-12 bottom-12 opacity-10 group-hover:opacity-20 transition-opacity">
          <i className="fi fi-rr-apps text-[160px] text-black"></i>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Pages */}
        <div className="bg-[#141414] border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between gap-8 group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-[#adaaaa] font-black uppercase tracking-widest">Total Pages</p>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <i className="fi fi-rr-document text-lg mt-1"></i>
            </div>
          </div>
          {loading ? (
            <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ) : (
            <div>
              <div className="text-[#C2F86C] text-6xl font-black tracking-tighter leading-none">{stats?.pages ?? 0}</div>
              <div className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest mt-2">In database</div>
            </div>
          )}
        </div>

        {/* Assets en Librería */}
        <div className="bg-[#141414] border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between gap-8 group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-[#adaaaa] font-black uppercase tracking-widest">Assets en Librería</p>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <i className="fi fi-rr-picture text-lg mt-1"></i>
            </div>
          </div>
          {loading ? (
            <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ) : (
            <div>
              <div className="text-[#C2F86C] text-6xl font-black tracking-tighter leading-none">{stats?.assets ?? 0}</div>
              <div className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest mt-2">Uploaded files</div>
            </div>
          )}
        </div>

        {/* Server Uptime */}
        <div className="bg-[#141414] border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between gap-8 group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-[#adaaaa] font-black uppercase tracking-widest">Server Uptime</p>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <i className="fi fi-rr-time-check text-lg mt-1"></i>
            </div>
          </div>
          {loading ? (
            <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ) : (
            <div>
              <div className="text-[#C2F86C] text-5xl font-black tracking-tighter leading-none">
                {formatUptime(stats?.uptimeSeconds ?? 0)}
              </div>
              <div className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Running
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Pages + Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Últimas 5 Páginas Editadas */}
        <div className="lg:col-span-2 bg-[#131313] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-2xl text-white tracking-tight">Recent Edits</h3>
            <button
              onClick={() => navigate('/dashboard/pages')}
              className="text-[10px] text-primary font-black uppercase tracking-widest border border-primary/20 px-3 py-1 rounded-full hover:bg-primary hover:text-black transition-all"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)}
            </div>
          ) : stats?.recentPages && stats.recentPages.length > 0 ? (
            <div className="grid gap-3">
              {stats.recentPages.map(page => (
                <div
                  key={page.id}
                  onClick={() => navigate(`/dashboard/pages/edit/${page.id}`)}
                  className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                      <i className="fi fi-rr-document text-sm mt-0.5"></i>
                    </div>
                    <div>
                      <h4 className="text-white font-bold group-hover:text-primary transition-colors">{page.title}</h4>
                      <p className="text-[10px] text-[#adaaaa] font-mono mt-0.5">/{page.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border hidden sm:block ${
                      page.status === 'published'
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                    }`}>
                      {page.status}
                    </span>
                    <i className="fi fi-rr-arrow-right text-white/20 group-hover:text-primary transition-colors mt-1"></i>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 bg-black/20 border border-dashed border-white/5 rounded-3xl text-center">
              <i className="fi fi-rr-document text-4xl text-white/10 mb-3 block"></i>
              <p className="text-[#adaaaa] text-sm">No pages yet. Create your first one!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard/pages/new')}
            className="w-full bg-primary text-black p-6 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden text-left"
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">Quick Action</span>
            <span className="text-xl font-black tracking-tight flex items-center gap-2">
              <i className="fi fi-rr-plus-small text-2xl mt-1"></i> New Page
            </span>
            <i className="fi fi-rr-document absolute -right-4 -bottom-4 text-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></i>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/media')}
            className="w-full bg-[#131313] border border-white/5 text-white p-6 rounded-[2rem] hover:border-primary/30 transition-all group relative overflow-hidden text-left"
          >
            <span className="text-[10px] text-[#adaaaa] font-black uppercase tracking-widest block mb-2">Library</span>
            <span className="text-xl font-black tracking-tight flex items-center gap-2 group-hover:text-primary transition-colors">
              <i className="fi fi-rr-picture text-2xl mt-1"></i> Open Media
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
