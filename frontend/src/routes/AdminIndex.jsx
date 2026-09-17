import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * RF01 - /admin sozinho não é uma tela; cada perfil tem uma "home" natural
 * dentro do módulo desktop. Evita cair em página em branco quando alguém
 * acessa /admin diretamente (ex: favorito salvo, link digitado de cabeça).
 */
const HOME_POR_PERFIL = {
  administrador: '/admin/dashboard',
  caixa: '/admin/mesas',
  cozinha: '/admin/cozinha',
  bar: '/admin/cozinha',
};

export default function AdminIndex() {
  const funcionario = useAuthStore((s) => s.funcionario);

  const destino = HOME_POR_PERFIL[funcionario?.perfil] || '/'; // garçom não usa o desktop

  return <Navigate to={destino} replace />;
}
