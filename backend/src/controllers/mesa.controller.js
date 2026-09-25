const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { Mesa, Comanda, LogAuditoria } = require('../models');

// RF04 - Mapa de Mesas Geral
const listar = asyncHandler(async (req, res) => {
  const mesas = await Mesa.find({ ativo: true }).sort({ numero: 1 });
  res.json(mesas);
});

async function buscarOu404(id) {
  const mesa = await Mesa.findById(id);
  if (!mesa) throw new AppError('Mesa não encontrada.', 404);
  return mesa;
}

async function auditar(req, tipo, mesa, detalhes = {}) {
  try {
    await LogAuditoria.create({
      tipo,
      funcionario: req.funcionario._id,
      entidade: 'Mesa',
      entidadeId: mesa._id,
      detalhes: { numero: mesa.numero, ...detalhes },
    });
  } catch (err) {
    logger.error('Falha ao gravar auditoria de mesa', { error: err.message });
  }
}

// Gestão do número de mesas do salão (botões "+ Adicionar Mesa" / "Remover")
const criar = asyncHandler(async (req, res) => {
  const { numero } = req.body;

  const existente = await Mesa.findOne({ numero });

  if (existente) {
    if (existente.ativo) {
      throw new AppError('Já existe uma mesa com esse número.', 409);
    }
    // reaproveita a mesa que havia sido removida (soft delete)
    existente.ativo = true;
    existente.status = 'livre';
    existente.abertaEm = null;
    existente.abertaPor = null;
    await existente.save();
    return res.status(201).json(existente);
  }

  const mesa = await Mesa.create({ numero });
  res.status(201).json(mesa);
});

const remover = asyncHandler(async (req, res) => {
  const mesa = await buscarOu404(req.params.id);

  if (mesa.status !== 'livre') {
    throw new AppError('Só é possível remover uma mesa livre (sem comanda aberta).', 409);
  }

  await Mesa.findByIdAndUpdate(mesa._id, { ativo: false }); // RNF11
  res.status(204).send();
});

// RF20 - Abertura de mesa (Mobile) - cria a mesa "Ocupada" + primeira comanda
const abrir = asyncHandler(async (req, res) => {
  const mesa = await buscarOu404(req.params.id);
  if (mesa.status !== 'livre') {
    throw new AppError('Mesa não está disponível para abertura.', 409);
  }

  mesa.status = 'ocupada';
  mesa.abertaEm = new Date();
  mesa.abertaPor = req.funcionario._id;
  await mesa.save();

  const totalComandas = await Comanda.countDocuments({ mesa: mesa._id });
  const comanda = await Comanda.create({
    mesa: mesa._id,
    numero: totalComandas + 1,
    abertaPor: req.funcionario._id,
  });

  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  res.status(201).json({ mesa, comanda });
});

// RF26 - Solicitação de Encerramento (botão de ação rápida no Mobile)
const solicitarFechamento = asyncHandler(async (req, res) => {
  const mesa = await buscarOu404(req.params.id);

  if (mesa.status !== 'ocupada') {
    throw new AppError('Só é possível solicitar encerramento de uma mesa ocupada.', 409);
  }

  mesa.status = 'aguardando_fechamento';
  await mesa.save();

  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  req.io?.to('caixa').emit('mesa:aguardando-fechamento', mesa);
  res.json(mesa);
});

// RF12 - Reabertura Operacional (restrita ao Administrador na rota)
const reabrir = asyncHandler(async (req, res) => {
  const mesa = await buscarOu404(req.params.id);

  if (mesa.status === 'livre') {
    throw new AppError('Esta mesa já está livre, não há o que reabrir.', 409);
  }

  const statusAnterior = mesa.status;
  mesa.status = 'ocupada';
  await mesa.save();

  // RF12 é uma ação sensível (desfaz um fechamento por engano) — precisa
  // ficar rastreada para auditoria, igual estorno e desconto (RF08/RF09).
  await auditar(req, 'reabertura_mesa', mesa, { statusAnterior });

  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  res.json(mesa);
});

module.exports = { listar, criar, remover, abrir, solicitarFechamento, reabrir };
