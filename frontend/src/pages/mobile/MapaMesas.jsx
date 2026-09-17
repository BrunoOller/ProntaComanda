import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';

// RF19/RF20 - Header contextual + seleção de mesa touch-friendly (mobile)
export default function MapaMesas() {
  const [mesas, setMesas] = useState([]);
  const { funcionario, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/mesas').then((r) => setMesas(r.data));
  }, []);

  const abrirMesa = async (mesa) => {
    if (mesa.status === 'livre') {
      await api.post(`/mesas/${mesa._id}/abrir`);
    }
    navigate(`/mesa/${mesa._id}`);
  };

  return (
    <div className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between border-b pb-2">
        <span className="text-sm font-medium">{funcionario?.nome}</span>
        <button onClick={logout} className="text-sm text-red-600">
          Sair
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {mesas.map((mesa) => (
          <button
            key={mesa._id}
            onClick={() => abrirMesa(mesa)}
            className={`rounded-lg border-2 p-6 text-center ${
              mesa.status === 'livre' ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <p className="text-2xl font-bold">{String(mesa.numero).padStart(2, '0')}</p>
            <p className="text-sm">Mesa</p>
          </button>
        ))}
      </div>
    </div>
  );
}
