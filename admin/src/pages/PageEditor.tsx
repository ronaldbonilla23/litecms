import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import api from '../api/axios';
import { PageSchema } from '../../../shared/types';
import { ContainerBlock } from '../../../shared/components/blocks/ContainerBlock';
import { SectionBlock } from '../../../shared/components/blocks/SectionBlock';
import { Container, Text, Image } from '../../../shared/components/blocks/BasicBlocks';

// --- USER COMPONENTS (Craft.js) ---

/**
 * 📝 Text Settings Panel — uses local state to prevent focus loss on every keystroke
 */
const TextSettings = ({ selectedId, props, actions }: { selectedId: string; props: any; actions: any }) => {
    const [localFontSize, setLocalFontSize] = useState<number>(props.fontSize ?? 16);

    // Sync if a different node gets selected
    React.useEffect(() => {
        setLocalFontSize(props.fontSize ?? 16);
    }, [selectedId, props.fontSize]);

    const commitFontSize = (val: number) => {
        const clamped = Math.max(1, Math.min(999, val || 1));
        actions.setProp(selectedId, (p: any) => { p.fontSize = clamped; });
        setLocalFontSize(clamped);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest">Font Size</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={1}
                        max={999}
                        value={localFontSize}
                        onChange={(e) => setLocalFontSize(Number(e.target.value))}
                        onBlur={(e) => commitFontSize(Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitFontSize(localFontSize); }}
                        className="w-full bg-[#141414] border border-[#C2F86C]/20 rounded-lg px-3 py-2 text-white text-[11px] focus:outline-none focus:border-[#C2F86C] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:appearance-auto"
                    />
                    <span className="text-[9px] text-[#adaaaa] shrink-0">px</span>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest">Text Color</label>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={props.color || '#000000'}
                        onChange={(e) => actions.setProp(selectedId, (p: any) => { p.color = e.target.value; })}
                        className="h-9 w-12 rounded border border-[#C2F86C]/20 cursor-pointer bg-[#141414] shrink-0"
                    />
                    <span className="text-[10px] text-[#adaaaa] font-mono">{props.color || '#000000'}</span>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest">Text Alignment</label>
                <div className="flex bg-white/5 p-1 rounded-xl">
                    {(['left', 'center', 'right'] as const).map(align => (
                        <button key={align} onClick={() => actions.setProp(selectedId, (p: any) => p.textAlign = align)} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${props.textAlign === align ? 'bg-primary text-black' : 'text-[#adaaaa]'}`}>{align}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- PANELS & UI ---

/**
 * 🔍 Left Panel - Layers & Toolbox
 */
const LayersPanel = () => {
    const { connectors } = useEditor();
    return (
        <div className="w-64 border-r border-white/5 bg-[#0e0e0e] h-full flex flex-col p-6 space-y-8 animate-in slide-in-from-left-4 duration-500">
            <section>
                <h4 className="text-[#adaaaa] text-[9px] font-black uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Toolbox</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button ref={(ref: any) => connectors.create(ref, <Element is={ContainerBlock} canvas />)} className="p-3 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex flex-col items-center gap-2 border border-white/5 group">
                        <i className="fi fi-rr-square text-lg group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] font-bold uppercase">Container</span>
                    </button>
                    <button ref={(ref: any) => connectors.create(ref, <Element is={SectionBlock} canvas />)} className="p-3 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex flex-col items-center gap-2 border border-white/5 group">
                        <i className="fi fi-rr-apps text-lg group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] font-bold uppercase">Section</span>
                    </button>
                    <button ref={(ref: any) => connectors.create(ref, <Text text="Nuevo Texto" />)} className="p-3 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex flex-col items-center gap-2 border border-white/5 group">
                        <i className="fi fi-rr-typewriter text-lg group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] font-bold uppercase">Text</span>
                    </button>
                    <button ref={(ref: any) => connectors.create(ref, <Image />)} className="p-3 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex flex-col items-center gap-2 border border-white/5 group">
                        <i className="fi fi-rr-picture text-lg group-hover:scale-110 transition-transform"></i>
                        <span className="text-[8px] font-bold uppercase">Image</span>
                    </button>
                </div>
            </section>
        </div>
    );
};

/**
 * ⚙️ Right Panel - Settings & Styling
 */
const SettingsPanel = ({ onOpenMedia }: { onOpenMedia: (blockId: string) => void }) => {
    const { selected, actions, query } = useEditor((state, query) => {
        const [nodeId] = state.events.selected;
        return { 
            selected: nodeId ? {
                id: nodeId,
                name: state.nodes[nodeId].data.name,
                settings: state.nodes[nodeId].related && state.nodes[nodeId].related.settings,
                isDeletable: query.node(nodeId).isDeletable()
            } : null
        };
    });

    if (!selected) return (
        <div className="w-80 border-l border-white/5 bg-[#0e0e0e] h-full flex items-center justify-center p-8 text-center animate-in slide-in-from-right-4 duration-500">
            <p className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest leading-loose">
                Please select a <span className="text-white">component</span><br/> to adjust parameters.
            </p>
        </div>
    );

    const node = query.node(selected.id).get();
    const props = node.data.props;

    return (
        <div className="w-80 border-l border-white/5 bg-[#0e0e0e] h-full flex flex-col p-8 space-y-8 animate-in slide-in-from-right-4 duration-500 overflow-y-auto">
            <div className="flex items-center justify-between">
                <h4 className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <i className="fi fi-rr-settings-sliders"></i> {selected.name}
                </h4>
                {selected.isDeletable && (
                    <button 
                        onClick={() => actions.delete(selected.id)}
                        className="text-error/50 hover:text-error transition-colors"
                    >
                        <i className="fi fi-rr-trash"></i>
                    </button>
                )}
            </div>

            {/* Render dynamic settings if available */}
            {selected.settings && React.createElement(selected.settings)}

            {/* Fallback for components without separate settings files (Text, Image) */}
            {node.data.type === Text && (
                <TextSettings selectedId={selected.id} props={props} actions={actions} />
            )}

            {node.data.type === Image && (
                <div className="space-y-6">
                   <button 
                        onClick={() => onOpenMedia(selected.id)}
                        className="w-full py-4 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(194,248,108,0.3)] transition-all"
                    >
                        Browse Media Library
                    </button>
                    <div className="space-y-2">
                        <label className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest">Alt Description</label>
                        <input type="text" value={props.alt || ''} onChange={(e) => actions.setProp(selected.id, (p: any) => p.alt = e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white text-[10px]" placeholder="SEO Description..." />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN WRAPPER ---

export function PageEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initialJson, setInitialJson] = useState<string | null>(null);
    const [data, setData] = useState({ title: '', slug: '', status: 'draft' as 'draft' | 'published' });
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [activeImageNodeId, setActiveImageNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const fetchPage = async () => {
                try {
                    setLoading(true);
                    const res = await api.get(`/pages/${id}`);
                    setData({ title: res.data.title, slug: res.data.slug, status: res.data.status });
                    setInitialJson(res.data.fields ? JSON.stringify(res.data.fields) : null);
                } catch (err) {
                    console.error("Error loading page", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchPage();
        }
    }, [id]);

    const openMediaSelector = async (nodeId: string) => {
        setActiveImageNodeId(nodeId);
        setShowMediaModal(true);
        try {
            const res = await api.get('/media');
            setMediaList(res.data);
        } catch (err) {
            console.error("Error loading media", err);
        }
    };

    if (loading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0e0e0e] overflow-hidden -m-10">
            <Editor resolver={{ Container, Text, Image, ContainerBlock, SectionBlock }}>
                {/* Visual Builder Navbar */}
                <div className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#0e0e0e]">
                    <div className="flex items-center gap-8">
                        <div>
                            <h2 className="text-white font-headline text-2xl font-black tracking-tighter leading-none">Visual Builder</h2>
                            <span className="text-[9px] text-[#adaaaa] font-bold uppercase tracking-widest">{id ? `Editing: ${data.slug}` : 'New Reality Creation'}</span>
                        </div>
                        <div className="h-8 w-px bg-white/5"></div>
                        <div className="flex gap-4">
                            <input 
                                type="text"
                                value={data.title}
                                placeholder="Untitled Experience"
                                onChange={(e) => setData({ ...data, title: e.target.value })}
                                className="bg-white/5 border border-white/5 rounded-xl px-4 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all w-48 font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/dashboard/pages')} className="text-[#adaaaa] hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Abort</button>
                        <DeployButton id={id} data={data} saving={saving} setSaving={setSaving} />
                    </div>
                </div>

                {/* Editor Workspace */}
                <div className="flex-1 flex overflow-hidden">
                    <LayersPanel />
                    
                    <div className="flex-1 bg-white overflow-y-auto flex flex-col">
                         <div className="w-full h-full">
                            <Frame data={initialJson && JSON.parse(initialJson).ROOT ? JSON.parse(initialJson) : undefined}>
                                <Element is={SectionBlock} canvas>
                                    <ContainerBlock display="flex" flexDirection="column" alignItems="center">
                                        <Text text="Welcome to LiteCMS" fontSize={64} textAlign="center" color="#000000" />
                                        <Text text="Empieza a construir tu sitio de alto impacto arrastrando componentes estructurales desde la izquierda." fontSize={18} textAlign="center" color="#555555" />
                                    </ContainerBlock>
                                </Element>
                            </Frame>
                         </div>
                    </div>

                    <SettingsPanel onOpenMedia={openMediaSelector} />
                </div>

                <MediaSelectorModal 
                    show={showMediaModal} 
                    onClose={() => setShowMediaModal(false)} 
                    media={mediaList} 
                    activeNodeId={activeImageNodeId} 
                />
            </Editor>
        </div>
    );
}

// --- HELPER COMPONENTS ---

const DeployButton = ({ id, data, saving, setSaving }: any) => {
    const { query } = useEditor();
    const navigate = useNavigate();

    const handleDeploy = async () => {
        try {
            setSaving(true);
            const serializedState = query.serialize();
            
            const payload = {
                ...data,
                slug: data.slug || data.title.toLowerCase().replace(/ /g, '-'),
                fields: JSON.parse(serializedState)
            };

            const validation = PageSchema.safeParse(payload);
            if (!validation.success) {
                alert(`Validation Failure: ${validation.error.issues[0].message}`);
                return;
            }

            if (id) {
                await api.put(`/pages/${id}`, payload);
            } else {
                await api.post('/pages', payload);
            }
            navigate('/dashboard/pages');
        } catch (err: any) {
            alert(err.response?.data?.error || "Critical system error during deployment");
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(194, 248, 108, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDeploy}
            disabled={saving}
            className="h-12 bg-primary text-black px-8 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10 transition-all border border-primary/20"
        >
            <i className={`fi ${saving ? 'fi-rr-spinner animate-spin' : 'fi-rr-rocket-lunch'} text-base`}></i>
            {saving ? 'Ignition...' : 'Deploy Page'}
        </motion.button>
    );
};

const MediaSelectorModal = ({ show, onClose, media, activeNodeId }: any) => {
    const { actions } = useEditor();
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></motion.div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-4xl bg-[#0e0e0e] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#141414]">
                    <h3 className="text-white font-headline font-bold text-2xl tracking-tighter uppercase">Asset Selection</h3>
                    <button onClick={onClose} className="text-[#adaaaa] hover:text-white"><i className="fi fi-rr-cross"></i></button>
                </div>
                <div className="p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {media.map((item: any) => (
                        <div key={item.id} onClick={() => {
                            if (activeNodeId) actions.setProp(activeNodeId, (props: any) => props.src = item.filename);
                            onClose();
                        }} className="group relative aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 hover:border-primary transition-all cursor-pointer">
                            <img src={`http://localhost:3000/uploads/${item.filename}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-primary/10 backdrop-blur-[2px] transition-opacity">
                                <span className="bg-primary text-black font-black text-[8px] px-3 py-2 rounded-lg tracking-widest">SELECT</span>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};
