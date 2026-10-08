import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Login';
import InicioPage from '@/pages/Inicio';
import CardapioPage from '@/pages/Cardapio';
import PedidosPage from '@/pages/Pedidos';
import MesasPage from '@/pages/Mesas';
import EstoqueGeralPage from '@/pages/EstoqueGeral';
import EntradaEstoquePage from '@/pages/EntradaEstoque';
import ConfiguracoesPage from '@/pages/configuracoes/Configuracoes';
import AmbientesPage from '@/pages/configuracoes/Ambientes';
import MesasCadastroPage from '@/pages/configuracoes/MesasCadastro';
import EquipePage from '@/pages/configuracoes/Equipe';
import ModuleProtectedRoute from './ModuleProtectedRoute';
import { CODIGOS_ENTRADA, MODULO_CONFIGURACOES, MODULO_ESTOQUE } from '@/constants/moduleCodes';

const router = createBrowserRouter(
    [
    { path: '/', element: <Navigate to="/login" replace /> },
    { path: '/login', element: <LoginPage /> },
    {
        path: '/inicio',
        element: (
            <ModuleProtectedRoute moduloCodigo={CODIGOS_ENTRADA}>
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
        path: '/configuracoes',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_CONFIGURACOES}>
                <ConfiguracoesPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/configuracoes/ambientes',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_CONFIGURACOES}>
                <AmbientesPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/configuracoes/mesas',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_CONFIGURACOES}>
                <MesasCadastroPage />
            </ModuleProtectedRoute>
        ),
    },
    {
        path: '/configuracoes/equipe',
        element: (
            <ModuleProtectedRoute moduloCodigo={MODULO_CONFIGURACOES}>
                <EquipePage />
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
