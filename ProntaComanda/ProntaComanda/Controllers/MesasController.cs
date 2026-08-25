using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class MesasController : Controller
{
    private readonly IMesaRepository _mesaRepository;
    private readonly IHistoricoVendaRepository _historicoRepository;
    private readonly IProdutoRepository _produtoRepository;

    // Injeção de dependência dos dois repositórios necessários
    public MesasController(IMesaRepository mesaRepository, IHistoricoVendaRepository historicoRepository, IProdutoRepository produtoRepository)
    {
        _mesaRepository = mesaRepository;
        _historicoRepository = historicoRepository;
        _produtoRepository = produtoRepository;
    }

    // 1. Carregamento Inicial da Tela (Gera o HTML + CONST_INICIAIS)
    public async Task<IActionResult> Index()
    {
        var mesas = await _mesaRepository.GetAllAsync();
        var produtos = await _produtoRepository.GetByFiltroAsync(null, Disponibilidade.Disponivel); // só disponíveis
        ViewBag.Produtos = produtos;
        return View(mesas);
    }

    // 2. Criar Nova Mesa
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Criar([FromBody] Mesa input)
    {
        if (input.Numero <= 0)
            return BadRequest(new { mensagem = "Número da mesa inválido." });

        // Prevenção de falha: Evita duplicar mesas com o mesmo número
        var mesaExistente = await _mesaRepository.GetByNumeroAsync(input.Numero);
        if (mesaExistente is not null)
            return BadRequest(new { mensagem = $"A mesa {input.Numero} já está cadastrada." });

        var novaMesa = new Mesa { Numero = input.Numero };
        await _mesaRepository.CreateAsync(novaMesa);

        return Ok(new { success = true, mesa = novaMesa });
    }

    // 3. Adicionar Comanda a uma Mesa
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AdicionarComanda([FromBody] AdicionarComandaRequest request)
    {
        var mesa = await _mesaRepository.GetByIdAsync(request.MesaId);
        if (mesa is null) return NotFound(new { mensagem = "Mesa não encontrada." });

        // Gera automaticamente o próximo número de comanda sequencial para aquela mesa
        int proximoNumero = mesa.Comandas.Any() ? mesa.Comandas.Max(c => c.Numero) + 1 : 1;

        var novaComanda = new Comanda
        {
            Numero = proximoNumero,
            AbertoEm = DateTime.UtcNow
        };

        await _mesaRepository.AddComandaAsync(request.MesaId, novaComanda);
        return Ok(new { success = true, numeroComanda = proximoNumero });
    }

    // 4. Mover Comandas (Transferência de Mesa)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> MoverMesa([FromBody] MoverMesaRequest request)
    {
        if (request.MesaOrigemId == request.MesaDestinoId)
            return BadRequest(new { mensagem = "A mesa de origem não pode ser igual à de destino." });

        await _mesaRepository.MoverComandasAsync(request.MesaOrigemId, request.MesaDestinoId);
        return Ok(new { success = true });
    }

    // 5. Aplicar Desconto/Cortesia
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AplicarDesconto([FromBody] DescontoRequest request)
    {
        await _mesaRepository.AplicarDescontoAsync(request.MesaId, request.Desconto, request.TipoDesconto);
        return Ok(new { success = true });
    }

    // 6. ORQUESTRAÇÃO CRÍTICA: Fechar Mesa e Salvar no BI do Dashboard
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> FecharMesa([FromBody] FecharMesaRequest request)
    {
        // 1. Busca a mesa com todos os dados atuais de consumo
        var mesa = await _mesaRepository.GetByIdAsync(request.MesaId);
        if (mesa is null) return NotFound(new { mensagem = "Mesa não encontrada." });
        if (!mesa.Ocupada || mesa.Comandas.Count == 0)
            return BadRequest(new { mensagem = "Esta mesa não possui comandas ativas para fechamento." });

        // 2. Monta o snapshot histórico completo antes de limpar a mesa do mapa
        var historico = new HistoricoVenda
        {
            NumeroMesa = mesa.Numero,
            FuncionarioId = mesa.FuncionarioId,
            Subtotal = mesa.Subtotal,
            DescontoAplicado = mesa.Desconto,
            TipoDesconto = mesa.TipoDesconto,
            TotalPago = mesa.Total,
            OcupadaEm = mesa.OcupadaEm ?? DateTime.UtcNow,
            FechadaEm = DateTime.UtcNow,
            TempoPermanenciaSegundos = mesa.PermanenciaSegundos,
            Comandas = mesa.Comandas // Guarda tudo o que comeram/beberam para gráficos futuros
        };

        // 3. Salva no banco de dados do Dashboard
        await _historicoRepository.CriarAsync(historico);

        // 4. Agora sim, limpa e libera a mesa física no restaurante
        await _mesaRepository.FecharMesaAsync(request.MesaId);

        return Ok(new { success = true, mensagem = "Mesa finalizada e venda registrada com sucesso!" });
    }

    // 7. Deletar Mesa (Caso seja removida do salão)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Deletar([FromBody] DeletarMesaRequest request)
    {
        var mesa = await _mesaRepository.GetByIdAsync(request.MesaId);
        if (mesa is null) return NotFound(new { mensagem = "Mesa não encontrada." });
        if (mesa.Ocupada) return BadRequest(new { mensagem = "Não é possível deletar uma mesa ocupada." });

        await _mesaRepository.DeleteAsync(request.MesaId);
        return Ok(new { success = true });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AlterarItem([FromBody] AlterarItemRequest request)
    {
        try
        {
            if (request == null) return BadRequest(new { mensagem = "Requisição vazia." });
            if (request.Quantidade == 0) return BadRequest(new { mensagem = "Quantidade inválida." });

            var mesa = await _mesaRepository.GetByIdAsync(request.MesaId);
            if (mesa is null) return NotFound(new { mensagem = "Mesa não encontrada." });

            var comanda = mesa.Comandas.FirstOrDefault(c => c.Numero == request.ComandaNumero);
            if (comanda is null) return NotFound(new { mensagem = "Comanda não encontrada." });

            if (request.Quantidade > 0)
            {
                // ADICIONAR — o AddItemComandaAsync já trata incremento se o item existir
                var item = new ItemComanda
                {
                    ProdutoId = request.ProdutoId,
                    NomeProduto = request.NomeProduto,
                    PrecoUnitario = request.PrecoUnitario,
                    Quantidade = request.Quantidade
                };
                await _mesaRepository.AddItemComandaAsync(request.MesaId, request.ComandaNumero, item);
            }
            else
            {
                // REMOVER — verifica se vai zerar ou só decrementar
                var itemExistente = comanda.Itens.FirstOrDefault(i => i.ProdutoId == request.ProdutoId);
                if (itemExistente is null)
                    return NotFound(new { mensagem = "Item não encontrado na comanda." });

                if (itemExistente.Quantidade + request.Quantidade <= 0)
                {
                    // Remove completamente
                    await _mesaRepository.RemoverItemComandaAsync(
                        request.MesaId, request.ComandaNumero, request.ProdutoId);
                }
                else
                {
                    // Decrementa usando o AddItemComandaAsync com quantidade negativa
                    var item = new ItemComanda
                    {
                        ProdutoId = request.ProdutoId,
                        NomeProduto = request.NomeProduto,
                        PrecoUnitario = request.PrecoUnitario,
                        Quantidade = request.Quantidade // já é negativo
                    };
                    await _mesaRepository.AddItemComandaAsync(request.MesaId, request.ComandaNumero, item);
                }
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { mensagem = "Erro no servidor: " + ex.Message });
        }
    }

    public record AdicionarComandaRequest(string MesaId);
    public record MoverMesaRequest(string MesaOrigemId, string MesaDestinoId);
    public record DescontoRequest(string MesaId, decimal Desconto, TipoDesconto TipoDesconto);
    public record FecharMesaRequest(string MesaId);
    public record DeletarMesaRequest(string MesaId);

    // O Request agora espera os dados essenciais do produto também
    public record AlterarItemRequest(
        string MesaId,
        int ComandaNumero,
        string ProdutoId,
        string NomeProduto,
        decimal PrecoUnitario,
        int Quantidade
    );
}