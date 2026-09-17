import KDSBoard from '../../components/kds/KDSBoard';
import { useAuthStore } from '../../store/authStore';

/**
 * RF01 - Cozinha e Bar só enxergam isto: o KDS, e nada mais. Sem sidebar
 * de Cardápio/Funcionários/Dashboard/etc — RF01 pede que cada perfil veja
 * só o que usa, não só que seja bloqueado de clicar no resto.
 */
export default function PainelKDS() {
  const { funcionario, logout } = useAuthStore();

  // cozinha -> itens marcados setorPreparo='cozinha'; bar -> 'bar'
  const setor = funcionario?.perfil === 'bar' ? 'bar' : 'cozinha';

  return (
    <div className="min-h-screen bg-neutral-50 p-6 dark:bg-neutral-900">
      <header className="mb-6 flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-lg font-semibold capitalize">{setor}</h1>
          <p className="text-xs text-neutral-500">{funcionario?.nome}</p>
        </div>
        <button onClick={logout} className="text-sm text-red-600">
          Sair
        </button>
      </header>

      <KDSBoard setor={setor} />
    </div>
  );
}
