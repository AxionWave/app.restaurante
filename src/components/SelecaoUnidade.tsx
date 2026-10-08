import { useEffect, useState, useSyncExternalStore } from 'react';
import { estoqueService } from '@/services/orion/estoque.service';
import type { UnidadeCore } from '@/services/orion/estoque.types';
import { getUnidadeAtivaId, setUnidadeAtivaId, subscribeUnidadeAtiva } from '@/state/unidadeAtiva.store';

/**
 * Seletor de unidade ativa (filial) — só aparece para quem tem o módulo Estoque, pois é o único
 * que hoje depende de X-Unidade-Id. Auto-seleciona quando a empresa só tem uma unidade.
 */
export default function SelecaoUnidade() {
    const unidadeAtivaId = useSyncExternalStore(subscribeUnidadeAtiva, getUnidadeAtivaId);
    const [unidades, setUnidades] = useState<UnidadeCore[] | null>(null);

    useEffect(() => {
        let cancelado = false;
        estoqueService
            .listarUnidades()
            .then((lista) => {
                if (cancelado) return;
                setUnidades(lista);
                if (lista.length === 1 && !getUnidadeAtivaId()) {
                    setUnidadeAtivaId(lista[0].id);
                }
            })
            .catch(() => setUnidades([]));
        return () => {
            cancelado = true;
        };
    }, []);

    if (!unidades || unidades.length <= 1) {
        return null;
    }

    return (
        <label className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink/45">
            <span className="hidden sm:inline">Unidade</span>
            <select
                className="field w-auto py-1.5 text-sm normal-case tracking-normal text-ink"
                value={unidadeAtivaId ?? ''}
                onChange={(e) => setUnidadeAtivaId(e.target.value ? Number(e.target.value) : null)}
            >
                <option value="" disabled>
                    Selecione...
                </option>
                {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                        {u.nome}
                    </option>
                ))}
            </select>
        </label>
    );
}
