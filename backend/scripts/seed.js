/**
 * Dados de exemplo para demonstração: funcionários de todos os perfis,
 * categorias, produtos e mesas. Assim o sistema já sobe pronto para usar.
 *
 * Como rodar (veja docs/dados-de-exemplo.md):
 *   com Docker:  docker compose exec backend node scripts/seed.js
 *   sem Docker:  cd backend && npm run seed
 *
 * Pode rodar quantas vezes quiser: só cria o que ainda não existe (funcionário
 * pelo CPF, categoria e produto pelo nome, mesa pelo número) e NUNCA apaga nem
 * altera nada que já está no banco.
 *
 * Opções:
 *   --mesas=N     quantidade de mesas (padrão 10)
 *   --forcar      permite rodar com NODE_ENV=production (por segurança, bloqueado)
 *   SEED_SENHA    variável de ambiente com a senha dos usuários (padrão senha123)
 */
require('dotenv').config();
const argon2 = require('argon2');
const mongoose = require('mongoose');
const { Funcionario, Categoria, Produto, Mesa } = require('../src/models');

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

// CPFs de teste com dígitos verificadores válidos (não pertencem a ninguém).
const FUNCIONARIOS = [
  { nome: 'Administrador', cpf: '52998224725', perfil: 'administrador' },
  { nome: 'Carlos Garçom', cpf: '11144477735', perfil: 'garcom' },
  { nome: 'Cozinha', cpf: '39053344705', perfil: 'cozinha' },
  { nome: 'Bar', cpf: '12345678909', perfil: 'bar' },
  { nome: 'Caixa', cpf: '98765432100', perfil: 'caixa' },
];

// `setor` decide para qual tela (KDS) o item vai: cozinha ou bar.
const CARDAPIO = [
  {
    categoria: 'Lanches',
    produtos: [
      {
        nome: 'Hambúrguer Clássico',
        descricao: 'Pão, carne 160 g, queijo, alface e tomate',
        preco: 28,
        setor: 'cozinha',
        tempoPreparoMinutos: 15,
        ingredientes: ['Pão', 'Carne', 'Queijo', 'Alface', 'Tomate'],
      },
      {
        nome: 'X-Bacon',
        descricao: 'Hambúrguer com bacon crocante e cheddar',
        preco: 32,
        setor: 'cozinha',
        tempoPreparoMinutos: 15,
        ingredientes: ['Pão', 'Carne', 'Bacon', 'Cheddar'],
      },
      {
        nome: 'X-Salada',
        descricao: 'Hambúrguer com queijo e salada completa',
        preco: 26,
        setor: 'cozinha',
        tempoPreparoMinutos: 15,
        ingredientes: ['Pão', 'Carne', 'Queijo', 'Alface', 'Tomate', 'Maionese'],
      },
      {
        nome: 'Frango Crocante',
        descricao: 'Sanduíche de frango empanado com maionese da casa',
        preco: 30,
        setor: 'cozinha',
        tempoPreparoMinutos: 18,
        ingredientes: ['Pão', 'Frango', 'Alface', 'Maionese'],
      },
    ],
  },
  {
    categoria: 'Porções',
    produtos: [
      {
        nome: 'Batata Frita',
        descricao: 'Porção de 400 g',
        preco: 22,
        setor: 'cozinha',
        tempoPreparoMinutos: 12,
      },
      {
        nome: 'Isca de Frango',
        descricao: 'Porção de 400 g com molho',
        preco: 34,
        setor: 'cozinha',
        tempoPreparoMinutos: 18,
      },
      {
        nome: 'Onion Rings',
        descricao: 'Anéis de cebola empanados, 300 g',
        preco: 24,
        setor: 'cozinha',
        tempoPreparoMinutos: 12,
      },
    ],
  },
  {
    categoria: 'Bebidas',
    produtos: [
      {
        nome: 'Refrigerante Lata',
        descricao: '350 ml',
        preco: 6,
        setor: 'bar',
        tempoPreparoMinutos: 2,
      },
      {
        nome: 'Suco de Laranja',
        descricao: 'Natural, 400 ml',
        preco: 10,
        setor: 'bar',
        tempoPreparoMinutos: 5,
      },
      {
        nome: 'Água Mineral',
        descricao: '500 ml',
        preco: 4.5,
        setor: 'bar',
        tempoPreparoMinutos: 2,
      },
      {
        nome: 'Chopp',
        descricao: 'Gelado, 300 ml',
        preco: 12,
        setor: 'bar',
        tempoPreparoMinutos: 3,
      },
      {
        nome: 'Caipirinha',
        descricao: 'Limão, cachaça, açúcar e gelo',
        preco: 18,
        setor: 'bar',
        tempoPreparoMinutos: 6,
      },
    ],
  },
  {
    categoria: 'Sobremesas',
    produtos: [
      {
        nome: 'Brownie com Sorvete',
        descricao: 'Brownie quente com bola de sorvete de creme',
        preco: 20,
        setor: 'cozinha',
        tempoPreparoMinutos: 10,
      },
      {
        // Já vem esgotado de propósito: serve para demonstrar que o cliente
        // não consegue pedir um item indisponível.
        nome: 'Torta de Limão',
        descricao: 'Fatia (esgotada hoje)',
        preco: 14,
        setor: 'cozinha',
        disponivel: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const mascararCpf = (cpf) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

function lerOpcoes() {
  const argumentos = process.argv.slice(2);
  const opcaoMesas = argumentos.find((a) => a.startsWith('--mesas='));
  const mesas = opcaoMesas ? Number(opcaoMesas.split('=')[1]) : 10;

  if (!Number.isInteger(mesas) || mesas < 0 || mesas > 100) {
    throw new Error('--mesas precisa ser um número inteiro entre 0 e 100.');
  }

  const senha = process.env.SEED_SENHA || 'senha123';
  if (senha.length < 6) {
    throw new Error('SEED_SENHA precisa ter pelo menos 6 caracteres.');
  }

  return { mesas, senha, forcar: argumentos.includes('--forcar') };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function criarFuncionarios(senha) {
  const senhaHash = await argon2.hash(senha); // mesmo hash que o sistema usa no cadastro
  let criados = 0;
  let jaExistiam = 0;

  for (const dados of FUNCIONARIOS) {
    if (await Funcionario.exists({ cpf: dados.cpf })) {
      jaExistiam++;
      continue;
    }
    await Funcionario.create({ ...dados, senhaHash });
    criados++;
  }
  return { criados, jaExistiam };
}

async function criarCardapio() {
  const resumo = {
    categorias: { criados: 0, jaExistiam: 0 },
    produtos: { criados: 0, jaExistiam: 0 },
  };

  for (const [indice, grupo] of CARDAPIO.entries()) {
    let categoria = await Categoria.findOne({ nome: grupo.categoria, ativo: true });
    if (categoria) {
      resumo.categorias.jaExistiam++;
    } else {
      categoria = await Categoria.create({ nome: grupo.categoria, ordem: indice + 1 });
      resumo.categorias.criados++;
    }

    for (const produto of grupo.produtos) {
      if (await Produto.exists({ nome: produto.nome })) {
        resumo.produtos.jaExistiam++;
        continue;
      }
      await Produto.create({ ...produto, categoria: categoria._id });
      resumo.produtos.criados++;
    }
  }
  return resumo;
}

async function criarMesas(quantidade) {
  let criados = 0;
  let jaExistiam = 0;

  for (let numero = 1; numero <= quantidade; numero++) {
    if (await Mesa.exists({ numero, ativo: true })) {
      jaExistiam++;
      continue;
    }
    await Mesa.create({ numero });
    criados++;
  }
  return { criados, jaExistiam };
}

async function main() {
  const { mesas, senha, forcar } = lerOpcoes();

  if (process.env.NODE_ENV === 'production' && !forcar) {
    throw new Error(
      'NODE_ENV=production: o seed cria usuários com senha de demonstração, então foi bloqueado. ' +
        'Se você tem certeza, rode de novo com --forcar.'
    );
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI não definida (veja o .env do backend).');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`\nBanco: ${mongoose.connection.name}\n`);

  const funcionarios = await criarFuncionarios(senha);
  const cardapio = await criarCardapio();
  const mesasResumo = await criarMesas(mesas);

  const linha = (rotulo, r) =>
    console.log(`  ${rotulo.padEnd(14)} ${r.criados} criado(s), ${r.jaExistiam} já existia(m)`);
  linha('Funcionários', funcionarios);
  linha('Categorias', cardapio.categorias);
  linha('Produtos', cardapio.produtos);
  linha('Mesas', mesasResumo);

  console.log(`\nLogins de demonstração (senha de todos: ${senha}):`);
  for (const f of FUNCIONARIOS) {
    console.log(`  ${f.perfil.padEnd(14)} CPF ${mascararCpf(f.cpf)}  (${f.nome})`);
  }
  console.log(
    '\nObservação: quem já existia no banco NÃO teve a senha alterada. Use a senha com a qual\n' +
      'aquele usuário foi criado.\n'
  );
}

main()
  .catch((erro) => {
    console.error(`\nErro: ${erro.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
