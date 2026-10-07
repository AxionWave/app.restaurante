import { AxiosError } from 'axios';

/**
 * Mensagens de erro amigáveis a partir do contrato `{ error, message }` usado pelo Core e pelo
 * Orion (ver `Orion.API/Erros/ErroEstoqueMiddleware.cs`). Baseado no helper equivalente do app.asc.
 */
export type ApiErrorPayload = { error?: string; message?: string };

const ERROR_CODE_USER_HINTS: Record<string, string> = {
    data_integrity: 'Este registro conflita com dados já existentes.',
    bad_request: 'Não foi possível processar a solicitação. Verifique os dados enviados.',
    validation_failed: 'Alguns campos estão incorretos ou incompletos.',
    access_denied: 'Você não tem permissão para esta ação.',
    not_found: 'Recurso não encontrado.',
    // Estoque (Orion)
    regra_estoque: 'Não foi possível concluir: verifique os dados da entrada.',
    xml_invalido: 'O arquivo enviado não é um XML de NF-e válido.',
    fiscal_provider_indisponivel: 'A busca automática por chave de acesso ainda não está disponível. Importe o XML ou digite os itens.',
    core_indisponivel: 'O serviço de estoque está indisponível no momento. Tente novamente em instantes.',
    produto_nao_encontrado: 'Nenhum produto encontrado com esse código de barras.',
    nao_encontrada: 'Entrada não encontrada.',
    arquivo_ausente: 'Selecione o arquivo XML da nota.',
    itens_pendentes: 'Existem itens sem produto vinculado.',
};

export function parseApiErrorPayload(data: unknown): ApiErrorPayload {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const o = data as Record<string, unknown>;
        const message = typeof o.message === 'string' ? o.message : undefined;
        const error = typeof o.error === 'string' ? o.error : undefined;
        return { error, message };
    }
    return {};
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
    const ax = error as AxiosError;
    const status = ax.response?.status;
    const p = parseApiErrorPayload(ax.response?.data);

    if (p.message?.trim()) {
        return p.message.trim();
    }
    if (p.error && ERROR_CODE_USER_HINTS[p.error]) {
        return ERROR_CODE_USER_HINTS[p.error];
    }
    if (p.error?.trim() && !['bad_request', 'error', 'internal_error'].includes(p.error)) {
        return p.error.trim();
    }
    if (status === 400) return 'Não foi possível concluir a operação. Verifique os dados informados.';
    if (status === 403) return 'Você não tem permissão para esta ação.';
    if (status === 404) return 'Recurso não encontrado.';
    if (status === 409) return 'Estes dados já existem ou estão em conflito.';
    if (status === 422) return 'Dados inválidos. Revise o formulário.';
    if (status !== undefined && status >= 500) return 'Serviço indisponível no momento. Tente novamente em instantes.';
    if (ax.request && !ax.response) return 'Não foi possível contatar o servidor. Verifique sua conexão.';
    return fallback || 'Ocorreu um erro inesperado.';
}
