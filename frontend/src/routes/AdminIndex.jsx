import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { destinoPosLogin } from './destinosPorPerfil';

/**
 * RF01 - /admin sozinho não é uma tela; cada perfil tem uma "home" natural.
 * A guarda de rota (RotaProtegida) já garante que só administrador/caixa
 * chegam até aqui — cozinha/bar vão direto pra /kds, garçom pra /funcionarios.
 * Navegação imperativa pelo mesmo motivo do RotaProtegida.jsx/RaizRedirect.jsx.
 */
export default function AdminIndex() {
  const funcionario = useAuthStore((s) => s.funcionario);
  const navigate = useNavigate();
  const destino = destinoPosLogin(funcionario?.perfil);

  useEffect(() => {
    navigate(destino, { replace: true });
  }, [destino, navigate]);

  return null;
}
