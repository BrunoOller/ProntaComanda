import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { destinoPosLogin } from './destinosPorPerfil';

/**
 * "/" não é mais a tela do garçom — cada perfil tem sua própria URL agora
 * (/admin/..., /kds, /funcionarios). Este componente só existe pra quando
 * alguém abre a raiz do site direto (ou dá refresh nela): manda pro lugar
 * certo se já estiver logado, ou pro login se não estiver.
 */
export default function RaizRedirect() {
  const { funcionario, carregando } = useAuthStore();

  if (carregando) return null;

  return <Navigate to={funcionario ? destinoPosLogin(funcionario.perfil) : '/login'} replace />;
}
