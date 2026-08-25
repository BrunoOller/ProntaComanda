using MongoDB.Driver;
using ProntaComanda.Data;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Repositories.Implementations;

public class HistoricoVendaRepository : IHistoricoVendaRepository
{
    private readonly IMongoCollection<HistoricoVenda> _collection;

    public HistoricoVendaRepository(MongoDbContext context)
    {
        // Pega a coleção de históricos do seu contexto
        _collection = context.HistoricoVendas;
    }

    public async Task CriarAsync(HistoricoVenda historico)
    {
        await _collection.InsertOneAsync(historico);
    }

    public async Task<List<HistoricoVenda>> ObterTodosAsync()
    {
        // Retorna tudo, do mais recente para o mais antigo
        return await _collection
            .Find(_ => true)
            .SortByDescending(h => h.FechadaEm)
            .ToListAsync();
    }

    public async Task<List<HistoricoVenda>> ObterPorPeriodoAsync(DateTime inicio, DateTime fim)
    {
        // Filtro direto e limpo para pegar as vendas entre duas datas
        return await _collection
            .Find(h => h.FechadaEm >= inicio && h.FechadaEm <= fim)
            .SortByDescending(h => h.FechadaEm)
            .ToListAsync();
    }
}
