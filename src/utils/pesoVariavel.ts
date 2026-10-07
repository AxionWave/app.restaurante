/**
 * Código de barras de "peso variável" (balança de açougue/padaria/hortifruti): EAN-13 com
 * prefixo 2, 5 dígitos de código interno do produto (PLU) e 5 dígitos de peso em gramas.
 * Padrão mais comum usado por balanças comerciais no Brasil (varia por fabricante, mas essa
 * é a convenção mais difundida) — por isso o resultado é sempre um valor sugerido, editável.
 */
export interface PesoVariavel {
    plu: string;
    pesoKg: number;
}

export function extrairPesoVariavel(codigo: string): PesoVariavel | null {
    const digitos = codigo.replace(/\D/g, '');
    if (digitos.length !== 13 || digitos[0] !== '2') return null;

    const plu = digitos.slice(1, 6);
    const pesoGramas = Number(digitos.slice(6, 11));
    if (!Number.isFinite(pesoGramas) || pesoGramas <= 0) return null;

    return { plu, pesoKg: pesoGramas / 1000 };
}

/** Extrai o primeiro peso reconhecível de um texto livre (ex.: lido por OCR de etiqueta). */
export function extrairPesoDeTexto(texto: string): number | null {
    const match = texto.match(/(\d+(?:[.,]\d+)?)\s*(kg|quilos?|g|gr|grs|gramas?)\b/i);
    if (!match) return null;

    const valor = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) return null;

    const unidade = match[2].toLowerCase();
    const jaEmKg = unidade.startsWith('k') || unidade.startsWith('quilo');
    return jaEmKg ? valor : valor / 1000;
}
