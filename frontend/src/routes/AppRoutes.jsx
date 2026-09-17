import { Routes, Route } from 'react-router-dom';
import RotaProtegida from './RotaProtegida';
import AdminIndex from './AdminIndex';
import RaizRedirect from './RaizRedirect';

import Login from '../pages/Login';

import DashboardAdmin from '../pages/admin/Dashboard';
import CardapioAdmin from '../pages/admin/Cardapio';
import MesasComandasAdmin from '../pages/admin/MesasComandas';
import CozinhaAdmin from '../pages/admin/Cozinha';
import FuncionariosAdmin from '../pages/admin/Funcionarios';

import PainelKDS from '../pages/kds/PainelKDS';

import MapaMesasFuncionarios from '../pages/funcionarios/MapaMesas';
import MesaFuncionarios from '../pages/funcionarios/Mesa';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* "/" não é mais tela de ninguém - só decide pra onde mandar */}
      <Route path="/" element={<RaizRedirect />} />

      {/* Módulo Mobile (Atendimento e Salão) - garçom, mas caixa/admin também
          podem abrir mesa por aqui se precisarem (RF19/RF20) */}
      <Route element={<RotaProtegida perfisPermitidos={['garcom', 'caixa', 'administrador']} />}>
        <Route path="/funcionarios" element={<MapaMesasFuncionarios />} />
        <Route path="/funcionarios/mesa/:mesaId" element={<MesaFuncionarios />} />
      </Route>

      {/* KDS standalone - RF01: cozinha e bar só veem isto, sem sidebar */}
      <Route element={<RotaProtegida perfisPermitidos={['cozinha', 'bar', 'administrador']} />}>
        <Route path="/kds" element={<PainelKDS />} />
      </Route>

      {/* Módulo Desktop (Administração e Caixa) - RF01 por rota */}
      <Route element={<RotaProtegida perfisPermitidos={['administrador', 'caixa']} />}>
        <Route path="/admin" element={<AdminIndex />} />
      </Route>

      <Route element={<RotaProtegida perfisPermitidos={['administrador']} />}>
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/cardapio" element={<CardapioAdmin />} />
        <Route path="/admin/funcionarios" element={<FuncionariosAdmin />} />
        {/* visão de supervisão do admin sobre o KDS, com sidebar */}
        <Route path="/admin/cozinha" element={<CozinhaAdmin />} />
      </Route>

      <Route element={<RotaProtegida perfisPermitidos={['administrador', 'caixa']} />}>
        <Route path="/admin/mesas" element={<MesasComandasAdmin />} />
      </Route>
    </Routes>
  );
}
