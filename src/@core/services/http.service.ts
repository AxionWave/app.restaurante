import axios, { AxiosHeaders, AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, SECURITY_CONFIG } from '../config';
import { AUTH_STORAGE_KEYS, clearAuthSessionStorage } from '../auth/auth.storage';
import { getUnidadeAtivaId } from '@/state/unidadeAtiva.store';

function applyGatewayHeaders(config: InternalAxiosRequestConfig): void {
    const secretToken = String(SECURITY_CONFIG.secretTokenQR || '').trim();
    if (!secretToken) return;
    if (!config.headers) config.headers = new AxiosHeaders();
    if (typeof (config.headers as AxiosHeaders).set === 'function') {
        (config.headers as AxiosHeaders).set('X-Secret-Token', secretToken);
    }
}

/** Anexa a unidade ativa (X-Unidade-Id) quando houver uma selecionada — usado pelas rotas de estoque. */
function applyUnidadeAtiva(config: InternalAxiosRequestConfig): void {
    const unidadeId = getUnidadeAtivaId();
    if (!unidadeId) return;
    if (!config.headers) config.headers = new AxiosHeaders();
    if (typeof (config.headers as AxiosHeaders).set === 'function') {
        (config.headers as AxiosHeaders).set('X-Unidade-Id', String(unidadeId));
    }
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const oauthClient: AxiosInstance = axios.create({
    baseURL: `${API_CONFIG.gateway}/api/auth`,
    headers: { 'Content-Type': 'application/json' },
});

oauthClient.interceptors.request.use((config) => {
    applyGatewayHeaders(config);
    return config;
});

export const httpClient: AxiosInstance = axios.create({
    baseURL: API_CONFIG.gateway,
    headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    applyGatewayHeaders(config);
    applyUnidadeAtiva(config);
    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const original = error.config as RetryConfig | undefined;
        if (status !== 401 || !original || original._retry) {
            return Promise.reject(error);
        }
        const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
            clearAuthSessionStorage();
            window.location.href = '/login';
            return Promise.reject(error);
        }
        original._retry = true;
        try {
            const { data } = await oauthClient.post<{
                access_token: string;
                refresh_token: string;
                token_type?: string;
                expires_in?: number;
            }>('/token', { refresh_token: refreshToken });
            localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
            localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
            if (!original.headers || typeof (original.headers as AxiosHeaders).set !== 'function') {
                original.headers = new AxiosHeaders();
            }
            (original.headers as AxiosHeaders).set('Authorization', `Bearer ${data.access_token}`);
            applyGatewayHeaders(original);
            return httpClient(original);
        } catch (refreshErr) {
            clearAuthSessionStorage();
            window.location.href = '/login';
            return Promise.reject(refreshErr);
        }
    }
);
