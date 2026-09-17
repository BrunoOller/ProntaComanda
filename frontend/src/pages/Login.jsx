import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema } from '../schemas/auth.schema';
import { useAuthStore } from '../store/authStore';

// RF02 - Tela de login (ver frame "Login" do design, tema vinho/laranja)
export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ cpf, senha }) => {
    try {
      await login(cpf, senha);
      navigate('/');
    } catch {
      setError('root', { message: 'CPF ou senha inválidos.' });
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-primary-dark to-primary md:block" />

      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold">Bem-vindo</h1>

          <div>
            <input
              {...register('cpf')}
              placeholder="CPF"
              className="w-full rounded-md border px-3 py-2"
            />
            {errors.cpf && <p className="text-sm text-red-600">{errors.cpf.message}</p>}
          </div>

          <div>
            <input
              type="password"
              {...register('senha')}
              placeholder="Senha"
              className="w-full rounded-md border px-3 py-2"
            />
            {errors.senha && <p className="text-sm text-red-600">{errors.senha.message}</p>}
          </div>

          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary py-2 text-white disabled:opacity-50"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
