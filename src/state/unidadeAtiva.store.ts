/**
 * Unidade (filial) ativa da sessão — usada em toda chamada de estoque via header X-Unidade-Id.
 * Store simples (localStorage + pub/sub) em vez de Context: é estado global único da aba,
 * lido tanto pelo interceptor do axios (fora da árvore React) quanto pelos componentes.
 */
const KEY = 'orion.unidadeAtiva';

type Listener = () => void;
const listeners = new Set<Listener>();

function ler(): number | null {
    try {
        const raw = localStorage.getItem(KEY);
        const id = raw ? Number(raw) : NaN;
        return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

let atual: number | null = ler();

export function getUnidadeAtivaId(): number | null {
    return atual;
}

export function setUnidadeAtivaId(id: number | null): void {
    atual = id && id > 0 ? id : null;
    try {
        if (atual) {
            localStorage.setItem(KEY, String(atual));
        } else {
            localStorage.removeItem(KEY);
        }
    } catch {
        // localStorage indisponível (modo privado etc.) — mantém só em memória.
    }
    listeners.forEach((l) => l());
}

export function subscribeUnidadeAtiva(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
