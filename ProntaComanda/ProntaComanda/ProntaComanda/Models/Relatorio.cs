using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ProntaComanda.Models;

/// <summary>
/// Ranking de um produto no período do relatório.
/// </summary>
public class ProdutoRanking
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string ProdutoId { get; set; } = string.Empty;

    public string NomeProduto { get; set; } = string.Empty;

    public string? CategoriaNome { get; set; }

    public int QuantidadeVendida { get; set; }

    public decimal TotalFaturado { get; set; }

    /// <summary>Participação percentual sobre o faturamento total do período.</summary>
    public decimal ParticipacaoPercentual { get; set; }
}

/// <summary>
/// Motivo de cancelamento com contagem para o gráfico do Dashboard.
/// </summary>
public class MotivoCancelamento
{
    public string Descricao { get; set; } = string.Empty;

    public int Quantidade { get; set; }

    public decimal Percentual { get; set; }
}

/// <summary>
/// Snapshot de relatório de vendas por período (RF14).
/// Armazenado na coleção "relatorios" para consultas históricas.
/// Também gerado on-the-fly para o Dashboard.
/// </summary>
public class RelatorioVendas
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// <summary>Início do período analisado.</summary>
    public DateTime Inicio { get; set; }

    /// <summary>Fim do período analisado.</summary>
    public DateTime Fim { get; set; }

    public decimal GanhosTotais { get; set; }

    public int TotalPedidos { get; set; }

    public int TotalCancelados { get; set; }

    public decimal TicketMedio => TotalPedidos > 0
        ? GanhosTotais / TotalPedidos
        : 0;

    public decimal TaxaConversao => (TotalPedidos + TotalCancelados) > 0
        ? (decimal)TotalPedidos / (TotalPedidos + TotalCancelados) * 100
        : 0;

    /// <summary>Faturamento agrupado por mês — índice 0 = Janeiro.</summary>
    public List<decimal> FaturamentoPorMes { get; set; } = new(12);

    public List<ProdutoRanking> TopProdutos { get; set; } = [];

    public List<MotivoCancelamento> MotivosCancelamento { get; set; } = [];

    public DateTime GeradoEm { get; set; } = DateTime.UtcNow;
}