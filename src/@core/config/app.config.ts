import { resolveGatewayUrl } from './ambientes';

export const APP_CONFIG = {
    nome: import.meta.env.VITE_APP_NOME_APP || 'Orion',
    sigla: import.meta.env.VITE_APP_SIGLA_SISTEMA || 'ORI',
    empresa: import.meta.env.VITE_APP_NOME_EMPRESA || 'Axion Wave',
    descricao: import.meta.env.VITE_APP_DESCRICAO_APP || 'Sistema Restaurante',
    versao: import.meta.env.VITE_APP_VERSAO_APP || '1.0.0',
} as const;

export const API_CONFIG = {
    gateway: resolveGatewayUrl(import.meta.env.VITE_ORION_AMBIENTE).url,
    productBase: '/api/restaurante',
} as const;

export const SECURITY_CONFIG = {
    secretTokenQR: import.meta.env.VITE_APP_SECRET_TOKEN_QR || '',
} as const;
