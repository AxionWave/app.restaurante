import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Login';
import InicioPage from '@/pages/Inicio';
import CardapioPage from '@/pages/Cardapio';
import PedidosPage from '@/pages/Pedidos';
import MesasPage from '@/pages/Mesas';
import EstoqueGeralPage from '@/pages/EstoqueGeral';
import EntradaEstoquePage from '@/pages/EntradaEstoque';
import ModuleProtectedRoute from './ModuleProtectedRoute';
import { MODULOS_RAIZ, MODULO_ESTOQUE } from '@/constants/moduleCodes';

const router = createBrowserRouter(
    [
    { path: '/', element: <Navigate to="/login" replace /> },
    { path: '/login', element: <LoginPage /> },
    {
        path: '/inicio',
        element: (
            <ModuleProtectedRoute moduloCodigo={[...MODULOS_RAIZ]}>
                <InicioPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/cardapio',
        element: (
            <ModuleProtectedRoute moduloCodigo="ORI0000001">
                <CardapioPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/pedidos',
        element: (
            <ModuleProtectedRoute moduloCodigo="ORI0000002">
                <PedidosPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/mesas',
        element: (
            <ModuleProtectedRoute moduloCodigo="ORI0000003">
                <MesasPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/estoque',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_ESTOQUE}>
                <EstoqueGeralPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/estoque/entrada',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_ESTOQUE}>
                <EntradaEstoquePage />
            </ModuleProtectedRoute>
        ),
    },
    ],
    { basename: (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/' },
);

export default router;
