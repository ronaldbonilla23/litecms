import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';

interface MediaItem {
    id: number;
    filename: string;
    url: string;
    mimetype: string;
}

export const MediaLibrary = () => {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = async () => {
        try {
            const res = await api.get('/media');
            setMedia(res.data);
        } catch (err) {
            console.error("Error cargando galería", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMedia(); }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        try {
            await api.post('/media/upload', formData);
            fetchMedia(); // Recargar
        } catch (err) { alert("Error al subir archivo"); }
    };

    const deleteItem = async (id: number) => {
        if (!window.confirm("¿Borrar esta imagen?")) return;
        await api.delete(`/media/${id}`);
        fetchMedia();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-white font-headline text-4xl font-black tracking-tighter">Media Library</h2>
                    <p className="text-on-surface-variant text-sm mt-1">Manage your visual assets and designs</p>
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

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-surface-container-low rounded-[2rem] animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {media.map((item) => (
                        <div key={item.id} className="group relative aspect-square bg-surface-container-low border border-white/5 rounded-[2rem] overflow-hidden hover:border-primary/50 transition-all">
                            <img
                                src={`http://localhost:3000/uploads/${item.filename}`}
                                alt={item.filename}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3 backdrop-blur-sm">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`http://localhost:3000/uploads/${item.filename}`);
                                        alert("URL copiada!");
                                    }}
                                    className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl hover:bg-primary hover:text-black transition-colors"
                                >
                                    <i className="fi fi-rr-copy text-[20px] m-auto leading-none mt-3.5"></i>
                                </button>
                                <button
                                    onClick={() => deleteItem(item.id)}
                                    className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl hover:bg-red-500 text-white transition-colors"
                                >
                                    <i className="fi fi-rr-trash text-[20px] m-auto leading-none mt-3.5"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};