import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import {
    Atendimento,
    CartaItem,
    MapaAmbiente,
    MapaMesa,
    moeda,
    nomeLugar,
    casaService,
} from '@/services/orion/casa.service';

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
    const [mapa, setMapa] = useState<MapaAmbiente[]>([]);
    const [ambienteId, setAmbienteId] = useState<number | null>(null);
    const [mesaId, setMesaId] = useState<number | null>(null);
    const [lugarId, setLugarId] = useState<number | null>(null);
    const [visita, setVisita] = useState<Atendimento | null>(null);
    const [carta, setCarta] = useState<CartaItem[]>([]);
    const [pratoId, setPratoId] = useState(0);
    const [quantidade, setQuantidade] = useState(1);
    const [observacao, setObservacao] = useState('');
    const [nome, setNome] = useState('');
    const [juntarId, setJuntarId] = useState(0);
    const [anfitriaoId, setAnfitriaoId] = useState(0);
    const [erro, setErro] = useState('');

    const carregarMapa = () =>
        casaService.mapa().then(setMapa);

    useEffect(() => {
        carregarMapa().catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir as mesas.')));
        casaService.itens(true).then((itens) => {
            setCarta(itens);
            setPratoId(itens[0]?.id ?? 0);
        }).catch(() => setCarta([]));
    }, []);

    const mesasVisiveis = useMemo(() => {
        const areas = ambienteId == null ? mapa : mapa.filter((a) => a.id === ambienteId);
        return areas.flatMap((area) => area.mesas.map((item) => ({ ...item, ambienteNome: area.nome })));
    }, [mapa, ambienteId]);
    const mesa = useMemo(
        () => mapa.flatMap((a) => a.mesas).find((m) => m.id === mesaId) ?? null,
        [mapa, mesaId],
    );

    const abrirPainel = async (alvo: MapaMesa, cadeira?: number) => {
        setMesaId(alvo.id);
        setLugarId(cadeira ?? null);
        setErro('');
        if (!alvo.atendimentoId) {
            setVisita(null);
            return;
        }
        try {
            const detalhe = await casaService.obter(alvo.atendimentoId);
            setVisita(detalhe);
            setAnfitriaoId(detalhe.lugares[0]?.id ?? 0);
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível abrir esta mesa.'));
        }
    };

    const aplicar = async (fn: () => Promise<Atendimento>) => {
        setErro('');
        try {
            const detalhe = await fn();
            if (detalhe.status === 'Fechada') {
                setVisita(null);
                setMesaId(null);
                setLugarId(null);
            } else {
                setVisita(detalhe);
            }
            await carregarMapa();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível concluir.'));
        }
    };

    const fecharModal = () => {
        setMesaId(null);
        setLugarId(null);
        setVisita(null);
        setErro('');
    };

    useEffect(() => {
        if (mesaId == null) return;
        const aoTeclar = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') fecharModal();
        };
        document.addEventListener('keydown', aoTeclar);
        const anterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', aoTeclar);
            document.body.style.overflow = anterior;
        };
    }, [mesaId]);

    const livres = mapa.flatMap((a) => a.mesas).filter((m) => !m.atendimentoId && m.situacao === 'Ativa' && m.id !== mesa?.id);
    const lugaresPainel = visita?.lugares ?? [];
    const itensPainel = (visita?.itens ?? []).filter((item) => (lugarId ? item.lugarId === lugarId : true));
    const lugarAberto = lugaresPainel.find((l) => l.id === lugarId);

    return (
        <AppShell>
            <PageIntro eyebrow="Serviço" title="Mesas" description="Todas as mesas da casa. Filtre por ambiente quando quiser ver só uma área. A mesa mostra a conta inteira. A cadeira, só quem está sentado." />

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
                    {mesasVisiveis.length === 0 && (
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
                                        onClick={() => abrirPainel(item)}
                                        className={`absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden border px-2 text-center ${tomMesa(item)} ${
                                            redonda ? 'h-[42%] w-[42%] rounded-full' : 'h-[32%] w-[48%]'
                                        } ${mesaId === item.id && lugarId == null ? 'ring-2 ring-brass ring-offset-2 ring-offset-paper' : ''}`}
                                    >
                                        <span className="text-[10px] uppercase tracking-[0.16em] opacity-60">{estado === 'Conta pedida' ? 'Conta' : estado}</span>
                                        <span className="max-w-full truncate font-display text-3xl leading-none">{item.rotulo}</span>
                                    </button>
                                    {lugares.map((lugar, indice) => {
                                        const ponto = pontos[indice];
                                        if (!ponto) return null;
                                        const escolhida = lugarId === lugar.id && mesaId === item.id;
                                        return (
                                            <button
                                                key={lugar.id}
                                                type="button"
                                                title={nomeLugar(lugar.ordem, lugar.nomeCliente)}
                                                onClick={() => abrirPainel(item, item.atendimentoId ? lugar.id : undefined)}
                                                style={{ left: `${ponto.x}%`, top: `${ponto.y}%` }}
                                                className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border ${
                                                    miuda ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
                                                } ${
                                                    escolhida
                                                        ? 'border-brass bg-brass text-paper'
                                                        : lugar.contaFechada
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

            {mesa && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={fecharModal}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mesa-dialog-titulo"
                        className="panel relative max-h-[min(42rem,calc(100vh-2rem))] w-full max-w-xl overflow-auto p-6"
                        onClick={(evento) => evento.stopPropagation()}
                    >
                        <button type="button" className="btn-ghost absolute right-3 top-3 px-3 py-1.5" onClick={fecharModal}>
                            Fechar
                        </button>
                    {mesa && !visita && !mesa.atendimentoId && (
                        <div className="pr-16">
                            <p id="mesa-dialog-titulo" className="kicker">Mesa {mesa.rotulo}</p>
                            <p className="mt-2 font-display text-3xl">{mesa.situacao === 'Bloqueada' ? 'Bloqueada' : 'Livre'}</p>
                            <p className="mt-2 text-sm text-ink/55">{mesa.lugares} lugares de sempre.</p>
                            {mesa.situacao === 'Ativa' && (
                                <button type="button" className="btn-primary mt-6" onClick={() => aplicar(() => casaService.abrir(mesa.id))}>
                                    Abrir visita
                                </button>
                            )}
                        </div>
                    )}
                    {mesa && !visita && mesa.atendimentoId && !erro && (
                        <p id="mesa-dialog-titulo" className="pr-16 text-sm text-ink/50">Abrindo a mesa…</p>
                    )}
                    {visita && (
                        <div className="space-y-5 pr-16">
                            <div>
                                <p id="mesa-dialog-titulo" className="kicker">{lugarAberto ? nomeLugar(lugarAberto.ordem, lugarAberto.nomeCliente) : `Mesa ${visita.mesaRotulo}`}</p>
                                <p className="mt-1 font-display text-4xl">{moeda(lugarAberto ? lugarAberto.total : visita.total)}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink/40">
                                    Aberta por {visita.abertoPorNome}
                                    {lugarId && (
                                        <button type="button" className="ml-3 text-brass" onClick={() => setLugarId(null)}>Ver a mesa</button>
                                    )}
                                </p>
                            </div>

                            {lugarAberto && !lugarAberto.contaFechada && (
                                <form
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        aplicar(() => casaService.nomearLugar(lugarAberto.id, nome || lugarAberto.nomeCliente || ''));
                                    }}
                                >
                                    <input className="field" placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
                                    <button className="btn-line" type="submit">Nomear</button>
                                </form>
                            )}

                            <ul className="divide-y divide-line">
                                {itensPainel.map((item) => (
                                    <li key={item.id} className="py-3 text-sm">
                                        <p className={item.status === 'Cancelado' ? 'text-ink/35 line-through' : ''}>
                                            {item.quantidade}× {item.descricao}
                                            <span className="ml-2 text-ink/45">{moeda(item.total)}</span>
                                        </p>
                                        <p className="text-[11px] uppercase tracking-[0.12em] text-ink/40">
                                            {!lugarId && (item.lugarId ? nomeLugar(visita.lugares.find((l) => l.id === item.lugarId)?.ordem ?? 0, visita.lugares.find((l) => l.id === item.lugarId)?.nomeCliente) : 'Mesa')}
                                            {' · '}{item.lancadoPorNome}
                                            {item.observacao ? ` · ${item.observacao}` : ''}
                                        </p>
                                        {item.status !== 'Cancelado' && (
                                            <select
                                                className="field mt-2"
                                                value={item.lugarId ?? ''}
                                                onChange={(e) => aplicar(() => casaService.transferir(item.id, e.target.value ? Number(e.target.value) : null))}
                                            >
                                                <option value="">Item da mesa</option>
                                                {visita.lugares.filter((l) => !l.contaFechada).map((l) => (
                                                    <option key={l.id} value={l.id}>{nomeLugar(l.ordem, l.nomeCliente)}</option>
                                                ))}
                                            </select>
                                        )}
                                    </li>
                                ))}
                                {itensPainel.length === 0 && <li className="py-3 text-sm text-ink/45">Nenhum prato ainda.</li>}
                            </ul>

                            <form
                                className="space-y-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    aplicar(async () => {
                                        const detalhe = await casaService.lancar(visita.id, {
                                            lugarId: lugarId,
                                            cartaItemId: pratoId,
                                            quantidade,
                                            observacao,
                                        });
                                        setObservacao('');
                                        setQuantidade(1);
                                        return detalhe;
                                    });
                                }}
                            >
                                <select className="field" value={pratoId} onChange={(e) => setPratoId(Number(e.target.value))}>
                                    {carta.map((prato) => <option key={prato.id} value={prato.id}>{prato.nome} · {moeda(prato.preco)}</option>)}
                                </select>
                                <div className="grid grid-cols-[5rem_1fr] gap-2">
                                    <input className="field" type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
                                    <input className="field" placeholder="Observação" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
                                </div>
                                <button className="btn-primary w-full" type="submit" disabled={carta.length === 0 || visita.status === 'Fechada'}>
                                    Lançar
                                </button>
                                {carta.length === 0 && <p className="text-xs text-ink/45">A carta ainda não tem pratos.</p>}
                            </form>

                            <div className="flex flex-wrap gap-2">
                                <button type="button" className="btn-line" onClick={() => aplicar(() => casaService.adicionarLugar(visita.id))}>Cadeira extra</button>
                                {lugarAberto && (
                                    <>
                                        <button type="button" className="btn-line" onClick={() => aplicar(() => casaService.removerLugar(lugarAberto.id))}>Tirar cadeira</button>
                                        {!lugarAberto.contaFechada && (
                                            <button type="button" className="btn-line" onClick={() => aplicar(() => casaService.fecharLugar(lugarAberto.id))}>Fechar esta pessoa</button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="space-y-2 border-t border-line pt-4">
                                <p className="text-sm text-ink/60">Dividir igual: {moeda(visita.cotaIgual)} por lugar.</p>
                                <button type="button" className="btn-line w-full" onClick={() => aplicar(() => casaService.fechar(visita.id, 'Dividido'))}>
                                    Fechar e dividir igual
                                </button>
                                <div className="flex gap-2">
                                    <select className="field" value={anfitriaoId} onChange={(e) => setAnfitriaoId(Number(e.target.value))}>
                                        {visita.lugares.map((l) => <option key={l.id} value={l.id}>{nomeLugar(l.ordem, l.nomeCliente)}</option>)}
                                    </select>
                                    <button type="button" className="btn-line" onClick={() => aplicar(() => casaService.fechar(visita.id, 'Anfitriao', anfitriaoId))}>
                                        Anfitrião paga
                                    </button>
                                </div>
                                {visita.status === 'Conta' ? (
                                    <button type="button" className="btn-ghost" onClick={() => aplicar(() => casaService.reabrir(visita.id))}>Voltar ao serviço</button>
                                ) : (
                                    <button type="button" className="btn-ghost" onClick={() => aplicar(() => casaService.pedirConta(visita.id))}>Pedir a conta</button>
                                )}
                                {livres.length > 0 && (
                                    <div className="flex gap-2">
                                        <select className="field" value={juntarId} onChange={(e) => setJuntarId(Number(e.target.value))}>
                                            <option value={0}>Juntar mesa</option>
                                            {livres.map((m) => <option key={m.id} value={m.id}>Mesa {m.rotulo}</option>)}
                                        </select>
                                        <button type="button" className="btn-line" disabled={!juntarId} onClick={() => aplicar(() => casaService.juntar(visita.id, juntarId))}>
                                            Juntar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {erro && <p className="alert-error mt-4">{erro}</p>}
                    </div>
                </div>,
                document.body,
            )}
        </AppShell>
    );
}
