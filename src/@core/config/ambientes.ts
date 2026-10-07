/**
 * Troca local ↔ homolog sem editar URL.
 *
 * .env.local (exemplo):
 *   VITE_GATEWAY_AMBIENTE=homolog
 *   VITE_ORION_AMBIENTE=homolog
 *   VITE_OAUTH_AMBIENTE=homolog
 *
 * O SPA só fala com o Gateway. VITE_OAUTH_AMBIENTE não muda a URL do browser:
 * oAuth/Core/Orion/Lyra são escolhidos pelo Gateway que você apontar.
 */
export type Ambiente = 'local' | 'homolog';

export const GATEWAY_BY_AMBIENTE: Record<Ambiente, string> = {
    local: 'http://localhost:8080',
    homolog: 'https://enterprise.lumenemotion.com.br',
};

export function parseAmbiente(value: unknown): Ambiente | null {
    const v = String(value ?? '')
        .trim()
        .toLowerCase();
    if (v === 'local' || v === 'homolog' || v === 'hmg') return v === 'hmg' ? 'homolog' : v;
    if (v === 'prd' || v === 'prod' || v === 'producao' || v === 'produção' || v === 'production') {
        return 'homolog';
    }
    if (v === 'dev' || v === 'des' || v === 'development') return 'local';
    return null;
}

export function resolveGatewayUrl(productAmbiente?: unknown): { url: string; ambiente: Ambiente } {
    const product = parseAmbiente(productAmbiente);
    const gateway = parseAmbiente(import.meta.env.VITE_GATEWAY_AMBIENTE);
    const app = parseAmbiente(import.meta.env.VITE_APP_AMBIENTE);
    const explicit = String(import.meta.env.VITE_GATEWAY_URL || '')
        .trim()
        .replace(/\/$/, '');

    const fromUrl: Ambiente | null = explicit
        ? explicit.includes('localhost') || explicit.includes('127.0.0.1')
            ? 'local'
            : 'homolog'
        : null;
    const ambiente: Ambiente = product || gateway || app || fromUrl || 'local';
    // Explicit vence o mapa por ambiente — permite apontar para um Gateway em outra máquina/IP
    // da rede local (ex.: acessar o front pelo celular via http://<ip-da-lan>:8080).
    const url = explicit || GATEWAY_BY_AMBIENTE[ambiente];

    const oauth = parseAmbiente(import.meta.env.VITE_OAUTH_AMBIENTE);
    if (oauth && oauth !== ambiente) {
        console.warn(
            `[enterprise] VITE_OAUTH_AMBIENTE=${oauth} ignorado no front. ` +
                `O browser só chama o Gateway (${ambiente} → ${url}). ` +
                `Para oAuth local, use VITE_GATEWAY_AMBIENTE=local e suba o Gateway na sua máquina.`
        );
    }

    return { url, ambiente };
}

/** Início do ASC (hub). VITE_ASC_AMBIENTE, senão localhost → :3000, senão /app/ na VPS. */
export function urlInicioAsc(): string {
    const explicit = parseAmbiente(import.meta.env.VITE_ASC_AMBIENTE);
    const fromHost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'local'
            : 'homolog';
    const ambiente: Ambiente = explicit || fromHost;
    return ambiente === 'local'
        ? 'http://localhost:3000/inicio'
        : 'https://enterprise.lumenemotion.com.br/app/inicio';
}
