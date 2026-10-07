/** Códigos alinhados ao Core (seed) e ao claim JWT `modulos`. */
export const SIGLA = 'ORI';
export const MODULO_RAIZ = 'ORION000000';
export const MODULO_RAIZ_LEGADO = 'ORI0000000';
export const MODULOS_RAIZ = [MODULO_RAIZ, MODULO_RAIZ_LEGADO] as const;
export const MODULO_CARDAPIO = 'ORI0000001';
export const MODULO_PEDIDOS = 'ORI0000002';
export const MODULO_MESAS = 'ORI0000003';
export const MODULO_ESTOQUE = 'ORI0000004';

export const MODULOS = [
    { codigo: MODULO_RAIZ, aliases: [MODULO_RAIZ_LEGADO], nome: 'Início', path: '/inicio', descricao: 'Painel do restaurante' },
    { codigo: MODULO_CARDAPIO, nome: 'Cardápio', path: '/cardapio', descricao: 'Itens e categorias' },
    { codigo: MODULO_PEDIDOS, nome: 'Pedidos', path: '/pedidos', descricao: 'Pedidos e comandas' },
    { codigo: MODULO_MESAS, nome: 'Mesas', path: '/mesas', descricao: 'Mesas e salão' },
    { codigo: MODULO_ESTOQUE, nome: 'Estoque', path: '/estoque', descricao: 'Entradas e ajustes de estoque' },
] as const;

export function temModuloRaiz(hasModulo: (codigo: string) => boolean): boolean {
    return MODULOS_RAIZ.some((c) => hasModulo(c));
}
