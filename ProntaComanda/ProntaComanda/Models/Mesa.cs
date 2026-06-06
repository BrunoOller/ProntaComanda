using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using ProntaComanda.API.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProntaComanda.Models;

/// <summary>
/// Item individual dentro de uma comanda.
/// Documento embutido — não tem coleção própria.
/// </summary>
public class ItemComanda
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string ProdutoId { get; set; } = string.Empty;

    /// <summary>Snapshot do nome — preserva histórico mesmo se o produto mudar.</summary>
    public string NomeProduto { get; set; } = string.Empty;

    /// <summary>Snapshot do preço no momento do lançamento (RF6).</summary>
    public decimal PrecoUnitario { get; set; }

    [Range(1, 999)]
    public int Quantidade { get; set; } = 1;

    /// <summary>Observações/modificadores aplicados (ex: "Sem vinagrete").</summary>
    public List<string> Observacoes { get; set; } = [];

    /// <summary>Acréssimos selecionados pelo cliente.</summary>
    public List<AcrescimoVinculado> Acrescimos { get; set; } = [];

    public decimal TotalItem => PrecoUnitario * Quantidade;
}

/// <summary>
/// Comanda vinculada a uma mesa — agrupa os itens consumidos (RF5, RF6).
/// Documento embutido dentro de Mesa.
/// </summary>
public class Comanda
{
    public int Numero { get; set; }

    public List<ItemComanda> Itens { get; set; } = [];

    public DateTime AbertoEm { get; set; } = DateTime.UtcNow;

    public decimal Subtotal => Itens.Sum(i => i.TotalItem);
}

/// <summary>
/// Mesa do restaurante (RF4, RF5, RF7).
/// Armazenada na coleção "mesas".
/// </summary>
public class Mesa
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [Range(1, 9999, ErrorMessage = "Número da mesa inválido.")]
    public int Numero { get; set; }

    public bool Ocupada { get; set; } = false;

    /// <summary>
    /// Momento em que a mesa foi ocupada.
    /// Null quando livre — base para cálculo de permanência (RF10).
    /// </summary>
    public DateTime? OcupadaEm { get; set; }

    /// <summary>
    /// Comandas ativas na mesa. Permite múltiplas comandas por mesa.
    /// </summary>
    public List<Comanda> Comandas { get; set; } = [];

    /// <summary>Desconto aplicado no fechamento (RF12).</summary>
    public decimal Desconto { get; set; } = 0;

    public TipoDesconto TipoDesconto { get; set; } = TipoDesconto.Valor;

    /// <summary>ID do funcionário responsável pela mesa.</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? FuncionarioId { get; set; }

    /// <summary>Subtotal bruto — soma de todas as comandas.</summary>
    public decimal Subtotal => Comandas.Sum(c => c.Subtotal);

    /// <summary>Total final com desconto aplicado (RF11, RF12).</summary>
    public decimal Total => TipoDesconto switch
    {
        TipoDesconto.Valor => Math.Max(0, Subtotal - Desconto),
        TipoDesconto.Percentual => Subtotal * (1 - Desconto / 100),
        TipoDesconto.Cortesia => 0,
        _ => Subtotal
    };

    /// <summary>
    /// Tempo decorrido desde a abertura em segundos.
    /// Calculado on-the-fly — não persiste no banco.
    /// </summary>
    [BsonIgnore]
    public int PermanenciaSegundos => OcupadaEm.HasValue
        ? (int)(DateTime.UtcNow - OcupadaEm.Value).TotalSeconds
        : 0;
}