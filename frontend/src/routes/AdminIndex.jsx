import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { destinoPosLogin } from './destinosPorPerfil';

/**
 * RF01 - /admin sozinho não é uma tela; cada perfil tem uma "home" natural.
 * Evita cair em página em branco quando o Administrador ou o Caixa acessam
 * /admin diretamente (ex: favorito salvo, link digitado de cabeça). A
 * guarda de rota (RotaProtegida) já garante que só administrador/caixa
 * chegam até aqui — cozinha/bar vão direto pra /kds, garçom pra /funcionarios.
 */
export default function AdminIndex() {
  const funcionario = useAuthStore((s) => s.funcionario);
  return <Navigate to={destinoPosLogin(funcionario?.perfil)} replace />;
}
