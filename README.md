# Pronta Comanda

Sistema de gestão de mesas para estabelecimentos, com cardápio digital e
gestão financeira. Backend e frontend separados, conforme especificado.

## Estrutura

```
ProntaComanda/
├── backend/                  # Node + Express + MongoDB (Mongoose)
│   ├── server.js              # ponto de entrada (conecta DB, sockets, cron, HTTP)
│   └── src/
│       ├── app.js             # monta o Express (middlewares globais + rotas)
│       ├── config/            # conexão com o banco
│       ├── models/            # schemas Mongoose (ver README próprio)
│       ├── schemas/           # validação Zod de entrada (auth, funcionário)
│       ├── routes/            # define os endpoints (fino, delega ao controller)
│       ├── controllers/       # regra de negócio de cada módulo
│       ├── middlewares/       # auth (JWT), RBAC, validate (Zod), erro global
│       ├── sockets/           # configuração do socket.io (KDS, mapa de mesas)
│       ├── jobs/              # rollup mensal agendado (node-cron)
│       └── utils/             # logger (winston), asyncHandler, AppError, cpf
│
└── frontend/                 # React + Vite + Tailwind
    └── src/
        ├── api/                # cliente axios
        ├── store/              # zustand (sessão do funcionário)
        ├── routes/             # react-router-dom + guarda de rota por perfil
        │   └── destinosPorPerfil.js  # fonte única: pra onde cada perfil vai após logar
        ├── schemas/            # validação de formulário (zod + react-hook-form)
        ├── hooks/              # useSocket (tempo real)
        ├── components/
        │   ├── layout/         # sidebar do admin (filtrada por perfil)
        │   └── kds/            # quadro do KDS, compartilhado entre 2 telas
        └── pages/
            ├── admin/          # Cardápio, Mesas/Comandas, Cozinha (supervisão), Funcionários, Dashboard
            ├── funcionarios/   # Mapa de mesas + Mesa (cardápio digital + comanda) — garçom/caixa/admin
            └── kds/            # tela standalone do KDS, sem sidebar — cozinha/bar
```

## Como cada perfil entra no sistema

Login manda todo mundo pra `/`, que decide sozinho o destino (ver
`routes/destinosPorPerfil.js`), e cada rota é protegida por perfil
(`routes/RotaProtegida.jsx`, RF01 — restringe visualização, não só execução):

| Perfil | Cai em | Sidebar? |
|---|---|---|
| administrador | `/admin/dashboard` | Sim, todos os itens |
| caixa | `/admin/mesas` | Sim, só "Mesas/Comandas" |
| cozinha / bar | `/kds` | Não — tela standalone só com o KDS |
| garçom | `/funcionarios` | Não — módulo mobile |

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

## O que já está funcional (testado rodando, não só em build)

- Login completo: JWT + cookie httpOnly + argon2, validado com Zod
  (`schemas/auth.schema.js`), com mitigação de timing attack (CPF
  inexistente ainda roda um `argon2.verify` de mentira, pra não dar pra
  descobrir CPF cadastrado pela latência da resposta)
- RBAC (RF01) validado no backend em toda rota sensível, e espelhado no
  frontend tanto na navegação (guarda de rota) quanto na sidebar (cada
  perfil só vê os itens de menu que pode de fato abrir)
- CRUD completo de Funcionários: criar/editar/desligar/reativar, com
  validação de CPF por dígito verificador (`utils/cpf.js`), auditoria de
  cada ação sensível, e a regra "não é possível desligar nem rebaixar o
  único administrador ativo do sistema"
- Erros do Mongo traduzidos em respostas amigáveis (CPF/e-mail duplicado
  vira 409, validação de schema vira 400) em vez de "erro inesperado" genérico
- CRUD completo de Categorias e Produtos: validação Zod rica (preço com no
  máximo 2 casas decimais, nome único por categoria, imagem só aceita
  URL http(s) válida), 404 tratado, nome de categoria/produto duplicado
  bloqueado, categoria com produto ativo não pode ser inativada, e todo
  o histórico de troca de preço/inativação/reativação vai para auditoria
- `GET /cardapio` — categorias ativas já com seus produtos dentro, em uma
  chamada só (alimenta a aba "Todos" do admin e a tela do garçom)
- Produto agora carrega o próprio `setor` (cozinha/bar) e
  `tempoPreparoMinutos`: o app do garçom não escolhe/inventa o setor no
  lançamento, ele vem do cadastro (fecha uma brecha onde um cliente mal-
  intencionado podia mandar uma bebida pra tela da cozinha)
- Fluxo de mesa: abrir → lançar item → KDS muda status → estornar item →
  aplicar desconto → fechar mesa com pagamento (RF04-RF12) — testado
  manualmente ponta a ponta (admin cadastra mesa → aparece na hora certa
  na tela do garçom)
- Estorno de item (RF08) e desconto aplicado (RF09) agora gravam auditoria
  (antes só validavam o motivo/valor, mas não deixavam rastro consultável)
- Reabertura de mesa (RF12) também auditada, e só é permitida se a mesa não
  estiver livre (evita reabrir o que não tem o que reabrir)
- 404 tratado (em vez de 200 com corpo vazio, ou 500 cru) em: mesa, item de
  comanda, transferência entre comandas, fechamento de pagamento e
  movimentação de estoque
- KDS com listagem por setor (`GET /comandas/kds?setor=cozinha|bar`),
  semáforo de tempo (RF06) e avanço de status em lote por pedido
- Estoque com alerta de ruptura em tempo real via socket.io (RF10/RF22),
  exige motivo em ajuste manual
- Dashboard com indicadores agregados via MongoDB aggregation (RF17)
- Job de consolidação mensal + expurgo, agendado com node-cron (RF14-RF16)

## O que ainda falta (próximos passos naturais)

- Refino visual das telas (o frontend aqui é funcional, não pixel-perfect
  em relação ao Figma — cores, espaçamentos e tema escuro completo)
- Testes automatizados (unitários nos controllers, e2e nas rotas)
- Swagger/OpenAPI (pacote `swagger-ui-express` já está no `package.json`,
  falta escrever as specs)
- Emissão de vias impressas (RF13, opcional)
- Botão "+ Adicionar Mesa" no admin ainda não tem `onClick` (mesa hoje só
  entra no banco via mongosh/script)
- Mesa, Comanda, Pagamento e Estoque ainda não têm validação Zod na entrada
  (hoje só Auth, Funcionário, Categoria e Produto têm) — o Mongoose ainda
  cobre o básico via `errorHandler`, mas as mensagens ficam menos amigáveis

## Histórico de bugs corrigidos

- **Loop de navegação na raiz (`/`)**: `RotaProtegida`, `RaizRedirect` e
  `AdminIndex` usavam `<Navigate>` declarativo, que redispara a navegação a
  cada re-render. Como esses componentes assinavam a store inteira,
  qualquer mudança nela recriava o `<Navigate>` e travava o app com
  "Maximum update depth exceeded". Corrigido trocando por
  `useNavigate()` + `useEffect` com dependências explícitas.
  ⚠️ **Esse bug já voltou uma vez** porque alguém subiu uma cópia local
  desatualizada por cima (obrigado surita). Se for mexer em
  `RotaProtegida.jsx` / `RaizRedirect.jsx` / `AdminIndex.jsx`, mantenha o
  padrão `useEffect`+`useNavigate` — nunca `<Navigate>` direto. 
- **Auditoria de produto quebrada silenciosamente**: `produto.controller.js`
  gravava tipos (`produto_preco_alterado`, `produto_inativado`,
  `produto_reativado`) que não existiam no enum do model `LogAuditoria`.
  O `try/catch` da função `auditar()` engolia o erro, então nada quebrava
  na tela, mas a auditoria simplesmente não era salva. Corrigido
  adicionando os tipos faltantes ao enum.
