using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ProntaComanda.Models;

public class HistoricoVenda
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    // Referências de quem atendeu e qual era a mesa
    public int NumeroMesa { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string? FuncionarioId { get; set; }

    // Dados financeiros absolutos para o Dashboard
    public decimal Subtotal { get; set; }
    public decimal DescontoAplicado { get; set; }
    public decimal TotalPago { get; set; }
    public TipoDesconto TipoDesconto { get; set; }

    // Métricas de tempo para o BI (Tempo médio de permanência)
    public DateTime OcupadaEm { get; set; }
    public DateTime FechadaEm { get; set; } = DateTime.UtcNow;
    public int TempoPermanenciaSegundos { get; set; }

    // Snapshot exato do que foi consumido para o gráfico de "Mais Vendidos"
    public List<Comanda> Comandas { get; set; } = [];
}