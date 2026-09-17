import { Routes, Route } from 'react-router-dom';
import RotaProtegida from './RotaProtegida';
import AdminIndex from './AdminIndex';

import Login from '../pages/Login';

import DashboardAdmin from '../pages/admin/Dashboard';
import CardapioAdmin from '../pages/admin/Cardapio';
import MesasComandasAdmin from '../pages/admin/MesasComandas';
import CozinhaAdmin from '../pages/admin/Cozinha';
import FuncionariosAdmin from '../pages/admin/Funcionarios';

import MapaMesasMobile from '../pages/mobile/MapaMesas';
import MesaMobile from '../pages/mobile/Mesa';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* RF19/RF20 - Módulo Mobile (Atendimento e Salão) */}
      <Route element={<RotaProtegida perfisPermitidos={['garcom', 'caixa', 'administrador']} />}>
        <Route path="/" element={<MapaMesasMobile />} />
        <Route path="/mesa/:mesaId" element={<MesaMobile />} />
      </Route>

      {/* Módulo Desktop (Administração, Caixa e KDS) - RF01 por rota */}
      <Route
        element={
          <RotaProtegida perfisPermitidos={['administrador', 'caixa', 'cozinha', 'bar']} />
        }
      >
        <Route path="/admin" element={<AdminIndex />} />
      </Route>

      <Route element={<RotaProtegida perfisPermitidos={['administrador']} />}>
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/cardapio" element={<CardapioAdmin />} />
        <Route path="/admin/funcionarios" element={<FuncionariosAdmin />} />
      </Route>

      <Route
        element={<RotaProtegida perfisPermitidos={['administrador', 'caixa']} />}
      >
        <Route path="/admin/mesas" element={<MesasComandasAdmin />} />
      </Route>

      <Route
        element={<RotaProtegida perfisPermitidos={['administrador', 'cozinha', 'bar']} />}
      >
        <Route path="/admin/cozinha" element={<CozinhaAdmin />} />
      </Route>
    </Routes>
  );
}
