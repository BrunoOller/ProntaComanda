using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

/// <summary>
/// Implementação do repositório de pedidos.
/// Principal fonte de dados da KDS e dos relatórios.
/// </summary>
public class PedidoRepository : IPedidoRepository
{
    private readonly IMongoCollection<Pedido> _collection;

    public PedidoRepository(MongoDbContext context)
    {
        _collection = context.Pedidos;
    }

    /// <inheritdoc/>
    public async Task<List<Pedido>> GetByStatusAsync(StatusPedido status) =>
        await _collection
            .Find(p => p.Status == status)
            .SortBy(p => p.LancadoEm) // mais antigos primeiro na KDS
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<List<Pedido>> GetAtivosAsync()
    {
        // Pendente, EmPreparo e Pronto — os três status visíveis na KDS
        var statusAtivos = new[]
        {
            StatusPedido.Pendente,
            StatusPedido.EmPreparo,
            StatusPedido.Pronto
        };

        var filtro = Builders<Pedido>.Filter.In(p => p.Status, statusAtivos);

        return await _collection
            .Find(filtro)
            .SortBy(p => p.LancadoEm)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<List<Pedido>> GetByMesaAsync(string mesaId) =>
        await _collection
            .Find(p => p.MesaId == mesaId)
            .SortByDescending(p => p.LancadoEm)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<List<Pedido>> GetByFuncionarioDataAsync(string funcionarioId, DateTime data)
    {
        // Define o intervalo do dia inteiro em UTC
        var inicio = data.Date.ToUniversalTime();
        var fim = inicio.AddDays(1);

        var filtro = Builders<Pedido>.Filter.And(
            Builders<Pedido>.Filter.Eq(p => p.FuncionarioId, funcionarioId),
            Builders<Pedido>.Filter.Gte(p => p.LancadoEm, inicio),
            Builders<Pedido>.Filter.Lt(p => p.LancadoEm, fim),
            // Apenas entregues contam para o faturamento do dia
            Builders<Pedido>.Filter.Eq(p => p.Status, StatusPedido.Entregue)
        );

        return await _collection
            .Find(filtro)
            .SortByDescending(p => p.LancadoEm)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<Pedido?> GetByIdAsync(string id) =>
        await _collection
            .Find(p => p.Id == id)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task CreateAsync(Pedido pedido)
    {
        pedido.LancadoEm = DateTime.UtcNow;
        pedido.Status = StatusPedido.Pendente;
        await _collection.InsertOneAsync(pedido);
    }

    /// <inheritdoc/>
    public async Task UpdateStatusAsync(string id, StatusPedido novoStatus)
    {
        // Atualiza o status e registra o timestamp correspondente
        var update = Builders<Pedido>.Update
            .Set(p => p.Status, novoStatus);

        if (novoStatus == StatusPedido.Pronto)
            update = update.Set(p => p.ProntoEm, DateTime.UtcNow);

        if (novoStatus == StatusPedido.Entregue)
            update = update.Set(p => p.EntregueEm, DateTime.UtcNow);

        await _collection.UpdateOneAsync(p => p.Id == id, update);
    }

    /// <inheritdoc/>
    public async Task<List<Pedido>> GetByPeriodoAsync(DateTime inicio, DateTime fim)
    {
        var filtro = Builders<Pedido>.Filter.And(
            Builders<Pedido>.Filter.Gte(p => p.LancadoEm, inicio.ToUniversalTime()),
            Builders<Pedido>.Filter.Lte(p => p.LancadoEm, fim.ToUniversalTime())
        );

        return await _collection
            .Find(filtro)
            .SortByDescending(p => p.LancadoEm)
            .ToListAsync();
    }
}