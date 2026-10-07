/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NOME_EMPRESA?: string;
    readonly VITE_APP_NOME_APP?: string;
    readonly VITE_APP_DESCRICAO_APP?: string;
    readonly VITE_APP_VERSAO_APP?: string;
    readonly VITE_APP_SIGLA_SISTEMA?: string;
    readonly VITE_APP_PORT?: string;
    readonly VITE_GATEWAY_URL?: string;
    readonly VITE_GATEWAY_AMBIENTE?: string;
    readonly VITE_ORION_AMBIENTE?: string;
    readonly VITE_ASC_AMBIENTE?: string;
    readonly VITE_OAUTH_AMBIENTE?: string;
    readonly VITE_APP_SECRET_TOKEN_QR?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
