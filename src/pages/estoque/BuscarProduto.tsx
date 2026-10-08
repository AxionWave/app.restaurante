import { useEffect, useRef, useState } from 'react';
import { estoqueService } from '@/services/orion/estoque.service';
import type { ProdutoCore } from '@/services/orion/estoque.types';
import NovoProdutoForm from '@/pages/estoque/NovoProdutoForm';

interface BuscarProdutoProps {
    onEscolher: (produto: ProdutoCore) => void;
    placeholder?: string;
}

/** Campo de busca com sugestões — usado para adicionar um item manualmente ou vincular um pendente. */
export default function BuscarProduto({ onEscolher, placeholder }: BuscarProdutoProps) {
    const [termo, setTermo] = useState('');
    const [resultados, setResultados] = useState<ProdutoCore[]>([]);
    const [aberto, setAberto] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [criandoNovo, setCriandoNovo] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!termo.trim()) {
            setResultados([]);
            return;
        }
        setCarregando(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            estoqueService
                .buscarProdutos(termo.trim())
                .then((lista) => setResultados(lista.slice(0, 15)))
                .catch(() => setResultados([]))
                .finally(() => setCarregando(false));
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [termo]);

    if (criandoNovo) {
        return (
            <NovoProdutoForm
                nomeSugerido={termo.trim()}
                onCriado={(p) => {
                    onEscolher(p);
                    setCriandoNovo(false);
                    setTermo('');
                    setResultados([]);
                }}
                onCancelar={() => setCriandoNovo(false)}
            />
        );
    }

    return (
        <div className="relative">
            <input
                type="text"
                value={termo}
                onChange={(e) => {
                    setTermo(e.target.value);
                    setAberto(true);
                }}
                onFocus={() => setAberto(true)}
                onBlur={() => setTimeout(() => setAberto(false), 150)}
                placeholder={placeholder || 'Buscar produto por nome ou código...'}
                className="field"
            />
            {aberto && termo.trim() && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto border border-line bg-paper shadow-maison">
                    {carregando && <p className="px-3 py-2 text-xs text-ink/40">Buscando...</p>}
                    {!carregando && resultados.length === 0 && (
                        <div className="px-3 py-3">
                            <p className="text-xs text-ink/45">Nenhum produto encontrado.</p>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setCriandoNovo(true);
                                    setAberto(false);
                                }}
                                className="mt-2 text-xs uppercase tracking-[0.14em] text-brass"
                            >
                                Cadastrar novo produto
                            </button>
                        </div>
                    )}
                    {resultados.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onEscolher(p);
                                setTermo('');
                                setResultados([]);
                                setAberto(false);
                            }}
                            className="block w-full px-3 py-2.5 text-left text-sm hover:bg-ivory"
                        >
                            <span className="font-medium text-ink">{p.nome}</span>
                            <span className="ml-2 font-mono text-xs text-ink/40">{p.codigo}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
