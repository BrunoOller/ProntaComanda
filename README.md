# Pronta Comanda

Sistema de gestão de mesas para estabelecimentos, com cardápio digital e
gestão financeira. 

## Estrutura

```
pronta-comanda/
├── backend/                 # Node + Express + MongoDB (Mongoose)
│   ├── server.js             # ponto de entrada (conecta DB, sockets, cron, HTTP)
│   └── src/
│       ├── app.js            # monta o Express (middlewares globais + rotas)
│       ├── config/           # conexão com o banco
│       ├── models/           # schemas Mongoose (ver README próprio)
│       ├── routes/           # define os endpoints (fino, delega ao controller)
│       ├── controllers/      # regra de negócio de cada módulo
│       ├── middlewares/      # auth (JWT), RBAC, validação (zod), erro global
│       ├── sockets/          # configuração do socket.io (KDS, mapa de mesas)
│       ├── jobs/             # rollup mensal agendado (node-cron)
│       └── utils/            # logger (winston), asyncHandler
│
└── frontend/                # React + Vite + Tailwind
    └── src/
        ├── api/               # cliente axios
        ├── store/             # zustand (sessão do funcionário)
        ├── routes/            # react-router-dom + guarda de rota por perfil
        ├── schemas/           # validação de formulário (zod + react-hook-form)
        ├── hooks/             # useSocket (tempo real)
        ├── components/layout/ # sidebar do admin
        └── pages/
            ├── admin/         # Cardápio, Mesas/Comandas, Cozinha, Funcionários, Dashboard
            └── mobile/        # Mapa de mesas, Mesa (cardápio + comanda)
```

## Como rodar

**Backend**
```bash
cd backend
cp .env.example .env   # ajuste MONGO_URI, JWT_SECRET etc.
npm install
npm run dev             # nodemon, porta 3333
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # vite, porta 5173, com proxy de /api -> :3333
```

## O que já está funcional (validado com build/smoke test real)

- Todos os models Mongoose (ver `backend/src/models/README.md`)
- Auth (login/logout/me) com JWT + cookie httpOnly + argon2
- Middleware de RBAC (`permitir('administrador', ...)`) aplicado em cada rota
  sensível, conforme RF01
- CRUD de funcionários, categorias, produtos
- Fluxo de mesa: abrir → lançar item → KDS muda status → estornar item →
  aplicar desconto → fechar mesa com pagamento (RF04-RF12)
- Estoque com alerta de ruptura em tempo real via socket.io (RF10/RF22)
- Dashboard com indicadores agregados via MongoDB aggregation (RF17)
- Job de consolidação mensal + expurgo, agendado com node-cron (RF14-RF16)
- Telas do frontend (admin e mobile) já conectadas na API real, com o
  layout/sidebar do design e navegação por perfil

## O que ainda falta (próximos passos naturais)

- Refino visual das telas (o frontend aqui é funcional, não pixel-perfect
  em relação ao Figma — cores, espaçamentos e tema escuro completo)
- Endpoint de listagem do KDS por setor (`GET /comandas/kds?setor=cozinha`)
  usado pela tela `pages/admin/Cozinha.jsx`
- Testes automatizados (unitários nos controllers, e2e nas rotas)
- Swagger/OpenAPI (pacote `swagger-ui-express` já está no `package.json`,
  falta escrever as specs)
- Emissão de vias impressas (RF13, opcional)
