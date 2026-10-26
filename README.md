# Pronta Comanda

Sistema de gestão de mesas para estabelecimentos, com cardápio digital,
KDS (cozinha/bar), estoque e gestão financeira. Backend e frontend são
projetos separados.

**Stack:** Node + Express + MongoDB (Mongoose) no backend; React + Vite +
Tailwind no frontend; comunicação em tempo real com socket.io.

## Estrutura

```
ProntaComanda/
├── docker-compose.yml         # sobe mongo + backend + frontend (ver "Como rodar > Com Docker")
├── .env.example               # modelo do .env do compose (JWT_SECRET etc.)
├── .github/workflows/ci.yml   # CI: docker compose build a cada push na main
├── backend/
│   ├── Dockerfile             # imagem do backend (Node 22)
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
    ├── Dockerfile             # build do Vite + nginx
    ├── nginx.conf             # serve o front e repassa /api, /uploads e /socket.io
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

Há dois jeitos. **O recomendado é com Docker**: um comando sobe tudo (banco,
backend e frontend) sem instalar Node nem MongoDB na máquina. O segundo jeito
(sem Docker) serve para quem prefere desenvolver direto no computador.

### Com Docker (recomendado)

**Você precisa de:**
- **Git**.
- **Docker Desktop** (Windows ou macOS) ou Docker Engine com o plugin Compose
  (Linux). No Windows, instale, **abra o Docker Desktop** e espere ele indicar
  que está rodando (ícone da baleia) antes de usar os comandos. Se o instalador
  pedir para ativar o WSL 2, aceite.

Os comandos abaixo funcionam no **Git Bash** (Windows) e no terminal do
macOS/Linux. Rode todos **na pasta raiz do projeto**, a que tem o
`docker-compose.yml`.

**O que sobe:**

| Serviço | O que é | Como acessar |
|---|---|---|
| `frontend` | nginx servindo o build do React; repassa `/api`, `/uploads` e `/socket.io` para o backend | **http://localhost:8080** (é a única porta que você usa) |
| `backend` | API Node 22 | só por dentro da rede do Docker (porta 3333) |
| `mongo` | MongoDB 7, sem senha | `localhost:27017`, só a própria máquina enxerga (dá para usar o Compass) |

Os dados ficam em *volumes* do Docker (`mongo-data` para o banco e `uploads`
para as fotos de produto), então **sobrevivem** quando você para ou recria os
containers.

#### Passo a passo (primeira vez)

**1. Baixe o projeto**
```bash
git clone https://github.com/BrunoOller/ProntaComanda.git
cd ProntaComanda
```

**2. Crie o seu arquivo `.env`**
```bash
cp .env.example .env
```
O `.env` guarda as configurações da sua máquina e **nunca vai para o Git**.

**3. Gere o `JWT_SECRET`** (a chave que assina os logins; o sistema não sobe
sem ela). Este comando já grava uma chave aleatória no seu `.env`:
```bash
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 64)/" .env
```
Para conferir, abra o `.env`: a linha `JWT_SECRET=` deve ter um texto longo.
Cada pessoa gera a sua; não compartilhe nem commite essa chave.

**4. Suba o sistema**
```bash
docker compose up --build
```
Na **primeira vez demora alguns minutos** (baixa as imagens e instala as
dependências). O terminal fica "preso" mostrando os logs, e isso é normal. Está
pronto quando aparecer `Pronta Comanda API rodando na porta 3333`. Se preferir
ter o terminal de volta, use `docker compose up --build -d` (o `-d` roda em
segundo plano).

**5. Confira se está tudo certo** (em outro terminal, na mesma pasta, se você
não usou o `-d`)
```bash
docker compose ps
```
`mongo` e `backend` devem aparecer como `(healthy)`. Teste também a API:
```bash
curl -i http://localhost:8080/api/auth/me
```
Deve responder `401` com `{"erro":"Não autenticado."}`. Isso é o esperado:
você ainda não fez login, e a resposta prova que o nginx está falando com o
backend.

**6. Crie o primeiro administrador.** O banco começa vazio e todas as rotas de
gestão exigem um administrador logado, então o primeiro é criado por este
comando. Ele roda **dentro do container do backend**, grava a senha com hash
argon2 (nunca em texto puro) e cria o usuário. Troque `NOME`, `CPF` e `SENHA`
pelos seus (a senha precisa de pelo menos 6 caracteres e não pode ter aspas
simples; o CPF precisa ser **válido**, com dígitos verificadores corretos, e
pode ter ou não pontos e traço):
```bash
docker compose exec -T \
  -e NOME='Seu Nome' -e CPF='529.982.247-25' -e SENHA='SuaSenhaAqui' \
  backend node - <<'EOF'
const mongoose = require('mongoose');
const argon2 = require('argon2');
const { Funcionario } = require('./src/models');
const { normalizarCpf, validarCpf } = require('./src/utils/cpf');

(async () => {
  const cpf = normalizarCpf(process.env.CPF || '');
  if (!validarCpf(cpf)) throw new Error('CPF inválido (precisa ter os dígitos verificadores corretos).');
  if (!process.env.SENHA || process.env.SENHA.length < 6) throw new Error('Senha muito curta (mínimo 6 caracteres).');
  await mongoose.connect(process.env.MONGO_URI);
  const senhaHash = await argon2.hash(process.env.SENHA);
  const adm = await Funcionario.create({
    nome: process.env.NOME,
    cpf,
    senhaHash,
    perfil: 'administrador',
  });
  console.log('Administrador criado:', adm.nome, '| CPF:', adm.cpf);
  await mongoose.disconnect();
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
EOF
```
Cole o bloco inteiro, do `docker compose exec` até a linha `EOF`. Deve
aparecer `Administrador criado: ...`. Se o CPF já existir, o comando avisa
(`Erro: ... duplicate key`), e aí é só entrar com ele.

**7. Entre no sistema:** abra **http://localhost:8080** e faça login com o CPF
e a senha do passo 6. O resto da equipe (caixa, garçom, cozinha, bar) é
cadastrado depois, pela tela de Funcionários.

#### Comandos do dia a dia

Sempre na pasta raiz do projeto:

| O que você quer | Comando |
|---|---|
| Subir (já construído antes) | `docker compose up -d` |
| Ver o estado dos serviços | `docker compose ps` |
| Ver os logs ao vivo (Ctrl+C sai, sem derrubar nada) | `docker compose logs -f backend` |
| Parar mantendo tudo (rápido para voltar) | `docker compose stop` |
| Desligar e remover os containers (**os dados continuam salvos**) | `docker compose down` |
| Atualizar depois de um `git pull` ou de mudar código | `docker compose up --build -d` |
| ⚠️ **Apagar tudo, inclusive o banco e as fotos** (volta ao zero) | `docker compose down -v` |

> **Mudou o código e nada mudou na tela?** Neste modo o código vai
> *empacotado* dentro da imagem: sem o `--build`, o Docker reutiliza a versão
> antiga. Sempre use `docker compose up --build -d` depois de editar ou de um
> `git pull`.

#### Configurações opcionais (`.env`)

| Variável | Padrão | Para que serve |
|---|---|---|
| `JWT_SECRET` | *(obrigatória)* | Chave que assina o login. O compose recusa subir sem ela |
| `WEB_PORT` | `8080` | Porta do sistema no navegador |
| `MONGO_PORT` | `27017` | Porta do Mongo na sua máquina (mude se der conflito) |
| `JWT_EXPIRES_IN` | `8h` | Duração do login |
| `TZ_ESTABELECIMENTO` | `America/Sao_Paulo` | Fuso do rollup mensal e do dashboard |

Depois de mudar o `.env`, rode `docker compose up -d` para aplicar.

#### Problemas comuns

| O que aparece | O que fazer |
|---|---|
| `ports are not available ... 127.0.0.1:27017` (ou "só é permitida uma utilização de cada endereço") | A porta 27017 já está em uso, geralmente por um **MongoDB instalado no Windows**. Coloque `MONGO_PORT=27018` no `.env` e rode `docker compose up -d` de novo. Para ver quem usa a porta: `netstat -ano \| grep 27017`, depois `tasklist \| grep NUMERO_DO_PID` |
| Mesmo erro, mas com a porta **8080** | Coloque `WEB_PORT=8081` no `.env` e abra `http://localhost:8081` |
| `Defina o JWT_SECRET ...` | O `.env` não existe ou está com `JWT_SECRET=` vazio. Refaça os passos 2 e 3 |
| `failed to connect to the docker API` / `Cannot connect to the Docker daemon` | O Docker não está rodando. Abra o Docker Desktop e espere iniciar |
| A tela abre, mas o login diz que o CPF ou a senha estão inválidos | O administrador ainda não foi criado (passo 6), ou o CPF/senha estão diferentes |
| O banco voltou vazio | Alguém rodou `docker compose down -v` (apaga os volumes). Recrie o administrador (passo 6) |
| `backend` fica `unhealthy` ou reiniciando | Veja o motivo com `docker compose logs backend`. Geralmente é `JWT_SECRET` ou o Mongo ainda iniciando |
| Quer começar do zero | `docker compose down -v` e depois repita a partir do passo 4 |

#### Bom saber

- **Conectar no Compass:** `mongodb://localhost:27017` (ou a porta do
  `MONGO_PORT`), banco `pronta-comanda`.
- **Atrás do nginx:** o compose liga o `TRUST_PROXY=1` para o limite de
  tentativas de login funcionar por IP real, e as conexões de tempo real
  (socket.io, com WebSocket) passam pelo mesmo endereço do site.
- **Não é uma configuração de produção.** O Mongo está **sem senha** (por isso
  só aceita conexões da própria máquina), o site roda em HTTP e o backend
  usa `NODE_ENV=development` de propósito. Não exponha essas portas na internet
  nem em rede compartilhada. Uma versão de produção (HTTPS, senha no banco,
  backup) ainda está nos planos.
- **Integração contínua:** a cada push na `main`, o GitHub Actions
  (`.github/workflows/ci.yml`) roda `docker compose build` para garantir que as
  imagens continuam compilando.

### Sem Docker (desenvolvimento local)

Requisitos: Node 22 e MongoDB rodando (local ou Atlas).

**Backend**
```bash
cd backend
cp .env.example .env
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

#### Primeiro administrador (sem Docker)

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
| Dashboard | `GET /dashboard/visao-geral?periodo=`, `GET /dashboard/faturamento-mensal`, `GET /dashboard/status-pedidos?periodo=`, `GET /dashboard/top-produtos?periodo=` | administrador |

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
  de timing attack (CPF inexistente ainda roda um `argon2.verify` falso) e
  limite de 10 tentativas por 15 minutos (`express-rate-limit`); login
  correto nunca conta pro limite.
- RBAC (RF01) no backend em toda rota sensível e espelhado no frontend.
- CRUD de Funcionários (com CPF validado por dígito verificador), Categorias,
  Produtos (com setor e tempo de preparo), Estoque e Mesas, todos com
  validação Zod e erros do Mongo traduzidos (duplicidade vira 409, dado
  inválido vira 400).
- Cardápio agrupado por categoria em uma chamada (`GET /cardapio`), usado na
  aba "Todos" do admin.
- Fluxo de mesa completo: abrir → lançar item → KDS → estornar → desconto →
  fechar com pagamento → reabrir se foi engano (RF04 a RF12).
- KDS por setor com semáforo de tempo (RF06, por produto — usa o tempo de
  preparo cadastrado no Cardápio, com um limite padrão quando não há tempo
  configurado) e avanço de status em lote.
- Módulo mobile do garçom (RF19 a RF26): carrinho com quantidade e remoção
  por item, seleção explícita de qual comanda recebe o pedido, "+ Nova
  comanda" sempre disponível (nunca fica sem destino pro pedido), sugestão
  de observações com um toque (RF21), espelho de consumo com status
  colorido e subtotal (RF23), mapa de mesas com os 3 status e indicador de
  conexão (RF04/RF19), tudo atualizado em tempo real por socket.
- Dashboard completo do design (RF17): filtro Hoje/Esta semana/Este mês,
  variação vs. período anterior (volta `null` quando o dado já foi expurgado
  e não dá pra comparar), faturamento dos últimos 12 meses (gráfico
  ApexCharts), taxa de conversão (rosca ApexCharts), status dos pedidos e
  Top 5 produtos por faturamento. "Pedido" é cada item lançado (RF05), não a
  comanda inteira.
- Telas admin de Funcionários, Cardápio, Estoque e Mesas/Comandas com botões de
  criar, editar, remover/reativar e o botão Sair na sidebar.
- Job de consolidação mensal + expurgo (RF14 a RF16): só processa comandas
  fechadas, recupera meses perdidos se o servidor ficou desligado na virada
  (catch-up na inicialização) e usa o fuso do estabelecimento
  (`TZ_ESTABELECIMENTO`, padrão `America/Sao_Paulo`).

## O que ainda falta

**Backend**
- **Tela/endpoint de log de auditoria:** os registros já são gravados, mas
  não há como consultá-los pela aplicação.
- **Ficha técnica:** `insumosNecessarios` existe no produto, mas o lançamento
  de item ainda não dá baixa no estoque (hoje só o ajuste manual mexe no saldo).
- **Reabertura por comanda:** a reabertura (RF12) é por mesa; fechar por
  engano uma comanda avulsa enquanto a mesa continua ocupada ainda não tem
  como ser desfeito.
- Swagger/OpenAPI (o `swagger-ui-express` já está no `package.json`, faltam as specs).
- Backup segmentado (RNF05) e revisão de índices para o limite de 1s (RNF09).
- Emissão de vias impressas (RF13, opcional).
- Testes para Auth, Funcionário, Categoria/Produto, Estoque e rollup.

**Frontend**
- Refino visual das telas para bater com o Figma (cores, espaçamento, tema
  escuro completo).
- Trocar os `prompt`/`confirm`/`alert` do navegador por modal, bottom sheet e
  toast, deixando para depois que o backend fechar.

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
