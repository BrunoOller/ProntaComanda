import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';

// RF02 - Gestão de Colaboradores e Autenticação
export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);

  useEffect(() => {
    api.get('/funcionarios').then((r) => setFuncionarios(r.data));
  }, []);

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Funcionários</h1>
          <p className="text-sm text-neutral-500">Gerencie sua equipe, funções e acessos ao sistema</p>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-white">
          + Adicionar funcionário
        </button>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b text-neutral-500">
          <tr>
            <th className="py-2">Nome do Funcionário</th>
            <th>CPF</th>
            <th>Cargo</th>
            <th>Especialidade</th>
            <th>Opções</th>
          </tr>
        </thead>
        <tbody>
          {funcionarios.map((f) => (
            <tr key={f._id} className="border-b">
              <td className="py-2">{f.nome}</td>
              <td>{f.cpf}</td>
              <td>{f.perfil}</td>
              <td>{f.especialidade}</td>
              <td className="space-x-2">
                <button className="rounded border px-2 py-1">Editar</button>
                <button className="rounded bg-neutral-900 px-2 py-1 text-white">Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
}
