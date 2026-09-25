import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { destinoPosLogin } from './destinosPorPerfil';

/**
 * "/" não é mais a tela do garçom — cada perfil tem sua própria URL agora
 * (/admin/..., /kds, /funcionarios). Este componente só existe pra quando
 * alguém abre a raiz do site direto (ou dá refresh nela): manda pro lugar
 * certo se já estiver logado, ou pro login se não estiver.
 *
 * Navegação imperativa (useEffect), não <Navigate> declarativo — ver o
 * comentário longo em RotaProtegida.jsx sobre o loop que isso causava.
 */
export default function RaizRedirect() {
  const funcionario = useAuthStore((s) => s.funcionario);
  const carregando = useAuthStore((s) => s.carregando);
  const navigate = useNavigate();

  const destino = funcionario ? destinoPosLogin(funcionario.perfil) : '/login';

  useEffect(() => {
    if (!carregando) navigate(destino, { replace: true });
  }, [carregando, destino, navigate]);

  return null;
}
