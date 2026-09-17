const { Funcionario, PERFIS } = require('./Funcionario');
const { Categoria } = require('./Categoria');
const { Produto } = require('./Produto');
const { ObservacaoFrequente } = require('./ObservacaoFrequente');
const { Mesa, STATUS_MESA } = require('./Mesa');
const { Comanda, STATUS_ITEM_KDS } = require('./Comanda');
const { Pagamento } = require('./Pagamento');
const { Insumo, MovimentacaoEstoque } = require('./Insumo');
const { ResumoMensal } = require('./ResumoMensal');
const { LogAuditoria } = require('./LogAuditoria');

module.exports = {
  Funcionario,
  PERFIS,
  Categoria,
  Produto,
  ObservacaoFrequente,
  Mesa,
  STATUS_MESA,
  Comanda,
  STATUS_ITEM_KDS,
  Pagamento,
  Insumo,
  MovimentacaoEstoque,
  ResumoMensal,
  LogAuditoria,
};
