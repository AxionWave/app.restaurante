import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@core/services';

export default function ModuleProtectedRoute({
    children,
    moduloCodigo,
}: {
    children: React.ReactNode;
    moduloCodigo: string | string[];
}) {
    const location = useLocation();
    const codes = Array.isArray(moduloCodigo) ? moduloCodigo : [moduloCodigo];
    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    if (!codes.some((c) => authService.hasModulo(c))) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ivory p-6">
                <div className="max-w-md border border-line bg-paper px-8 py-10 text-center">
                    <h1 className="font-display text-3xl text-ink">Esta área não está liberada</h1>
                    <p className="mt-3 text-sm leading-relaxed text-ink/60">
                        Peça o acesso no ASC e entre novamente.
                    </p>
                    <a href="/inicio" className="mt-8 inline-block text-[11px] uppercase tracking-[0.18em] text-brass">
                        Voltar ao início
                    </a>
                </div>
            </div>
        );
    }
    return <>{children}</>;
}
