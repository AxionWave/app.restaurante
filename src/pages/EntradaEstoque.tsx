import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import BuscarProduto from '@/pages/estoque/BuscarProduto';
import NovoProdutoForm from '@/pages/estoque/NovoProdutoForm';
import { estoqueService, novaChaveIdempotencia } from '@/services/orion/estoque.service';
import { getApiErrorMessage } from '@core/utils/apiError';
import { extrairChaveAcesso } from '@/utils/chaveAcesso';
import { getUnidadeAtivaId } from '@/state/unidadeAtiva.store';
import type { EntradaDto, ItemDto, OrigemEntrada, ProdutoCore, TipoEntrada } from '@/services/orion/estoque.types';

// @zxing/library é pesado (~500 kB) — só carrega quando o scanner é realmente aberto.
const LeitorCodigo = lazy(() => import('@/components/scanner/LeitorCodigo'));

type Motivo = 'COMPRA' | 'MANUAL' | 'INVENTARIO' | 'DEVOLUCAO';

const MOTIVOS: Record<Motivo, { label: string; tipo: TipoEntrada; origem: OrigemEntrada; ajuda: string }> = {
    MANUAL: { label: 'Sem nota', tipo: 'ENTRADA', origem: 'MANUAL', ajuda: 'Compra sem NF, produção própria, sobra — só contabiliza a entrada.' },
    COMPRA: { label: 'Compra (com nota)', tipo: 'ENTRADA', origem: 'COMPRA', ajuda: 'Escaneie o DANFE, importe o XML ou digite os itens da nota.' },
    INVENTARIO: { label: 'Contagem', tipo: 'AJUSTE', origem: 'INVENTARIO', ajuda: 'A quantidade informada vira o saldo do produto (ajuste de inventário).' },
    DEVOLUCAO: { label: 'Devolução', tipo: 'ENTRADA', origem: 'DEVOLUCAO', ajuda: 'Item que voltou ao estoque.' },
};

interface CarrinhoItem {
    chave: string;
    produtoCoreId: number;
    produtoCodigo: string;
    produtoNome: string;
    unidadeMedida: string;
    codigoBarras: string | null;
    quantidadeRecebida: string;
    fatorConversao: string;
    valorUnitarioNf: string;
}

function carrinhoItemDeProduto(p: ProdutoCore): CarrinhoItem {
    return {
        chave: novaChaveIdempotencia(),
        produtoCoreId: p.id,
        produtoCodigo: p.codigo,
        produtoNome: p.nome,
        unidadeMedida: p.unidadeMedida,
        codigoBarras: p.codigoBarras ?? null,
        quantidadeRecebida: '1',
        fatorConversao: p.fatorConversao ? String(p.fatorConversao) : '1',
        valorUnitarioNf: '',
    };
}

export default function EntradaEstoquePage() {
    const [motivo, setMotivo] = useState<Motivo>('MANUAL');
    const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
    const [entrada, setEntrada] = useState<EntradaDto | null>(null); // preenchida ao importar XML/chave
    const [confirmada, setConfirmada] = useState<EntradaDto | null>(null);

    const [scanner, setScanner] = useState<'produto' | 'danfe' | null>(null);
    const [codigoBarrasPendente, setCodigoBarrasPendente] = useState<string | null>(null);
    const [itemCriandoProduto, setItemCriandoProduto] = useState<number | null>(null);
    const [criandoProdutoManual, setCriandoProdutoManual] = useState(false);

    const [fornecedorNome, setFornecedorNome] = useState('');
    const [fornecedorCnpj, setFornecedorCnpj] = useState('');
    const [numeroNf, setNumeroNf] = useState('');
    const [observacao, setObservacao] = useState('');

    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const info = MOTIVOS[motivo];
    const unidadeAtivaId = getUnidadeAtivaId();

    function resetar() {
        setMotivo('MANUAL');
        setCarrinho([]);
        setEntrada(null);
        setConfirmada(null);
        setFornecedorNome('');
        setFornecedorCnpj('');
        setNumeroNf('');
        setObservacao('');
        setErro(null);
        setAviso(null);
    }

    function adicionarAoCarrinho(p: ProdutoCore) {
        setCarrinho((c) => [...c, carrinhoItemDeProduto(p)]);
        setCodigoBarrasPendente(null);
        setCriandoProdutoManual(false);
    }

    function atualizarItem(chave: string, campo: keyof CarrinhoItem, valor: string) {
        setCarrinho((c) => c.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)));
    }

    function removerItem(chave: string) {
        setCarrinho((c) => c.filter((i) => i.chave !== chave));
    }

    async function onDetectarProduto(valor: string) {
        setScanner(null);
        setErro(null);
        try {
            const produto = await estoqueService.resolverCodigoBarras(valor);
            adicionarAoCarrinho(produto);
        } catch (e) {
            if ((e as { response?: { status?: number } }).response?.status === 404) {
                setCodigoBarrasPendente(valor);
            } else {
                setErro(getApiErrorMessage(e, 'Não foi possível buscar o produto.'));
            }
        }
    }

    async function onDetectarDanfe(valor: string) {
        setScanner(null);
        setErro(null);
        const chave = extrairChaveAcesso(valor);
        if (!chave) {
            setErro('Não foi possível reconhecer uma chave de acesso válida nesse código.');
            return;
        }
        setEnviando(true);
        try {
            const resp = await estoqueService.importarPorChave(chave, unidadeAtivaId);
            if ('itens' in resp) {
                setEntrada(resp);
                setAviso(resp.itens.length === 0 ? null : 'Nota importada. Confira os itens abaixo.');
            } else {
                setEntrada(resp.entrada);
                setAviso(resp.message);
            }
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível importar pela chave de acesso.'));
        } finally {
            setEnviando(false);
        }
    }

    async function onImportarXml(file: File) {
        setErro(null);
        setEnviando(true);
        try {
            const resp = await estoqueService.importarXml(file, unidadeAtivaId);
            setEntrada(resp);
            setAviso('Nota importada. Confira os itens abaixo.');
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível importar o XML.'));
        } finally {
            setEnviando(false);
        }
    }

    async function vincularItemDoRascunho(item: ItemDto, produto: ProdutoCore) {
        if (!entrada) return;
        try {
            const atualizada = await estoqueService.atualizarItem(entrada.id, item.id, { produtoCoreId: produto.id });
            setEntrada(atualizada);
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível vincular o produto.'));
        }
    }

    async function criarProdutoParaItemDoRascunho(item: ItemDto, produto: ProdutoCore) {
        if (!entrada) return;
        try {
            const atualizada = await estoqueService.atualizarItem(entrada.id, item.id, { produtoCoreId: produto.id });
            setEntrada(atualizada);
            setItemCriandoProduto(null);
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível vincular o produto.'));
        }
    }

    async function confirmarEntrada() {
        setErro(null);
        setEnviando(true);
        try {
            let id = entrada?.id;
            if (!id) {
                if (carrinho.length === 0) {
                    setErro('Adicione ao menos um item.');
                    setEnviando(false);
                    return;
                }
                const criada = await estoqueService.criarEntrada({
                    chaveIdempotencia: novaChaveIdempotencia(),
                    unidadeId: unidadeAtivaId,
                    tipo: info.tipo,
                    origem: info.origem,
                    observacao: observacao || null,
                    fiscal:
                        motivo === 'COMPRA'
                            ? { fornecedorNome: fornecedorNome || null, fornecedorCnpj: fornecedorCnpj || null, numeroNf: numeroNf || null }
                            : null,
                    itens: carrinho.map((i) => ({
                        produtoCoreId: i.produtoCoreId,
                        quantidadeRecebida: Number(i.quantidadeRecebida.replace(',', '.')) || 0,
                        fatorConversao: i.fatorConversao ? Number(i.fatorConversao.replace(',', '.')) : null,
                        valorUnitarioNf: i.valorUnitarioNf ? Number(i.valorUnitarioNf.replace(',', '.')) : null,
                    })),
                });
                id = criada.id;
                setEntrada(criada);
            }
            const confirmadaResp = await estoqueService.confirmar(id);
            setConfirmada(confirmadaResp);
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível confirmar a entrada.'));
        } finally {
            setEnviando(false);
        }
    }

    if (confirmada) {
        return (
            <AppShell>
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                        <h1 className="text-lg font-semibold text-emerald-900">Entrada confirmada</h1>
                        <p className="mt-1 text-sm text-emerald-800">
                            {confirmada.itens.length} item(ns) lançado(s) no estoque{confirmada.numeroNf ? ` — NF ${confirmada.numeroNf}` : ''}.
                        </p>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Produto</th>
                                    <th className="px-4 py-2">Entrou</th>
                                    <th className="px-4 py-2">Saldo agora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {confirmada.itens.map((i) => (
                                    <tr key={i.id}>
                                        <td className="px-4 py-2">{i.produtoCodigo}</td>
                                        <td className="px-4 py-2">{i.quantidadeEstoque}</td>
                                        <td className="px-4 py-2 font-medium">{i.saldoResultante ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={resetar}
                            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                        >
                            Nova entrada
                        </button>
                        <Link to="/estoque" className="rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
                            Ver estoque
                        </Link>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <Link to="/estoque" className="text-xs text-slate-500 hover:underline">
                ← Voltar ao estoque
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nova entrada de estoque</h1>
            <p className="mt-1 text-sm text-slate-500">Compra com nota, sem nota, devolução ou contagem de inventário.</p>

            {!unidadeAtivaId && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    Selecione a unidade no topo da página antes de continuar.
                </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
                {(Object.keys(MOTIVOS) as Motivo[]).map((m) => (
                    <button
                        key={m}
                        type="button"
                        disabled={!!entrada}
                        onClick={() => setMotivo(m)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            motivo === m ? 'bg-accent text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {MOTIVOS[m].label}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">{info.ajuda}</p>

            {erro && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>}
            {aviso && <p className="mt-4 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-800">{aviso}</p>}

            {!entrada && (
                <>
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-sm font-semibold text-slate-900">Adicionar itens</p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <div className="flex-1">
                                <BuscarProduto onEscolher={adicionarAoCarrinho} />
                            </div>
                            <button
                                type="button"
                                onClick={() => setScanner('produto')}
                                className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                            >
                                📷 Escanear produto
                            </button>
                            <button
                                type="button"
                                onClick={() => setCriandoProdutoManual(true)}
                                className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/40"
                            >
                                + Novo produto
                            </button>
                            {motivo === 'COMPRA' && (
                                <button
                                    type="button"
                                    onClick={() => setScanner('danfe')}
                                    className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/40"
                                >
                                    📷 Escanear DANFE
                                </button>
                            )}
                            {motivo === 'COMPRA' && (
                                <label className="cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                                    Importar XML
                                    <input
                                        type="file"
                                        accept=".xml,text/xml,application/xml"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            if (file) void onImportarXml(file);
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        {codigoBarrasPendente && (
                            <div className="mt-4">
                                <NovoProdutoForm
                                    codigoBarrasSugerido={codigoBarrasPendente}
                                    onCriado={adicionarAoCarrinho}
                                    onCancelar={() => setCodigoBarrasPendente(null)}
                                />
                            </div>
                        )}

                        {criandoProdutoManual && (
                            <div className="mt-4">
                                <NovoProdutoForm
                                    onCriado={adicionarAoCarrinho}
                                    onCancelar={() => setCriandoProdutoManual(false)}
                                />
                            </div>
                        )}
                    </div>

                    {carrinho.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2">Produto</th>
                                        <th className="px-4 py-2">{motivo === 'INVENTARIO' ? 'Contagem' : 'Quantidade'}</th>
                                        <th className="px-4 py-2">Fator</th>
                                        <th className="px-4 py-2">Custo unit.</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {carrinho.map((i) => (
                                        <tr key={i.chave}>
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-slate-900">{i.produtoNome}</p>
                                                <p className="font-mono text-xs text-slate-400">{i.produtoCodigo}</p>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={i.quantidadeRecebida}
                                                    onChange={(e) => atualizarItem(i.chave, 'quantidadeRecebida', e.target.value)}
                                                    className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={i.fatorConversao}
                                                    onChange={(e) => atualizarItem(i.chave, 'fatorConversao', e.target.value)}
                                                    className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="opcional"
                                                    value={i.valorUnitarioNf}
                                                    onChange={(e) => atualizarItem(i.chave, 'valorUnitarioNf', e.target.value)}
                                                    className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button type="button" onClick={() => removerItem(i.chave)} className="text-xs text-red-600 hover:underline">
                                                    remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {motivo === 'COMPRA' && (
                        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
                            <div>
                                <label className="text-xs font-medium text-slate-600">Fornecedor</label>
                                <input
                                    value={fornecedorNome}
                                    onChange={(e) => setFornecedorNome(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600">CNPJ</label>
                                <input
                                    value={fornecedorCnpj}
                                    onChange={(e) => setFornecedorCnpj(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600">Nº da NF</label>
                                <input
                                    value={numeroNf}
                                    onChange={(e) => setNumeroNf(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="text-xs font-medium text-slate-600">Observação</label>
                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                </>
            )}

            {entrada && (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                        {entrada.fornecedorNome && <span className="font-medium">{entrada.fornecedorNome}</span>}
                        {entrada.numeroNf && <span className="ml-2 text-slate-400">NF {entrada.numeroNf}</span>}
                        {entrada.chaveAcesso && <span className="ml-2 block font-mono text-xs text-slate-400">{entrada.chaveAcesso}</span>}
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Item da nota</th>
                                <th className="px-4 py-2">Qtd</th>
                                <th className="px-4 py-2">Vínculo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entrada.itens.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-2">
                                        <p className="text-slate-900">{item.descricaoNf || item.produtoCodigo}</p>
                                        {item.codigoBarrasNf && <p className="font-mono text-xs text-slate-400">{item.codigoBarrasNf}</p>}
                                        {item.divergencia && (
                                            <p className="text-xs text-amber-700">
                                                NF: {item.quantidadeNf} · recebido: {item.quantidadeRecebida}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{item.quantidadeRecebida}</td>
                                    <td className="px-4 py-2">
                                        {item.statusVinculo !== 'PENDENTE' ? (
                                            <span className="text-xs font-medium text-emerald-700">
                                                {item.produtoCodigo} ✓
                                            </span>
                                        ) : itemCriandoProduto === item.id ? (
                                            <div className="max-w-xs">
                                                <NovoProdutoForm
                                                    codigoBarrasSugerido={item.codigoBarrasNf}
                                                    onCriado={(p) => void criarProdutoParaItemDoRascunho(item, p)}
                                                    onCancelar={() => setItemCriandoProduto(null)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="max-w-xs">
                                                <BuscarProduto
                                                    placeholder="Vincular a um produto..."
                                                    onEscolher={(p) => void vincularItemDoRascunho(item, p)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setItemCriandoProduto(item.id)}
                                                    className="mt-1 text-xs text-accent hover:underline"
                                                >
                                                    + cadastrar novo produto
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {entrada.itens.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                                        Sem itens ainda — importe o XML da nota para preencher automaticamente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    disabled={enviando || !unidadeAtivaId || (entrada ? entrada.itens.length === 0 : carrinho.length === 0)}
                    onClick={() => void confirmarEntrada()}
                    className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {enviando ? 'Enviando...' : 'Confirmar entrada'}
                </button>
                {(entrada || carrinho.length > 0) && (
                    <button type="button" onClick={resetar} className="rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">
                        Cancelar
                    </button>
                )}
            </div>

            {scanner && (
                <Suspense
                    fallback={
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-sm text-white">
                            Carregando câmera...
                        </div>
                    }
                >
                    <LeitorCodigo
                        formatos={scanner === 'produto' ? ['ean'] : ['qr']}
                        titulo={scanner === 'produto' ? 'Escanear código de barras' : 'Escanear DANFE'}
                        onDetectar={(valor) => void (scanner === 'produto' ? onDetectarProduto(valor) : onDetectarDanfe(valor))}
                        onFechar={() => setScanner(null)}
                    />
                </Suspense>
            )}
        </AppShell>
    );
}
