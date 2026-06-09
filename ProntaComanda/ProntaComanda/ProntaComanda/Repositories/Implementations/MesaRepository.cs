using MongoDB.Bson;
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

    public async Task AddItemComandaAsync(string mesaId, int numeroComanda, string produtoId, int quantidade)
    {
        var filtro = Builders<Mesa>.Filter.And(
            Builders<Mesa>.Filter.Eq(m => m.Id, mesaId),
            Builders<Mesa>.Filter.ElemMatch(m => m.Comandas, c => c.Numero == numeroComanda)
        );

        var update = Builders<Mesa>.Update.Inc("comandas.$.Itens.$[i].Quantidade", quantidade);

        var arrayFilters = new List<ArrayFilterDefinition>
    {
        new BsonDocumentArrayFilterDefinition<ItemComanda>(new BsonDocument("i.ProdutoId", produtoId))
    };

        await _collection.UpdateOneAsync(filtro, update, new UpdateOptions { ArrayFilters = arrayFilters });
    }

    public async Task RemoverItemComandaAsync(string mesaId, int numeroComanda, string produtoId)
    {
        // Filtro: Mesa correta, Comanda correta
        var filtro = Builders<Mesa>.Filter.And(
            Builders<Mesa>.Filter.Eq(m => m.Id, mesaId),
            Builders<Mesa>.Filter.ElemMatch(m => m.Comandas, c => c.Numero == numeroComanda)
        );

        // O $pull remove o item da lista 'itens' da comanda que foi identificada pelo $
        // Nota: O filtro "comandas.$.itens" dentro do update usa o operador posicional
        var update = Builders<Mesa>.Update.PullFilter("comandas.$.Itens",
            Builders<ItemComanda>.Filter.Eq(i => i.ProdutoId, produtoId));

        await _collection.UpdateOneAsync(filtro, update);
    }

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
        var origem = await GetByIdAsync(mesaOrigemId);
        if (origem is null || origem.Comandas.Count == 0) return;

        var destino = await GetByIdAsync(mesaDestinoId);
        if (destino is null) return;

        // PREVENÇÃO DE FALHA: Se a destino já estiver ocupada, mantemos o horário 
        // de quem chegou primeiro para não estragar a métrica de tempo.
        var novoOcupadaEm = destino.OcupadaEm.HasValue && destino.OcupadaEm < origem.OcupadaEm
            ? destino.OcupadaEm
            : origem.OcupadaEm;

        // Se a mesa de destino estava livre, ela herda o garçom da mesa de origem.
        var funcionarioId = destino.FuncionarioId ?? origem.FuncionarioId;

        var updateDestino = Builders<Mesa>.Update
            .PushEach(m => m.Comandas, origem.Comandas)
            .Set(m => m.Ocupada, true)
            .Set(m => m.OcupadaEm, novoOcupadaEm)
            .Set(m => m.FuncionarioId, funcionarioId);

        // Na origem, além de limpar as comandas, garantimos que o FuncionarioId suma
        var updateOrigem = Builders<Mesa>.Update
            .Set(m => m.Comandas, new List<Comanda>())
            .Set(m => m.Ocupada, false)
            .Set(m => m.OcupadaEm, (DateTime?)null)
            .Set(m => m.Desconto, 0m)
            .Set(m => m.TipoDesconto, TipoDesconto.Valor)
            .Set(m => m.FuncionarioId, (string?)null);

        await _collection.UpdateOneAsync(m => m.Id == mesaDestinoId, updateDestino);
        await _collection.UpdateOneAsync(m => m.Id == mesaOrigemId, updateOrigem);
    }

    /// <inheritdoc/>
    public async Task FecharMesaAsync(string mesaId)
    {
        var update = Builders<Mesa>.Update
            .Set(m => m.Ocupada, false)
            .Set(m => m.OcupadaEm, (DateTime?)null)
            .Set(m => m.Comandas, new List<Comanda>())
            .Set(m => m.Desconto, 0m)
            .Set(m => m.TipoDesconto, TipoDesconto.Valor)
            .Set(m => m.FuncionarioId, (string?)null); // Garantindo a liberação do garçom

        await _collection.UpdateOneAsync(m => m.Id == mesaId, update);
    }

    /// <inheritdoc/>
    public async Task DeleteAsync(string id) =>
        await _collection.DeleteOneAsync(m => m.Id == id);
}