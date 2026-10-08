import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '@core/services';
import { APP_CONFIG, urlInicioAsc } from '@core/config';
import { buildSsoLaunchUrl } from '@core/auth/sso';
import { MODULOS, MODULO_ESTOQUE } from '@/constants/moduleCodes';
import SelecaoUnidade from '@/components/SelecaoUnidade';
import IconeNav from '@/components/IconeNav';

function modulosVisiveis() {
    return MODULOS.filter((m) => {
        if (authService.hasModulo(m.codigo)) return true;
        return 'aliases' in m && Array.isArray(m.aliases)
            ? m.aliases.some((a) => authService.hasModulo(a))
            : false;
    });
}

function Marca({ onClick, clara = false }: { onClick: () => void; clara?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Voltar ao início do ASC"
            className="block min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
        >
            <span className={`flex items-center gap-3 ${clara ? 'text-ivory' : 'text-ink'}`}>
                <span
                    className={`grid h-9 w-9 shrink-0 place-items-center border font-display text-lg leading-none ${
                        clara ? 'border-brass/60 text-brass-bright' : 'border-brass/50 text-brass'
                    }`}
                >
                    O
                </span>
                <span className="min-w-0">
                    <span className={`block truncate text-[10px] font-medium uppercase tracking-[0.22em] ${clara ? 'text-ivory/45' : 'text-ink/45'}`}>
                        {APP_CONFIG.empresa}
                    </span>
                    <span className="font-display text-2xl leading-none">{APP_CONFIG.nome}</span>
                </span>
            </span>
        </button>
    );
}

function Navegacao({ onNavigate, clara = false }: { onNavigate?: () => void; clara?: boolean }) {
    return (
        <nav className="flex flex-col gap-1">
            {modulosVisiveis().map((m) => (
                <NavLink
                    key={m.codigo}
                    to={m.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide transition ${
                            clara
                                ? isActive
                                    ? 'text-ivory'
                                    : 'text-ivory/50 hover:text-ivory'
                                : isActive
                                  ? 'text-ink'
                                  : 'text-ink/50 hover:text-ink'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <IconeNav
                                path={m.path}
                                className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brass-bright' : 'opacity-70'}`}
                            />
                            <span>
                                <span className="block">{m.nome}</span>
                                <span className={`block text-[11px] ${clara ? 'text-ivory/35' : 'text-ink/35'}`}>{m.descricao}</span>
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [menuAberto, setMenuAberto] = useState(false);
    const user = authService.getStoredUserInfo();
    const nomeEmpresa = user?.empresaNome || APP_CONFIG.empresa;

    const irParaAsc = () => {
        window.location.assign(buildSsoLaunchUrl(urlInicioAsc()));
    };

    const sair = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-ivory text-ink">
            <div className="flex min-h-screen">
                <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-espresso text-ivory md:flex">
                    <div className="px-6 pb-6 pt-8">
                        <Marca onClick={irParaAsc} clara />
                        <p className="mt-4 truncate text-[11px] uppercase tracking-[0.18em] text-ivory/35">{nomeEmpresa}</p>
                    </div>
                    <div className="mx-6 h-px bg-ivory/10" />
                    <div className="flex-1 overflow-auto px-3 py-6">
                        <Navegacao clara />
                    </div>
                    <div className="border-t border-ivory/10 px-6 py-5">
                        <p className="truncate text-sm text-ivory/80">{user?.email || user?.username}</p>
                        <button type="button" onClick={sair} className="mt-2 text-xs uppercase tracking-[0.18em] text-brass-bright hover:text-ivory">
                            Sair
                        </button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-ivory/90 px-4 py-3 backdrop-blur md:px-10">
                        <div className="flex items-center gap-3 md:hidden">
                            <button
                                type="button"
                                aria-expanded={menuAberto}
                                aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                                onClick={() => setMenuAberto(true)}
                                className="grid h-10 w-10 place-items-center border border-line text-ink"
                            >
                                <span className="flex w-4 flex-col gap-1">
                                    <span className="h-px bg-ink" />
                                    <span className="h-px bg-ink" />
                                    <span className="h-px w-2.5 bg-brass" />
                                </span>
                            </button>
                            <button type="button" onClick={irParaAsc} className="font-display text-2xl leading-none">
                                Orion
                            </button>
                        </div>
                        <p className="hidden font-display text-xl italic text-ink/70 md:block">A casa, em ordem.</p>
                        {authService.hasModulo(MODULO_ESTOQUE) && <SelecaoUnidade />}
                    </header>

                    <main className="page-rise flex-1 px-4 py-7 md:px-10 md:py-10">{children}</main>
                </div>
            </div>

            {menuAberto && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/50" onClick={() => setMenuAberto(false)} />
                    <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-espresso text-ivory shadow-maison">
                        <div className="flex items-start justify-between px-6 pb-4 pt-8">
                            <Marca onClick={irParaAsc} clara />
                            <button type="button" onClick={() => setMenuAberto(false)} className="text-xs uppercase tracking-[0.16em] text-ivory/50">
                                Fechar
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto px-3 py-4">
                            <Navegacao clara onNavigate={() => setMenuAberto(false)} />
                        </div>
                        <div className="border-t border-ivory/10 px-6 py-5">
                            <p className="truncate text-sm text-ivory/80">{user?.email || user?.username}</p>
                            <button type="button" onClick={sair} className="mt-2 text-xs uppercase tracking-[0.18em] text-brass-bright">
                                Sair
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
