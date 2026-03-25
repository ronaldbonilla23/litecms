import React, { useState } from 'react';
import api from '../api/axios';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setNotification(null);
        
        if (!email || !password) {
            setError('Por favor, ingresa tu email y contraseña.');
            return;
        }

        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            setNotification('Identificación exitosa. Redirigiendo...');
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error: Credenciales incorrectas. Verifica tus datos e inténtalo de nuevo.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[#141414] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
                <div className="text-center mb-10">
                    <div className="inline-block text-[14px] font-black text-[#C2F86C] tracking-tighter leading-none mb-4">
                        LITE<br />CMS
                    </div>
                    <h1 className="text-white font-headline text-3xl font-black tracking-tighter">Welcome back</h1>
                    <p className="text-[#adaaaa] text-sm mt-2">Enter your credentials to access the console</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}
                {notification && (
                    <div className="mb-6 p-4 rounded-2xl bg-[#C2F86C]/10 border border-[#C2F86C]/20 text-[#C2F86C] text-sm text-center">
                        {notification}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-[#C2F86C] uppercase tracking-[0.2em] mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#C2F86C] transition-all placeholder:text-white/20"
                            placeholder="name@litecms.io"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#C2F86C] uppercase tracking-[0.2em] mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#C2F86C] transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-[#C2F86C] text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#C2F86C]/10"
                    >
                        SIGN IN
                    </button>
                </form>
            </div>
        </div>
    );
};