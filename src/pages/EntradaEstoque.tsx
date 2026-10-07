import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import BuscarProduto from '@/pages/estoque/BuscarProduto';
import NovoProdutoForm from '@/pages/estoque/NovoProdutoForm';
import { estoqueService, novaChaveIdempotencia } from '@/services/orion/estoque.service';
import { getApiErrorMessage } from '@core/utils/apiError';
import { chaveValida, extrairChaveAcesso } from '@/utils/chaveAcesso';
import { extrairPesoVariavel } from '@/utils/pesoVariavel';
import { getUnidadeAtivaId } from '@/state/unidadeAtiva.store';
import type { EntradaDto, ItemDto, OrigemEntrada, ProdutoCore, TipoEntrada } from '@/services/orion/estoque.types';

// @zxing/library e tesseract.js são pesados — só carregam quando o scanner é realmente aberto.
const LeitorCodigo = lazy(() => import('@/components/scanner/LeitorCodigo'));
const LeitorPeso = lazy(() => import('@/components/scanner/LeitorPeso'));

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

    const [mostrarInputChave, setMostrarInputChave] = useState(false);
    const [mostrarNotaFiscal, setMostrarNotaFiscal] = useState(false);
    const [chaveDigitada, setChaveDigitada] = useState('');
    const [arrastandoXml, setArrastandoXml] = useState(false);

    // peso lido (código de balança ou foto da etiqueta) aguardando o produto ser escolhido/criado
    const [pesoPendente, setPesoPendente] = useState<number | null>(null);
    // null = fechado; '' = aplica ao próximo produto adicionado; outro valor = chave do item do carrinho sendo pesado
    const [pesandoChave, setPesandoChave] = useState<string | null>(null);

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
        setPesoPendente(null);
        setMostrarNotaFiscal(false);
        setMostrarInputChave(false);
    }

    function adicionarAoCarrinho(p: ProdutoCore) {
        const item = carrinhoItemDeProduto(p);
        if (pesoPendente != null) {
            item.quantidadeRecebida = String(pesoPendente);
        }
        setCarrinho((c) => [...c, item]);
        setCodigoBarrasPendente(null);
        setCriandoProdutoManual(false);
        setPesoPendente(null);
    }

    function onDetectarPeso(pesoKg: number) {
        if (pesandoChave) {
            atualizarItem(pesandoChave, 'quantidadeRecebida', String(pesoKg));
        } else {
            setPesoPendente(pesoKg);
            setAviso(`Peso lido: ${pesoKg} kg — agora escaneie ou busque o produto para aplicar.`);
        }
        setPesandoChave(null);
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

        const pesoVariavel = extrairPesoVariavel(valor);
        if (pesoVariavel) {
            try {
                const encontrados = await estoqueService.buscarProdutos(pesoVariavel.plu);
                if (encontrados.length === 1) {
                    setPesoPendente(pesoVariavel.pesoKg);
                    adicionarAoCarrinho(encontrados[0]);
                } else {
                    // produto novo ou ambíguo: abre o cadastro já com o peso lido pronto pra aplicar
                    setPesoPendente(pesoVariavel.pesoKg);
                    setCriandoProdutoManual(true);
                    setAviso(`Peso lido: ${pesoVariavel.pesoKg} kg. Não achei um produto só com esse código — cadastre um novo.`);
                }
            } catch (e) {
                setErro(getApiErrorMessage(e, 'Não foi possível buscar o produto pelo código de peso.'));
            }
            return;
        }

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

    async function importarPelaChave(chave: string) {
        setErro(null);
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
            setChaveDigitada('');
            setMostrarInputChave(false);
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível importar pela chave de acesso.'));
        } finally {
            setEnviando(false);
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
        await importarPelaChave(chave);
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
                        <p className="text-sm font-semibold text-slate-900">Adicionar produto</p>
                        <p className="mt-0.5 text-xs text-slate-500">Busque pelo nome ou use a câmera — o jeito mais rápido.</p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <div className="flex-1">
                                <BuscarProduto onEscolher={adicionarAoCarrinho} />
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={() => setScanner('produto')}
                                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                            >
                                📷 Escanear código
                            </button>
                            <button
                                type="button"
                                onClick={() => setPesandoChave('')}
                                className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-accent ring-1 ring-accent/40"
                            >
                                ⚖️ Ler peso da etiqueta
                            </button>
                            <button
                                type="button"
                                onClick={() => setCriandoProdutoManual(true)}
                                className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                ✍️ Cadastrar produto novo
                            </button>
                        </div>

                        {pesoPendente != null && (
                            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                                ⚖️ Peso pronto: <strong>{pesoPendente} kg</strong> — escaneie ou busque o produto pra aplicar.
                            </p>
                        )}

                        {motivo === 'COMPRA' && (
                            <div className="mt-5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setMostrarNotaFiscal((v) => !v)}
                                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                                >
                                    {mostrarNotaFiscal ? '▾' : '▸'} Já tem a nota fiscal? (XML, DANFE ou chave de acesso)
                                </button>

                                {mostrarNotaFiscal && (
                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => setScanner('danfe')}
                                            className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/40"
                                        >
                                            📷 Escanear DANFE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarInputChave((v) => !v)}
                                            className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                        >
                                            Digitar a chave
                                        </button>
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
                                    </div>
                                )}

                                {mostrarInputChave && (
                                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <label className="text-xs font-medium text-slate-600">Chave de acesso da NF-e (44 dígitos)</label>
                                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                            {(() => {
                                                const digitos = chaveDigitada.length;
                                                const valida = digitos === 44 && chaveValida(chaveDigitada);
                                                const corBorda =
                                                    digitos === 0
                                                        ? 'border-slate-200 focus:border-accent'
                                                        : valida
                                                          ? 'border-emerald-400'
                                                          : digitos === 44
                                                            ? 'border-red-300'
                                                            : 'border-amber-300';
                                                return (
                                                    <>
                                                        <div className="relative flex-1">
                                                            <input
                                                                value={chaveDigitada}
                                                                onChange={(e) => setChaveDigitada(e.target.value.replace(/\D/g, '').slice(0, 44))}
                                                                placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                                                                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm tracking-tight outline-none ${corBorda}`}
                                                            />
                                                            {digitos > 0 && (
                                                                <span
                                                                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                                                                        valida ? 'text-emerald-600' : digitos === 44 ? 'text-red-600' : 'text-amber-600'
                                                                    }`}
                                                                >
                                                                    {valida ? '✓' : digitos === 44 ? 'chave inválida' : `${digitos}/44`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!valida || enviando}
                                                            onClick={() => void importarPelaChave(chaveDigitada)}
                                                            className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            Buscar
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={i.quantidadeRecebida}
                                                        onChange={(e) => atualizarItem(i.chave, 'quantidadeRecebida', e.target.value)}
                                                        className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPesandoChave(i.chave)}
                                                        title="Ler peso da etiqueta"
                                                        className="rounded px-1.5 py-1 text-sm hover:bg-slate-100"
                                                    >
                                                        ⚖️
                                                    </button>
                                                </div>
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
                    {entrada.itens.length === 0 ? (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setArrastandoXml(true);
                            }}
                            onDragLeave={() => setArrastandoXml(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setArrastandoXml(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) void onImportarXml(file);
                            }}
                            className="p-5"
                        >
                            <p className="text-sm font-semibold text-slate-900">📄 Não encontramos os dados automaticamente</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Sem certificado digital configurado, não dá para buscar a nota na SEFAZ só pela chave. Anexe o XML
                                desta nota (baixado do fornecedor ou do portal da SEFAZ) para completar os itens automaticamente.
                            </p>
                            <label
                                className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                                    arrastandoXml ? 'border-accent bg-accent/5' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="text-2xl">⬆️</span>
                                <span className="text-sm font-medium text-slate-700">Arraste o XML aqui ou clique para selecionar</span>
                                <span className="text-xs text-slate-400">.xml da NF-e</span>
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
                            <button type="button" onClick={resetar} className="mt-3 text-xs text-slate-500 hover:underline">
                                ou cancele e lance os itens manualmente
                            </button>
                        </div>
                    ) : (
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
                        </tbody>
                    </table>
                    )}
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

            {pesandoChave !== null && (
                <Suspense
                    fallback={
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-sm text-white">
                            Carregando câmera...
                        </div>
                    }
                >
                    <LeitorPeso onDetectar={onDetectarPeso} onFechar={() => setPesandoChave(null)} />
                </Suspense>
            )}
        </AppShell>
    );
}
