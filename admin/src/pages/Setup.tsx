import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { apiErrorBody, apiErrorMessage } from '../lib/errors';

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string[]>>;

/**
 * Asistente de instalación: aparece solo cuando todavía no existe ningún administrador.
 * Crea el primer admin e inicia sesión automáticamente.
 */
export const Setup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [submitting, setSubmitting] = useState(false);

    // Si el CMS ya está instalado, esta pantalla no tiene sentido
    useEffect(() => {
        api.get('/install/status')
            .then(({ data }) => {
                if (data.installed) navigate('/login', { replace: true });
            })
            .catch(() => setError('No se pudo conectar con el servidor de LiteCMS.'));
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        if (password !== confirmPassword) {
            setFieldErrors({ password: ['Las contraseñas no coinciden'] });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/install', { name, email, password });
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setFieldErrors((apiErrorBody(err).details as FieldErrors | undefined) || {});
            setError(apiErrorMessage(err, 'No se pudo completar la instalación.'));
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = 'w-full bg-[#1c1c1c] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#C2F86C] transition-all placeholder:text-white/20';
    const labelClass = 'block text-[10px] font-bold text-[#C2F86C] uppercase tracking-[0.2em] mb-2';

    const renderFieldError = (field: keyof FieldErrors) =>
        fieldErrors[field]?.[0] && <p className="text-red-500 text-xs mt-2">{fieldErrors[field]?.[0]}</p>;

    return (
        <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[#141414] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10">
                    <div className="inline-block text-[14px] font-black text-[#C2F86C] tracking-tighter leading-none mb-4">
                        LITE<br />CMS
                    </div>
                    <h1 className="text-white font-headline text-3xl font-black tracking-tighter">Instalar LiteCMS</h1>
                    <p className="text-[#adaaaa] text-sm mt-2">Crea la cuenta de administrador para empezar</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={labelClass}>Nombre</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Tu nombre" required />
                        {renderFieldError('name')}
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="admin@tusitio.com" required />
                        {renderFieldError('email')}
                    </div>
                    <div>
                        <label className={labelClass}>Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 8 caracteres" minLength={8} required />
                        {renderFieldError('password')}
                    </div>
                    <div>
                        <label className={labelClass}>Confirmar contraseña</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#C2F86C] text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#C2F86C]/10 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {submitting ? 'INSTALANDO...' : 'INSTALAR'}
                    </button>
                </form>
            </div>
        </div>
    );
};
