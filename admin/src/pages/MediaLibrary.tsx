import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';

interface MediaItem {
    id: number;
    filename: string;
    url: string;
    mimetype: string;
    alt_text?: string;
    seo_title?: string;
}

export const MediaLibrary = () => {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
    const [seoData, setSeoData] = useState({ alt_text: '', seo_title: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const res = await api.get('/media');
            const mediaData = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setMedia(mediaData);
        } catch (err) {
            console.error("Error cargando galería", err);
            setMedia([]); // Aseguramos que sea array
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMedia(); }, []);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/media/upload', formData);
            fetchMedia(); // Recargar
        } catch (err) {
            alert("Error al subir archivo");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        uploadFile(e.target.files[0]);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const deleteItem = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm("¿Borrar esta imagen?")) return;
        try {
            await api.delete(`/media/${id}`);
            if (selectedItem?.id === id) setSelectedItem(null);
            fetchMedia();
        } catch (err) {
            alert("Error al eliminar");
        }
    };

    const copyUrl = (e: React.MouseEvent, filename: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`http://localhost:3000/uploads/${filename}`);
        alert("URL copiada!");
    };

    const openPreview = (item: MediaItem) => {
        setSelectedItem(item);
        setSeoData({ alt_text: item.alt_text || '', seo_title: item.seo_title || '' });
    };

    const saveSeo = async () => {
        if (!selectedItem) return;
        try {
            await api.put(`/media/${selectedItem.id}/seo`, seoData);
            alert("SEO Actualizado 🚀");
            fetchMedia(); // Recargar para ver cambios
            setSelectedItem(null); // Cerrar
        } catch (err) {
            alert("Error al guardar SEO");
        }
    };

    return (
        <div className="flex gap-8">
            <div
                className={`flex-1 space-y-8 transition-colors duration-300 ${isDragging ? 'bg-primary/5' : ''} animate-in fade-in duration-700`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Header con Switch de Vista */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-white font-headline text-4xl font-black tracking-tighter">Media Library</h2>
                        <div className="flex gap-6 mt-4">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${viewMode === 'grid' ? 'text-primary' : 'text-[#adaaaa] hover:text-white'}`}
                            >
                                <i className="fi fi-rr-apps text-lg leading-none"></i> GRID
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'text-primary' : 'text-[#adaaaa] hover:text-white'}`}
                            >
                                <i className="fi fi-rr-list text-lg leading-none"></i> LIST
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-primary text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                        <i className="fi fi-rr-cloud-upload text-xl mt-1"></i>
                        UPLOAD NEW
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                </div>

                {/* Overlay de Drag & Drop */}
                {isDragging && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0e0e]/90 backdrop-blur-sm border-4 border-dashed border-[#C2F86C] m-8 rounded-[3rem]"
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="text-center pointer-events-none">
                            <i className="fi fi-rr-cloud-upload text-primary text-6xl animate-bounce"></i>
                            <p className="text-white font-headline text-2xl font-black mt-4">Drop your designs here</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-surface-container-low rounded-[2rem] animate-pulse" />)}
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {media.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => openPreview(item)}
                                        className={`group relative aspect-square bg-[#131313] border ${selectedItem?.id === item.id ? 'border-primary' : 'border-white/5'} rounded-[2rem] overflow-hidden hover:border-primary/50 transition-all cursor-pointer`}
                                    >
                                        <img
                                            src={`http://localhost:3000/uploads/${item.filename}`}
                                            alt={item.alt_text || item.filename}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3 backdrop-blur-sm">
                                            <button
                                                onClick={(e) => copyUrl(e, item.filename)}
                                                className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl hover:bg-primary hover:text-black transition-colors"
                                            >
                                                <i className="fi fi-rr-copy text-[20px] m-auto leading-none mt-3.5"></i>
                                            </button>
                                            <button
                                                onClick={(e) => deleteItem(e, item.id)}
                                                className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl hover:bg-red-500 text-white transition-colors"
                                            >
                                                <i className="fi fi-rr-trash text-[20px] m-auto leading-none mt-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {media.length === 0 && (
                                    <div className="col-span-full py-16 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-4">
                                        <i className="fi fi-rr-picture text-4xl text-white/20"></i>
                                        <div className="text-center">
                                            <p className="text-white font-bold">No assets found</p>
                                            <p className="text-[#adaaaa] text-xs mt-1">Drag and drop files to start building your library</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#131313] border border-white/5 rounded-[2rem] p-6 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-4 font-headline font-bold text-xl text-white">Asset</th>
                                            <th className="px-4 py-4 font-headline font-bold text-xl text-white">Filename</th>
                                            <th className="px-4 py-4 font-headline font-bold text-xl text-white text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {media.map((item) => (
                                            <tr
                                                key={item.id}
                                                onClick={() => openPreview(item)}
                                                className={`border-t border-white/5 hover:bg-white/5 transition-all group cursor-pointer ${selectedItem?.id === item.id ? 'bg-white/5' : ''}`}
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                                                        <img src={`http://localhost:3000/uploads/${item.filename}`} alt={item.alt_text || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-white font-bold">{item.filename}</div>
                                                    <div className="text-xs text-[#adaaaa] mt-1">{item.mimetype}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={(e) => copyUrl(e, item.filename)}
                                                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-primary hover:text-black transition-colors text-[#adaaaa]"
                                                            title="Copy URL"
                                                        >
                                                            <i className="fi fi-rr-copy text-lg mt-1"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => deleteItem(e, item.id)}
                                                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-colors text-[#adaaaa]"
                                                            title="Delete Asset"
                                                        >
                                                            <i className="fi fi-rr-trash text-lg mt-1"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {media.length === 0 && (
                                    <p className="text-[#adaaaa] text-sm mt-6 bg-white/5 p-4 rounded-2xl text-center">No assets found yet. Upload some files!</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 2. El Sidebar de Preview & SEO (#141414 & #C2F86C) */}
            {selectedItem && (
                <aside className="w-96 shrink-0 bg-[#141414] border border-white/5 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-right duration-500 sticky top-8 h-[calc(100vh-4rem)] custom-scrollbar overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-headline text-2xl font-black tracking-tighter">Asset Details</h3>
                        <button onClick={() => setSelectedItem(null)} className="text-on-surface-variant hover:text-white">
                            <i className="fi fi-rr-cross-small text-xl leading-none"></i>
                        </button>
                    </div>

                    <div className="aspect-video bg-surface-container-low rounded-2xl overflow-hidden border border-white/5">
                        <img src={`http://localhost:3000/uploads/${selectedItem.filename}`} alt={selectedItem.alt_text || ''} className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-2 text-xs text-on-surface-variant">
                        <p><strong>Filename:</strong> {selectedItem.filename}</p>
                        <p><strong>Type:</strong> {selectedItem.mimetype}</p>
                    </div>

                    {/* Sección SEO */}
                    <div className="space-y-6 pt-6 border-t border-white/5">
                        <h4 className="block text-[10px] font-bold text-[#C2F86C] uppercase tracking-[0.2em]">SEO Optimization</h4>

                        <div>
                            <label className="block text-xs text-white mb-2">Alternative Text (Alt)</label>
                            <input
                                type="text"
                                value={seoData.alt_text}
                                onChange={(e) => setSeoData({ ...seoData, alt_text: e.target.value })}
                                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C2F86C]"
                                placeholder="Describe la imagen"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-white mb-2">SEO Title</label>
                            <input
                                type="text"
                                value={seoData.seo_title}
                                onChange={(e) => setSeoData({ ...seoData, seo_title: e.target.value })}
                                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C2F86C]"
                                placeholder="Título clave para Google..."
                            />
                        </div>

                        <button
                            onClick={saveSeo}
                            className="w-full bg-primary text-black font-black py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                        >
                            <i className="fi fi-rr-disk mt-1"></i> SAVE SEO DATA
                        </button>
                    </div>
                </aside>
            )}
        </div>
    );
};