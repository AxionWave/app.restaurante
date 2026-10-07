// Espelha os DTOs de Orion.Application/Estoque (src/Orion.Application/Estoque/*.cs).

export type TipoEntrada = 'ENTRADA' | 'AJUSTE';
export type OrigemEntrada = 'COMPRA' | 'MANUAL' | 'INVENTARIO' | 'DEVOLUCAO';
export type StatusEntrada = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA';
export type OrigemCadastro = 'MANUAL' | 'SCANNER' | 'XML_NFE' | 'API_FISCAL';
export type StatusVinculoItem = 'PENDENTE' | 'VINCULADO' | 'PRODUTO_NOVO';

export interface UnidadeCore {
    id: number;
    nome: string;
    codigo?: string | null;
    cidade?: string | null;
    estado?: string | null;
}

export interface SaldoCore {
    produtoId: number;
    produtoCodigo: string;
    produtoNome: string;
    unidadeMedida: string;
    unidadeId: number | null;
    quantidade: number;
    custoMedio: number | null;
    estoqueMinimo: number | null;
    abaixoMinimo: boolean;
}

export interface FornecedorDto {
    id: number;
    nome: string;
    cnpj?: string | null;
}

export interface ProdutoCore {
    id: number;
    codigo: string;
    nome: string;
    codigoBarras?: string | null;
    unidadeMedida: string;
    unidadeCompra?: string | null;
    fatorConversao?: number | null;
    estoqueMinimo?: number | null;
}

export interface NovoProdutoRequest {
    codigo: string;
    nome: string;
    unidadeMedida: string;
    unidadeCompra?: string | null;
    fatorConversao?: number | null;
    codigoBarras?: string | null;
    categoria?: string | null;
    estoqueMinimo?: number | null;
}

export interface DadosFiscaisRequest {
    fornecedorId?: number | null;
    fornecedorNome?: string | null;
    fornecedorCnpj?: string | null;
    numeroNf?: string | null;
    serie?: string | null;
    chaveAcesso?: string | null;
    dataEmissao?: string | null;
}

export interface ItemEntradaRequest {
    produtoCoreId?: number | null;
    codigoBarras?: string | null;
    novoProduto?: NovoProdutoRequest | null;
    unidadeComercialNf?: string | null;
    quantidadeNf?: number | null;
    quantidadeRecebida: number;
    fatorConversao?: number | null;
    valorUnitarioNf?: number | null;
}

export interface CriarEntradaRequest {
    chaveIdempotencia: string;
    unidadeId?: number | null;
    tipo: TipoEntrada;
    origem: OrigemEntrada;
    dataEntrada?: string | null;
    observacao?: string | null;
    fiscal?: DadosFiscaisRequest | null;
    itens: ItemEntradaRequest[];
}

export interface AtualizarItemRequest {
    produtoCoreId?: number | null;
    novoProduto?: NovoProdutoRequest | null;
    quantidadeRecebida?: number | null;
    fatorConversao?: number | null;
    valorUnitarioNf?: number | null;
    motivoDivergencia?: string | null;
}

export interface AtualizarEntradaRequest {
    tipo?: TipoEntrada | null;
    origem?: OrigemEntrada | null;
    observacao?: string | null;
    fiscal?: DadosFiscaisRequest | null;
}

export interface ItemDto {
    id: number;
    produtoCoreId: number | null;
    produtoCodigo: string | null;
    descricaoNf: string | null;
    codigoBarrasNf: string | null;
    ncm: string | null;
    unidadeComercialNf: string | null;
    quantidadeNf: number | null;
    quantidadeRecebida: number;
    fatorConversao: number;
    quantidadeEstoque: number;
    valorUnitarioNf: number | null;
    custoUnitarioEstoque: number | null;
    divergencia: boolean;
    motivoDivergencia: string | null;
    statusVinculo: StatusVinculoItem;
    movimentacaoCoreId: number | null;
    saldoResultante: number | null;
}

export interface EntradaDto {
    id: number;
    chaveIdempotencia: string;
    empresaId: number;
    unidadeId: number;
    tipo: TipoEntrada;
    origem: OrigemEntrada;
    origemCadastro: OrigemCadastro;
    status: StatusEntrada;
    fornecedorId: number | null;
    fornecedorNome: string | null;
    fornecedorCnpj: string | null;
    modeloFiscal: string | null;
    chaveAcesso: string | null;
    numeroNf: string | null;
    serie: string | null;
    dataEmissao: string | null;
    dataEntrada: string;
    valorTotal: number | null;
    observacao: string | null;
    criadoEm: string;
    confirmadoEm: string | null;
    itens: ItemDto[];
}
