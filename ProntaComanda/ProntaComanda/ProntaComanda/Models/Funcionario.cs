using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace ProntaComanda.Models;

/// <summary>
/// Representa um funcionário do restaurante.
/// Armazenado na coleção "funcionarios" do MongoDB.
/// </summary>
public class Funcionario
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Nome deve ter entre 3 e 100 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "A função é obrigatória.")]
    public FuncaoUsuario Funcao { get; set; }

    /// <summary>
    /// Aplicável apenas quando Funcao == Cozinheiro.
    /// </summary>
    public EspecialidadeCozinha Especialidade { get; set; } = EspecialidadeCozinha.NA;

    /// <summary>
    /// Senha armazenada como hash — nunca em texto puro.
    /// O hash será gerado na camada de serviço antes de persistir.
    /// </summary>
    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string SenhaHash { get; set; } = string.Empty;

    /// <summary>
    /// Data de cadastro — preenchida automaticamente ao criar.
    /// </summary>
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}