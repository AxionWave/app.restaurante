import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Estoque</h1>
                    <p className="mt-1 text-sm text-slate-500">O que você tem em mãos hoje, por produto.</p>
                </div>
                <Link
                    to="/estoque/entrada"
                    className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                    + Nova entrada
                </Link>
            </div>

            {!unidadeAtivaId && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    Selecione a unidade no topo da página para ver e ajustar o estoque.
                </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase text-slate-500">Produtos em estoque</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{saldos.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase text-slate-500">Valor total em estoque</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {temCusto ? formatoMoeda.format(valorTotalEstoque) : '—'}
                    </p>
                </div>
                <div
                    className={`rounded-xl border p-4 ${
                        qtdEstoqueBaixo > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
                    }`}
                >
                    <p className={`text-xs font-medium uppercase ${qtdEstoqueBaixo > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                        Estoque baixo
                    </p>
                    <p className={`mt-1 text-2xl font-semibold ${qtdEstoqueBaixo > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                        {qtdEstoqueBaixo > 0 ? `⚠️ ${qtdEstoqueBaixo}` : '—'}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
                <div className="relative w-full max-w-sm">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome ou código..."
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm focus:border-accent focus:outline-none"
                    />
                    {busca && (
                        <button
                            type="button"
                            onClick={() => setBusca('')}
                            aria-label="Limpar busca"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            ×
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => recarregar(busca.trim() || undefined)}
                    disabled={carregando}
                    className="whitespace-nowrap text-xs font-medium text-accent hover:underline disabled:opacity-50"
                >
                    {carregando ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-2">Produto</th>
                            <th className="px-4 py-2">Quantidade</th>
                            <th className="px-4 py-2">Custo médio</th>
                            <th className="px-4 py-2">Valor em estoque</th>
                            <th className="px-4 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {carregando && saldos.length === 0 &&
                            [0, 1, 2].map((i) => (
                                <tr key={`skeleton-${i}`} className="animate-pulse">
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-32 rounded bg-slate-100" />
                                        <div className="mt-1 h-3 w-16 rounded bg-slate-100" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-12 rounded bg-slate-100" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-16 rounded bg-slate-100" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-16 rounded bg-slate-100" />
                                    </td>
                                    <td className="px-4 py-3" />
                                </tr>
                            ))}
                        {saldos.map((s) => (
                            <tr key={s.produtoId} className={s.abaixoMinimo ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}>
                                <td className="px-4 py-2">
                                    <p className="font-medium text-slate-900">{s.produtoNome}</p>
                                    <p className="font-mono text-xs text-slate-400">{s.produtoCodigo}</p>
                                </td>
                                <td className="px-4 py-2">
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
                                                    className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                                />
                                                <span className="text-xs text-slate-500">{s.unidadeMedida}</span>
                                            </div>
                                            {erroAjuste && <p className="text-xs text-red-700">{erroAjuste}</p>}
                                        </div>
                                    ) : (
                                        <>
                                            {s.quantidade} {s.unidadeMedida}
                                            {s.abaixoMinimo && (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                    ⚠️ Estoque baixo
                                                </span>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-slate-600">
                                    {s.custoMedio != null ? formatoMoeda.format(s.custoMedio) : '—'}
                                </td>
                                <td className="px-4 py-2 text-slate-600">
                                    {s.custoMedio != null ? formatoMoeda.format(s.custoMedio * s.quantidade) : '—'}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {ajustandoProdutoId === s.produtoId ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                disabled={ajustando}
                                                onClick={() => void confirmarAjuste(s)}
                                                className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                                            >
                                                {ajustando ? 'Salvando...' : 'Salvar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={fecharAjuste}
                                                className="text-xs text-slate-500 hover:underline"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!unidadeAtivaId}
                                            onClick={() => abrirAjuste(s)}
                                            className="text-xs text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Ajustar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!carregando && saldos.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                                    <p className="text-2xl">📦</p>
                                    <p className="mt-2">
                                        {busca.trim() ? 'Nenhum produto encontrado.' : 'Nenhum produto com movimentação de estoque ainda.'}
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
