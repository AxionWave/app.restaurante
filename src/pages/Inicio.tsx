import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { authService } from '@core/services';
import { httpClient } from '@core/services/http.service';
import { API_CONFIG } from '@core/config';
import { MODULOS, codigosDoModulo } from '@/constants/moduleCodes';
import IconeNav from '@/components/IconeNav';

function saudacao() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

export default function InicioPage() {
    const user = authService.getStoredUserInfo();
    const [error, setError] = useState('');
    const nome = user?.email || user?.username || 'usuário';
    const atalhos = MODULOS.filter((m) => m.path !== '/inicio' && codigosDoModulo(m).some((c) => authService.hasModulo(c)));

    useEffect(() => {
        httpClient
            .get(`${API_CONFIG.productBase}/me`)
            .catch(() => setError('Não foi possível abrir a casa agora. Tente de novo em instantes.'));
    }, []);

    return (
        <AppShell>
            <p className="kicker">Restaurante</p>
            <h1 className="display mt-3">
                {saudacao()}
                <span className="italic text-ink/70">, {nome}.</span>
            </h1>
            <p className="lede mt-4">O serviço da casa começa por aqui. Escolha o que abre agora.</p>

            <div className="mt-12 grid gap-px bg-line sm:grid-cols-2">
                {atalhos.map((m) => (
                    <Link
                        key={m.codigo}
                        to={m.path}
                        className="group bg-paper px-6 py-7 transition hover:bg-ivory"
                    >
                        <IconeNav path={m.path} className="h-5 w-5 text-brass" />
                        <p className="mt-4 font-display text-4xl text-ink transition group-hover:translate-x-0.5">{m.nome}</p>
                        <p className="mt-2 text-sm text-ink/55">{m.descricao}</p>
                    </Link>
                ))}
            </div>

            {error && <p className="alert-warn mt-10">{error}</p>}
        </AppShell>
    );
}
