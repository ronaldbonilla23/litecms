import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api/axios';

const CORE_URL = '';

export default function PageEditor() {
    const { id } = useParams(); // Obtener ID de la URL
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<any[]>([]);
    const [pageData, setPageData] = useState({
        title: 'Nueva Página',
        slug: '/',
        header_id: '',
        footer_id: '',
        content: '<main class="max-w-6xl mx-auto p-8">\n  <h2 class="text-4xl text-primary font-bold">Contenido de la página</h2>\n  <p class="text-white mt-4">Usa clases de Tailwind aquí.</p>\n</main>'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!id);

    // Cargar página si estamos editando
    useEffect(() => {
        if (id) {
            const fetchPage = async () => {
                try {
                    const { data } = await api.get(`/pages/${id}`);
                    setPageData({
                        title: data.title || 'Nueva Página',
                        slug: data.slug || '/',
                        header_id: data.header_id || '',
                        footer_id: data.footer_id || '',
                        content: data.content || pageData.content
                    });
                } catch (error) {
                    console.error('Error al cargar página:', error);
                    alert('Error al cargar la página');
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
            if (id) {
                // Actualizar página existente
                await api.put(`${CORE_URL}/pages/${id}`, pageData);
                alert('Página actualizada 🚀');
            } else {
                // Crear nueva página
                await api.post(`${CORE_URL}/pages`, pageData);
                alert('Página creada con éxito 🚀');
            }
            navigate('/dashboard/pages');
        } catch (error: any) {
            console.error('[PageEditor] Error:', error);
            alert(`Error al guardar: ${error.response?.data?.error || error.message}`);
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
                    <label className="text-[10px] text-gray-500 uppercase mb-2">Ruta (Slug)</label>
                    <input
                        type="text"
                        value={pageData.slug}
                        onChange={(e) => setPageData({ ...pageData, slug: e.target.value })}
                        placeholder="ej: / o /nosotros"
                        className="bg-[#141414] border border-gray-800 text-[#C2F86C] px-3 py-2 rounded text-sm focus:border-[#C2F86C] outline-none"
                    />
                    <span className="text-[10px] text-gray-600 mt-1">Usa "/" para definir esta página como el Home (Index).</span>
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
