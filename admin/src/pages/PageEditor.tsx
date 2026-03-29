import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import api from '../api/axios';

// --- Utility ---
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanum
    .trim()
    .replace(/[\s_-]+/g, '-')         // spaces → hyphens
    .replace(/^-+|-+$/g, '');         // trim leading/trailing hyphens
}

interface MediaItem {
  id: number;
  filename: string;
  mimetype: string;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'heading';
  key: string;
  value: string;
}

interface PageData {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  fields: ContentBlock[];
}

export function PageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PageData>({
    title: '',
    slug: '',
    status: 'draft',
    fields: []
  });

  // Slug auto-sync: locked by default in Edit mode, unlocked in Create mode
  const [slugLocked, setSlugLocked] = useState(false);

  // Media Selector State
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchPage = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/pages/${id}`);
          setData({
            title: res.data.title,
            slug: res.data.slug,
            status: res.data.status,
            fields: Array.isArray(res.data.fields) ? res.data.fields : []
          });
          setSlugLocked(true); // lock slug in edit mode to protect SEO
        } catch (err) {
          console.error("Error loading page", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPage();
    }
  }, [id]);

  // Auto-sync slug from title when not locked
  useEffect(() => {
    if (!slugLocked) {
      setData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [data.title, slugLocked]);

  const savePage = async () => {
    try {
      setSaving(true);
      const payload = { ...data };
      if (id) {
        await api.put(`/pages/${id}`, payload);
      } else {
        await api.post('/pages', payload);
      }
      navigate('/dashboard/pages');
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al guardar la página");
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: ContentBlock['type'] = 'text') => {
    const newBlock: ContentBlock = {
      id: nanoid(),
      type,
      key: `field_${data.fields.length + 1}`,
      value: ''
    };
    setData({
      ...data,
      fields: [...data.fields, newBlock]
    });
  };

  const removeBlock = (blockId: string) => {
    setData({
      ...data,
      fields: data.fields.filter(b => b.id !== blockId)
    });
  };

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setData({
      ...data,
      fields: data.fields.map(b => b.id === blockId ? { ...b, ...updates } : b)
    });
  };

  const openMediaSelector = async (blockId: string) => {
    setActiveBlockId(blockId);
    setShowMediaModal(true);
    try {
      const res = await api.get('/media');
      setMediaList(res.data);
    } catch (err) {
      console.error("Error cargando medios", err);
    }
  };

  const selectMedia = (filename: string) => {
    if (activeBlockId) {
      updateBlock(activeBlockId, { value: filename });
      setShowMediaModal(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-headline text-4xl font-black tracking-tighter">
            {id ? 'Edit Page' : 'Create New Page'}
          </h2>
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-2 px-1 border-l-2 border-primary ml-1">
            {id ? `Editing ID: ${id}` : 'Design your next landing'}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard/pages')}
            className="text-[#adaaaa] hover:text-white font-black text-[10px] uppercase tracking-widest px-6 py-3"
          >
            Cancel
          </button>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(194, 248, 108, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={savePage}
            disabled={saving}
            className="bg-primary text-black font-black px-8 py-4 rounded-[1.5rem] flex items-center gap-3 transition-colors shadow-primary/20 disabled:opacity-50 relative overflow-hidden group"
          >
             <motion.div
                initial={false}
                animate={saving ? { y: -40, opacity: 0 } : { y: 0, opacity: 1 }}
                className="flex items-center gap-3"
             >
                <i className="fi fi-rr-rocket-lunch text-xl mt-1"></i>
                <span className="tracking-widest uppercase text-xs">Launch Page</span>
             </motion.div>
             
             {saving && (
                <motion.div 
                    initial={{ y: 40, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-primary"
                >
                    <span className="animate-pulse tracking-widest uppercase text-xs">Ignition...</span>
                </motion.div>
             )}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* General info */}
          <section className="bg-[#131313] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-primary font-headline font-bold text-xl uppercase tracking-widest flex items-center gap-2">
              <i className="fi fi-rr-settings text-lg mt-1"></i> Core Details
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest ml-1">Page Title</label>
                <input 
                  type="text" 
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-6 py-4 text-white focus:outline-none focus:border-primary transition-colors font-bold text-lg"
                  placeholder="The Future of Design"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest">URL Slug</label>
                  <button
                    type="button"
                    onClick={() => setSlugLocked(l => !l)}
                    title={slugLocked ? 'Unlock for manual edit' : 'Lock slug — stop auto-sync'}
                    className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                      slugLocked ? 'text-primary' : 'text-[#adaaaa] hover:text-white'
                    }`}
                  >
                    <i className={`fi ${slugLocked ? 'fi-rr-lock' : 'fi-rr-unlock'} text-sm mt-0.5`}></i>
                    {slugLocked ? 'Locked' : 'Auto'}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={data.slug}
                  readOnly={!slugLocked}
                  onChange={(e) => setData({ ...data, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                  className={`w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-6 py-4 text-white font-mono transition-all focus:outline-none focus:border-primary ${
                    slugLocked ? 'opacity-100 cursor-text' : 'opacity-70 cursor-default'
                  }`}
                  placeholder="future-design"
                />
              </div>
            </div>
            <div className="flex p-1 bg-black/40 border border-white/10 rounded-[1.5rem]">
                <button 
                  onClick={() => setData({...data, status: 'draft'})}
                  className={`flex-1 py-3 rounded-[1rem] font-black text-[10px] tracking-widest transition-all ${data.status === 'draft' ? 'bg-white/10 text-white' : 'text-[#adaaaa] hover:text-white'}`}
                >
                  DRAFT
                </button>
                <button 
                  onClick={() => setData({...data, status: 'published'})}
                  className={`flex-1 py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest transition-all ${data.status === 'published' ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-[#adaaaa] hover:text-white'}`}
                >
                  PUBLISHED
                </button>
            </div>
          </section>

          {/* Dynamic Blocks */}
          <section className="bg-[#131313] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-headline font-bold text-xl uppercase tracking-widest flex items-center gap-2">
                <i className="fi fi-rr-layers text-lg mt-1"></i> Dynamic Blocks
              </h3>
              <div className="flex gap-2">
                 <button onClick={() => addBlock('text')} className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all border border-white/5" title="Add Text Block">
                    <i className="fi fi-rr-text-field text-lg mt-1 block"></i>
                 </button>
                 <button onClick={() => addBlock('image')} className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all border border-white/5" title="Add Image Block">
                    <i className="fi fi-rr-picture text-lg mt-1 block"></i>
                 </button>
                 <button onClick={() => addBlock('heading')} className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all border border-white/5" title="Add Heading Block">
                    <i className="fi fi-rr-heading text-lg mt-1 block"></i>
                 </button>
              </div>
            </div>

            <div className="space-y-4">
              {data.fields.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center bg-black/10">
                  <i className="fi fi-rr-square-plus text-4xl text-white/10 mb-4 block"></i>
                  <p className="text-[#adaaaa] text-sm">Add some blocks to start building</p>
                </div>
              ) : data.fields.map((block, index) => (
                <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={block.id} 
                    className="group flex gap-4 p-6 bg-black/40 rounded-3xl border border-white/5 hover:border-white/10 transition-all relative"
                >
                  <div className="shrink-0 pt-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                         <div className="w-1/4">
                            <label className="text-[9px] text-primary/50 font-bold uppercase tracking-widest ml-1">Section Key</label>
                            <input 
                                type="text"
                                value={block.key}
                                onChange={(e) => updateBlock(block.id, { key: e.target.value })}
                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white text-[10px] font-mono focus:outline-none focus:border-primary"
                                placeholder="hero_title"
                            />
                         </div>
                         <div className="flex-1">
                             <label className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest ml-1">Content ({block.type})</label>
                             {block.type === 'image' ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={block.value}
                                        readOnly
                                        className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white text-xs focus:outline-none"
                                        placeholder="No image selected"
                                    />
                                    <button 
                                        onClick={() => openMediaSelector(block.id)}
                                        className="px-4 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-xl transition-all border border-primary/20"
                                    >
                                        <i className="fi fi-rr-picture"></i>
                                    </button>
                                </div>
                             ) : (
                                <textarea 
                                    value={block.value}
                                    onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-primary transition-all h-10 min-h-[40px]"
                                    placeholder="Enter content..."
                                />
                             )}
                         </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeBlock(block.id)}
                    className="absolute -right-2 -top-2 w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-white/5 shadow-xl hover:scale-110"
                  >
                    <i className="fi fi-rr-cross-small"></i>
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
            <section className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8">
                <h4 className="text-primary font-bold text-sm uppercase tracking-widest mb-6 border-b border-primary/10 pb-4">
                    Builder Rules
                </h4>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-[10px] font-bold">01</span>
                        </div>
                        <p className="text-[11px] text-primary/70 font-medium leading-relaxed">
                            Each block needs a <b>Key</b> to be identified by the frontend.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-[10px] font-bold">02</span>
                        </div>
                        <p className="text-[11px] text-primary/70 font-medium leading-relaxed">
                            Slugs are <b>immutable</b> in edit mode to preserve SEO integrity.
                        </p>
                    </div>
                </div>
            </section>
        </div>
      </div>

      {/* Media Selector Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            onClick={() => setShowMediaModal(false)}
          ></motion.div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-4xl bg-[#131313] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#181818]">
              <h3 className="text-white font-headline font-bold text-2xl tracking-tighter uppercase">Media Library Pro</h3>
              <button onClick={() => setShowMediaModal(false)} className="text-[#adaaaa] hover:text-white transition-colors">
                 <i className="fi fi-rr-cross text-xl"></i>
              </button>
            </div>
            <div className="p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {mediaList.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => selectMedia(item.filename)}
                  className="group relative aspect-square bg-black/40 rounded-3xl overflow-hidden border border-white/5 hover:border-primary transition-all cursor-pointer"
                >
                  <img 
                    src={`http://localhost:3000/uploads/${item.filename}`} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-primary/20 backdrop-blur-[2px] transition-opacity">
                    <span className="bg-primary text-black font-black text-[9px] px-3 py-1.5 rounded-full tracking-widest">INSERT</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
