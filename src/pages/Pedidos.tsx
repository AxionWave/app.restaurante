import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import {
    Atendimento,
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

export default function PedidosPage() {
    const [lista, setLista] = useState<Atendimento[]>([]);
    const [erro, setErro] = useState('');
    const [motivo, setMotivo] = useState<Record<number, string>>({});

    const carregar = () => {
        casaService.abertos().then(setLista).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir os pedidos.')));
    };

    useEffect(() => {
        carregar();
    }, []);

    const agir = async (fn: () => Promise<unknown>) => {
        setErro('');
        try {
            await fn();
            carregar();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível atualizar o pedido.'));
        }
    };

    return (
        <AppShell>
            <PageIntro
                eyebrow="Serviço"
                title="Pedidos"
                description="O que está na mesa, para onde foi e quem lançou. Cozinha, bar e sobremesa seguem daqui."
            />
            {erro && <p className="alert-error mt-6">{erro}</p>}
            {lista.length === 0 && (
                <div className="panel mt-10 px-6 py-16 text-center">
                    <p className="font-display text-3xl italic text-ink/80">Nenhuma comanda nesta passagem.</p>
                    <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">Os pedidos do serviço aparecem aqui, na ordem em que o restaurante os lançar.</p>
                </div>
            )}
            <div className="mt-10 space-y-8">
                {lista.map((visita) => (
                    <section key={visita.id} className="panel p-6">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="kicker">{visita.ambienteNome || 'Casa'} · {visita.status === 'Conta' ? 'conta pedida' : 'aberta'}</p>
                                <h2 className="mt-1 font-display text-4xl">Mesa {visita.mesaRotulo}</h2>
                                <p className="mt-1 text-sm text-ink/50">Aberta por {visita.abertoPorNome} · {moeda(visita.total)}</p>
                            </div>
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
        </AppShell>
    );
}
