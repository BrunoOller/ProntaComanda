using ProntaComanda.Models;

namespace ProntaComanda.Repositories.Interfaces;

// ══════════════════════════════════════════════════════════════════
// IFuncionarioRepository
// ══════════════════════════════════════════════════════════════════

public interface IFuncionarioRepository
{
    /// <summary>Retorna todos os funcionários.</summary>
    Task<List<Funcionario>> GetAllAsync();

    /// <summary>Retorna funcionários filtrados por função.</summary>
    Task<List<Funcionario>> GetByFuncaoAsync(FuncaoUsuario funcao);

    /// <summary>Busca um funcionário pelo Id.</summary>
    Task<Funcionario?> GetByIdAsync(string id);

    /// <summary>Cria um novo funcionário.</summary>
    Task CreateAsync(Funcionario funcionario);

    /// <summary>Atualiza um funcionário existente.</summary>
    Task UpdateAsync(string id, Funcionario funcionario);

    /// <summary>Remove um funcionário pelo Id.</summary>
    Task DeleteAsync(string id);
}

// ══════════════════════════════════════════════════════════════════
// IProdutoRepository
// ══════════════════════════════════════════════════════════════════

public interface IProdutoRepository
{
    /// <summary>Retorna todos os produtos.</summary>
    Task<List<Produto>> GetAllAsync();

    /// <summary>Retorna produtos filtrados por categoria e/ou disponibilidade.</summary>
    Task<List<Produto>> GetByFiltroAsync(string? categoriaId = null, Disponibilidade? disponibilidade = null);

    /// <summary>Busca produtos pelo nome (busca parcial, case-insensitive).</summary>
    Task<List<Produto>> SearchByNomeAsync(string termo);

    /// <summary>Busca um produto pelo Id.</summary>
    Task<Produto?> GetByIdAsync(string id);

    /// <summary>Cria um novo produto.</summary>
    Task CreateAsync(Produto produto);

    /// <summary>Atualiza um produto existente.</summary>
    Task UpdateAsync(string id, Produto produto);

    /// <summary>Atualiza apenas a disponibilidade de um produto (RF2).</summary>
    Task UpdateDisponibilidadeAsync(string id, Disponibilidade disponibilidade);

    /// <summary>Remove um produto pelo Id.</summary>
    Task DeleteAsync(string id);
}

// ══════════════════════════════════════════════════════════════════
// IMesaRepository
// ══════════════════════════════════════════════════════════════════

public interface IMesaRepository
{
    /// <summary>Retorna todas as mesas.</summary>
    Task<List<Mesa>> GetAllAsync();

    /// <summary>Retorna mesas filtradas por status de ocupação (RF4).</summary>
    Task<List<Mesa>> GetByStatusAsync(bool ocupada);

    /// <summary>Busca uma mesa pelo Id.</summary>
    Task<Mesa?> GetByIdAsync(string id);

    /// <summary>Busca uma mesa pelo número.</summary>
    Task<Mesa?> GetByNumeroAsync(int numero);

    /// <summary>Cria uma nova mesa.</summary>
    Task CreateAsync(Mesa mesa);

    /// <summary>Substitui o documento inteiro da mesa (usado após mutações no estado).</summary>
    Task UpdateAsync(string id, Mesa mesa);

    /// <summary>
    /// Adiciona uma comanda à mesa (RF5).
    /// Usa $push para não reescrever o documento inteiro.
    /// </summary>
    Task AddComandaAsync(string mesaId, Comanda comanda);

    /// <summary>
    /// Adiciona um item a uma comanda específica da mesa (RF6).
    /// Usa $push com filtro de array.
    /// </summary>
    Task AddItemComandaAsync(string mesaId, int numeroComanda, ItemComanda item);

    /// <summary>
    /// Aplica desconto na mesa (RF12).
    /// </summary>
    Task AplicarDescontoAsync(string mesaId, decimal desconto, TipoDesconto tipo);

    /// <summary>
    /// Transfere todas as comandas de uma mesa para outra (RF7).
    /// </summary>
    Task MoverComandasAsync(string mesaOrigemId, string mesaDestinoId);

    /// <summary>
    /// Fecha a mesa — limpa comandas e marca como livre.
    /// </summary>
    Task FecharMesaAsync(string mesaId);

    /// <summary>Remove uma mesa pelo Id.</summary>
    Task DeleteAsync(string id);
}

// ══════════════════════════════════════════════════════════════════
// IPedidoRepository
// ══════════════════════════════════════════════════════════════════

public interface IPedidoRepository
{
    /// <summary>Retorna pedidos filtrados por status (principal query da KDS).</summary>
    Task<List<Pedido>> GetByStatusAsync(StatusPedido status);

    /// <summary>Retorna todos os pedidos ativos (Pendente + EmPreparo + Pronto).</summary>
    Task<List<Pedido>> GetAtivosAsync();

    /// <summary>Retorna pedidos de uma mesa específica.</summary>
    Task<List<Pedido>> GetByMesaAsync(string mesaId);

    /// <summary>
    /// Retorna pedidos de um funcionário em uma data específica (RF14 / Pedidos do Dia).
    /// </summary>
    Task<List<Pedido>> GetByFuncionarioDataAsync(string funcionarioId, DateTime data);

    /// <summary>Busca um pedido pelo Id.</summary>
    Task<Pedido?> GetByIdAsync(string id);

    /// <summary>Cria um novo pedido e o transmite para a KDS (RF8).</summary>
    Task CreateAsync(Pedido pedido);

    /// <summary>
    /// Atualiza o status de um pedido (RF9).
    /// Registra automaticamente ProntoEm ou EntregueEm conforme o novo status.
    /// </summary>
    Task UpdateStatusAsync(string id, StatusPedido novoStatus);

    /// <summary>
    /// Retorna pedidos em um intervalo de datas — usado pelos relatórios (RF14).
    /// </summary>
    Task<List<Pedido>> GetByPeriodoAsync(DateTime inicio, DateTime fim);
}

// ══════════════════════════════════════════════════════════════════
// IRelatorioRepository
// ══════════════════════════════════════════════════════════════════

public interface IRelatorioRepository
{
    /// <summary>
    /// Gera um relatório de vendas agregado para o período informado (RF14).
    /// Faz as agregações diretamente no MongoDB — não carrega tudo em memória.
    /// </summary>
    Task<RelatorioVendas> GerarAsync(DateTime inicio, DateTime fim);

    /// <summary>Salva um relatório gerado para consulta histórica.</summary>
    Task SalvarAsync(RelatorioVendas relatorio);

    /// <summary>Retorna os relatórios já gerados, do mais recente ao mais antigo.</summary>
    Task<List<RelatorioVendas>> GetHistoricoAsync(int limite = 12);
}