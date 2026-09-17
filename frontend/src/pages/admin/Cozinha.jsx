import AdminLayout from '../../components/layout/AdminLayout';
import KDSBoard from '../../components/kds/KDSBoard';

// Visão do KDS dentro do admin (uso do Administrador para supervisionar).
// A tela operacional de verdade, usada pela equipe de cozinha/bar no dia a
// dia, é a standalone em pages/kds/PainelKDS.jsx (sem sidebar).
export default function Cozinha() {
  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Cozinha</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Acompanhe e organize os pedidos em preparo em tempo real
      </p>
      <KDSBoard setor="cozinha" />
    </AdminLayout>
  );
}
