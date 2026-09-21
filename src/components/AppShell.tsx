import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '@core/services';
import { APP_CONFIG, urlInicioAsc } from '@core/config';
import { buildSsoLaunchUrl } from '@core/auth/sso';
import { MODULOS, MODULO_ESTOQUE } from '@/constants/moduleCodes';
import SelecaoUnidade from '@/components/SelecaoUnidade';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const user = authService.getStoredUserInfo();
    const nomeEmpresa = user?.empresaNome || APP_CONFIG.empresa;

    const irParaAsc = () => {
        window.location.assign(buildSsoLaunchUrl(urlInicioAsc()));
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
                <div className="border-b border-slate-200 px-5 py-4">
                    <button
                        type="button"
                        onClick={irParaAsc}
                        title="Voltar ao início do ASC"
                        className="block w-full min-w-0 rounded-lg text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 underline-offset-2 hover:underline">
                            {nomeEmpresa}
                        </p>
                        <p className="mt-0.5 text-lg font-semibold text-slate-900">{APP_CONFIG.nome}</p>
                    </button>
                </div>
                <nav className="flex-1 space-y-0.5 p-3">
                    {MODULOS.filter((m) => {
                        if (authService.hasModulo(m.codigo)) return true;
                        return 'aliases' in m && Array.isArray(m.aliases)
                            ? m.aliases.some((a) => authService.hasModulo(a))
                            : false;
                    }).map((m) => (
                        <NavLink
                            key={m.codigo}
                            to={m.path}
                            className={({ isActive }) =>
                                `block rounded-lg px-3 py-2 text-sm font-medium ${
                                    isActive ? 'bg-accent-muted text-accent' : 'text-slate-600 hover:bg-slate-50'
                                }`
                            }
                        >
                            {m.nome}
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
                    <p className="truncate font-medium text-slate-700">{user?.email || user?.username}</p>
                    <button
                        type="button"
                        className="mt-2 text-accent hover:underline"
                        onClick={() => {
                            authService.logout();
                            navigate('/login', { replace: true });
                        }}
                    >
                        Sair
                    </button>
                </div>
            </aside>
            <main className="min-w-0 flex-1 p-6 md:p-8">
                {authService.hasModulo(MODULO_ESTOQUE) && (
                    <div className="mb-4 flex justify-end">
                        <SelecaoUnidade />
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
