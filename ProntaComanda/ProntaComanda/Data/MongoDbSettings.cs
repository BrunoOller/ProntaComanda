namespace ProntaComanda.Settings;

/// <summary>
/// Configurações de conexão com o MongoDB.
/// Mapeadas a partir da seção "MongoDbSettings" no appsettings.json.
/// </summary>
public class MongoDbSettings
{
    /// <summary>
    /// String de conexão completa.
    /// Ex: "mongodb://localhost:27017" ou URI do Atlas.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// Nome do banco de dados.
    /// Ex: "prontacomanda"
    /// </summary>
    public string DatabaseName { get; set; } = string.Empty;
}