using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ProntaComanda.Models;

public class LogOperacaoItem
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string MesaId { get; set; } = string.Empty;
    public int NumeroComanda { get; set; }

    public string ProdutoId { get; set; } = string.Empty;
    public string NomeProduto { get; set; } = string.Empty;
    public decimal PrecoUnitario { get; set; }
    public int Quantidade { get; set; }

    public string TipoOperacao { get; set; } = string.Empty; // "Adicao" ou "Remocao"
    public DateTime DataOperacao { get; set; } = DateTime.UtcNow;

    [BsonRepresentation(BsonType.ObjectId)]
    public string? FuncionarioId { get; set; }
}