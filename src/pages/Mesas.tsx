import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import { MapaAmbiente, MapaMesa, nomeLugar, casaService } from '@/services/orion/casa.service';

function tomMesa(mesa: MapaMesa) {
    if (mesa.situacao === 'Bloqueada') return 'border-line bg-ivory text-ink/35';
    if (mesa.statusAtendimento === 'Conta') return 'border-espresso bg-espresso text-ivory';
    if (mesa.atendimentoId) return 'border-brass bg-paper text-ink';
    return 'border-line bg-paper text-ink';
}

type LugarDesenho = {
    id: number;
    ordem: number;
    nomeCliente?: string | null;
    ocupado: boolean;
    contaFechada: boolean;
};

function lugaresDaMesa(mesa: MapaMesa): LugarDesenho[] {
    if (mesa.atendimentoId && mesa.lugaresVisita.length > 0) return mesa.lugaresVisita;
    return Array.from({ length: mesa.lugaresPadrao }, (_, i) => ({
        id: -(i + 1),
        ordem: i + 1,
        nomeCliente: null,
        ocupado: false,
        contaFechada: false,
    }));
}

function espalhar(qtd: number, inicio: number, fim: number) {
    if (qtd <= 0) return [];
    if (qtd === 1) return [(inicio + fim) / 2];
    const passo = (fim - inicio) / (qtd + 1);
    return Array.from({ length: qtd }, (_, i) => inicio + passo * (i + 1));
}

function posicoesCadeiras(total: number, redonda: boolean) {
    if (total <= 0) return [];
    if (redonda) {
        const raio = total > 10 ? 40 : 36;
        return Array.from({ length: total }, (_, i) => {
            const angulo = -Math.PI / 2 + (2 * Math.PI * i) / total;
            return { x: 50 + Math.cos(angulo) * raio, y: 50 + Math.sin(angulo) * raio };
        });
    }

    let topo = 0;
    let direita = 0;
    let base = 0;
    let esquerda = 0;
    if (total === 1) topo = 1;
    else if (total === 2) {
        topo = 1;
        base = 1;
    } else if (total === 3) {
        topo = 1;
        direita = 1;
        base = 1;
    } else {
        const curtos = total >= 10 ? 2 : 1;
        const resto = total - curtos * 2;
        topo = Math.ceil(resto / 2);
        base = Math.floor(resto / 2);
        direita = curtos;
        esquerda = curtos;
    }
    const x0 = 26;
    const x1 = 74;
    const y0 = 34;
    const y1 = 66;
    const fora = 13;
    return [
        ...espalhar(topo, x0, x1).map((x) => ({ x, y: y0 - fora })),
        ...espalhar(direita, y0, y1).map((y) => ({ x: x1 + fora, y })),
        ...espalhar(base, x0, x1).reverse().map((x) => ({ x, y: y1 + fora })),
        ...espalhar(esquerda, y0, y1).reverse().map((y) => ({ x: x0 - fora, y })),
    ];
}

export default function MesasPage() {
    const navigate = useNavigate();
    const [mapa, setMapa] = useState<MapaAmbiente[]>([]);
    const [ambienteId, setAmbienteId] = useState<number | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        casaService.mapa().then(setMapa).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir as mesas.')));
    }, []);

    const mesasVisiveis = useMemo(() => {
        const areas = ambienteId == null ? mapa : mapa.filter((a) => a.id === ambienteId);
        return areas.flatMap((area) => area.mesas.map((item) => ({ ...item, ambienteNome: area.nome })));
    }, [mapa, ambienteId]);

    const irParaComanda = async (alvo: MapaMesa) => {
        setErro('');
        if (alvo.situacao === 'Bloqueada' && !alvo.atendimentoId) {
            setErro('Esta mesa está bloqueada.');
            return;
        }
        try {
            if (!alvo.atendimentoId && alvo.situacao === 'Ativa') {
                await casaService.abrir(alvo.id);
            }
            navigate(`/pedidos/mesa/${alvo.id}`, { state: { origem: 'mesas' } });
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível abrir esta mesa.'));
        }
    };

    return (
        <AppShell>
            <PageIntro
                eyebrow="Serviço"
                title="Mesas"
                description="O mapa da casa. Clique na mesa — livre ou ocupada — para abrir os pedidos daquela passagem."
            />

            {erro && <p className="alert-error mt-6">{erro}</p>}

            {mapa.length === 0 && (
                <div className="panel mt-10 px-6 py-16 text-center">
                    <p className="font-display text-3xl italic text-ink/80">O mapa ainda não foi desenhado.</p>
                    <Link to="/configuracoes/ambientes" className="btn-primary mt-6">Cadastrar ambientes</Link>
                </div>
            )}

            {mapa.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`chip ${ambienteId == null ? 'bg-espresso text-ivory' : 'bg-paper text-ink/70 ring-1 ring-line'}`}
                        onClick={() => setAmbienteId(null)}
                    >
                        Todas
                    </button>
                    {mapa.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`chip ${ambienteId === item.id ? 'bg-espresso text-ivory' : 'bg-paper text-ink/70 ring-1 ring-line'}`}
                            onClick={() => setAmbienteId(item.id)}
                        >
                            {item.nome}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-8">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {mesasVisiveis.length === 0 && mapa.length > 0 && (
                        <div className="panel px-6 py-16 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
                            <p className="font-display text-3xl italic text-ink/80">Nenhuma mesa neste ambiente.</p>
                            <Link to="/configuracoes/mesas" className="btn-primary mt-6">Cadastrar mesas</Link>
                        </div>
                    )}
                    {mesasVisiveis.map((item) => {
                        const lugares = lugaresDaMesa(item);
                        const redonda = item.forma === 'Redonda';
                        const pontos = posicoesCadeiras(lugares.length, redonda);
                        const miuda = lugares.length > 8;
                        const estado = item.situacao === 'Bloqueada' ? 'Bloqueada' : item.statusAtendimento === 'Conta' ? 'Conta pedida' : item.atendimentoId ? 'Ocupada' : 'Livre';
                        return (
                            <article key={item.id} className="border border-line bg-paper px-3 pb-4 pt-4">
                                {ambienteId == null && <p className="text-center text-[11px] uppercase tracking-[0.2em] text-ink/40">{item.ambienteNome}</p>}
                                <div className="relative mx-auto aspect-square w-full max-w-[17rem]">
                                    <button
                                        type="button"
                                        onClick={() => irParaComanda(item)}
                                        className={`absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden border px-2 text-center ${tomMesa(item)} ${
                                            redonda ? 'h-[42%] w-[42%] rounded-full' : 'h-[32%] w-[48%]'
                                        }`}
                                    >
                                        <span className="text-[10px] uppercase tracking-[0.16em] opacity-60">{estado === 'Conta pedida' ? 'Conta' : estado}</span>
                                        <span className="max-w-full truncate font-display text-3xl leading-none">{item.rotulo}</span>
                                    </button>
                                    {lugares.map((lugar, indice) => {
                                        const ponto = pontos[indice];
                                        if (!ponto) return null;
                                        return (
                                            <button
                                                key={lugar.id}
                                                type="button"
                                                title={nomeLugar(lugar.ordem, lugar.nomeCliente)}
                                                onClick={() => irParaComanda(item)}
                                                style={{ left: `${ponto.x}%`, top: `${ponto.y}%` }}
                                                className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border ${
                                                    miuda ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
                                                } ${
                                                    lugar.contaFechada
                                                        ? 'border-line bg-ivory text-ink/30'
                                                        : lugar.nomeCliente
                                                            ? 'border-brass bg-paper text-ink'
                                                            : 'border-ink/20 bg-ivory text-ink/70'
                                                }`}
                                            >
                                                {lugar.ordem}
                                            </button>
                                        );
                                    })}
                                </div>
                                {item.abertoPorNome && <p className="text-center text-xs text-ink/45">Aberta por {item.abertoPorNome}</p>}
                            </article>
                        );
                    })}
                </div>
            </div>
        </AppShell>
    );
}
