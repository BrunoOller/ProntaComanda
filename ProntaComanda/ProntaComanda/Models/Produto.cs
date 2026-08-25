using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace ProntaComanda.Models;

/// <summary>
/// Categoria de produto do cardápio (RF3).
/// Armazenada na coleção "categorias".
/// </summary>
public class Categoria
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [Required(ErrorMessage = "O nome da categoria é obrigatório.")]
    [StringLength(50, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    public string? SubCategoria { get; set; }
}

/// <summary>
/// Janela de horário de um Happy Hour em um dia específico.
/// </summary>
public class JanelaHorario
{
    public DiaSemana Dia { get; set; }

    /// <summary>Formato HH:mm — ex: "18:00"</summary>
    [Required]
    public string HorarioInicio { get; set; } = "18:00";

    /// <summary>Formato HH:mm — ex: "22:00"</summary>
    [Required]
    public string HorarioFim { get; set; } = "22:00";
}

/// <summary>
/// Configuração de Happy Hour de um produto (RF — Happy Hour).
/// Documento embutido dentro de Produto.
/// </summary>
public class HappyHour
{
    public bool Ativo { get; set; } = false;

    public bool ExibirBadge { get; set; } = false;

    [Range(0, double.MaxValue, ErrorMessage = "Preço promocional não pode ser negativo.")]
    public decimal PrecoPromocional { get; set; }

    /// <summary>
    /// Dias da semana em que o Happy Hour está ativo.
    /// </summary>
    public List<DiaSemana> DiasAtivos { get; set; } = [];

    /// <summary>
    /// Janelas de horário por dia da semana.
    /// </summary>
    public List<JanelaHorario> Janelas { get; set; } = [];
}

/// <summary>
/// Acréssimo/modificador global reutilizável (ex: "Bacon Extra").
/// Armazenado na coleção "acrescimos".
/// </summary>
public class Acrescimo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [Required(ErrorMessage = "O nome do acréssimo é obrigatório.")]
    [StringLength(80, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "Preço base não pode ser negativo.")]
    public decimal PrecoBase { get; set; }
}

/// <summary>
/// Vínculo entre um Produto e um Acréssimo,
/// com possibilidade de preço customizado para aquele produto.
/// </summary>
public class AcrescimoVinculado
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string AcrescimoId { get; set; } = string.Empty;

    public string NomeAcrescimo { get; set; } = string.Empty;

    public decimal PrecoBaseGlobal { get; set; }

    /// <summary>
    /// Preço customizado para este produto específico.
    /// Se null, usa o PrecoBaseGlobal.
    /// </summary>
    public decimal? PrecoCustomizado { get; set; }
}

/// <summary>
/// Regras de seleção de acréssimos para um produto.
/// </summary>
public class RegrasAcrescimo
{
    [Range(0, 99)]
    public int MinEscolhas { get; set; } = 0;

    [Range(0, 99)]
    public int MaxEscolhas { get; set; } = 0;

    public List<AcrescimoVinculado> ItensVinculados { get; set; } = [];
}

/// <summary>
/// Produto do cardápio digital (RF1, RF2, RF3).
/// Armazenado na coleção "produtos".
/// </summary>
public class Produto
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [Required(ErrorMessage = "O nome do produto é obrigatório.")]
    [StringLength(120, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    /// <summary>Nome exibido na KDS/cozinha — geralmente abreviado.</summary>
    [StringLength(40)]
    public string NomeCurto { get; set; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "Preço não pode ser negativo.")]
    public decimal Preco { get; set; }

    /// <summary>Estoque disponível. 0 = sem controle de estoque.</summary>
    [Range(0, int.MaxValue)]
    public int Estoque { get; set; } = 0;

    public string Legenda { get; set; } = string.Empty;

    public Disponibilidade Disponibilidade { get; set; } = Disponibilidade.Disponivel;

    /// <summary>Caminho/URL da imagem no servidor ou storage.</summary>
    public string? ImagemUrl { get; set; }

    /// <summary>Referência à categoria — ID da coleção "categorias".</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? CategoriaId { get; set; }

    /// <summary>Snapshot do nome da categoria para evitar joins desnecessários.</summary>
    public string? CategoriaNome { get; set; }

    public string? SubCategoria { get; set; }

    /// <summary>Configuração de Happy Hour embutida no documento.</summary>
    public HappyHour HappyHour { get; set; } = new();

    /// <summary>Regras e lista de acréssimos vinculados.</summary>
    public RegrasAcrescimo Acrescimos { get; set; } = new();

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
}