import axios from 'axios';

/**
 * RNF02 - Interface Assíncrona e Dinâmica: todas as chamadas passam por
 * aqui, nunca por submit de <form> com reload de página.
 * withCredentials permite o cookie httpOnly de sessão (RF18) viajar em
 * toda requisição, inclusive no mobile.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// RNF10 - se a sessão expirar NO MEIO DO USO, redireciona para o login em
// vez de deixar a tela travada em um erro silencioso.
//
// Duas exceções importantes (senão vira loop de reload infinito):
// 1. Se a chamada que falhou é o próprio '/auth/me' — usado por
//    restaurarSessao() (RF18) pra checar se existe sessão. Um 401 aqui é
//    esperado e normal quando ninguém está logado, não é uma "sessão
//    expirando", então quem trata isso é o catch do authStore, não aqui.
// 2. Se já estamos em /login, não faz sentido redirecionar pra /login de
//    novo (isso recarregava a própria página de login em loop).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isCheckDeSessao = error.config?.url?.includes('/auth/me');
    const jaEstaNoLogin = window.location.pathname === '/login';

    if (error.response?.status === 401 && !isCheckDeSessao && !jaEstaNoLogin) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;