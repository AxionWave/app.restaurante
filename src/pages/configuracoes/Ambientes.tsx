import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import { Ambiente, casaService } from '@/services/orion/casa.service';

const vazio = { nome: '', ordem: 0, ativo: true };

export default function AmbientesPage() {
    const [lista, setLista] = useState<Ambiente[]>([]);
    const [form, setForm] = useState(vazio);
    const [editando, setEditando] = useState<number | null>(null);
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);

    const carregar = () => {
        casaService.ambientes().then(setLista).catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir os ambientes.')));
    };

    useEffect(() => {
        carregar();
    }, []);

    const editar = (item: Ambiente) => {
        setEditando(item.id);
        setForm({ nome: item.nome, ordem: item.ordem, ativo: item.ativo });
    };

    const limpar = () => {
        setEditando(null);
        setForm(vazio);
    };

    const salvar = async (e: FormEvent) => {
        e.preventDefault();
        setErro('');
        setSalvando(true);
        try {
            await casaService.salvarAmbiente(form, editando ?? undefined);
            limpar();
            carregar();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível guardar o ambiente.'));
        } finally {
            setSalvando(false);
        }
    };

    return (
        <AppShell>
            <PageIntro eyebrow="Casa" title="Ambientes" description="As áreas do mapa. A ordem define como o restaurante se apresenta.">
                <Link to="/configuracoes" className="btn-line">Voltar</Link>
            </PageIntro>

            <form onSubmit={salvar} className="panel mt-10 grid gap-4 p-6 md:grid-cols-[1fr_8rem_auto_auto] md:items-end">
                <label className="block text-sm">
                    <span className="kicker">Nome</span>
                    <input className="field mt-2" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </label>
                <label className="block text-sm">
                    <span className="kicker">Ordem</span>
                    <input className="field mt-2" type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 pb-3 text-sm text-ink/70">
                    <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                    Ativo
                </label>
                <div className="flex gap-2">
                    <button className="btn-primary" disabled={salvando} type="submit">{editando ? 'Guardar' : 'Incluir'}</button>
                    {editando && <button className="btn-ghost" type="button" onClick={limpar}>Cancelar</button>}
                </div>
            </form>

            {erro && <p className="alert-error mt-4">{erro}</p>}

            <ul className="mt-8 divide-y divide-line border border-line bg-paper">
                {lista.length === 0 && <li className="px-6 py-10 text-sm text-ink/50">Nenhum ambiente ainda.</li>}
                {lista.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div>
                            <p className="font-display text-2xl">{item.nome}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-ink/40">{item.ativo ? 'Ativo' : 'Oculto no mapa'} · ordem {item.ordem}</p>
                        </div>
                        <button type="button" className="btn-line" onClick={() => editar(item)}>Editar</button>
                    </li>
                ))}
            </ul>
        </AppShell>
    );
}
