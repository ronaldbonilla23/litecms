import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import BlotFormatter from 'quill-blot-formatter';
import 'react-quill-new/dist/quill.snow.css';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

if (typeof window !== 'undefined' && Quill) {
  // Manejo de compatibilidad para Vite/ESM
  const Formatter = (BlotFormatter as any).default || BlotFormatter;
  Quill.register('modules/blotFormatter', Formatter);
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const reactQuillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    try {
      const res = await api.get('/media');
      const mediaData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setMediaList(mediaData);
    } catch (error) {
      console.error('Error fetching media:', error);
      setMediaList([]);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await api.post('/media/upload', formData);
      toast.success('Imagen subida 🎉');
      fetchMedia();
    } catch (err) {
      console.error(err);
      toast.error('Error al subir imagen');
    }
  };

  useEffect(() => {
    if (showMediaModal) {
      fetchMedia();
    }
  }, [showMediaModal]);

  const imageHandler = () => {
    setShowMediaModal(true);
  };

  const selectMedia = (filename: string) => {
    const imageUrl = `http://localhost:3000/uploads/${filename}`;
    const editor = reactQuillRef.current?.getEditor();
    
    if (editor) {
      const range = editor.getSelection();
      editor.insertEmbed(range?.index || 0, 'image', imageUrl);
      setShowMediaModal(false);
    }
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ direction: 'rtl' }, { align: [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    blotFormatter: {}
  }), []);

  return (
    <>
      <style>{`
        .quill-dark .ql-toolbar {
          background-color: #1a1a1a;
          border: none !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          padding: 12px !important;
        }
        .quill-dark .ql-container {
          border: none !important;
          background-color: #141414;
          color: white;
          font-family: inherit;
          font-size: 15px;
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
        }
        .quill-dark .ql-editor {
          min-height: 300px;
          padding: 1rem 1.5rem;
        }
        .quill-dark .ql-stroke {
          stroke: #9ca3af !important;
        }
        .quill-dark .ql-fill {
          fill: #9ca3af !important;
        }
        .quill-dark .ql-picker-label {
          color: #9ca3af !important;
        }
        .quill-dark .ql-picker-options {
          background-color: #1a1a1a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }
        .quill-dark .ql-picker-item:hover,
        .quill-dark button:hover .ql-stroke {
          stroke: #C2F86C !important;
          color: #C2F86C !important;
        }
        .quill-dark button:hover .ql-fill {
          fill: #C2F86C !important;
        }
        .quill-dark .ql-active .ql-stroke {
          stroke: #C2F86C !important;
        }
        .quill-dark .ql-active .ql-fill {
          fill: #C2F86C !important;
        }
      `}</style>
      
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden quill-dark">
        <ReactQuill 
          ref={reactQuillRef}
          theme="snow" 
          value={content} 
          onChange={onChange} 
          modules={modules}
          className="text-white"
        />

        {/* Media Selector Modal */}
        {showMediaModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowMediaModal(false)}></div>
              <div className="relative w-full max-w-4xl bg-[#0e0e0e] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
                      <h3 className="text-white font-bold text-xl uppercase tracking-wider">
                          Insertar Imagen
                      </h3>
                      <div className="flex items-center gap-4">
                          <button onClick={() => fileInputRef.current?.click()} className="bg-[#C2F86C] text-black px-4 py-2 font-bold text-xs uppercase cursor-pointer rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
                              <i className="fi fi-rr-cloud-upload"></i> Subir
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                          <button onClick={() => setShowMediaModal(false)} className="text-gray-400 hover:text-white" title="Cerrar">
                              <i className="fi fi-rr-cross text-xl"></i>
                          </button>
                      </div>
                  </div>
                  <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4">
                      {mediaList.map((item: any) => (
                          <div key={item.id} onClick={() => selectMedia(item.filename)}
                              className="group relative aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/5 hover:border-[#C2F86C] transition-all cursor-pointer">
                              <img src={`http://localhost:3000/uploads/${item.filename}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#C2F86C]/10 backdrop-blur-[2px] transition-opacity">
                                  <span className="bg-[#C2F86C] text-black font-bold text-xs px-3 py-1.5 rounded-full">INSERTAR</span>
                              </div>
                          </div>
                      ))}
                      {mediaList.length === 0 && (
                          <div className="col-span-full text-center py-12 text-gray-500">
                              <i className="fi fi-rr-picture text-4xl mb-3"></i>
                              <p>No hay medios en la librería</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        )}
      </div>
    </>
  );
}
