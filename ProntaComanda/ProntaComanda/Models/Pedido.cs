using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProntaComanda.Models;

/// <summary>
/// Item individual dentro de um pedido KDS.
/// Documento embutido dentro de Pedido.
/// </summary>
public class ItemPedido
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string ProdutoId { get; set; } = string.Empty;

    /// <summary>Snapshot do nome curto para exibição na KDS.</summary>
    public string NomeProduto { get; set; } = string.Empty;

    [Range(1, 999)]
    public int Quantidade { get; set; } = 1;

    /// <summary>Observações visíveis na tela da cozinha/bar.</summary>
    public List<string> Observacoes { get; set; } = [];
}

/// <summary>
/// Pedido transmitido para a KDS (RF8, RF9, RF10).
/// Armazenado na coleção "pedidos".
/// </summary>
public class Pedido
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string MesaId { get; set; } = string.Empty;

    public int NumeroMesa { get; set; }

    public int NumeroComanda { get; set; }

    /// <summary>ID do funcionário que lançou o pedido.</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? FuncionarioId { get; set; }

    public StatusPedido Status { get; set; } = StatusPedido.Pendente;

    public List<ItemPedido> Itens { get; set; } = [];

    /// <summary>Momento em que o pedido foi lançado (RF10).</summary>
    public DateTime LancadoEm { get; set; } = DateTime.UtcNow;

    /// <summary>Momento em que foi marcado como Pronto.</summary>
    public DateTime? ProntoEm { get; set; }

    /// <summary>Momento em que foi marcado como Entregue.</summary>
    public DateTime? EntregueEm { get; set; }

    /// <summary>
    /// Tempo total de preparo em segundos (LancadoEm → ProntoEm).
    /// Calculado on-the-fly — não persiste no banco.
    /// </summary>
    [BsonIgnore]
    public int TempoPreparo => ProntoEm.HasValue
        ? (int)(ProntoEm.Value - LancadoEm).TotalSeconds
        : 0;

    /// <summary>
    /// Tempo de espera atual em segundos (LancadoEm → agora), 
    /// enquanto o pedido ainda não foi entregue.
    /// </summary>
    [BsonIgnore]
    public int TempoEspera => EntregueEm.HasValue
        ? (int)(EntregueEm.Value - LancadoEm).TotalSeconds
        : (int)(DateTime.UtcNow - LancadoEm).TotalSeconds;
}