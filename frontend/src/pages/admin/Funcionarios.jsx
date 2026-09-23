import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosClient';
import { funcionarioSchema, PERFIS } from '../../schemas/funcionario.schema';

const rotuloPerfil = (valor) => PERFIS.find((p) => p.valor === valor)?.rotulo ?? valor;

const formatarCpf = (cpf = '') =>
  cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;

const VAZIO = {
  nome: '',
  cpf: '',
  perfil: '',
  especialidade: '',
  telefone: '',
  email: '',
  senha: '',
};

// RF02 - Gestão de Colaboradores e Autenticação
export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [mostrarDesligados, setMostrarDesligados] = useState(false);
  const [erroLista, setErroLista] = useState('');
  // null = fechado | {} = novo | {_id,...} = editando
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/funcionarios', {
        params: { ativo: mostrarDesligados ? 'todos' : 'true' },
      });
      setFuncionarios(data);
      setErroLista('');
    } catch (err) {
      setErroLista(err.response?.data?.erro || 'Não foi possível carregar os funcionários.');
    }
  }, [mostrarDesligados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const desligar = async (f) => {
    if (!window.confirm(`Desligar ${f.nome}? Ele perde o acesso ao sistema.`)) return;
    try {
      await api.delete(`/funcionarios/${f._id}`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao desligar funcionário.');
    }
  };

  const reativar = async (f) => {
    try {
      await api.patch(`/funcionarios/${f._id}/reativar`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.erro || 'Erro ao reativar funcionário.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Funcionários</h1>
          <p className="text-sm text-neutral-500">
            Gerencie sua equipe, funções e acessos ao sistema
          </p>
        </div>
        <button
          onClick={() => setEditando({})}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white"
        >
          + Adicionar funcionário
        </button>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={mostrarDesligados}
          onChange={(e) => setMostrarDesligados(e.target.checked)}
        />
        Mostrar desligados
      </label>

      {erroLista && <p className="mb-3 text-sm text-red-600">{erroLista}</p>}

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
            <tr key={f._id} className={`border-b ${f.ativo ? '' : 'text-neutral-400'}`}>
              <td className="py-2">
                {f.nome}
                {!f.ativo && (
                  <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs">
                    desligado
                  </span>
                )}
              </td>
              <td>{formatarCpf(f.cpf)}</td>
              <td>{rotuloPerfil(f.perfil)}</td>
              <td>{f.especialidade}</td>
              <td className="space-x-2">
                {f.ativo ? (
                  <>
                    <button onClick={() => setEditando(f)} className="rounded border px-2 py-1">
                      Editar
                    </button>
                    <button
                      onClick={() => desligar(f)}
                      className="rounded bg-neutral-900 px-2 py-1 text-white"
                    >
                      Desligar
                    </button>
                  </>
                ) : (
                  <button onClick={() => reativar(f)} className="rounded border px-2 py-1">
                    Reativar
                  </button>
                )}
              </td>
            </tr>
          ))}
          {funcionarios.length === 0 && !erroLista && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-500">
                Nenhum funcionário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editando && (
        <FormularioFuncionario
          funcionario={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </AdminLayout>
  );
}

function FormularioFuncionario({ funcionario, onFechar, onSalvo }) {
  const modo = funcionario._id ? 'editar' : 'criar';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(funcionarioSchema(modo)),
    defaultValues: {
      ...VAZIO,
      nome: funcionario.nome ?? '',
      cpf: funcionario.cpf ?? '',
      perfil: funcionario.perfil ?? '',
      especialidade: funcionario.especialidade ?? '',
      telefone: funcionario.telefone ?? '',
      email: funcionario.email ?? '',
    },
  });

  const onSubmit = async (dados) => {
    const corpo = { ...dados };
    // Em edição, senha vazia = manter a atual (não envia o campo).
    if (modo === 'editar' && !corpo.senha) delete corpo.senha;

    try {
      if (modo === 'criar') await api.post('/funcionarios', corpo);
      else await api.put(`/funcionarios/${funcionario._id}`, corpo);
      onSalvo();
    } catch (err) {
      const resp = err.response?.data;
      // 400 do backend: { detalhes: { campo: [mensagens] } }
      if (resp?.detalhes) {
        Object.entries(resp.detalhes).forEach(([campo, msgs]) =>
          setError(campo, { message: msgs[0] })
        );
      }
      // 409 (CPF/e-mail duplicado): { erro, campo }
      else if (resp?.campo) {
        setError(resp.campo, { message: resp.erro });
      } else {
        setError('root', { message: resp?.erro || 'Erro ao salvar funcionário.' });
      }
    }
  };

  const campo = 'w-full rounded-md border px-3 py-2 text-sm';
  const erro = (nome) =>
    errors[nome] && <p className="mt-1 text-xs text-red-600">{errors[nome].message}</p>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">
          {modo === 'criar' ? 'Novo funcionário' : 'Editar funcionário'}
        </h2>

        <div>
          <label className="text-sm">Nome completo</label>
          <input {...register('nome')} className={campo} />
          {erro('nome')}
        </div>

        <div>
          <label className="text-sm">CPF</label>
          <input {...register('cpf')} placeholder="000.000.000-00" className={campo} />
          {erro('cpf')}
        </div>

        <div>
          <label className="text-sm">Cargo</label>
          <select {...register('perfil')} className={campo}>
            <option value="">Selecione…</option>
            {PERFIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
          {erro('perfil')}
        </div>

        <div>
          <label className="text-sm">Especialidade (opcional)</label>
          <input {...register('especialidade')} className={campo} />
          {erro('especialidade')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Telefone (opcional)</label>
            <input {...register('telefone')} placeholder="(14) 99999-9999" className={campo} />
            {erro('telefone')}
          </div>
          <div>
            <label className="text-sm">E-mail (opcional)</label>
            <input {...register('email')} className={campo} />
            {erro('email')}
          </div>
        </div>

        <div>
          <label className="text-sm">
            {modo === 'criar' ? 'Senha' : 'Nova senha (deixe vazio para manter)'}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            {...register('senha')}
            className={campo}
          />
          {erro('senha')}
        </div>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onFechar} className="rounded-md border px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
