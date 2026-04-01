import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CORE_URL = '';

export default function PageEditor() {
    const { id } = useParams(); // Obtener ID de la URL
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<any[]>([]);
    const [pageData, setPageData] = useState({
        title: 'Nueva Página',
        slug: '',
        header_id: '',
        footer_id: '',
        status: 'draft',
        content: '<main class="max-w-6xl mx-auto p-8">\n  <h2 class="text-4xl text-primary font-bold">Contenido de la página</h2>\n  <p class="text-white mt-4">Usa clases de Tailwind aquí.</p>\n</main>'
    });
    const [isIndex, setIsIndex] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!id);

    // Cargar página si estamos editando
    useEffect(() => {
        if (id) {
            const fetchPage = async () => {
                try {
                    const { data } = await api.get(`/pages/${id}`);
                    const loadedSlug = data.slug || '';
                    setPageData({
                        title: data.title || 'Nueva Página',
                        slug: loadedSlug === '/' ? '/' : loadedSlug,
                        header_id: data.header_id || '',
                        footer_id: data.footer_id || '',
                        status: data.status || 'draft',
                        content: data.content || pageData.content
                    });
                    setIsIndex(loadedSlug === '/');
                } catch (error) {
                    console.error('Error al cargar página:', error);
                    toast.error('Error al cargar la página');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPage();
        }
    }, [id]);

    useEffect(() => {
        // Cargar plantillas disponibles para los selects de Header y Footer
        const fetchTemplates = async () => {
            try {
                const { data } = await api.get(`${CORE_URL}/templates`);
                setTemplates(data);
            } catch (error) {
                console.error('Error al cargar plantillas:', error);
            }
        };
        fetchTemplates();
    }, []);

    const handleEditorChange = (value: string | undefined) => {
        setPageData({ ...pageData, content: value || '' });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Normalizar slug
            let normalizedSlug = pageData.slug.trim();
            if (isIndex) {
                normalizedSlug = '/';
            } else if (!normalizedSlug) {
                // Si está vacío, derivarlo del título
                normalizedSlug = '/' + pageData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            } else if (!normalizedSlug.startsWith('/')) {
                normalizedSlug = '/' + normalizedSlug;
            }

            const pageDataToSave = {
                ...pageData,
                slug: normalizedSlug,
                header_id: pageData.header_id || null,
                footer_id: pageData.footer_id || null
            };

            if (id) {
                // Actualizar página existente
                await api.put(`${CORE_URL}/pages/${id}`, pageDataToSave);
                toast.success('Página actualizada 🚀');
            } else {
                // Crear nueva página
                await api.post(`${CORE_URL}/pages`, pageDataToSave);
                toast.success('Página creada con éxito 🚀');
            }
            navigate('/dashboard/pages');
        } catch (error: any) {
            console.error('[PageEditor] Error:', error);
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-[#141414] text-white font-mono">

            {/* SIDEBAR: Ajustes de la Página */}
            <div className="w-80 border-r border-gray-800 p-6 flex flex-col bg-[#1a1a1a]/50 space-y-6 overflow-y-auto">
                <h2 className="text-[#C2F86C] tracking-widest uppercase text-xs font-bold mb-2">Ajustes de Página</h2>

                <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase mb-2">Título Interno</label>
                    <input
                        type="text"
                        value={pageData.title}
                        onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                        className="bg-[#141414] border border-gray-800 text-white px-3 py-2 rounded text-sm focus:border-[#C2F86C] outline-none"
                    />
                </div>

                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-gray-500 uppercase">Ruta (Slug)</label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={isIndex}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setIsIndex(checked);
                                        if (checked) {
                                            setPageData({ ...pageData, slug: '/' });
                                        } else {
                                            setPageData({ ...pageData, slug: '' });
                                        }
                                    }}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${isIndex
                                        ? 'bg-primary border-primary'
                                        : 'bg-[#141414] border-gray-600 group-hover:border-primary'
                                    }`}>
                                    {isIndex && (
                                        <i className="fi fi-rr-check text-black text-xs font-bold" style={{ paddingTop: '4px' }}></i>
                                    )}
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isIndex ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                                }`}>Página de Inicio</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        value={pageData.slug}
                        disabled={isIndex}
                        onChange={(e) => {
                            // Formatear a URL slug: espacios a guiones primero, luego limpiar inválidos
                            let formattedVal = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\/-]/g, '');
                            setPageData({ ...pageData, slug: formattedVal });
                        }}
                        placeholder={isIndex ? '/' : `ej: /${pageData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'nuestra-empresa'}`}
                        className={`bg-[#141414] border border-gray-800 text-[#C2F86C] px-3 py-2 rounded text-sm focus:border-[#C2F86C] outline-none ${isIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <span className="text-[10px] text-gray-600 mt-1">Si la dejas vacía, se generará usando tu Título Interno.</span>
                </div>

                <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase mb-3">Estado</label>
                    <button
                        onClick={() => setPageData({ ...pageData, status: pageData.status === 'draft' ? 'published' : 'draft' })}
                        className={`relative w-full h-14 rounded-xl border transition-all duration-300 ${pageData.status === 'published'
                            ? 'bg-[#C2F86C]/10 border-[#C2F86C]'
                            : 'bg-[#1a1a1a] border-gray-700'
                            }`}
                    >
                        <div className="absolute inset-0 flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                <i className={`fi fi-rr-check-circle text-2xl ${pageData.status === 'published' ? 'opacity-100 text-[#C2F86C]' : 'opacity-30 text-gray-500'}`}></i>
                                <span className={`text-xs font-bold uppercase tracking-widest ${pageData.status === 'published' ? 'text-[#C2F86C]' : 'text-gray-500'
                                    }`}>
                                    Published
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold uppercase tracking-widest ${pageData.status === 'draft' ? 'text-white' : 'text-gray-500'
                                    }`}>
                                    Draft
                                </span>
                                <i className={`fi fi-rr-pencil text-2xl ${pageData.status === 'draft' ? 'opacity-100 text-white' : 'opacity-30 text-gray-500'}`}></i>
                            </div>
                        </div>
                        <div className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center ${pageData.status === 'published'
                            ? 'right-1 bg-[#C2F86C]'
                            : 'left-1 bg-gray-600'
                            }`}>
                            {pageData.status === 'published' ? (
                                <i className="fi fi-rr-check text-black text-sm"></i>
                            ) : (
                                <i className="fi fi-rr-pencil text-black text-sm"></i>
                            )}
                        </div>
                    </button>
                    <span className="text-[10px] text-gray-600 mt-2">
                        {pageData.status === 'published'
                            ? '🌐 Página visible en el frontend público'
                            : '🔒 Página solo visible para administradores'}
                    </span>
                </div>

                <div className="h-px bg-gray-800 my-4"></div>

                <div className="flex flex-col">
                    <label className="text-[10px] text-[#C2F86C] uppercase mb-2">Header por Defecto</label>
                    <select
                        value={pageData.header_id}
                        onChange={(e) => setPageData({ ...pageData, header_id: e.target.value })}
                        className="bg-[#141414] border border-gray-800 text-white px-3 py-2 rounded text-sm focus:border-[#C2F86C] outline-none"
                    >
                        <option value="">Ninguno (Página en blanco)</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-[10px] text-[#C2F86C] uppercase mb-2">Footer por Defecto</label>
                    <select
                        value={pageData.footer_id}
                        onChange={(e) => setPageData({ ...pageData, footer_id: e.target.value })}
                        className="bg-[#141414] border border-gray-800 text-white px-3 py-2 rounded text-sm focus:border-[#C2F86C] outline-none"
                    >
                        <option value="">Ninguno (Página en blanco)</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="mt-auto bg-[#C2F86C] text-black px-4 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#d4ff8a] transition-all disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : isLoading ? 'Cargando...' : id ? 'Actualizar Página 🚀' : 'Publicar Página 🚀'}
                </button>
            </div>

            {/* ÁREA PRINCIPAL: Editor Monaco */}
            <div className="flex-1 flex flex-col relative">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <i className="fi fi-rr-spinner animate-spin text-4xl mb-3"></i>
                            <p>Cargando página...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="h-12 border-b border-gray-800 flex items-center px-6 bg-[#1a1a1a]/30">
                            <span className="text-xs text-gray-500 tracking-widest uppercase">Content Editor (HTML + Tailwind)</span>
                        </div>
                        <Editor
                            height="100%"
                            language="html"
                            theme="vs-dark"
                            value={pageData.content}
                            onChange={handleEditorChange}
                            options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'Roboto Mono', monospace", wordWrap: 'on', padding: { top: 20 } }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
