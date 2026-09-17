import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * RF01 - Controle de Acesso por Perfis (RBAC), lado do frontend.
 * Isto é só uma conveniência de UX (esconder telas que o perfil não usa);
 * a validação que realmente importa acontece no backend em toda requisição.
 */
export default function RotaProtegida({ perfisPermitidos }) {
  const { funcionario, carregando } = useAuthStore();

  if (carregando) return null; // ou um spinner

  if (!funcionario) return <Navigate to="/login" replace />;

  if (perfisPermitidos && !perfisPermitidos.includes(funcionario.perfil)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
