import { httpClient } from '@core/services/http.service';
import { API_CONFIG } from '@core/config';
import type {
    AtualizarEntradaRequest,
    AtualizarItemRequest,
    CriarEntradaRequest,
    EntradaDto,
    FornecedorDto,
    NovoProdutoRequest,
    OrigemEntrada,
    ProdutoCore,
    SaldoCore,
    StatusEntrada,
    UnidadeCore,
} from './estoque.types';

const base = `${API_CONFIG.productBase}/estoque`;

export interface ListarEntradasParams {
    status?: StatusEntrada;
    origem?: OrigemEntrada;
    fornecedorId?: number;
    de?: string;
    ate?: string;
    page?: number;
    size?: number;
}

export const estoqueService = {
    listarUnidades: () => httpClient.get<UnidadeCore[]>(`${base}/unidades`).then((r) => r.data),

    buscarFornecedores: (search?: string) =>
        httpClient.get<FornecedorDto[]>(`${base}/fornecedores`, { params: { search } }).then((r) => r.data),

    buscarProdutos: (search?: string) =>
        httpClient.get<ProdutoCore[]>(`${base}/produtos`, { params: { search } }).then((r) => r.data),

    /** 404 quando o código de barras não está cadastrado — o chamador decide oferecer "novo produto". */
    resolverCodigoBarras: (codigo: string) =>
        httpClient.get<ProdutoCore>(`${base}/produtos/por-codigo-barras`, { params: { codigo } }).then((r) => r.data),

    criarProduto: (req: NovoProdutoRequest) => httpClient.post<ProdutoCore>(`${base}/produtos`, req).then((r) => r.data),

    listarSaldos: (search?: string) =>
        httpClient.get<SaldoCore[]>(`${base}/saldos`, { params: { search } }).then((r) => r.data),

    criarEntrada: (req: CriarEntradaRequest) => httpClient.post<EntradaDto>(`${base}/entradas`, req).then((r) => r.data),

    importarXml: (arquivo: File, unidadeId?: number | null) => {
        const form = new FormData();
        form.append('arquivo', arquivo);
        return httpClient
            .post<EntradaDto>(`${base}/entradas/importar-xml`, form, {
                params: unidadeId ? { unidadeId } : undefined,
                // axios define o multipart/form-data com boundary automaticamente quando o body é FormData
                // e o Content-Type default do cliente (application/json) precisa ser removido.
                headers: { 'Content-Type': undefined },
            })
            .then((r) => r.data);
    },

    importarPorChave: (chave: string, unidadeId?: number | null) =>
        httpClient
            .post<{ message: string; entrada: EntradaDto } | EntradaDto>(
                `${base}/entradas/importar-chave`,
                { chave },
                { params: unidadeId ? { unidadeId } : undefined }
            )
            .then((r) => r.data),

    obterEntrada: (id: number) => httpClient.get<EntradaDto>(`${base}/entradas/${id}`).then((r) => r.data),

    atualizarEntrada: (id: number, req: AtualizarEntradaRequest) =>
        httpClient.put<EntradaDto>(`${base}/entradas/${id}`, req).then((r) => r.data),

    atualizarItem: (id: number, itemId: number, req: AtualizarItemRequest) =>
        httpClient.put<EntradaDto>(`${base}/entradas/${id}/itens/${itemId}`, req).then((r) => r.data),

    removerItem: (id: number, itemId: number) =>
        httpClient.delete<EntradaDto>(`${base}/entradas/${id}/itens/${itemId}`).then((r) => r.data),

    confirmar: (id: number) => httpClient.post<EntradaDto>(`${base}/entradas/${id}/confirmar`).then((r) => r.data),

    cancelar: (id: number) => httpClient.post<EntradaDto>(`${base}/entradas/${id}/cancelar`).then((r) => r.data),

    listarEntradas: (params: ListarEntradasParams = {}) =>
        httpClient.get<EntradaDto[]>(`${base}/entradas`, { params }).then((r) => r.data),
};

export function novaChaveIdempotencia(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}
