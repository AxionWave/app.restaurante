import { useState } from 'react';
import { estoqueService } from '@/services/orion/estoque.service';
import { getApiErrorMessage } from '@core/utils/apiError';
import type { ProdutoCore } from '@/services/orion/estoque.types';

const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PC', 'DZ', 'FD'];

interface NovoProdutoFormProps {
    codigoBarrasSugerido?: string | null;
    nomeSugerido?: string;
    onCriado: (produto: ProdutoCore) => void;
    onCancelar: () => void;
}

/** Cadastro rápido de produto — usado quando um código de barras escaneado ou uma busca não acham nada no catálogo. */
export default function NovoProdutoForm({ codigoBarrasSugerido, nomeSugerido, onCriado, onCancelar }: NovoProdutoFormProps) {
    const [codigo, setCodigo] = useState('');
    const [nome, setNome] = useState(nomeSugerido ?? '');
    const [unidadeMedida, setUnidadeMedida] = useState('UN');
    const [unidadeCompra, setUnidadeCompra] = useState('');
    const [fatorConversao, setFatorConversao] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    async function salvar() {
        if (!codigo.trim() || !nome.trim()) {
            setErro('Informe código e nome do produto.');
            return;
        }
        setSalvando(true);
        setErro(null);
        try {
            const produto = await estoqueService.criarProduto({
                codigo: codigo.trim(),
                nome: nome.trim(),
                unidadeMedida,
                unidadeCompra: unidadeCompra || null,
                fatorConversao: fatorConversao ? Number(fatorConversao) : null,
                codigoBarras: codigoBarrasSugerido || null,
            });
            onCriado(produto);
        } catch (e) {
            setErro(getApiErrorMessage(e, 'Não foi possível cadastrar o produto.'));
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Novo produto</p>
            {codigoBarrasSugerido && (
                <p className="mt-1 font-mono text-xs text-slate-500">Código de barras: {codigoBarrasSugerido}</p>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="text-xs font-medium text-slate-600">Código (SKU) *</label>
                    <input
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600">Nome *</label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600">Unidade de estoque</label>
                    <select
                        value={unidadeMedida}
                        onChange={(e) => setUnidadeMedida(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    >
                        {UNIDADES.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600">Unidade de compra (opcional)</label>
                    <select
                        value={unidadeCompra}
                        onChange={(e) => setUnidadeCompra(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    >
                        <option value="">— igual à unidade de estoque —</option>
                        {UNIDADES.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>
                {unidadeCompra && (
                    <div>
                        <label className="text-xs font-medium text-slate-600">
                            1 {unidadeCompra} equivale a quantas {unidadeMedida}?
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={fatorConversao}
                            onChange={(e) => setFatorConversao(e.target.value)}
                            placeholder="ex.: 12"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                        />
                    </div>
                )}
            </div>
            {erro && <p className="mt-2 text-xs text-red-700">{erro}</p>}
            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    disabled={salvando}
                    onClick={salvar}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {salvando ? 'Salvando...' : 'Cadastrar e usar'}
                </button>
                <button type="button" onClick={onCancelar} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                    Cancelar
                </button>
            </div>
        </div>
    );
}
