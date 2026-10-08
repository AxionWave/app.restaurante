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
        <div className="border border-brass/30 bg-brass-muted p-5">
            <p className="font-display text-2xl text-ink">Novo produto</p>
            {codigoBarrasSugerido && (
                <p className="mt-1 font-mono text-xs text-ink/50">Código de barras: {codigoBarrasSugerido}</p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink/50">Código (SKU) *</label>
                    <input
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        className="field mt-1.5"
                    />
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink/50">Nome *</label>
                    <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="field mt-1.5"
                    />
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink/50">Unidade de estoque</label>
                    <select
                        value={unidadeMedida}
                        onChange={(e) => setUnidadeMedida(e.target.value)}
                        className="field mt-1.5"
                    >
                        {UNIDADES.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink/50">Unidade de compra (opcional)</label>
                    <select
                        value={unidadeCompra}
                        onChange={(e) => setUnidadeCompra(e.target.value)}
                        className="field mt-1.5"
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
                        <label className="text-[11px] uppercase tracking-[0.16em] text-ink/50">
                            1 {unidadeCompra} equivale a quantas {unidadeMedida}?
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={fatorConversao}
                            onChange={(e) => setFatorConversao(e.target.value)}
                            placeholder="ex.: 12"
                            className="field mt-1.5"
                        />
                    </div>
                )}
            </div>
            {erro && <p className="alert-error mt-3">{erro}</p>}
            <div className="mt-5 flex gap-2">
                <button type="button" disabled={salvando} onClick={salvar} className="btn-primary">
                    {salvando ? 'Salvando...' : 'Cadastrar e usar'}
                </button>
                <button type="button" onClick={onCancelar} className="btn-ghost">
                    Cancelar
                </button>
            </div>
        </div>
    );
}
