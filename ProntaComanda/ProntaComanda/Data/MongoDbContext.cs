using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using ProntaComanda.Models;
using ProntaComanda.Settings;

namespace ProntaComanda.Data;

/// <summary>
/// Contexto central do MongoDB.
/// Expõe todas as coleções do banco como propriedades tipadas.
/// Registrado como Singleton no DI container.
/// </summary>
public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(MongoDbSettings settings)
    {
        // ── Convenções globais ──────────────────────────────────────────
        // Aplica antes de qualquer operação de serialização
        var conventionPack = new ConventionPack
        {
            // Serializa enums como string legível ("Disponivel") em vez de int (0)
            new EnumRepresentationConvention(BsonType.String),

            // Ignora campos nulos — evita poluir os documentos no MongoDB
            new IgnoreIfNullConvention(true),

            // Usa camelCase nos campos do documento MongoDB
            // (padrão mais comum em projetos com front-end JS)
            new CamelCaseElementNameConvention()
        };

        ConventionRegistry.Register(
            "ProntaComandaConventions",
            conventionPack,
            // Aplica apenas às classes do nosso namespace
            t => t.FullName?.StartsWith("ProntaComanda") ?? false
        );

        // Garante que decimal seja serializado corretamente pelo driver
        BsonSerializer.TryRegisterSerializer(new DecimalSerializer(BsonType.Decimal128));

        // ── Conexão ─────────────────────────────────────────────────────
        var client = new MongoClient(settings.ConnectionString);
        _database = client.GetDatabase(settings.DatabaseName);

        // ── Índices ─────────────────────────────────────────────────────
        CriarIndices();
    }

    // ── Coleções ────────────────────────────────────────────────────────

    /// <summary>Coleção de funcionários do restaurante.</summary>
    public IMongoCollection<Funcionario> Funcionarios =>
        _database.GetCollection<Funcionario>("funcionarios");

    /// <summary>Coleção de produtos do cardápio digital.</summary>
    public IMongoCollection<Produto> Produtos =>
        _database.GetCollection<Produto>("produtos");

    /// <summary>Coleção de categorias do cardápio.</summary>
    public IMongoCollection<Categoria> Categorias =>
        _database.GetCollection<Categoria>("categorias");

    /// <summary>Coleção de acréssimos/modificadores globais.</summary>
    public IMongoCollection<Acrescimo> Acrescimos =>
        _database.GetCollection<Acrescimo>("acrescimos");

    /// <summary>Coleção de mesas com comandas embutidas.</summary>
    public IMongoCollection<Mesa> Mesas =>
        _database.GetCollection<Mesa>("mesas");

    /// <summary>Coleção de pedidos transmitidos para a KDS.</summary>
    public IMongoCollection<Pedido> Pedidos =>
        _database.GetCollection<Pedido>("pedidos");

    /// <summary>Coleção de relatórios de vendas gerados.</summary>
    public IMongoCollection<RelatorioVendas> Relatorios =>
        _database.GetCollection<RelatorioVendas>("relatorios");

    // ── Índices ─────────────────────────────────────────────────────────

    /// <summary>
    /// Cria índices essenciais para performance das queries mais frequentes.
    /// Chamado uma única vez na inicialização — o MongoDB ignora se já existirem.
    /// </summary>
    private void CriarIndices()
    {
        // Funcionários — busca por nome
        Funcionarios.Indexes.CreateOne(new CreateIndexModel<Funcionario>(
            Builders<Funcionario>.IndexKeys.Ascending(f => f.Nome)
        ));

        // Produtos — busca por categoria e disponibilidade (filtro do cardápio)
        Produtos.Indexes.CreateOne(new CreateIndexModel<Produto>(
            Builders<Produto>.IndexKeys
                .Ascending(p => p.CategoriaId)
                .Ascending(p => p.Disponibilidade)
        ));

        // Produtos — busca por nome (pesquisa no cardápio)
        Produtos.Indexes.CreateOne(new CreateIndexModel<Produto>(
            Builders<Produto>.IndexKeys.Ascending(p => p.Nome)
        ));

        // Mesas — busca por número (operação mais comum)
        Mesas.Indexes.CreateOne(new CreateIndexModel<Mesa>(
            Builders<Mesa>.IndexKeys.Ascending(m => m.Numero),
            new CreateIndexOptions { Unique = true }
        ));

        // Pedidos — busca por status (KDS filtra por EmPreparo/Pronto)
        Pedidos.Indexes.CreateOne(new CreateIndexModel<Pedido>(
            Builders<Pedido>.IndexKeys
                .Ascending(p => p.Status)
                .Descending(p => p.LancadoEm)
        ));

        // Pedidos — busca por mesa (histórico de pedidos de uma mesa)
        Pedidos.Indexes.CreateOne(new CreateIndexModel<Pedido>(
            Builders<Pedido>.IndexKeys.Ascending(p => p.MesaId)
        ));

        // Pedidos — busca por funcionário + data (relatório do dia)
        Pedidos.Indexes.CreateOne(new CreateIndexModel<Pedido>(
            Builders<Pedido>.IndexKeys
                .Ascending(p => p.FuncionarioId)
                .Descending(p => p.LancadoEm)
        ));

        // Relatórios — busca por período
        Relatorios.Indexes.CreateOne(new CreateIndexModel<RelatorioVendas>(
            Builders<RelatorioVendas>.IndexKeys
                .Descending(r => r.Inicio)
                .Descending(r => r.Fim)
        ));
    }
}