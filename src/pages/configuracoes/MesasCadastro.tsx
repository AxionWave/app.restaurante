import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { getApiErrorMessage } from '@core/utils/apiError';
import { Ambiente, FormaMesa, Mesa, SituacaoMesa, casaService } from '@/services/orion/casa.service';

const vazio = { ambienteId: 0, rotulo: '', lugaresPadrao: 4, forma: 'Retangular' as FormaMesa, situacao: 'Ativa' as SituacaoMesa };

export default function MesasCadastroPage() {
    const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
    const [lista, setLista] = useState<Mesa[]>([]);
    const [form, setForm] = useState(vazio);
    const [editando, setEditando] = useState<number | null>(null);
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);

    const carregar = () => {
        Promise.all([casaService.ambientes(), casaService.mesas()])
            .then(([amb, mesas]) => {
                setAmbientes(amb);
                setLista(mesas);
                setForm((atual) => ({ ...atual, ambienteId: atual.ambienteId || amb[0]?.id || 0 }));
            })
            .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir as mesas.')));
    };

    useEffect(() => {
        carregar();
    }, []);

    const salvar = async (e: FormEvent) => {
        e.preventDefault();
        setErro('');
        setSalvando(true);
        try {
            await casaService.salvarMesa(form, editando ?? undefined);
            setEditando(null);
            setForm({ ...vazio, ambienteId: form.ambienteId });
            carregar();
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível guardar a mesa.'));
        } finally {
            setSalvando(false);
        }
    };

    return (
        <AppShell>
            <PageIntro eyebrow="Móveis" title="Mesas" description="O lugar padrão de cada mesa. A cadeira a mais, no serviço, não muda este cadastro.">
                <Link to="/configuracoes" className="btn-line">Voltar</Link>
            </PageIntro>

            {ambientes.length === 0 && (
                <p className="alert-note mt-8">Cadastre um ambiente antes de criar mesas.</p>
            )}

            <form onSubmit={salvar} className="panel mt-10 grid gap-4 p-6 md:grid-cols-2">
                <label className="text-sm">
                    <span className="kicker">Ambiente</span>
                    <select className="field mt-2" value={form.ambienteId} onChange={(e) => setForm({ ...form, ambienteId: Number(e.target.value) })} required>
                        {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                </label>
                <label className="text-sm">
                    <span className="kicker">Número ou nome</span>
                    <input className="field mt-2" value={form.rotulo} onChange={(e) => setForm({ ...form, rotulo: e.target.value })} required />
                </label>
                <label className="text-sm">
                    <span className="kicker">Lugares padrão</span>
                    <input className="field mt-2" type="number" min={1} value={form.lugaresPadrao} onChange={(e) => setForm({ ...form, lugaresPadrao: Number(e.target.value) })} />
                </label>
                <label className="text-sm">
                    <span className="kicker">Forma</span>
                    <select className="field mt-2" value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value as FormaMesa })}>
                        <option value="Retangular">Retangular</option>
                        <option value="Redonda">Redonda</option>
                    </select>
                </label>
                <label className="text-sm">
                    <span className="kicker">Situação</span>
                    <select className="field mt-2" value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value as SituacaoMesa })}>
                        <option value="Ativa">Ativa</option>
                        <option value="Bloqueada">Bloqueada</option>
                    </select>
                </label>
                <div className="flex items-end gap-2">
                    <button className="btn-primary" disabled={salvando || ambientes.length === 0} type="submit">{editando ? 'Guardar' : 'Incluir'}</button>
                    {editando && (
                        <button className="btn-ghost" type="button" onClick={() => { setEditando(null); setForm({ ...vazio, ambienteId: ambientes[0]?.id || 0 }); }}>
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            {erro && <p className="alert-error mt-4">{erro}</p>}

            <ul className="mt-8 divide-y divide-line border border-line bg-paper">
                {lista.length === 0 && <li className="px-6 py-10 text-sm text-ink/50">Nenhuma mesa ainda.</li>}
                {lista.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div>
                            <p className="font-display text-2xl">Mesa {item.rotulo}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-ink/40">
                                {item.ambienteNome} · {item.lugaresPadrao} lugares · {item.forma === 'Redonda' ? 'redonda' : 'retangular'} · {item.situacao === 'Ativa' ? 'ativa' : 'bloqueada'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-line"
                            onClick={() => {
                                setEditando(item.id);
                                setForm({
                                    ambienteId: item.ambienteId,
                                    rotulo: item.rotulo,
                                    lugaresPadrao: item.lugaresPadrao,
                                    forma: item.forma,
                                    situacao: item.situacao,
                                });
                            }}
                        >
                            Editar
                        </button>
                    </li>
                ))}
            </ul>
        </AppShell>
    );
}
