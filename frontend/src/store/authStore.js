import { create } from 'zustand';
import api from '../api/axiosClient';

/**
 * RF18 - Sessão Contínua (Persistent Login)
 * RF01 - o `perfil` guardado aqui é só para a UI decidir o que MOSTRAR;
 * a autorização de verdade é sempre revalidada no backend a cada requisição.
 */
export const useAuthStore = create((set) => ({
  funcionario: null,
  carregando: true,

  login: async (cpf, senha) => {
    const { data } = await api.post('/auth/login', { cpf, senha });
    set({ funcionario: data.funcionario });
    return data.funcionario;
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ funcionario: null });
  },

  // Chamado uma vez ao carregar o app: tenta restaurar a sessão via cookie
  // (RF18 - redireciona ao mapa de mesas sem precisar logar de novo).
  restaurarSessao: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ funcionario: data.funcionario, carregando: false });
    } catch {
      set({ funcionario: null, carregando: false });
    }
  },
}));
