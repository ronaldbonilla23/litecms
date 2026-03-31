import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Lista de fuentes disponibles
const FONT_OPTIONS = [
    { value: 'Inter', label: 'Inter (Sans-serif)' },
    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: "'Roboto Mono', monospace", label: 'Roboto Mono (Monospace)' },
    { value: 'system-ui, sans-serif', label: 'System Default' },
];

// Pesos de fuente disponibles
const FONT_WEIGHTS = [
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Regular (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semi-bold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'Extra-bold (800)' },
];

// Alturas de línea
const LINE_HEIGHTS = [
    { value: '1.4', label: 'Compacta (1.4)' },
    { value: '1.5', label: 'Normal (1.5)' },
    { value: '1.6', label: 'Relajada (1.6)' },
    { value: '1.75', label: 'Amplia (1.75)' },
    { value: '1.8', label: 'Muy amplia (1.8)' },
];

export default function ThemeSettings() {
    const [settings, setSettings] = useState({
        // Colores Globales
        primary_color: '#C2F86C',
        secondary_color: '#3B82F6',
        accent_color: '#F59E0B',
        background_color: '#141414',

        // Tipografía - Headers
        header_font: 'Plus Jakarta Sans',
        header_font_weight: '700',

        // Tipografía - Body
        body_font: 'Inter',
        body_font_weight: '400',
        body_line_height: '1.6',

        // Botones - Primary
        button_primary_bg: '#C2F86C',
        button_primary_color: '#141414',
        button_primary_radius: '8',
        button_primary_border: '0',

        // Botones - Secondary
        button_secondary_bg: 'transparent',
        button_secondary_color: '#C2F86C',
        button_secondary_radius: '8',
        button_secondary_border: '1',

        // Logo y Favicon
        logo_url: '',
        favicon_url: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [mediaField, setMediaField] = useState<'logo' | 'favicon'>('logo');
    const [mediaList, setMediaList] = useState<any[]>([]);

    // Cargar configuraciones desde la API
    useEffect(() => {
        fetchSettings();
        fetchMedia();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/theme-settings');
            if (response.data && Object.keys(response.data).length > 0) {
                setSettings(prev => ({ ...prev, ...response.data }));
                applyCssVariables(response.data);
            }
        } catch (error) {
            console.error('Error al obtener el Design System:', error);
        }
    };

    const fetchMedia = async () => {
        try {
            const response = await axios.get('/api/media');
            setMediaList(response.data);
        } catch (error) {
            console.error('Error al cargar media:', error);
        }
    };

    // Aplicar variables CSS al :root
    const applyCssVariables = (newSettings: any) => {
        const root = document.documentElement;

        // Colores
        root.style.setProperty('--theme-primary', newSettings.primary_color);
        root.style.setProperty('--theme-secondary', newSettings.secondary_color);
        root.style.setProperty('--theme-accent', newSettings.accent_color);
        root.style.setProperty('--theme-bg', newSettings.background_color);

        // Tipografía
        root.style.setProperty('--theme-header-font', newSettings.header_font);
        root.style.setProperty('--theme-header-weight', newSettings.header_font_weight);
        root.style.setProperty('--theme-body-font', newSettings.body_font);
        root.style.setProperty('--theme-body-weight', newSettings.body_font_weight);
        root.style.setProperty('--theme-line-height', newSettings.body_line_height);

        // Botones
        root.style.setProperty('--btn-primary-bg', newSettings.button_primary_bg);
        root.style.setProperty('--btn-primary-color', newSettings.button_primary_color);
        root.style.setProperty('--btn-primary-radius', `${newSettings.button_primary_radius}px`);
        root.style.setProperty('--btn-primary-border', `${newSettings.button_primary_border}px`);

        root.style.setProperty('--btn-secondary-bg', newSettings.button_secondary_bg);
        root.style.setProperty('--btn-secondary-color', newSettings.button_secondary_color);
        root.style.setProperty('--btn-secondary-radius', `${newSettings.button_secondary_radius}px`);
        root.style.setProperty('--btn-secondary-border', `${newSettings.button_secondary_border}px`);
    };

    // Manejar cambios en inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const newSettings = { ...settings, [e.target.name]: e.target.value };
        setSettings(newSettings);
        applyCssVariables(newSettings);
    };

    // Abrir modal de selección de medios
    const openMediaModal = (field: 'logo' | 'favicon') => {
        setMediaField(field);
        setShowMediaModal(true);
    };

    // Seleccionar medio de la librería
    const selectMedia = (filename: string) => {
        const field = mediaField === 'logo' ? 'logo_url' : 'favicon_url';
        setSettings({ ...settings, [field]: filename });
        setShowMediaModal(false);
    };

    // Guardar en el backend
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.put('/api/theme-settings', settings);
            toast.success('Design System Deployado 🚀');
        } catch (error) {
            console.error('Error al guardar el Design System:', error);
            toast.error('Hubo un error al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white p-8" style={{ fontFamily: settings.body_font }}>
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-10 border-b border-[#C2F86C]/20 pb-6">
                    <h1 className="text-3xl mb-2 text-[#C2F86C] tracking-widest uppercase font-bold"
                        style={{ fontFamily: settings.header_font, fontWeight: settings.header_font_weight }}>
                        Design System Global
                    </h1>
                    <p className="text-gray-400 text-sm">Configura la identidad visual completa de tu LiteCMS</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* SECCIÓN 1: Colores Globales */}
                    <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-[#C2F86C] mb-6 flex items-center gap-2">
                            <i className="fi fi-rr-palette text-xl"></i>
                            Colores Globales
                        </h2>

                        <div className="space-y-5">
                            {/* Primary Color */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" name="primary_color" value={settings.primary_color} onChange={handleChange}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                                    <input type="text" name="primary_color" value={settings.primary_color} onChange={handleChange}
                                        className="flex-1 bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-mono focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>

                            {/* Secondary Color */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Secondary Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" name="secondary_color" value={settings.secondary_color} onChange={handleChange}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                                    <input type="text" name="secondary_color" value={settings.secondary_color} onChange={handleChange}
                                        className="flex-1 bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-mono focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>

                            {/* Accent Color */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Accent Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" name="accent_color" value={settings.accent_color} onChange={handleChange}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                                    <input type="text" name="accent_color" value={settings.accent_color} onChange={handleChange}
                                        className="flex-1 bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-mono focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>

                            {/* Background Color */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Background Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" name="background_color" value={settings.background_color} onChange={handleChange}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                                    <input type="text" name="background_color" value={settings.background_color} onChange={handleChange}
                                        className="flex-1 bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-mono focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: Tipografía */}
                    <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-[#C2F86C] mb-6 flex items-center gap-2">
                            <i className="fi fi-rr-text text-xl"></i>
                            Tipografía
                        </h2>

                        {/* Headers */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#C2F86C] rounded-full"></span>
                                Headers
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Fuente</label>
                                    <select name="header_font" value={settings.header_font} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2.5 rounded-lg text-sm focus:border-[#C2F86C] outline-none">
                                        {FONT_OPTIONS.map(font => (
                                            <option key={font.value} value={font.value}>{font.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Font Weight</label>
                                    <select name="header_font_weight" value={settings.header_font_weight} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2.5 rounded-lg text-sm focus:border-[#C2F86C] outline-none">
                                        {FONT_WEIGHTS.map(weight => (
                                            <option key={weight.value} value={weight.value}>{weight.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div>
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#3B82F6] rounded-full"></span>
                                Body Text
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Fuente</label>
                                    <select name="body_font" value={settings.body_font} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2.5 rounded-lg text-sm focus:border-[#C2F86C] outline-none">
                                        {FONT_OPTIONS.map(font => (
                                            <option key={font.value} value={font.value}>{font.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Font Weight</label>
                                        <select name="body_font_weight" value={settings.body_font_weight} onChange={handleChange}
                                            className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2.5 rounded-lg text-sm focus:border-[#C2F86C] outline-none">
                                            {FONT_WEIGHTS.map(weight => (
                                                <option key={weight.value} value={weight.value}>{weight.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Line Height</label>
                                        <select name="body_line_height" value={settings.body_line_height} onChange={handleChange}
                                            className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2.5 rounded-lg text-sm focus:border-[#C2F86C] outline-none">
                                            {LINE_HEIGHTS.map(lh => (
                                                <option key={lh.value} value={lh.value}>{lh.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: Botones */}
                    <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-[#C2F86C] mb-6 flex items-center gap-2">
                            <i className="fi fi-rr-square text-xl"></i>
                            Botones
                        </h2>

                        {/* Primary Button */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#C2F86C] rounded-full"></span>
                                Primary Button
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Background</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" name="button_primary_bg" value={settings.button_primary_bg} onChange={handleChange}
                                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                                        <input type="text" name="button_primary_bg" value={settings.button_primary_bg} onChange={handleChange}
                                            className="flex-1 bg-[#141414] border border-white/10 text-white px-2 py-1.5 rounded text-xs font-mono focus:border-[#C2F86C] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" name="button_primary_color" value={settings.button_primary_color} onChange={handleChange}
                                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                                        <input type="text" name="button_primary_color" value={settings.button_primary_color} onChange={handleChange}
                                            className="flex-1 bg-[#141414] border border-white/10 text-white px-2 py-1.5 rounded text-xs font-mono focus:border-[#C2F86C] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Border Radius (px)</label>
                                    <input type="number" name="button_primary_radius" value={settings.button_primary_radius} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-[#C2F86C] outline-none" />
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Border Width (px)</label>
                                    <input type="number" name="button_primary_border" value={settings.button_primary_border} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-4 p-3 bg-[#141414] rounded-lg">
                                <button style={{
                                    backgroundColor: settings.button_primary_bg,
                                    color: settings.button_primary_color,
                                    borderRadius: `${settings.button_primary_radius}px`,
                                    border: `${settings.button_primary_border}px solid ${settings.button_primary_bg}`,
                                }} className="px-4 py-2 text-sm font-bold">
                                    Button Preview
                                </button>
                            </div>
                        </div>

                        {/* Secondary Button */}
                        <div>
                            <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#3B82F6] rounded-full"></span>
                                Secondary Button
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Background</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" name="button_secondary_bg" value={settings.button_secondary_bg === 'transparent' ? '#ffffff' : settings.button_secondary_bg} onChange={(e) => handleChange({ ...e, target: { ...e.target, name: 'button_secondary_bg', value: e.target.value } })}
                                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                                        <input type="text" name="button_secondary_bg" value={settings.button_secondary_bg} onChange={handleChange}
                                            className="flex-1 bg-[#141414] border border-white/10 text-white px-2 py-1.5 rounded text-xs font-mono focus:border-[#C2F86C] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" name="button_secondary_color" value={settings.button_secondary_color} onChange={handleChange}
                                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                                        <input type="text" name="button_secondary_color" value={settings.button_secondary_color} onChange={handleChange}
                                            className="flex-1 bg-[#141414] border border-white/10 text-white px-2 py-1.5 rounded text-xs font-mono focus:border-[#C2F86C] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Border Radius (px)</label>
                                    <input type="number" name="button_secondary_radius" value={settings.button_secondary_radius} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-[#C2F86C] outline-none" />
                                </div>

                                <div>
                                    <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-2 block">Border Width (px)</label>
                                    <input type="number" name="button_secondary_border" value={settings.button_secondary_border} onChange={handleChange}
                                        className="w-full bg-[#141414] border border-white/10 text-white px-3 py-2 rounded-lg text-sm focus:border-[#C2F86C] outline-none" />
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-4 p-3 bg-[#141414] rounded-lg">
                                <button style={{
                                    backgroundColor: settings.button_secondary_bg,
                                    color: settings.button_secondary_color,
                                    borderRadius: `${settings.button_secondary_radius}px`,
                                    border: `${settings.button_secondary_border}px solid ${settings.button_secondary_color}`,
                                }} className="px-4 py-2 text-sm font-bold">
                                    Button Preview
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 4: Logo y Favicon */}
                    <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-[#C2F86C] mb-6 flex items-center gap-2">
                            <i className="fi fi-rr-image text-xl"></i>
                            Logo & Favicon
                        </h2>

                        <div className="space-y-6">
                            {/* Logo */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-3 block">Logo del Sitio</label>
                                <div className="flex items-start gap-4">
                                    <div className="w-32 h-32 bg-[#141414] border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                                        {settings.logo_url ? (
                                            <img src={`http://localhost:3000/uploads/${settings.logo_url}`} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-gray-600 text-xs text-center">Sin logo</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <button onClick={() => openMediaModal('logo')}
                                            className="w-full bg-[#1a1a1a] border border-dashed border-white/20 text-gray-400 px-4 py-3 rounded-lg text-sm hover:border-[#C2F86C] hover:text-[#C2F86C] transition-all mb-2">
                                            <i className="fi fi-rr-upload mr-2"></i>
                                            {settings.logo_url ? 'Cambiar Logo' : 'Seleccionar Logo'}
                                        </button>
                                        {settings.logo_url && (
                                            <button onClick={() => setSettings({ ...settings, logo_url: '' })}
                                                className="w-full bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-xs hover:bg-red-500/20 transition-all">
                                                <i className="fi fi-rr-trash mr-2"></i>
                                                Eliminar Logo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Favicon */}
                            <div>
                                <label className="text-[10px] tracking-widest uppercase text-gray-400 mb-3 block">Favicon</label>
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-[#141414] border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                                        {settings.favicon_url ? (
                                            <img src={`http://localhost:3000/uploads/${settings.favicon_url}`} alt="Favicon" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-600 text-[10px] text-center">Sin favicon</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <button onClick={() => openMediaModal('favicon')}
                                            className="w-full bg-[#1a1a1a] border border-dashed border-white/20 text-gray-400 px-4 py-3 rounded-lg text-sm hover:border-[#C2F86C] hover:text-[#C2F86C] transition-all mb-2">
                                            <i className="fi fi-rr-upload mr-2"></i>
                                            {settings.favicon_url ? 'Cambiar Favicon' : 'Seleccionar Favicon'}
                                        </button>
                                        {settings.favicon_url && (
                                            <button onClick={() => setSettings({ ...settings, favicon_url: '' })}
                                                className="w-full bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-xs hover:bg-red-500/20 transition-all">
                                                <i className="fi fi-rr-trash mr-2"></i>
                                                Eliminar Favicon
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-10 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving}
                        className="bg-[#C2F86C] text-[#141414] px-8 py-4 rounded-xl uppercase tracking-widest font-bold hover:shadow-[0_0_20px_rgba(194,248,108,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
                        <i className={`fi ${isSaving ? 'fi-rr-spinner animate-spin' : 'fi-rr-check'}`}></i>
                        {isSaving ? 'Guardando...' : 'Deploy System 🚀'}
                    </button>
                </div>
            </div>

            {/* Media Selector Modal */}
            {showMediaModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowMediaModal(false)}></div>
                    <div className="relative w-full max-w-4xl bg-[#0e0e0e] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
                            <h3 className="text-white font-bold text-xl uppercase tracking-wider">
                                {mediaField === 'logo' ? 'Seleccionar Logo' : 'Seleccionar Favicon'}
                            </h3>
                            <button onClick={() => setShowMediaModal(false)} className="text-gray-400 hover:text-white">
                                <i className="fi fi-rr-cross text-xl"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {mediaList.map((item: any) => (
                                <div key={item.id} onClick={() => selectMedia(item.filename)}
                                    className="group relative aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/5 hover:border-[#C2F86C] transition-all cursor-pointer">
                                    <img src={`http://localhost:3000/uploads/${item.filename}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#C2F86C]/10 backdrop-blur-[2px] transition-opacity">
                                        <span className="bg-[#C2F86C] text-black font-bold text-xs px-3 py-1.5 rounded-full">SELECT</span>
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
    );
}
