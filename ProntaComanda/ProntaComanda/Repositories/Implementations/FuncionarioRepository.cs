using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

/// <summary>
/// Implementação do repositório de funcionários.
/// Todas as queries são assíncronas para não bloquear a thread da requisição.
/// </summary>
public class FuncionarioRepository : IFuncionarioRepository
{
    private readonly IMongoCollection<Funcionario> _collection;

    public FuncionarioRepository(MongoDbContext context)
    {
        _collection = context.Funcionarios;
    }

    /// <inheritdoc/>
    public async Task<List<Funcionario>> GetAllAsync() =>
        await _collection
            .Find(_ => true)
            .SortBy(f => f.Nome)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<List<Funcionario>> GetByFuncaoAsync(FuncaoUsuario funcao) =>
        await _collection
            .Find(f => f.Funcao == funcao)
            .SortBy(f => f.Nome)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<Funcionario?> GetByIdAsync(string id) =>
        await _collection
            .Find(f => f.Id == id)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task CreateAsync(Funcionario funcionario)
    {
        // CriadoEm já é preenchido no model, mas garantimos aqui também
        funcionario.CriadoEm = DateTime.UtcNow;
        await _collection.InsertOneAsync(funcionario);
    }

    /// <inheritdoc/>
    public async Task UpdateAsync(string id, Funcionario funcionario) =>
        await _collection.ReplaceOneAsync(f => f.Id == id, funcionario);

    /// <inheritdoc/>
    public async Task DeleteAsync(string id) =>
        await _collection.DeleteOneAsync(f => f.Id == id);
}