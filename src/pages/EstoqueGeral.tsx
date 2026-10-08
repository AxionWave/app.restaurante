import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { estoqueService, novaChaveIdempotencia } from '@/services/orion/estoque.service';
import { getApiErrorMessage } from '@core/utils/apiError';
import { getUnidadeAtivaId } from '@/state/unidadeAtiva.store';
import type { SaldoCore } from '@/services/orion/estoque.types';

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Visão geral do estoque — o que o cliente tem em mãos hoje, com ajuste rápido por item. */
export default function EstoqueGeralPage() {
    const [saldos, setSaldos] = useState<SaldoCore[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [busca, setBusca] = useState('');

    const [ajustandoProdutoId, setAjustandoProdutoId] = useState<number | null>(null);
    const [novaQuantidade, setNovaQuantidade] = useState('');
    const [ajustando, setAjustando] = useState(false);
    const [erroAjuste, setErroAjuste] = useState<string | null>(null);

    const unidadeAtivaId = getUnidadeAtivaId();
    const temCusto = saldos.some((s) => s.custoMedio != null);
    const valorTotalEstoque = saldos.reduce((soma, s) => soma + (s.custoMedio ?? 0) * s.quantidade, 0);
    const qtdEstoqueBaixo = saldos.filter((s) => s.abaixoMinimo).length;

    function recarregar(search?: string) {
        setCarregando(true);
        estoqueService
            .listarSaldos(search)
            .then(setSaldos)
            .catch(() => setSaldos([]))
            .finally(() => setCarregando(false));
    }

    useEffect(() => {
        const t = setTimeout(() => recarregar(busca.trim() || undefined), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    function abrirAjuste(s: SaldoCore) {
        setAjustandoProdutoId(s.produtoId);
        setNovaQuantidade(String(s.quantidade));
        setErroAjuste(null);
    }

    function fecharAjuste() {
        setAjustandoProdutoId(null);
        setErroAjuste(null);
    }

    async function confirmarAjuste(s: SaldoCore) {
        const qtd = Number(novaQuantidade.replace(',', '.'));
        if (Number.isNaN(qtd) || qtd < 0) {
            setErroAjuste('Informe uma quantidade válida.');
            return;
        }
        setAjustando(true);
        setErroAjuste(null);
        try {
            const criada = await estoqueService.criarEntrada({
                chaveIdempotencia: novaChaveIdempotencia(),
                unidadeId: unidadeAtivaId,
                tipo: 'AJUSTE',
                origem: 'INVENTARIO',
                observacao: 'Ajuste rápido de estoque atual',
                itens: [{ produtoCoreId: s.produtoId, quantidadeRecebida: qtd }],
            });
            await estoqueService.confirmar(criada.id);
            setAjustandoProdutoId(null);
            recarregar(busca.trim() || undefined);
        } catch (e) {
            setErroAjuste(getApiErrorMessage(e, 'Não foi possível ajustar o estoque.'));
        } finally {
            setAjustando(false);
        }
    }

    return (
        <AppShell>
            <PageIntro eyebrow="Despensa" title="Estoque" description="O que a casa tem em mãos hoje, produto a produto.">
                <Link to="/estoque/entrada" className="btn-primary">
                    Nova entrada
                </Link>
            </PageIntro>

            {!unidadeAtivaId && (
                <p className="alert-warn mt-6">Selecione a unidade no topo da página para ver e ajustar o estoque.</p>
            )}

            <div className="mt-8 grid gap-px bg-line sm:grid-cols-3">
                <div className="bg-paper px-5 py-5">
                    <p className="kicker">Produtos</p>
                    <p className="mt-2 font-display text-4xl text-ink">{saldos.length}</p>
                </div>
                <div className="bg-paper px-5 py-5">
                    <p className="kicker">Valor em estoque</p>
                    <p className="mt-2 font-display text-4xl text-ink">{temCusto ? formatoMoeda.format(valorTotalEstoque) : '—'}</p>
                </div>
                <div className={`px-5 py-5 ${qtdEstoqueBaixo > 0 ? 'bg-brass-muted' : 'bg-paper'}`}>
                    <p className="kicker">Abaixo do mínimo</p>
                    <p className="mt-2 font-display text-4xl text-ink">{qtdEstoqueBaixo > 0 ? qtdEstoqueBaixo : '—'}</p>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome ou código"
                        className="field pr-8"
                    />
                    {busca && (
                        <button
                            type="button"
                            onClick={() => setBusca('')}
                            aria-label="Limpar busca"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                        >
                            ×
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => recarregar(busca.trim() || undefined)}
                    disabled={carregando}
                    className="text-xs uppercase tracking-[0.16em] text-brass hover:text-ink disabled:opacity-50"
                >
                    {carregando ? 'Atualizando' : 'Atualizar'}
                </button>
            </div>

            <div className="panel mt-4 overflow-hidden">
                <table className="table-lux">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Quantidade</th>
                            <th>Custo médio</th>
                            <th>Valor em estoque</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {carregando && saldos.length === 0 &&
                            [0, 1, 2].map((i) => (
                                <tr key={`skeleton-${i}`} className="animate-pulse">
                                    <td>
                                        <div className="h-4 w-32 bg-ivory" />
                                        <div className="mt-2 h-3 w-16 bg-ivory" />
                                    </td>
                                    <td><div className="h-4 w-12 bg-ivory" /></td>
                                    <td><div className="h-4 w-16 bg-ivory" /></td>
                                    <td><div className="h-4 w-16 bg-ivory" /></td>
                                    <td />
                                </tr>
                            ))}
                        {saldos.map((s) => (
                            <tr key={s.produtoId} className={s.abaixoMinimo ? 'bg-brass-muted/60' : 'hover:bg-ivory/70'}>
                                <td>
                                    <p className="font-medium text-ink">{s.produtoNome}</p>
                                    <p className="font-mono text-xs text-ink/40">{s.produtoCodigo}</p>
                                </td>
                                <td>
                                    {ajustandoProdutoId === s.produtoId ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    autoFocus
                                                    value={novaQuantidade}
                                                    onChange={(e) => setNovaQuantidade(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') void confirmarAjuste(s);
                                                        if (e.key === 'Escape') fecharAjuste();
                                                    }}
                                                    className="field w-24 py-1.5"
                                                />
                                                <span className="text-xs text-ink/50">{s.unidadeMedida}</span>
                                            </div>
                                            {erroAjuste && <p className="text-xs text-[#7A3030]">{erroAjuste}</p>}
                                        </div>
                                    ) : (
                                        <>
                                            {s.quantidade} {s.unidadeMedida}
                                            {s.abaixoMinimo && (
                                                <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-[#6B4E24]">
                                                    Estoque baixo
                                                </span>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td className="text-ink/70">
                                    {s.custoMedio != null ? formatoMoeda.format(s.custoMedio) : '—'}
                                </td>
                                <td className="text-ink/70">
                                    {s.custoMedio != null ? formatoMoeda.format(s.custoMedio * s.quantidade) : '—'}
                                </td>
                                <td className="text-right">
                                    {ajustandoProdutoId === s.produtoId ? (
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                disabled={ajustando}
                                                onClick={() => void confirmarAjuste(s)}
                                                className="text-xs uppercase tracking-[0.14em] text-brass disabled:opacity-50"
                                            >
                                                {ajustando ? 'Salvando' : 'Salvar'}
                                            </button>
                                            <button type="button" onClick={fecharAjuste} className="text-xs uppercase tracking-[0.14em] text-ink/45">
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!unidadeAtivaId}
                                            onClick={() => abrirAjuste(s)}
                                            className="text-xs uppercase tracking-[0.14em] text-brass disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Ajustar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!carregando && saldos.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-14 text-center">
                                    <p className="font-display text-2xl italic text-ink/70">
                                        {busca.trim() ? 'Nenhum produto encontrado.' : 'A despensa ainda não tem movimento.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AppShell>
    );
}
