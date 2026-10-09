import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import {
    Atendimento,
    MapaAmbiente,
    MapaMesa,
    STATUS_ITEM,
    StatusItem,
    moeda,
    nomeLugar,
    casaService,
} from '@/services/orion/casa.service';

const PROXIMO: Partial<Record<StatusItem, StatusItem>> = {
    Lancado: 'EmPreparo',
    EmPreparo: 'Pronto',
    Pronto: 'Entregue',
};

function estadoMesa(mesa: MapaMesa) {
    if (mesa.situacao === 'Bloqueada') return 'Bloqueada';
    if (mesa.statusAtendimento === 'Conta') return 'Conta pedida';
    if (mesa.atendimentoId) return 'Ocupada';
    return 'Livre';
}

export default function PedidosPage() {
    const navigate = useNavigate();
    const [modo, setModo] = useState<'mesas' | 'passagem'>('mesas');
    const [mapa, setMapa] = useState<MapaAmbiente[]>([]);
    const [lista, setLista] = useState<Atendimento[]>([]);
    const [erro, setErro] = useState('');
    const [motivo, setMotivo] = useState<Record<number, string>>({});

    const carregarMapa = () => casaService.mapa().then(setMapa);
    const carregarPassagem = () => casaService.abertos().then(setLista);

    useEffect(() => {
        carregarMapa().catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir as mesas.')));
        carregarPassagem().catch(() => undefined);
    }, []);

    const mesas = useMemo(
        () => mapa.flatMap((area) => area.mesas.map((mesa) => ({ ...mesa, ambienteNome: area.nome }))),
        [mapa],
    );

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
            navigate(`/pedidos/mesa/${alvo.id}`, { state: { origem: 'pedidos' } });
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível abrir esta mesa.'));
        }
    };

    const agir = async (fn: () => Promise<unknown>) => {
        setErro('');
        try {
            await fn();
            await carregarPassagem();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível atualizar o pedido.'));
        }
    };

    return (
        <AppShell>
            <PageIntro
                eyebrow="Serviço"
                title="Pedidos"
                description="Escolha a mesa para entrar na comanda. A passagem da cozinha, do bar e da sobremesa fica no outro modo."
            />

            <div className="mt-8 flex flex-wrap gap-2">
                <button
                    type="button"
                    className={`chip ${modo === 'mesas' ? 'bg-espresso text-ivory' : 'bg-paper text-ink/70 ring-1 ring-line'}`}
                    onClick={() => setModo('mesas')}
                >
                    Mesas
                </button>
                <button
                    type="button"
                    className={`chip ${modo === 'passagem' ? 'bg-espresso text-ivory' : 'bg-paper text-ink/70 ring-1 ring-line'}`}
                    onClick={() => setModo('passagem')}
                >
                    Passagem
                </button>
            </div>

            {erro && <p className="alert-error mt-6">{erro}</p>}

            {modo === 'mesas' && (
                <div className="mt-10 space-y-8">
                    {mapa.length === 0 && (
                        <div className="panel px-6 py-16 text-center">
                            <p className="font-display text-3xl italic text-ink/80">Nenhuma mesa cadastrada.</p>
                            <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">O cadastro da mesa continua no salão. Daqui só se entra na comanda.</p>
                            <Link to="/configuracoes/mesas" className="btn-primary mt-6">Cadastrar mesas</Link>
                        </div>
                    )}
                    {mapa.map((area) => (
                        <section key={area.id}>
                            <p className="kicker">{area.nome}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {area.mesas.map((mesa) => (
                                    <button
                                        key={mesa.id}
                                        type="button"
                                        onClick={() => irParaComanda(mesa)}
                                        className="panel px-5 py-5 text-left transition hover:bg-ivory"
                                    >
                                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40">{estadoMesa(mesa)}</p>
                                        <h2 className="mt-1 font-display text-4xl">Mesa {mesa.rotulo}</h2>
                                        <p className="mt-1 text-sm text-ink/50">
                                            {mesa.atendimentoId
                                                ? `${mesa.lugares} ${mesa.lugares === 1 ? 'lugar' : 'lugares'} nesta passagem${mesa.abertoPorNome ? ` · ${mesa.abertoPorNome}` : ''}`
                                                : `${mesa.lugaresPadrao} lugares de sempre`}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                    {mesas.length === 0 && mapa.length > 0 && (
                        <p className="text-sm text-ink/50">Este ambiente ainda não tem mesas.</p>
                    )}
                </div>
            )}

            {modo === 'passagem' && (
                <div className="mt-10 space-y-8">
                    {lista.length === 0 && (
                        <div className="panel px-6 py-16 text-center">
                            <p className="font-display text-3xl italic text-ink/80">Nenhuma comanda nesta passagem.</p>
                            <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">Os pedidos do serviço aparecem aqui, na ordem em que o restaurante os lançar.</p>
                        </div>
                    )}
                    {lista.map((visita) => (
                        <section key={visita.id} className="panel p-6">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="kicker">{visita.ambienteNome || 'Casa'} · {visita.status === 'Conta' ? 'conta pedida' : 'aberta'}</p>
                                    <h2 className="mt-1 font-display text-4xl">Mesa {visita.mesaRotulo}</h2>
                                    <p className="mt-1 text-sm text-ink/50">Aberta por {visita.abertoPorNome} · {moeda(visita.total)}</p>
                                </div>
                                <Link to={`/pedidos/mesa/${visita.mesaId}`} state={{ origem: 'pedidos' }} className="btn-line">
                                    Abrir comanda
                                </Link>
                            </div>
                            <ul className="mt-6 divide-y divide-line">
                                {visita.itens.map((item) => {
                                    const lugar = visita.lugares.find((l) => l.id === item.lugarId);
                                    const proximo = PROXIMO[item.status];
                                    return (
                                        <li key={item.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                                            <div>
                                                <p className={`font-display text-2xl ${item.status === 'Cancelado' ? 'text-ink/35 line-through' : ''}`}>
                                                    {item.quantidade}× {item.descricao}
                                                </p>
                                                <p className="text-xs uppercase tracking-[0.14em] text-ink/45">
                                                    {item.lugarId ? nomeLugar(lugar?.ordem ?? 0, lugar?.nomeCliente) : 'Mesa'} · {item.destino} · {STATUS_ITEM[item.status]} · {item.lancadoPorNome}
                                                </p>
                                                {item.observacao && <p className="mt-1 text-sm italic text-ink/60">{item.observacao}</p>}
                                                {item.motivoCancelamento && <p className="mt-1 text-sm text-ink/50">Cancelado: {item.motivoCancelamento}</p>}
                                            </div>
                                            {item.status !== 'Cancelado' && item.status !== 'Entregue' && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {proximo && (
                                                        <button type="button" className="btn-brass" onClick={() => agir(() => casaService.statusItem(item.id, proximo))}>
                                                            {STATUS_ITEM[proximo]}
                                                        </button>
                                                    )}
                                                    <input
                                                        className="field w-40"
                                                        placeholder="Motivo"
                                                        value={motivo[item.id] ?? ''}
                                                        onChange={(e) => setMotivo({ ...motivo, [item.id]: e.target.value })}
                                                    />
                                                    <button type="button" className="btn-line" onClick={() => agir(() => casaService.cancelar(item.id, motivo[item.id] ?? ''))}>
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </AppShell>
    );
}
