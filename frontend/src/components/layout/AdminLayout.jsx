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
  const logout = useAuthStore((s) => s.logout);
  const itensVisiveis = ITENS_MENU.filter((item) => item.perfis.includes(funcionario?.perfil));

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-900">
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-neutral-200 p-4 dark:border-neutral-800">
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

        {/* Rodapé da sidebar: quem está logado + botão de sair.
            Ao limpar a sessão, a RotaProtegida redireciona para /login. */}
        <div className="mt-auto border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="truncate text-sm font-medium dark:text-neutral-100">{funcionario?.nome}</p>
          <p className="mb-3 text-xs capitalize text-neutral-500">{funcionario?.perfil}</p>
          <button
            onClick={logout}
            className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
