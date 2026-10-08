import { FormEvent, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import {
    CartaCategoria,
    CartaItem,
    DESTINOS,
    DestinoPedido,
    moeda,
    casaService,
} from '@/services/orion/casa.service';

export default function CardapioPage() {
    const [categorias, setCategorias] = useState<CartaCategoria[]>([]);
    const [itens, setItens] = useState<CartaItem[]>([]);
    const [categoria, setCategoria] = useState({ nome: '', ordem: 0, ativo: true });
    const [item, setItem] = useState({ categoriaId: 0, nome: '', preco: 0, destino: 'Cozinha' as DestinoPedido, ativo: true });
    const [erro, setErro] = useState('');

    const carregar = () => {
        Promise.all([casaService.categorias(), casaService.itens()])
            .then(([cats, pratos]) => {
                setCategorias(cats);
                setItens(pratos);
                setItem((atual) => ({ ...atual, categoriaId: atual.categoriaId || cats[0]?.id || 0 }));
            })
            .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir a carta.')));
    };

    useEffect(() => {
        carregar();
    }, []);

    const salvarCategoria = async (e: FormEvent) => {
        e.preventDefault();
        setErro('');
        try {
            await casaService.salvarCategoria(categoria);
            setCategoria({ nome: '', ordem: categorias.length + 1, ativo: true });
            carregar();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível guardar a categoria.'));
        }
    };

    const salvarItem = async (e: FormEvent) => {
        e.preventDefault();
        setErro('');
        try {
            await casaService.salvarItem(item);
            setItem({ ...item, nome: '', preco: 0 });
            carregar();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível guardar o prato.'));
        }
    };

    return (
        <AppShell>
            <PageIntro
                eyebrow="Carta"
                title="Cardápio"
                description="A carta que o restaurante consulta ao lançar. O preço gravado no pedido não muda se a carta mudar depois."
            />

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <form onSubmit={salvarCategoria} className="panel space-y-4 p-6">
                    <p className="kicker">Categoria</p>
                    <input className="field" placeholder="Entradas, grelhados, taça" value={categoria.nome} onChange={(e) => setCategoria({ ...categoria, nome: e.target.value })} required />
                    <button className="btn-primary" type="submit">Incluir categoria</button>
                    <ul className="divide-y divide-line">
                        {categorias.map((c) => (
                            <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                                <span className="font-display text-2xl">{c.nome}</span>
                                <button type="button" className="text-xs uppercase tracking-[0.16em] text-brass" onClick={() => casaService.salvarCategoria({ ...c, ativo: !c.ativo }).then(carregar)}>
                                    {c.ativo ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </li>
                        ))}
                    </ul>
                </form>

                <form onSubmit={salvarItem} className="panel space-y-4 p-6">
                    <p className="kicker">Prato</p>
                    <select className="field" value={item.categoriaId} onChange={(e) => setItem({ ...item, categoriaId: Number(e.target.value) })} required>
                        {categorias.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <input className="field" placeholder="Nome do prato" value={item.nome} onChange={(e) => setItem({ ...item, nome: e.target.value })} required />
                    <div className="grid grid-cols-2 gap-3">
                        <input className="field" type="number" min={0} step="0.01" value={item.preco} onChange={(e) => setItem({ ...item, preco: Number(e.target.value) })} />
                        <select className="field" value={item.destino} onChange={(e) => setItem({ ...item, destino: e.target.value as DestinoPedido })}>
                            {DESTINOS.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                    </div>
                    <button className="btn-primary" type="submit" disabled={categorias.length === 0}>Incluir prato</button>
                </form>
            </div>

            {erro && <p className="alert-error mt-4">{erro}</p>}

            <div className="mt-10 space-y-8">
                {categorias.map((c) => {
                    const pratos = itens.filter((i) => i.categoriaId === c.id);
                    if (pratos.length === 0) return null;
                    return (
                        <section key={c.id}>
                            <p className="kicker">{c.nome}</p>
                            <ul className="mt-3 divide-y divide-line border border-line bg-paper">
                                {pratos.map((prato) => (
                                    <li key={prato.id} className="flex items-center justify-between gap-4 px-5 py-4">
                                        <div>
                                            <p className="font-display text-2xl">{prato.nome}</p>
                                            <p className="text-xs uppercase tracking-[0.16em] text-ink/40">{prato.destino} · {prato.ativo ? 'na carta' : 'oculto'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">{moeda(prato.preco)}</span>
                                            <button type="button" className="btn-line" onClick={() => casaService.salvarItem({ ...prato, ativo: !prato.ativo }, prato.id).then(carregar)}>
                                                {prato.ativo ? 'Ocultar' : 'Mostrar'}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
                {itens.length === 0 && (
                    <div className="panel px-6 py-16 text-center">
                        <p className="font-display text-3xl italic text-ink/80">A carta ainda não foi composta.</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
