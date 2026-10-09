import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { authService } from '@core/services';
import { getApiErrorMessage } from '@core/utils/apiError';
import { MODULO_MESAS, MODULO_PEDIDOS } from '@/constants/moduleCodes';
import {
    Atendimento,
    CartaItem,
    Conta,
    Lugar,
    MapaMesa,
    STATUS_ITEM,
    moeda,
    nomeLugar,
    casaService,
} from '@/services/orion/casa.service';

export default function ComandaMesaPage() {
    const { mesaId } = useParams();
    const id = Number(mesaId);
    const navigate = useNavigate();
    const location = useLocation();
    const origem = (location.state as { origem?: string } | null)?.origem;
    const volta = origem === 'mesas' || (!authService.hasModulo(MODULO_PEDIDOS) && authService.hasModulo(MODULO_MESAS))
        ? '/mesas'
        : '/pedidos';

    const [mesa, setMesa] = useState<MapaMesa | null>(null);
    const [visita, setVisita] = useState<Atendimento | null>(null);
    const [conta, setConta] = useState<Conta | null>(null);
    const [carta, setCarta] = useState<CartaItem[]>([]);
    const [lugarId, setLugarId] = useState<number | null>(null);
    const [nomes, setNomes] = useState<Record<number, string>>({});
    const [marcados, setMarcados] = useState<number[]>([]);
    const [pratoId, setPratoId] = useState(0);
    const [quantidade, setQuantidade] = useState(1);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);

    const carregar = async (aberta?: Atendimento | null) => {
        const detalhe = aberta === undefined ? await casaService.visitaDaMesa(id) : aberta;
        setVisita(detalhe);
        if (detalhe) {
            setNomes(Object.fromEntries(detalhe.lugares.map((l) => [l.id, l.nomeCliente ?? ''])));
            setLugarId((atual) => atual && detalhe.lugares.some((l) => l.id === atual) ? atual : detalhe.lugares.find((l) => l.ocupado)?.id ?? detalhe.lugares[0]?.id ?? null);
            setConta(await casaService.conta(detalhe.id));
        } else {
            setConta(null);
        }
    };

    useEffect(() => {
        if (!Number.isFinite(id) || id <= 0) return;
        setCarregando(true);
        Promise.all([casaService.mapa(), casaService.itens(true)])
            .then(async ([areas, itens]) => {
                const encontrada = areas.flatMap((a) => a.mesas).find((m) => m.id === id) ?? null;
                setMesa(encontrada);
                setCarta(itens);
                setPratoId(itens[0]?.id ?? 0);
                await carregar();
            })
            .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir a comanda.')))
            .finally(() => setCarregando(false));
    }, [id]);

    const aplicar = async (fn: () => Promise<Atendimento>) => {
        setErro('');
        try {
            const detalhe = await fn();
            if (detalhe.status === 'Fechada') {
                navigate(volta);
                return true;
            }
            await carregar(detalhe);
            return true;
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível concluir.'));
            return false;
        }
    };

    const lugar = visita?.lugares.find((l) => l.id === lugarId) ?? null;
    const nomeados = visita?.lugares.filter((l) => l.nomeCliente?.trim()) ?? [];
    const gruposJunto = (visita?.grupos ?? []).filter((g) => g.modo === 'Junto');

    const toggleMarcado = (lugarAlvo: Lugar) => {
        if (!lugarAlvo.nomeCliente?.trim()) return;
        setMarcados((atual) => atual.includes(lugarAlvo.id) ? atual.filter((x) => x !== lugarAlvo.id) : [...atual, lugarAlvo.id]);
    };

    const salvarJunto = () => {
        if (!visita || marcados.length < 2) return;
        const resto = gruposJunto.filter((g) => !g.lugarIds.some((lid) => marcados.includes(lid)));
        aplicar(() => casaService.grupos(visita.id, [
            ...resto.map((g) => ({ modo: 'Junto' as const, lugarIds: g.lugarIds })),
            { modo: 'Junto', lugarIds: marcados },
        ])).then((ok) => { if (ok) setMarcados([]); });
    };

    const soltarGrupo = (lugarIds: number[]) => {
        if (!visita) return;
        const resto = gruposJunto.filter((g) => g.lugarIds.join() !== lugarIds.join());
        aplicar(() => casaService.grupos(visita.id, resto.map((g) => ({ modo: 'Junto' as const, lugarIds: g.lugarIds }))));
    };

    const nomear = (evento: FormEvent, alvo: Lugar) => {
        evento.preventDefault();
        aplicar(() => casaService.nomearLugar(alvo.id, nomes[alvo.id] ?? ''));
    };

    const lancar = (evento: FormEvent) => {
        evento.preventDefault();
        if (!visita || !lugarId) return;
        aplicar(async () => {
            const detalhe = await casaService.lancar(visita.id, {
                lugarId,
                cartaItemId: pratoId,
                quantidade,
                observacao,
            });
            setObservacao('');
            setQuantidade(1);
            return detalhe;
        });
    };

    const titulo = mesa ? `Mesa ${mesa.rotulo}` : 'Comanda';
    const ambiente = useMemo(() => visita?.ambienteNome ?? '', [visita]);

    return (
        <AppShell>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="kicker">{ambiente || 'Casa'} · comanda</p>
                    <h1 className="display mt-2">{titulo}</h1>
                    <p className="mt-2 max-w-xl text-sm text-ink/55">
                        Nomeie quem sentou, lance o que cada um pediu e junte o pagamento só de quem paga junto. Os totais são o consumo, sem taxa.
                    </p>
                </div>
                <Link to={volta} className="btn-ghost">Voltar</Link>
            </div>

            {erro && <p className="alert-error mt-6">{erro}</p>}
            {carregando && <p className="mt-10 text-sm text-ink/50">Abrindo a mesa…</p>}

            {!carregando && !mesa && (
                <div className="panel mt-10 px-6 py-16 text-center">
                    <p className="font-display text-3xl italic text-ink/80">Mesa não encontrada.</p>
                    <Link to={volta} className="btn-primary mt-6">Voltar</Link>
                </div>
            )}

            {!carregando && mesa && !visita && (
                <div className="panel mt-10 px-6 py-10">
                    <p className="font-display text-3xl">{mesa.situacao === 'Bloqueada' ? 'Bloqueada' : 'Livre'}</p>
                    <p className="mt-2 text-sm text-ink/55">{mesa.lugaresPadrao} lugares de sempre. A mesa já existe no salão; daqui só se abre a passagem.</p>
                    {mesa.situacao === 'Ativa' && (
                        <button type="button" className="btn-primary mt-6" onClick={() => aplicar(() => casaService.abrir(mesa.id))}>
                            Abrir visita
                        </button>
                    )}
                </div>
            )}

            {visita && (
                <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
                    <div className="space-y-8">
                        <section className="panel p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-display text-3xl">Quem sentou</h2>
                                <div className="flex gap-2">
                                    <button type="button" className="btn-line" onClick={() => aplicar(() => casaService.adicionarLugar(visita.id))}>+ lugar</button>
                                </div>
                            </div>
                            <ul className="mt-4 divide-y divide-line">
                                {visita.lugares.map((item) => (
                                    <li key={item.id} className="flex flex-wrap items-center gap-2 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setLugarId(item.id)}
                                            className={`grid h-8 w-8 place-items-center rounded-full border text-xs ${
                                                lugarId === item.id ? 'border-brass bg-brass text-paper' : 'border-line bg-ivory'
                                            }`}
                                        >
                                            {item.ordem}
                                        </button>
                                        <form className="flex min-w-[12rem] flex-1 gap-2" onSubmit={(e) => nomear(e, item)}>
                                            <input
                                                className="field"
                                                placeholder={`Nome do lugar ${item.ordem}`}
                                                value={nomes[item.id] ?? ''}
                                                onChange={(e) => setNomes((atual) => ({ ...atual, [item.id]: e.target.value }))}
                                                disabled={item.contaFechada}
                                            />
                                            <button className="btn-line" type="submit" disabled={item.contaFechada}>Nomear</button>
                                        </form>
                                        <p className="w-20 text-right text-sm text-ink/50">{moeda(item.total)}</p>
                                        {visita.lugares.length > 1 && !item.contaFechada && (
                                            <button type="button" className="btn-ghost px-2" onClick={() => aplicar(() => casaService.removerLugar(item.id))}>
                                                −
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="panel p-6">
                            <h2 className="font-display text-3xl">Lançar para {lugar ? nomeLugar(lugar.ordem, lugar.nomeCliente) : 'alguém'}</h2>
                            <form className="mt-4 space-y-2" onSubmit={lancar}>
                                <select className="field" value={lugarId ?? ''} onChange={(e) => setLugarId(Number(e.target.value))}>
                                    {visita.lugares.map((item) => (
                                        <option key={item.id} value={item.id}>{nomeLugar(item.ordem, item.nomeCliente)}</option>
                                    ))}
                                </select>
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

                            <ul className="mt-6 divide-y divide-line">
                                {visita.itens.filter((item) => !lugarId || item.lugarId === lugarId).map((item) => (
                                    <li key={item.id} className="py-3 text-sm">
                                        <p className={item.status === 'Cancelado' ? 'text-ink/35 line-through' : ''}>
                                            {item.quantidade}× {item.descricao}
                                            <span className="ml-2 text-ink/45">{moeda(item.total)}</span>
                                        </p>
                                        <p className="text-[11px] uppercase tracking-[0.12em] text-ink/40">
                                            {nomeLugar(visita.lugares.find((l) => l.id === item.lugarId)?.ordem ?? 0, visita.lugares.find((l) => l.id === item.lugarId)?.nomeCliente)}
                                            {' · '}{STATUS_ITEM[item.status]}
                                            {item.observacao ? ` · ${item.observacao}` : ''}
                                        </p>
                                    </li>
                                ))}
                                {visita.itens.filter((item) => !lugarId || item.lugarId === lugarId).length === 0 && (
                                    <li className="py-3 text-sm text-ink/45">Nenhum prato neste lugar ainda.</li>
                                )}
                            </ul>
                        </section>

                        <section className="panel p-6">
                            <h2 className="font-display text-3xl">Pagamento</h2>
                            <p className="mt-2 text-sm text-ink/55">Marque quem paga junto (um casal, por exemplo). Quem ficar de fora paga o próprio consumo.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {nomeados.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleMarcado(item)}
                                        className={`chip ${marcados.includes(item.id) ? 'bg-espresso text-ivory' : 'bg-paper text-ink/70 ring-1 ring-line'}`}
                                    >
                                        {nomeLugar(item.ordem, item.nomeCliente)}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="btn-line mt-4" disabled={marcados.length < 2} onClick={salvarJunto}>
                                Pagar junto
                            </button>
                            <ul className="mt-4 divide-y divide-line">
                                {gruposJunto.map((grupo) => (
                                    <li key={grupo.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                                        <span>{grupo.lugarIds.map((lid) => nomeLugar(visita.lugares.find((l) => l.id === lid)?.ordem ?? 0, visita.lugares.find((l) => l.id === lid)?.nomeCliente)).join(' + ')}</span>
                                        <button type="button" className="btn-ghost" onClick={() => soltarGrupo(grupo.lugarIds)}>Separar</button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <aside className="space-y-6">
                        <section className="panel p-6">
                            <p className="kicker">Totais sem 10%</p>
                            <p className="mt-2 font-display text-5xl">{moeda(conta?.total ?? visita.total)}</p>
                            <div className="mt-6 space-y-4">
                                {(conta?.porGrupo ?? []).map((grupo) => (
                                    <div key={`${grupo.id ?? 's'}-${grupo.lugarIds.join('-')}`}>
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="font-display text-2xl">{grupo.titulo}</p>
                                            <p className="text-sm text-ink/60">{moeda(grupo.total)}</p>
                                        </div>
                                        {grupo.pessoas.length > 1 && grupo.modo === 'Junto' && (
                                            <p className="text-xs text-ink/40">Um só valor para os dois.</p>
                                        )}
                                        {grupo.pessoas.map((pessoa) => (
                                            <div key={pessoa.lugarId} className="mt-2 text-sm text-ink/70">
                                                {grupo.modo === 'Separado' || grupo.pessoas.length === 1 ? null : (
                                                    <p>{pessoa.nome} · {moeda(pessoa.subtotal)}</p>
                                                )}
                                                {pessoa.itens.map((item) => (
                                                    <p key={item.id} className="text-xs text-ink/45">{item.quantidade}× {item.descricao} · {moeda(item.total)}</p>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="btn-primary mt-8 w-full"
                                onClick={() => aplicar(() => casaService.fechar(visita.id, 'PorPessoa'))}
                            >
                                Encerrar mesa
                            </button>
                            <p className="mt-3 text-xs text-ink/40">A mesa volta vazia no mapa. Os nomes ficam só nesta passagem.</p>
                        </section>
                    </aside>
                </div>
            )}
        </AppShell>
    );
}
