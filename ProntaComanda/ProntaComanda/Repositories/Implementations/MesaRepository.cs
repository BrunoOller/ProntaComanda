using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

/// <summary>
/// Implementação do repositório de mesas.
/// Usa operações atômicas do MongoDB ($push, $set) para mutações parciais
/// evitando condições de corrida em ambiente multi-usuário.
/// </summary>
public class MesaRepository : IMesaRepository
{
    private readonly IMongoCollection<Mesa> _collection;

    public MesaRepository(MongoDbContext context)
    {
        _collection = context.Mesas;
    }

    /// <inheritdoc/>
    public async Task<List<Mesa>> GetAllAsync() =>
        await _collection
            .Find(_ => true)
            .SortBy(m => m.Numero)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<List<Mesa>> GetByStatusAsync(bool ocupada) =>
        await _collection
            .Find(m => m.Ocupada == ocupada)
            .SortBy(m => m.Numero)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<Mesa?> GetByIdAsync(string id) =>
        await _collection
            .Find(m => m.Id == id)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task<Mesa?> GetByNumeroAsync(int numero) =>
        await _collection
            .Find(m => m.Numero == numero)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task CreateAsync(Mesa mesa) =>
        await _collection.InsertOneAsync(mesa);

    /// <inheritdoc/>
    public async Task UpdateAsync(string id, Mesa mesa) =>
        await _collection.ReplaceOneAsync(m => m.Id == id, mesa);

    /// <inheritdoc/>
    public async Task AddComandaAsync(string mesaId, Comanda comanda)
    {
        // $push adiciona a comanda ao array sem reescrever o documento inteiro
        var update = Builders<Mesa>.Update
            .Push(m => m.Comandas, comanda)
            .Set(m => m.Ocupada, true)
            .SetOnInsert(m => m.OcupadaEm, DateTime.UtcNow);

        // Garante que OcupadaEm só é definido na primeira comanda
        var updateOcupada = Builders<Mesa>.Update.Combine(
            Builders<Mesa>.Update.Push(m => m.Comandas, comanda),
            Builders<Mesa>.Update.Set(m => m.Ocupada, true)
        );

        // Se a mesa ainda não tem OcupadaEm, define agora
        var mesa = await GetByIdAsync(mesaId);
        if (mesa is not null && !mesa.OcupadaEm.HasValue)
        {
            updateOcupada = Builders<Mesa>.Update.Combine(
                updateOcupada,
                Builders<Mesa>.Update.Set(m => m.OcupadaEm, DateTime.UtcNow)
            );
        }

        await _collection.UpdateOneAsync(m => m.Id == mesaId, updateOcupada);
    }

    /// <inheritdoc/>
    public async Task AddItemComandaAsync(string mesaId, int numeroComanda, ItemComanda item)
    {
        // Filtra o documento da mesa E o elemento correto dentro do array de comandas
        var filtroMesa = Builders<Mesa>.Filter.Eq(m => m.Id, mesaId);
        var filtroComanda = Builders<Mesa>.Filter.ElemMatch(
            m => m.Comandas,
            c => c.Numero == numeroComanda
        );

        // $push no array aninhado usando o operador posicional $
        var update = Builders<Mesa>.Update
            .Push("comandas.$.itens", item);

        await _collection.UpdateOneAsync(
            filtroMesa & filtroComanda,
            update
        );
    }

    /// <inheritdoc/>
    public async Task AplicarDescontoAsync(string mesaId, decimal desconto, TipoDesconto tipo)
    {
        var update = Builders<Mesa>.Update
            .Set(m => m.Desconto, desconto)
            .Set(m => m.TipoDesconto, tipo);

        await _collection.UpdateOneAsync(m => m.Id == mesaId, update);
    }

    /// <inheritdoc/>
    public async Task MoverComandasAsync(string mesaOrigemId, string mesaDestinoId)
    {
        // Busca as comandas da mesa de origem
        var origem = await GetByIdAsync(mesaOrigemId);
        if (origem is null || origem.Comandas.Count == 0) return;

        // Adiciona as comandas na mesa de destino
        var updateDestino = Builders<Mesa>.Update
            .PushEach(m => m.Comandas, origem.Comandas)
            .Set(m => m.Ocupada, true);

        // Limpa as comandas da mesa de origem e libera
        var updateOrigem = Builders<Mesa>.Update
            .Set(m => m.Comandas, new List<Comanda>())
            .Set(m => m.Ocupada, false)
            .Set(m => m.OcupadaEm, (DateTime?)null)
            .Set(m => m.Desconto, 0m);

        await _collection.UpdateOneAsync(m => m.Id == mesaDestinoId, updateDestino);
        await _collection.UpdateOneAsync(m => m.Id == mesaOrigemId, updateOrigem);
    }

    /// <inheritdoc/>
    public async Task FecharMesaAsync(string mesaId)
    {
        // Limpa o estado da mesa após pagamento
        var update = Builders<Mesa>.Update
            .Set(m => m.Ocupada, false)
            .Set(m => m.OcupadaEm, (DateTime?)null)
            .Set(m => m.Comandas, new List<Comanda>())
            .Set(m => m.Desconto, 0m)
            .Set(m => m.TipoDesconto, TipoDesconto.Valor)
            .Set(m => m.FuncionarioId, (string?)null);

        await _collection.UpdateOneAsync(m => m.Id == mesaId, update);
    }

    /// <inheritdoc/>
    public async Task DeleteAsync(string id) =>
        await _collection.DeleteOneAsync(m => m.Id == id);
}