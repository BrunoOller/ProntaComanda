const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const asyncHandler = require('../utils/asyncHandler');
const { LogAuditoria } = require('../models');
const { TIPOS_AUDITORIA } = require('../models/LogAuditoria');

/**
 * RF17 - Dashboard de Gestão: relatórios de auditoria.
 * Somente leitura. Os registros são gravados pelos próprios módulos
 * (estorno, desconto, reabertura, estoque, funcionário, produto).
 */
const TIMEZONE = process.env.TZ_ESTABELECIMENTO || 'America/Sao_Paulo';

// GET /auditoria?tipo=&funcionario=&de=&ate=&pagina=&porPagina=
const listar = asyncHandler(async (req, res) => {
  const { tipo, funcionario, de, ate, pagina, porPagina } = req.query;

  const filtro = {};
  if (tipo) filtro.tipo = tipo;
  if (funcionario) filtro.funcionario = funcionario;

  if (de || ate) {
    filtro.createdAt = {};
    if (de) filtro.createdAt.$gte = dayjs.tz(de, TIMEZONE).startOf('day').toDate();
    if (ate) filtro.createdAt.$lte = dayjs.tz(ate, TIMEZONE).endOf('day').toDate();
  }

  const [itens, total] = await Promise.all([
    LogAuditoria.find(filtro)
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .populate('funcionario', 'nome perfil')
      .lean(),
    LogAuditoria.countDocuments(filtro),
  ]);

  res.json({
    itens,
    pagina,
    porPagina,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  });
});

// GET /auditoria/tipos - alimenta o filtro da tela sem duplicar a lista no front
const listarTipos = asyncHandler(async (_req, res) => {
  res.json(TIPOS_AUDITORIA);
});

module.exports = { listar, listarTipos };
