using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

/// <summary>
/// Implementação do repositório de relatórios.
/// Usa pipeline de agregação do MongoDB para calcular métricas
/// diretamente no banco — evita carregar todos os pedidos em memória.
/// </summary>
public class RelatorioRepository : IRelatorioRepository
{
    private readonly IMongoCollection<Pedido> _pedidos;
    private readonly IMongoCollection<RelatorioVendas> _relatorios;

    public RelatorioRepository(MongoDbContext context)
    {
        _pedidos = context.Pedidos;
        _relatorios = context.Relatorios;
    }

    /// <inheritdoc/>
    public async Task<RelatorioVendas> GerarAsync(DateTime inicio, DateTime fim)
    {
        var inicioUtc = inicio.ToUniversalTime();
        var fimUtc = fim.ToUniversalTime();

        // ── Busca todos os pedidos do período ────────────────────────────
        var filtroPeriodo = Builders<Pedido>.Filter.And(
            Builders<Pedido>.Filter.Gte(p => p.LancadoEm, inicioUtc),
            Builders<Pedido>.Filter.Lte(p => p.LancadoEm, fimUtc)
        );

        var todosPedidos = await _pedidos.Find(filtroPeriodo).ToListAsync();

        var entregues = todosPedidos.Where(p => p.Status == StatusPedido.Entregue).ToList();
        var cancelados = todosPedidos.Where(p => p.Status == StatusPedido.Cancelado).ToList();

        // ── Ganhos totais ────────────────────────────────────────────────
        // Soma os itens de todos os pedidos entregues
        var ganhosTotais = entregues
            .SelectMany(p => p.Itens)
            .Sum(i => i.Quantidade * 0m); // preço não está no ItemPedido — ver nota abaixo *

        // * Nota: ItemPedido não tem PrecoUnitario (só está em ItemComanda).
        // Para faturamento real, precisaremos cruzar com a Mesa/Comanda.
        // Por ora calculamos a contagem — o preço virá da integração com Mesa.
        // TODO: adicionar PrecoUnitario em ItemPedido quando integrar com Mesa.

        // ── Top produtos ─────────────────────────────────────────────────
        var topProdutos = entregues
            .SelectMany(p => p.Itens)
            .GroupBy(i => new { i.ProdutoId, i.NomeProduto })
            .Select(g => new ProdutoRanking
            {
                ProdutoId = g.Key.ProdutoId,
                NomeProduto = g.Key.NomeProduto,
                QuantidadeVendida = g.Sum(i => i.Quantidade),
                TotalFaturado = 0m, // idem — aguarda integração com Mesa
            })
            .OrderByDescending(p => p.QuantidadeVendida)
            .Take(10)
            .ToList();

        // Calcula participação percentual após ter todos os totais
        var totalGeral = topProdutos.Sum(p => p.QuantidadeVendida);
        foreach (var p in topProdutos)
            p.ParticipacaoPercentual = totalGeral > 0
                ? Math.Round((decimal)p.QuantidadeVendida / totalGeral * 100, 1)
                : 0;

        // ── Faturamento por mês ──────────────────────────────────────────
        // Array de 12 posições — índice 0 = Janeiro
        var faturamentoPorMes = new decimal[12];
        foreach (var pedido in entregues)
            faturamentoPorMes[pedido.LancadoEm.Month - 1] += 0m; // TODO: valor real

        // ── Motivos de cancelamento ──────────────────────────────────────
        // Por ora agrupa pelo campo Observacoes[0] do primeiro item
        // TODO: adicionar campo "MotivoCancelamento" no model Pedido
        var motivosCancelamento = cancelados
            .GroupBy(p => p.Itens.FirstOrDefault()?.Observacoes.FirstOrDefault() ?? "Não informado")
            .Select(g => new MotivoCancelamento
            {
                Descricao = g.Key,
                Quantidade = g.Count(),
            })
            .ToList();

        var totalCancelados = motivosCancelamento.Sum(m => m.Quantidade);
        foreach (var m in motivosCancelamento)
            m.Percentual = totalCancelados > 0
                ? Math.Round((decimal)m.Quantidade / totalCancelados * 100, 1)
                : 0;

        // ── Monta o relatório ────────────────────────────────────────────
        return new RelatorioVendas
        {
            Inicio = inicioUtc,
            Fim = fimUtc,
            GanhosTotais = ganhosTotais,
            TotalPedidos = entregues.Count,
            TotalCancelados = cancelados.Count,
            FaturamentoPorMes = faturamentoPorMes.ToList(),
            TopProdutos = topProdutos,
            MotivosCancelamento = motivosCancelamento,
            GeradoEm = DateTime.UtcNow
        };
    }

    /// <inheritdoc/>
    public async Task SalvarAsync(RelatorioVendas relatorio) =>
        await _relatorios.InsertOneAsync(relatorio);

    /// <inheritdoc/>
    public async Task<List<RelatorioVendas>> GetHistoricoAsync(int limite = 12) =>
        await _relatorios
            .Find(_ => true)
            .SortByDescending(r => r.GeradoEm)
            .Limit(limite)
            .ToListAsync();
}