import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * RF01 - Controle de Acesso por Perfis (RBAC), lado do frontend.
 * Isto é só uma conveniência de UX (esconder telas que o perfil não usa);
 * a validação que realmente importa acontece no backend em toda requisição.
 *
 * IMPORTANTE: a navegação é feita via useNavigate()+useEffect, e NÃO via
 * <Navigate>. O <Navigate> declarativo do react-router dispara seu efeito
 * interno a cada re-render (sem array de dependências), e como este
 * componente lia a store inteira, qualquer mudança nela (mesmo de outro
 * campo) recriava o <Navigate> e redisparava a navegação — isso causava um
 * loop real ("Maximum update depth exceeded" / navegação bloqueada pelo
 * navegador). Usando useEffect com dependências explícitas, só navegamos
 * quando o valor relevante (funcionario/perfil) realmente muda.
 *
 * ATENÇÃO time: esse arquivo já voltou pra versão com bug uma vez (alguém
 * deve ter subido uma branch antiga por cima). Se for mexer aqui nesta
 * tela, mantenha o padrão useEffect+useNavigate, não use <Navigate> direto.
 */
export default function RotaProtegida({ perfisPermitidos }) {
  const funcionario = useAuthStore((s) => s.funcionario);
  const carregando = useAuthStore((s) => s.carregando);
  const navigate = useNavigate();

  const naoAutenticado = !carregando && !funcionario;
  const semPermissao =
    !carregando &&
    funcionario &&
    perfisPermitidos &&
    !perfisPermitidos.includes(funcionario.perfil);

  useEffect(() => {
    if (naoAutenticado) navigate('/login', { replace: true });
    else if (semPermissao) navigate('/', { replace: true });
  }, [naoAutenticado, semPermissao, navigate]);

  if (carregando || naoAutenticado || semPermissao) return null;

  return <Outlet />;
}
