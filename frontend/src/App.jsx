import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';

export default function App() {
  const restaurarSessao = useAuthStore((s) => s.restaurarSessao);

  // RF18 - Sessão Contínua: tenta restaurar via cookie httpOnly ao abrir o app.
  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  return <AppRoutes />;
}
