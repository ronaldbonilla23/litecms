import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { apiErrorMessage } from '../lib/errors';
import { uploadUrl } from '../lib/urls';

export interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  alt_text?: string | null;
}

interface MediaPickerProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

/**
 * Campo de imagen: muestra la imagen elegida y abre un modal con la librería
 * de medios para elegir otra o subir una nueva.
 */
export default function MediaPicker({ value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    try {
      const { data } = await api.get('/media');
      setMedia(Array.isArray(data) ? data : []);
    } catch {
      toast.error('No se pudo cargar la librería de medios');
    }
  };

  // Se carga al montar para poder mostrar la miniatura del valor actual
  useEffect(() => {
    loadMedia();
  }, []);

  const selected = media.find((item) => item.id === value);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const { data } = await api.post('/media/upload', formData);
      await loadMedia();
      onChange(data.media.id);
      setOpen(false);
      toast.success('Imagen subida');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo subir la imagen'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-28 h-20 rounded-xl border border-dashed border-white/20 bg-[#141414] overflow-hidden flex items-center justify-center hover:border-primary transition-colors"
        >
          {selected ? (
            <img src={uploadUrl(selected.filename)} alt={selected.alt_text || ''} className="w-full h-full object-cover" />
          ) : (
            <i className="fi fi-rr-picture text-2xl text-white/30"></i>
          )}
        </button>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline text-left">
            {selected ? 'Cambiar imagen' : 'Elegir imagen'}
          </button>
          {value !== null && (
            <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-500 hover:text-red-400 text-left">
              Quitar
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden bg-[#141414] border border-white/10 rounded-[2rem] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
              <h3 className="text-white font-headline text-xl font-black tracking-tight">Librería de medios</h3>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                  <i className="fi fi-rr-cross-small text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4">
              {media.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">No hay imágenes todavía</p>}
              {media.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => { onChange(item.id); setOpen(false); }}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${item.id === value ? 'border-primary' : 'border-transparent hover:border-white/30'}`}
                  title={item.original_name}
                >
                  <img src={uploadUrl(item.filename)} alt={item.alt_text || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
