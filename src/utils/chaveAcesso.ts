/**
 * Extrai a chave de acesso (44 dígitos) de um texto lido da câmera: o valor pode ser a chave
 * crua (código de barras Code-128 do DANFE), uma URL de NFC-e (`...?p=chave|2|1|1|hash...`)
 * ou uma URL de NF-e (`...?chNFe=chave`). Espelha a validação de `NfeXmlParser.ChaveValida` (Orion).
 */
export function extrairChaveAcesso(textoLido: string): string | null {
    const texto = textoLido.trim();
    if (!texto) return null;

    // 1) URL com parâmetro "p" (NFC-e): p=<chave>|<versao>|<ambiente>|...
    try {
        const url = new URL(texto);
        const p = url.searchParams.get('p');
        if (p) {
            const candidato = p.split('|')[0];
            if (chaveValida(candidato)) return candidato;
        }
        const chNFe = url.searchParams.get('chNFe');
        if (chNFe && chaveValida(chNFe)) return chNFe;
    } catch {
        // não é uma URL — segue para os outros formatos
    }

    // 2) A própria chave (código de barras Code-128 do DANFE) — só dígitos.
    const soDigitos = texto.replace(/\D/g, '');
    if (soDigitos.length === 44 && chaveValida(soDigitos)) {
        return soDigitos;
    }

    // 3) Primeira sequência de 44 dígitos consecutivos em qualquer lugar do texto.
    const match = texto.match(/\d{44}/);
    if (match && chaveValida(match[0])) {
        return match[0];
    }

    return null;
}

/** Dígito verificador módulo 11 (mesmo algoritmo de `NfeXmlParser.ChaveValida`, no backend). */
export function chaveValida(chave: string): boolean {
    if (!/^\d{44}$/.test(chave)) return false;
    let soma = 0;
    let peso = 2;
    for (let i = 42; i >= 0; i--) {
        soma += Number(chave[i]) * peso;
        peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
    return dv === Number(chave[43]);
}
