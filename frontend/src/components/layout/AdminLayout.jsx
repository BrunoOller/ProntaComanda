import { NavLink } from 'react-router-dom';

/**
 * Sidebar do Admin/Caixa/KDS visto no design: Cardápio, Mesas/Comandas,
 * Cozinha, Funcionários, Dashboard. RNF08 - otimizado para telas largas.
 */
const ITENS_MENU = [
  { rota: '/admin/cardapio', label: 'Cardápio' },
  { rota: '/admin/mesas', label: 'Mesas/Comandas' },
  { rota: '/admin/cozinha', label: 'Cozinha' },
  { rota: '/admin/funcionarios', label: 'Funcionários' },
  { rota: '/admin/dashboard', label: 'Dashboard' },
];

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-900">
      <aside className="w-56 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <nav className="mt-6 flex flex-col gap-1">
          {ITENS_MENU.map((item) => (
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
