import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authService } from '@core/services';
import { APP_CONFIG } from '@core/config';
import { temAcessoOrion } from '@/constants/moduleCodes';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (authService.isAuthenticated() && temAcessoOrion((c) => authService.hasModulo(c))) {
            navigate('/inicio', { replace: true });
            return;
        }
        if (authService.isAuthenticated()) {
            setError('Sua conta ainda não tem acesso a este restaurante. Peça a liberação no ASC e entre de novo.');
        }
    }, [navigate]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authService.login({ username: username.trim(), password });
            if (res.must_change_password) {
                setError('Sua senha precisa ser definida. Use o primeiro acesso no ASC e volte aqui.');
                authService.logout();
                return;
            }
            if (!temAcessoOrion((c) => authService.hasModulo(c))) {
                setError('Sua conta ainda não tem acesso a este restaurante. Peça a liberação no ASC e entre de novo.');
                return;
            }
            navigate('/inicio', { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err) && (err.response?.status === 401 || err.code === 'ERR_NETWORK')) {
                setError(err.code === 'ERR_NETWORK'
                    ? 'Não foi possível contatar o Gateway. Confira VITE_GATEWAY_URL.'
                    : 'E-mail ou senha incorretos.');
            } else {
                setError('Erro ao entrar. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
            <section className="relative hidden overflow-hidden bg-espresso text-ivory lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-14">
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse at 15% 0%, rgba(198,163,106,0.22), transparent 46%), radial-gradient(ellipse at 90% 100%, rgba(198,163,106,0.08), transparent 40%)',
                    }}
                />
                <p className="relative kicker text-brass-bright">{APP_CONFIG.empresa}</p>
                <div className="relative">
                    <p className="font-display text-[7.5rem] leading-none tracking-tight">{APP_CONFIG.nome}</p>
                    <div className="mt-6 h-px w-16 bg-brass-bright" />
                    <p className="mt-6 max-w-sm font-display text-3xl italic leading-snug text-ivory/80">
                        A casa, em ordem.
                    </p>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/55">
                        Cardápio, mesas, comandas e despensa — o serviço da casa num só lugar.
                    </p>
                </div>
                <p className="relative text-[11px] uppercase tracking-[0.22em] text-ivory/35">{APP_CONFIG.descricao}</p>
            </section>

            <section className="flex items-center justify-center bg-ivory px-5 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <p className="kicker">{APP_CONFIG.empresa}</p>
                        <h1 className="mt-2 font-display text-5xl text-ink">{APP_CONFIG.nome}</h1>
                    </div>
                    <p className="kicker">Acesso da casa</p>
                    <h2 className="mt-2 font-display text-4xl text-ink">Entrar</h2>
                    <p className="mt-2 text-sm text-ink/55">Use a mesma conta Enterprise do restaurante.</p>

                    <form className="mt-10 space-y-5" onSubmit={onSubmit}>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ink/50">
                            E-mail
                            <input
                                className="field mt-2"
                                name="username"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </label>
                        <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ink/50">
                            Senha
                            <span className="relative mt-2 block">
                                <input
                                    className="field pr-20"
                                    type={mostrarSenha ? 'text' : 'password'}
                                    name="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenha((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.14em] text-brass"
                                >
                                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </span>
                        </label>
                        {error && <p className="alert-error">{error}</p>}
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                            {loading ? 'Entrando…' : 'Entrar'}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}
