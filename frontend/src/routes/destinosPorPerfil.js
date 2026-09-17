/**
 * RF01 - Uma única fonte da verdade pra "onde cada perfil cai depois de
 * logar" — usada pelo Login.jsx (destino após autenticar) e pela raiz "/"
 * (RaizRedirect.jsx, pra quando alguém já logado abre a URL base ou dá
 * refresh). Evita duplicar essa tabela em dois lugares e eles saírem de
 * sincronia quando um perfil novo aparecer.
 */
export const DESTINO_POR_PERFIL = {
  administrador: '/admin/dashboard',
  caixa: '/admin/mesas',
  cozinha: '/kds',
  bar: '/kds',
  garcom: '/funcionarios',
};

export function destinoPosLogin(perfil) {
  return DESTINO_POR_PERFIL[perfil] || '/funcionarios';
}
