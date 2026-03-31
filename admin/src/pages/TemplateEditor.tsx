import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = '/templates';

interface Template {
  id?: string;
  name: string;
  type: string;
  content: string;
  is_active: boolean;
}

export default function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get(API_URL);
      setTemplates(response.data);
      if (response.data.length > 0 && !activeTemplate) {
        setActiveTemplate(response.data[0]);
      }
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
    }
  };

  const handleNewTemplate = () => {
    const newTemp: Template = { name: 'Nueva Plantilla', type: 'page', content: '\n<div class="container">\n  \n</div>', is_active: true };
    setActiveTemplate(newTemp);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeTemplate) setActiveTemplate({ ...activeTemplate, content: value || '' });
  };

  const handleSave = async () => {
    if (!activeTemplate) return;
    setIsSaving(true);
    try {
      if (activeTemplate.id) {
        // Actualizar plantilla existente
        await api.put(`${API_URL}/${activeTemplate.id}`, activeTemplate);
        toast.success('Plantilla actualizada 🚀');
      } else {
        // Crear nueva plantilla
        await api.post(API_URL, activeTemplate);
        toast.success('Plantilla creada 🚀');
      }
      fetchTemplates();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la plantilla.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTemplate?.id) return;
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      await api.delete(`${API_URL}/${activeTemplate.id}`);
      toast.success('Plantilla eliminada');
      setActiveTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la plantilla.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#141414] text-white font-mono">
      <div className="w-64 border-r border-gray-800 p-4 flex flex-col bg-[#1a1a1a]/50">
        <h2 className="text-[#C2F86C] tracking-widest uppercase text-xs font-bold mb-6">Mis Plantillas</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplate(tpl)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTemplate?.id === tpl.id
                ? 'bg-[#C2F86C]/10 text-[#C2F86C] border border-[#C2F86C]/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <div className="font-medium truncate">{tpl.name}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{tpl.type}</div>
            </button>
          ))}
        </div>
        <button onClick={handleNewTemplate} className="mt-4 border border-dashed border-gray-600 text-gray-400 py-2 rounded text-sm hover:border-[#C2F86C] hover:text-[#C2F86C] transition-colors">
          + Nueva Plantilla
        </button>
      </div>
      <div className="flex-1 flex flex-col">
        {activeTemplate ? (
          <>
            <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#1a1a1a]/30">
              <div className="flex items-center gap-4 flex-1">
                <input type="text" value={activeTemplate.name} onChange={(e) => setActiveTemplate({ ...activeTemplate, name: e.target.value })} className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b focus:border-[#C2F86C]" placeholder="Nombre de la Plantilla" />
                <select value={activeTemplate.type} onChange={(e) => setActiveTemplate({ ...activeTemplate, type: e.target.value })} className="bg-[#1c1c1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C2F86C]">
                  <option value="page">Page</option>
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                  <option value="section">Section</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">Tip: Usa {'{{ page.title }}'} para variables</span>
                {activeTemplate.id && (
                  <button onClick={handleDelete} className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors">
                    Delete
                  </button>
                )}
                <button onClick={handleSave} disabled={isSaving} className="bg-[#C2F86C] text-black px-6 py-2 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#d4ff8a] transition-all disabled:opacity-50">
                  {isSaving ? 'Guardando...' : activeTemplate.id ? 'Update Code 🚀' : 'Deploy Code 🚀'}
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Editor height="100%" language="html" theme="vs-dark" value={activeTemplate.content} onChange={handleEditorChange} options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'Roboto Mono', monospace", wordWrap: 'on', padding: { top: 20 } }} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">Selecciona o crea una plantilla para empezar.</div>
        )}
      </div>
    </div>
  );
}
