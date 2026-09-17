import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Sidebar do Admin/Caixa visto no design: Cardápio, Mesas/Comandas,
 * Cozinha, Funcionários, Dashboard. RNF08 - otimizado para telas largas.
 *
 * RF01 exige restringir tanto a EXECUÇÃO quanto a VISUALIZAÇÃO por perfil.
 * Cada item carrega os perfis que podem vê-lo aqui; o backend continua
 * sendo a autoridade de verdade (ver middlewares/rbac.middleware.js em
 * cada rota) — isto é só o espelho no menu, pra não mostrar atalho pra
 * tela que o perfil vai ser barrado de abrir.
 */
const ITENS_MENU = [
  { rota: '/admin/cardapio', label: 'Cardápio', perfis: ['administrador'] },
  { rota: '/admin/mesas', label: 'Mesas/Comandas', perfis: ['administrador', 'caixa'] },
  { rota: '/admin/cozinha', label: 'Cozinha', perfis: ['administrador'] },
  { rota: '/admin/funcionarios', label: 'Funcionários', perfis: ['administrador'] },
  { rota: '/admin/dashboard', label: 'Dashboard', perfis: ['administrador'] },
];

export default function AdminLayout({ children }) {
  const funcionario = useAuthStore((s) => s.funcionario);
  const itensVisiveis = ITENS_MENU.filter((item) => item.perfis.includes(funcionario?.perfil));

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-900">
      <aside className="w-56 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <nav className="mt-6 flex flex-col gap-1">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.rota}
              to={item.rota}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
