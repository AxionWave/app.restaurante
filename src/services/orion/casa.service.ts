import { httpClient } from '@core/services/http.service';
import { API_CONFIG } from '@core/config';

const base = `${API_CONFIG.productBase}/casa`;

export type FormaMesa = 'Redonda' | 'Retangular';
export type SituacaoMesa = 'Ativa' | 'Bloqueada';
export type StatusAtendimento = 'Aberta' | 'Conta' | 'Fechada';
export type DestinoPedido = 'Cozinha' | 'Bar' | 'Sobremesa';
export type StatusItem = 'Lancado' | 'EmPreparo' | 'Pronto' | 'Entregue' | 'Cancelado';
export type ModoFechamento = 'PorPessoa' | 'Dividido' | 'Anfitriao';

export interface Ambiente {
    id: number;
    nome: string;
    ordem: number;
    ativo: boolean;
}

export interface Mesa {
    id: number;
    ambienteId: number;
    ambienteNome: string;
    rotulo: string;
    lugaresPadrao: number;
    forma: FormaMesa;
    situacao: SituacaoMesa;
}

export interface CartaCategoria {
    id: number;
    nome: string;
    ordem: number;
    ativo: boolean;
}

export interface CartaItem {
    id: number;
    categoriaId: number;
    categoriaNome: string;
    nome: string;
    preco: number;
    destino: DestinoPedido;
    ativo: boolean;
}

export interface MapaLugar {
    id: number;
    ordem: number;
    nomeCliente?: string | null;
    ocupado: boolean;
    contaFechada: boolean;
}

export interface MapaMesa {
    id: number;
    ambienteId: number;
    rotulo: string;
    lugaresPadrao: number;
    forma: FormaMesa;
    situacao: SituacaoMesa;
    atendimentoId?: number | null;
    statusAtendimento?: StatusAtendimento | null;
    abertoPorNome?: string | null;
    lugares: number;
    lugaresVisita: MapaLugar[];
}

export interface MapaAmbiente {
    id: number;
    nome: string;
    ordem: number;
    mesas: MapaMesa[];
}

export interface Lugar {
    id: number;
    ordem: number;
    nomeCliente?: string | null;
    ocupado: boolean;
    contaFechada: boolean;
    total: number;
}

export interface ItemComanda {
    id: number;
    lugarId?: number | null;
    cartaItemId?: number | null;
    descricao: string;
    precoUnitario: number;
    quantidade: number;
    total: number;
    observacao?: string | null;
    destino: DestinoPedido;
    status: StatusItem;
    lancadoPorUsuarioId: number;
    lancadoPorNome: string;
    lancadoEm: string;
    motivoCancelamento?: string | null;
    canceladoPorNome?: string | null;
}

export interface Atendimento {
    id: number;
    mesaId: number;
    mesaRotulo: string;
    ambienteNome: string;
    status: StatusAtendimento;
    abertoPorUsuarioId: number;
    abertoPorNome: string;
    abertoEm: string;
    fechadoEm?: string | null;
    modoFechamento?: ModoFechamento | null;
    anfitriaoLugarId?: number | null;
    mesasIds: number[];
    lugares: Lugar[];
    itens: ItemComanda[];
    total: number;
    cotaIgual: number;
}

export const DESTINOS: { id: DestinoPedido; nome: string }[] = [
    { id: 'Cozinha', nome: 'Cozinha' },
    { id: 'Bar', nome: 'Bar' },
    { id: 'Sobremesa', nome: 'Sobremesa' },
];

export const STATUS_ITEM: Record<StatusItem, string> = {
    Lancado: 'Lançado',
    EmPreparo: 'Em preparo',
    Pronto: 'Pronto',
    Entregue: 'Entregue',
    Cancelado: 'Cancelado',
};

export function moeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function nomeLugar(ordem: number, nome?: string | null) {
    const texto = nome?.trim();
    return texto ? texto : `Lugar ${ordem}`;
}

async function get<T>(path: string) {
    const { data } = await httpClient.get<T>(`${base}${path}`);
    return data;
}

async function send<T>(method: 'post' | 'put' | 'delete', path: string, body?: unknown) {
    const { data } = await httpClient.request<T>({ method, url: `${base}${path}`, data: body });
    return data;
}

export const casaService = {
    ambientes: (ativos = false) => get<Ambiente[]>(`/ambientes?ativos=${ativos}`),
    salvarAmbiente: (body: Omit<Ambiente, 'id'>, id?: number) =>
        id ? send<Ambiente>('put', `/ambientes/${id}`, body) : send<Ambiente>('post', '/ambientes', body),
    mesas: () => get<Mesa[]>('/mesas'),
    salvarMesa: (body: Omit<Mesa, 'id' | 'ambienteNome'>, id?: number) =>
        id ? send<Mesa>('put', `/mesas/${id}`, body) : send<Mesa>('post', '/mesas', body),
    categorias: (ativas = false) => get<CartaCategoria[]>(`/carta/categorias?ativas=${ativas}`),
    salvarCategoria: (body: Omit<CartaCategoria, 'id'>, id?: number) =>
        id ? send<CartaCategoria>('put', `/carta/categorias/${id}`, body) : send<CartaCategoria>('post', '/carta/categorias', body),
    itens: (ativos = false) => get<CartaItem[]>(`/carta/itens?ativos=${ativos}`),
    salvarItem: (body: Omit<CartaItem, 'id' | 'categoriaNome'>, id?: number) =>
        id ? send<CartaItem>('put', `/carta/itens/${id}`, body) : send<CartaItem>('post', '/carta/itens', body),
    mapa: () => get<MapaAmbiente[]>('/mapa'),
    abertos: () => get<Atendimento[]>('/atendimentos'),
    obter: (id: number) => get<Atendimento>(`/atendimentos/${id}`),
    abrir: (mesaId: number) => send<Atendimento>('post', `/mesas/${mesaId}/abrir`),
    pedirConta: (id: number) => send<Atendimento>('post', `/atendimentos/${id}/conta`),
    reabrir: (id: number) => send<Atendimento>('post', `/atendimentos/${id}/reabrir`),
    adicionarLugar: (id: number) => send<Atendimento>('post', `/atendimentos/${id}/lugares`),
    removerLugar: (id: number) => send<Atendimento>('delete', `/lugares/${id}`),
    nomearLugar: (id: number, nomeCliente: string) => send<Atendimento>('put', `/lugares/${id}`, { nomeCliente }),
    fecharLugar: (id: number) => send<Atendimento>('post', `/lugares/${id}/fechar`),
    lancar: (id: number, body: { lugarId?: number | null; cartaItemId: number; quantidade: number; observacao?: string; destino?: DestinoPedido }) =>
        send<Atendimento>('post', `/atendimentos/${id}/itens`, body),
    transferir: (id: number, lugarId: number | null) => send<Atendimento>('post', `/itens/${id}/transferir`, { lugarId }),
    statusItem: (id: number, status: StatusItem) => send<Atendimento>('post', `/itens/${id}/status`, { status }),
    cancelar: (id: number, motivo: string) => send<Atendimento>('post', `/itens/${id}/cancelar`, { motivo }),
    juntar: (id: number, mesaId: number) => send<Atendimento>('post', `/atendimentos/${id}/juntar`, { mesaId }),
    fechar: (id: number, modo: ModoFechamento, lugarId?: number) =>
        send<Atendimento>('post', `/atendimentos/${id}/fechar`, { modo, lugarId }),
};
