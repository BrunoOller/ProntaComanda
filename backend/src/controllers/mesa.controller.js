const asyncHandler = require('../utils/asyncHandler');
const { Mesa, Comanda } = require('../models');

// RF04 - Mapa de Mesas Geral
const listar = asyncHandler(async (req, res) => {
  const mesas = await Mesa.find({ ativo: true }).sort({ numero: 1 });
  res.json(mesas);
});

// Gestão do número de mesas do salão (botões "+ Adicionar Mesa" / "Remover")
const criar = asyncHandler(async (req, res) => {
  const { numero } = req.body;

  const existente = await Mesa.findOne({ numero });

  if (existente) {
    if (existente.ativo) {
      return res.status(409).json({ erro: 'Já existe uma mesa com esse número.' });
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
  await Mesa.findByIdAndUpdate(req.params.id, { ativo: false }); // RNF11
  res.status(204).send();
});

// RF20 - Abertura de mesa (Mobile) - cria a mesa "Ocupada" + primeira comanda
const abrir = asyncHandler(async (req, res) => {
  const mesa = await Mesa.findById(req.params.id);
  if (!mesa || mesa.status !== 'livre') {
    return res.status(409).json({ erro: 'Mesa não está disponível para abertura.' });
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
  const mesa = await Mesa.findByIdAndUpdate(
    req.params.id,
    { status: 'aguardando_fechamento' },
    { new: true }
  );

  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  req.io?.to('caixa').emit('mesa:aguardando-fechamento', mesa);
  res.json(mesa);
});

// RF12 - Reabertura Operacional (restrita ao Administrador na rota)
const reabrir = asyncHandler(async (req, res) => {
  const mesa = await Mesa.findByIdAndUpdate(req.params.id, { status: 'ocupada' }, { new: true });
  req.io?.to('mapa-mesas').emit('mesa:atualizada', mesa);
  res.json(mesa);
});

module.exports = { listar, criar, remover, abrir, solicitarFechamento, reabrir };
