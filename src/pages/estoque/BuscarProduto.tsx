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
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            {aberto && termo.trim() && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {carregando && <p className="px-3 py-2 text-xs text-slate-400">Buscando...</p>}
                    {!carregando && resultados.length === 0 && (
                        <div className="px-3 py-2">
                            <p className="text-xs text-slate-400">Nenhum produto encontrado.</p>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setCriandoNovo(true);
                                    setAberto(false);
                                }}
                                className="mt-1 text-xs font-medium text-accent hover:underline"
                            >
                                + cadastrar novo produto
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
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                            <span className="font-medium text-slate-900">{p.nome}</span>
                            <span className="ml-2 font-mono text-xs text-slate-400">{p.codigo}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
