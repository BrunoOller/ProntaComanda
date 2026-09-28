# Pronta Comanda

Sistema de gestão de mesas para estabelecimentos, com cardápio digital,
KDS (cozinha/bar), estoque e gestão financeira. Backend e frontend são
projetos separados.

**Stack:** Node + Express + MongoDB (Mongoose) no backend; React + Vite +
Tailwind no frontend; comunicação em tempo real com socket.io.

## Estrutura

```
ProntaComanda/
├── backend/
│   ├── server.js              # ponto de entrada (conecta DB, sockets, cron, HTTP)
│   ├── tests/                 # testes automatizados (node --test) + banco falso em tests/helpers
│   └── src/
│       ├── app.js             # monta o Express (helmet, cors, rotas em /api)
│       ├── config/            # conexão com o banco
│       ├── models/            # schemas Mongoose (ver models/README.md)
│       ├── schemas/           # validação Zod de entrada, um arquivo por módulo
│       ├── routes/            # endpoints + RBAC + validação (fino, delega ao controller)
│       ├── controllers/       # regra de negócio de cada módulo
│       ├── middlewares/       # auth (JWT), RBAC, validate (Zod), erro global
│       ├── sockets/           # socket.io (KDS, mapa de mesas, ruptura de estoque)
│       ├── jobs/              # rollup mensal agendado (node-cron)
│       └── utils/             # logger (winston), asyncHandler, AppError, cpf, escaparRegex
│
└── frontend/
    └── src/
        ├── api/               # cliente axios
        ├── store/             # zustand (sessão do funcionário)
        ├── routes/            # react-router-dom + guarda de rota por perfil
        │   └── destinosPorPerfil.js  # fonte única: para onde cada perfil vai após logar
        ├── schemas/           # validação de formulário (zod + react-hook-form)
        ├── hooks/             # useSocket (tempo real)
        ├── components/
        │   ├── layout/        # sidebar do admin (filtrada por perfil, com botão Sair)
        │   └── kds/           # quadro do KDS, compartilhado entre 2 telas
        └── pages/
            ├── admin/         # Dashboard, Cardápio, Mesas/Comandas, Cozinha, Estoque, Funcionários
            ├── funcionarios/  # Mapa de mesas + Mesa (cardápio digital + comanda), mobile
            └── kds/           # tela standalone do KDS, sem sidebar (cozinha/bar)
```

## Como cada perfil entra no sistema

O login manda todo mundo para `/`, que decide o destino
(`routes/destinosPorPerfil.js`). Cada rota é protegida por perfil
(`routes/RotaProtegida.jsx`, RF01) e o backend valida o perfil de novo em
toda requisição.

| Perfil | Cai em | Sidebar? |
|---|---|---|
| administrador | `/admin/dashboard` | Sim, todos os itens |
| caixa | `/admin/mesas` | Sim, só "Mesas/Comandas" |
| cozinha / bar | `/kds` | Não, tela standalone só com o KDS |
| garçom | `/funcionarios` | Não, módulo mobile |

## Como rodar

Requisitos: Node 22 e MongoDB rodando (local ou Atlas).

**Backend**
```bash
cd backend
cp .env.example .env    # no Windows: copy .env.example .env
npm install
npm run dev              # nodemon, porta 3333
```

No `.env`, ajuste `MONGO_URI` e troque o `JWT_SECRET` por uma chave própria:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # vite, porta 5173, com proxy de /api -> :3333
```

### Primeiro administrador

Todas as rotas de gestão exigem um administrador logado, então o primeiro
precisa ser criado direto no banco. Gere o hash da senha:

```bash
cd backend
node -e "require('argon2').hash('SUA_SENHA').then(console.log)"
```

E insira no `mongosh` (ou no Compass), com o **CPF só com dígitos**:

```js
db.funcionarios.insertOne({
  nome: 'Seu Nome',
  cpf: '52998224725',          // precisa ser um CPF válido (dígitos verificadores)
  senhaHash: '<hash gerado acima>',
  perfil: 'administrador',
  ativo: true                   // obrigatório ao inserir fora do Mongoose
})
```

Depois é só logar e cadastrar o resto da equipe pela tela de Funcionários.

### Testes

```bash
cd backend
node --test tests/*.test.js    # ou: npm test, se houver o script "test" no package.json
```

Os testes sobem o app real com um banco **falso em memória**
(`tests/helpers/fakeColecao.js`), então rodam sem MongoDB. Cobrem Mesa
(incluindo reabertura), Pagamento e Comanda. Como o banco é simulado, eles
não substituem um teste com o Mongo real: índices únicos, `$set`/`$unset` e
comportamento de `populate` só se confirmam rodando o sistema.

## API

Todas as rotas ficam sob `/api` e (exceto o login) exigem o cookie de sessão.
Erros seguem o formato `{ "erro": "mensagem" }`; validação de entrada devolve
400 com `{ "erro": "Dados inválidos.", "detalhes": { campo: [mensagens] } }`.
Duplicidade (CPF, e-mail, nome, número de mesa) devolve 409.

| Módulo | Endpoints | Quem acessa |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | qualquer (`me` exige login) |
| Funcionários | `GET/POST /funcionarios`, `GET/PUT/DELETE /funcionarios/:id`, `PATCH /funcionarios/:id/reativar` | administrador |
| Categorias | `GET /categorias`, `GET /categorias/:id` | qualquer perfil logado |
| | `POST /categorias`, `PUT/DELETE /categorias/:id`, `PATCH /categorias/:id/reativar` | administrador |
| Produtos | `GET /produtos`, `GET /produtos/:id`, `GET /cardapio` | qualquer perfil logado |
| | `POST /produtos`, `PUT/DELETE /produtos/:id`, `PATCH /produtos/:id/disponibilidade`, `PATCH /produtos/:id/reativar` | administrador |
| Estoque | `GET/POST /estoque`, `GET/PUT/DELETE /estoque/:id`, `PATCH /estoque/:id/reativar`, `POST /estoque/:id/movimentar`, `GET /estoque/:id/movimentacoes` | administrador |
| Mesas | `GET /mesas` | qualquer perfil logado |
| | `POST /mesas`, `DELETE /mesas/:id`, `PATCH /mesas/:id/reabrir` | administrador |
| | `POST /mesas/:id/abrir`, `PATCH /mesas/:id/solicitar-fechamento` | garçom, caixa, administrador |
| Comandas | `GET /comandas/mesa/:mesaId`, `GET /comandas/produtos/:produtoId/sugestoes` | qualquer perfil logado |
| | `POST /comandas/abrir`, `POST /comandas/:id/itens`, `POST /comandas/:id/transferir` | garçom, caixa, administrador |
| | `GET /comandas/kds?setor=`, `PATCH /comandas/:id/avancar-status?setor=`, `PATCH /comandas/:id/itens/:itemId/status` | cozinha, bar, administrador |
| | `PATCH /comandas/:id/itens/:itemId/estornar` | caixa, administrador |
| | `PATCH /comandas/:id/desconto` | administrador |
| Pagamentos | `POST /pagamentos/mesa/:mesaId/fechar`, `POST /pagamentos/comanda/:comandaId/fechar` | caixa, administrador |
| Dashboard | `GET /dashboard/visao-geral`, `GET /dashboard/top-produtos` | administrador |

**Eventos socket.io:** `mesa:atualizada` (sala `mapa-mesas`),
`kds:novo-item` (sala do setor: `cozinha` ou `bar`), `kds:status-atualizado`
e `produto:atualizado` (disponibilidade/ruptura, para todos os dispositivos).

## Regras de negócio que valem saber

- **Soft delete (RNF11):** funcionário, categoria, produto, insumo e mesa são
  inativados, nunca apagados, para preservar o histórico. Todos têm rota de
  reativar (exceto mesa, que é recriada pelo mesmo número).
- **Snapshot no item da comanda:** nome e preço do produto são copiados no
  lançamento, então editar o cardápio depois não altera contas antigas.
- **Setor vem do cadastro:** o item lançado usa o `setor` (cozinha/bar) do
  produto; o que o app enviar é ignorado.
- **Categoria com produto ativo não pode ser inativada** (409, com a contagem).
- **Mesa:** livre → ocupada (abrir) → aguardando fechamento (solicitar) →
  livre (pagamento). Uma mesa pode ter várias comandas abertas ao mesmo tempo.
- **Pagamento (RF11):** o valor recebido tem que cobrir o total (com
  tolerância de meio centavo); menos que isso é recusado com 409 dizendo
  quanto falta. Descontos e itens estornados entram no cálculo.
- **Estorno e transferência (RF07/RF08/RF25):** só em comanda aberta. Para
  corrigir depois do fechamento, reabra a mesa primeiro. Estorno exige motivo
  (mínimo 3 caracteres) e gera auditoria.
- **Desconto (RF09):** só administrador, só em comanda aberta, percentual de
  0 a 100.
- **Reabertura (RF12):** só administrador, só numa mesa já livre. Volta a mesa
  para ocupada, reabre a(s) comanda(s) e estorna o último pagamento
  (`estornado: true`, que o dashboard ignora).
- **KDS (RF05/RF06):** a esteira só avança (pendente → em preparo → pronto →
  entregue); item estornado não muda de status.
- **Estoque (RF10/RF22):** o saldo só muda por `/movimentar` (entrada, saída
  ou ajuste), sempre com histórico, e nunca fica negativo. Ajuste exige
  motivo e gera auditoria. Zerar um insumo torna indisponíveis os produtos
  que dependem dele, e repor volta a liberá-los, em tempo real.
- **Auditoria:** criação/edição/desligamento de funcionário, troca de preço e
  inativação de produto, ajuste de estoque, estorno, desconto e reabertura de
  mesa gravam em `LogAuditoria`.

## O que já está funcional

- Login com JWT em cookie httpOnly + argon2, validado com Zod, com mitigação
  de timing attack (CPF inexistente ainda roda um `argon2.verify` falso).
- RBAC (RF01) no backend em toda rota sensível e espelhado no frontend.
- CRUD de Funcionários (com CPF validado por dígito verificador), Categorias,
  Produtos (com setor e tempo de preparo), Estoque e Mesas, todos com
  validação Zod e erros do Mongo traduzidos (duplicidade vira 409, dado
  inválido vira 400).
- Cardápio agrupado por categoria em uma chamada (`GET /cardapio`), usado na
  aba "Todos" do admin.
- Fluxo de mesa completo: abrir → lançar item → KDS → estornar → desconto →
  fechar com pagamento → reabrir se foi engano (RF04 a RF12).
- KDS por setor com semáforo de tempo (RF06) e avanço de status em lote.
- Dashboard com indicadores via aggregation (RF17), valores em reais
  arredondados para 2 casas e exibidos como moeda.
- Telas admin de Funcionários, Cardápio, Estoque e Mesas/Comandas com botões de
  criar, editar, remover/reativar e o botão Sair na sidebar.
- Job de consolidação mensal + expurgo (RF14 a RF16), veja a pendência abaixo.

## O que ainda falta

**Backend**
- **Rollup mensal (RF14 a RF16):** o job atual apaga também comandas ainda
  abertas na virada do mês, não recupera meses perdidos se o servidor estava
  desligado no dia 1º e usa o fuso do servidor em vez do do estabelecimento.
- **Tela/endpoint de log de auditoria:** os registros já são gravados, mas
  não há como consultá-los pela aplicação.
- **Dashboard completo do design:** filtro de período (hoje/semana/mês),
  variação vs. período anterior, faturamento por mês (lendo do
  `ResumoMensal`, já que o expurgo apaga os pedidos antigos), status dos
  pedidos e ticket médio.
- **Ficha técnica:** `insumosNecessarios` existe no produto, mas o lançamento
  de item ainda não dá baixa no estoque (hoje só o ajuste manual mexe no saldo).
- **Reabertura por comanda:** a reabertura (RF12) é por mesa; fechar por
  engano uma comanda avulsa enquanto a mesa continua ocupada ainda não tem
  como ser desfeito.
- Swagger/OpenAPI (o `swagger-ui-express` já está no `package.json`, faltam as specs).
- Backup segmentado (RNF05) e revisão de índices para o limite de 1s (RNF09).
- Limite de tentativas no login e atualização do `multer` para a 2.x.
- Upload de foto de produto (hoje só aceita link em `imagemUrl`).
- Emissão de vias impressas (RF13, opcional).
- Testes para Auth, Funcionário, Categoria/Produto, Estoque e rollup.

**Frontend**
- Refino visual das telas para bater com o Figma (cores, espaçamento, tema
  escuro completo).
- Trocar os `prompt`/`confirm`/`alert` do navegador por modal, bottom sheet e
  toast, deixando para depois que o backend fechar.
- Telas mobile e KDS mais completas.

## Convenções

- **Commits** no padrão Conventional Commits: `tipo(escopo): descrição`
  (`feat`, `fix`, `chore`, `test`), por exemplo
  `fix(pagamento): bloqueia fechamento com valor insuficiente`.
- Antes de commitar: `npm run lint` e `npm run format` no backend, e conferir
  o `git status` para não subir `.env`, `logs/`, `node_modules/` nem pastas de
  build de IDE.

## Histórico de bugs corrigidos

- **Loop de navegação na raiz (`/`):** `RotaProtegida`, `RaizRedirect` e
  `AdminIndex` usavam `<Navigate>` declarativo, que redispara a navegação a
  cada re-render. Como esses componentes assinavam a store inteira, qualquer
  mudança nela recriava o `<Navigate>` e travava o app com "Maximum update
  depth exceeded". Corrigido com `useNavigate()` + `useEffect` com
  dependências explícitas.
  ⚠️ **O bug já voltou uma vez** porque uma cópia local desatualizada foi
  enviada por cima da correção. Ao mexer nesses três arquivos, mantenha o
  padrão `useEffect` + `useNavigate`, nunca `<Navigate>` direto, e confira o
  `git diff` antes de commitar.
- **Auditoria de produto perdida em silêncio:** o controller gravava tipos
  (`produto_preco_alterado`, `produto_inativado`, `produto_reativado`) que não
  existiam no enum de `LogAuditoria`; o `try/catch` engolia o erro e nada era
  salvo. Corrigido adicionando os tipos ao enum.
- **Reabertura de mesa (RF12) nunca funcionava:** a condição estava invertida
  e bloqueava justamente o caso de uso (mesa já fechada). Agora reabre a
  comanda e estorna o pagamento.
- **Pagamento menor que o total era aceito:** só zerava o troco e liberava a
  mesa. Agora é recusado (409).
- **Status do KDS sem validação:** qualquer texto era gravado, e o item nunca
  mais saía da tela. Agora só aceita os 4 status, e só para frente.
- **Estorno, transferência e desconto em comanda já fechada** alteravam contas
  já cobradas. Agora exigem comanda aberta.
- **Criar mesa sem número** podia reativar a primeira mesa do banco por engano
  (o Mongo ignora chaves `undefined` no filtro). Agora dá 400.
- **Telas sem `try/catch`:** fechar mesa, estornar item e aplicar desconto
  quebravam em silêncio quando o backend recusava. Agora mostram o motivo.
