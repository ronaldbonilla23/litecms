import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ThemeSettings() {
    const [settings, setSettings] = useState({
        primary_color: '#C2F86C',
        bg_color: '#141414',
        font_family: 'Inter, sans-serif'
    });
    const [isSaving, setIsSaving] = useState(false);

    // 1. Cargar los datos desde tu API (SQLite) al montar el componente
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/theme-settings');
                // Si la base de datos devuelve configuraciones guardadas, las usamos
                if (response.data && Object.keys(response.data).length > 0) {
                    // Fusionamos los datos por si falta alguna llave en la DB
                    const loadedSettings = { ...settings, ...response.data };
                    setSettings(loadedSettings);
                    applyCssVariables(loadedSettings);
                } else {
                    // Si está vacía, aplicamos los defaults
                    applyCssVariables(settings);
                }
            } catch (error) {
                console.error('Error al obtener el Design System:', error);
            }
        };
        fetchSettings();
    }, []);

    // 2. La magia: Inyectar las variables CSS nativas al :root del navegador
    const applyCssVariables = (newSettings: any) => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', newSettings.primary_color);
        root.style.setProperty('--theme-bg', newSettings.bg_color);
        root.style.setProperty('--theme-font', newSettings.font_family);
    };

    // 3. Manejar cambios en los inputs (Preview en vivo)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const newSettings = { ...settings, [e.target.name]: e.target.value };
        setSettings(newSettings);
        applyCssVariables(newSettings);
    };

    // 4. Enviar al Backend (Guardar en SQLite)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.put('/api/theme-settings', settings);
            alert('Design System Deployado con éxito 🚀');
        } catch (error) {
            console.error('Error al guardar el Design System:', error);
            alert('Hubo un error al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white p-10" style={{ fontFamily: 'var(--theme-font)' }}>
            <div className="max-w-2xl mx-auto border border-[#C2F86C]/20 p-8 rounded-lg shadow-[0_0_15px_rgba(194,248,108,0.1)]">

                <h1 className="text-2xl mb-8 text-[#C2F86C] tracking-widest uppercase font-bold">
                    Design System Global
                </h1>

                <div className="space-y-8">
                    {/* Accent Color Picker */}
                    <div className="flex flex-col">
                        <label className="text-xs tracking-widest uppercase text-gray-400 mb-3">Color de Acento (Primary)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                name="primary_color"
                                value={settings.primary_color}
                                onChange={handleChange}
                                className="w-14 h-14 bg-transparent border-none cursor-pointer p-0"
                            />
                            <input
                                type="text"
                                name="primary_color"
                                value={settings.primary_color}
                                onChange={handleChange}
                                className="bg-transparent border border-[#C2F86C]/30 text-[#C2F86C] px-4 py-2 rounded focus:outline-none focus:border-[#C2F86C] font-mono"
                            />
                        </div>
                    </div>

                    {/* Background Color Picker */}
                    <div className="flex flex-col">
                        <label className="text-xs tracking-widest uppercase text-gray-400 mb-3">Color de Fondo Base</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                name="bg_color"
                                value={settings.bg_color}
                                onChange={handleChange}
                                className="w-14 h-14 bg-transparent border-none cursor-pointer p-0"
                            />
                            <input
                                type="text"
                                name="bg_color"
                                value={settings.bg_color}
                                onChange={handleChange}
                                className="bg-transparent border border-gray-700 text-gray-300 px-4 py-2 rounded focus:outline-none focus:border-gray-500 font-mono"
                            />
                        </div>
                    </div>

                    {/* Typography Selector */}
                    <div className="flex flex-col">
                        <label className="text-xs tracking-widest uppercase text-gray-400 mb-3">Tipografía Principal</label>
                        <select
                            name="font_family"
                            value={settings.font_family}
                            onChange={handleChange}
                            className="bg-[#1a1a1a] border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-[#C2F86C] w-full"
                        >
                            <option value="Inter, sans-serif">Inter (Sans-serif)</option>
                            <option value="'Roboto Mono', monospace">Roboto Mono (Monospace)</option>
                            <option value="system-ui, sans-serif">System Default</option>
                        </select>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-12 w-full bg-[#C2F86C] text-[#141414] px-6 py-4 rounded uppercase tracking-widest font-bold hover:shadow-[0_0_20px_rgba(194,248,108,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Guardando en BD...' : 'Deploy System 🚀'}
                </button>

            </div>
        </div>
    );
}