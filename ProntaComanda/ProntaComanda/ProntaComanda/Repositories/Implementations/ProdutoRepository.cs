using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

/// <summary>
/// Implementação do repositório de produtos do cardápio.
/// </summary>
public class ProdutoRepository : IProdutoRepository
{
    private readonly IMongoCollection<Produto> _collection;

    public ProdutoRepository(MongoDbContext context)
    {
        _collection = context.Produtos;
    }

    /// <inheritdoc/>
    public async Task<List<Produto>> GetAllAsync() =>
        await _collection
            .Find(_ => true)
            .SortBy(p => p.CategoriaNome)
            .ThenBy(p => p.Nome)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<List<Produto>> GetByFiltroAsync(
        string? categoriaId = null,
        Disponibilidade? disponibilidade = null)
    {
        // Constrói o filtro dinamicamente — só adiciona condições informadas
        var builder = Builders<Produto>.Filter;
        var filtro = builder.Empty;

        if (!string.IsNullOrEmpty(categoriaId))
            filtro &= builder.Eq(p => p.CategoriaId, categoriaId);

        if (disponibilidade.HasValue)
            filtro &= builder.Eq(p => p.Disponibilidade, disponibilidade.Value);

        return await _collection
            .Find(filtro)
            .SortBy(p => p.Nome)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<List<Produto>> SearchByNomeAsync(string termo)
    {
        // Regex case-insensitive para busca parcial por nome
        var filtro = Builders<Produto>.Filter.Regex(
            p => p.Nome,
            new MongoDB.Bson.BsonRegularExpression(termo, "i")
        );

        return await _collection
            .Find(filtro)
            .SortBy(p => p.Nome)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<Produto?> GetByIdAsync(string id) =>
        await _collection
            .Find(p => p.Id == id)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task CreateAsync(Produto produto)
    {
        produto.CriadoEm = DateTime.UtcNow;
        produto.AtualizadoEm = DateTime.UtcNow;
        await _collection.InsertOneAsync(produto);
    }

    /// <inheritdoc/>
    public async Task UpdateAsync(string id, Produto produto)
    {
        produto.AtualizadoEm = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(p => p.Id == id, produto);
    }

    /// <inheritdoc/>
    public async Task UpdateDisponibilidadeAsync(string id, Disponibilidade disponibilidade)
    {
        // Atualiza apenas o campo necessário — evita reescrever o documento inteiro
        var update = Builders<Produto>.Update
            .Set(p => p.Disponibilidade, disponibilidade)
            .Set(p => p.AtualizadoEm, DateTime.UtcNow);

        await _collection.UpdateOneAsync(p => p.Id == id, update);
    }

    /// <inheritdoc/>
    public async Task DeleteAsync(string id) =>
        await _collection.DeleteOneAsync(p => p.Id == id);
}