import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'layout';
  is_active: boolean;
  updated_at: string;
}

const TemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      await api.put(`/templates/${id}`, { is_active: !currentState });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !currentState } : t))
      );
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      try {
        await api.delete(`/templates/${id}`);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        console.error('Error al eliminar plantilla:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white p-8 font-sans antialiased">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Templates</h1>
          <p className="text-gray-400 mt-1">Manage headers, footers and site-wide layouts.</p>
        </div>
        
        <button 
          onClick={() => navigate('/templates/create')}
          className="bg-[#C2F86C] text-black font-semibold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(194,248,108,0.4)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
        >
          <i className="fi fi-rr-plus flex"></i>
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C2F86C]"></div>
        </div>
      ) : (
        <div className="bg-[#1C1C1C] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-[#242424] text-gray-400 text-xs uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Template Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-semibold text-gray-200 group-hover:text-white transition-colors uppercase text-sm tracking-wide">
                      {template.name}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${template.type === 'header' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        template.type === 'footer' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                    `}>
                      {template.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <button
                      onClick={() => toggleActive(template.id, template.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none
                        ${template.is_active ? 'bg-[#C2F86C] shadow-[0_0_10px_rgba(194,248,108,0.5)]' : 'bg-gray-700'}
                      `}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                          ${template.is_active ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500">
                    {formatDate(template.updated_at)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => navigate(`/templates/edit/${template.id}`)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      >
                        <i className="fi fi-rr-edit flex"></i>
                      </button>
                      <button 
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <i className="fi fi-rr-trash flex"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {templates.length === 0 && (
            <div className="py-20 text-center text-gray-500">
              <p>No templates found. Create your first one to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplatesManager;
