import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageIntro from '@/components/PageIntro';
import { httpClient } from '@core/services/http.service';
import { getApiErrorMessage } from '@core/utils/apiError';

const PERFIL = 'Funcionário Orion';
const FUNCOES = ['Garçom', 'Maître', 'Caixa'];

interface Perfil {
    id: number;
    nome: string;
}

interface Pessoa {
    id: number;
    nomeCompleto: string;
    emailLogin?: string;
    cpf?: string;
    cargoTexto?: string;
    podeLogar?: boolean;
    estaAtivo?: boolean;
    perfilAcessoId?: number;
}

interface Pagina<T> {
    content?: T[];
}

const vazio = { nomeCompleto: '', emailLogin: '', cpf: '', cargoTexto: 'Garçom' };

export default function EquipePage() {
    const [perfilId, setPerfilId] = useState<number | null>(null);
    const [lista, setLista] = useState<Pessoa[]>([]);
    const [form, setForm] = useState(vazio);
    const [erro, setErro] = useState('');
    const [aviso, setAviso] = useState('');
    const [salvando, setSalvando] = useState(false);

    const carregar = async (id: number) => {
        const { data } = await httpClient.get<Pagina<Pessoa>>('/api/pessoas', { params: { page: 0, size: 200 } });
        setLista((data.content ?? []).filter((p) => p.perfilAcessoId === id));
    };

    useEffect(() => {
        httpClient
            .get<Pagina<Perfil>>('/api/perfis-acesso', { params: { page: 0, size: 100, search: PERFIL } })
            .then(async ({ data }) => {
                const perfil = (data.content ?? []).find((p) => p.nome === PERFIL);
                if (!perfil) {
                    setAviso('O perfil da equipe ainda não está nesta casa. Saia, entre de novo, e volte a esta tela.');
                    return;
                }
                setPerfilId(perfil.id);
                await carregar(perfil.id);
            })
            .catch((e) => setErro(getApiErrorMessage(e, 'Não foi possível abrir a equipe.')));
    }, []);

    const salvar = async (e: FormEvent) => {
        e.preventDefault();
        if (!perfilId) return;
        setErro('');
        setAviso('');
        setSalvando(true);
        const cpf = form.cpf.replace(/\D/g, '');
        const corpo = {
            nomeCompleto: form.nomeCompleto.trim(),
            emailLogin: form.emailLogin.trim(),
            cpf,
            cargoTexto: form.cargoTexto,
            podeLogar: true,
            estaAtivo: true,
            perfilAcessoId: perfilId,
            dataAdmissao: new Date().toISOString().slice(0, 10),
        };
        try {
            let existente: Pessoa | null = null;
            try {
                const { data } = await httpClient.get<Pessoa>(`/api/pessoas/email/${encodeURIComponent(corpo.emailLogin)}`);
                existente = data;
            } catch {
                existente = null;
            }
            if (existente?.id) {
                await httpClient.put(`/api/pessoas/${existente.id}`, { ...existente, ...corpo, cpf: existente.cpf || cpf });
                setAviso('Esta pessoa já estava na casa. O acesso ao restaurante foi concedido.');
            } else {
                await httpClient.post('/api/pessoas', corpo);
                setAviso('Conta criada. A senha inicial é o CPF. A troca, se pedida, acontece no ASC.');
            }
            setForm(vazio);
            await carregar(perfilId);
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível guardar esta pessoa.'));
        } finally {
            setSalvando(false);
        }
    };

    const alternar = async (pessoa: Pessoa) => {
        if (!perfilId) return;
        setErro('');
        try {
            await httpClient.put(`/api/pessoas/${pessoa.id}`, {
                ...pessoa,
                estaAtivo: !pessoa.estaAtivo,
                podeLogar: true,
                perfilAcessoId: perfilId,
            });
            await carregar(perfilId);
        } catch (err) {
            setErro(getApiErrorMessage(err, 'Não foi possível atualizar o acesso.'));
        }
    };

    return (
        <AppShell>
            <PageIntro eyebrow="Casa" title="Equipe" description="Quem trabalha no restaurante entra com o próprio acesso e o pedido fica no nome de quem lançou.">
                <Link to="/configuracoes" className="btn-line">Voltar</Link>
            </PageIntro>

            <form onSubmit={salvar} className="panel mt-10 grid gap-4 p-6 md:grid-cols-2">
                <label className="text-sm">
                    <span className="kicker">Nome</span>
                    <input className="field mt-2" value={form.nomeCompleto} onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} required />
                </label>
                <label className="text-sm">
                    <span className="kicker">E-mail de acesso</span>
                    <input className="field mt-2" type="email" value={form.emailLogin} onChange={(e) => setForm({ ...form, emailLogin: e.target.value })} required />
                </label>
                <label className="text-sm">
                    <span className="kicker">CPF</span>
                    <input className="field mt-2" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
                </label>
                <label className="text-sm">
                    <span className="kicker">Função na casa</span>
                    <select className="field mt-2" value={form.cargoTexto} onChange={(e) => setForm({ ...form, cargoTexto: e.target.value })}>
                        {FUNCOES.map((f) => <option key={f}>{f}</option>)}
                    </select>
                </label>
                <div className="md:col-span-2">
                    <button className="btn-primary" type="submit" disabled={salvando || !perfilId}>Incluir na equipe</button>
                </div>
            </form>

            {erro && <p className="alert-error mt-4">{erro}</p>}
            {aviso && <p className="alert-note mt-4">{aviso}</p>}

            <ul className="mt-8 divide-y divide-line border border-line bg-paper">
                {lista.length === 0 && <li className="px-6 py-10 text-sm text-ink/50">Ninguém nesta equipe ainda.</li>}
                {lista.map((pessoa) => (
                    <li key={pessoa.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div>
                            <p className="font-display text-2xl">{pessoa.nomeCompleto}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-ink/40">
                                {pessoa.cargoTexto || 'Equipe'} · {pessoa.emailLogin} · {pessoa.estaAtivo === false ? 'acesso desligado' : 'acesso ativo'}
                            </p>
                        </div>
                        <button type="button" className="btn-line" onClick={() => alternar(pessoa)}>
                            {pessoa.estaAtivo === false ? 'Reativar' : 'Desligar'}
                        </button>
                    </li>
                ))}
            </ul>
        </AppShell>
    );
}
