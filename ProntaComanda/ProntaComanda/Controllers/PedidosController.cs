using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

/// <summary>
/// Gerencia os pedidos transmitidos para a KDS (RF8, RF9, RF10).
/// Base: /api/pedidos
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PedidosController : ControllerBase
{
    private readonly IPedidoRepository _repo;

    public PedidosController(IPedidoRepository repo)
    {
        _repo = repo;
    }

    // ── GET /api/pedidos/ativos ──────────────────────────────────────────
    /// <summary>
    /// Retorna todos os pedidos ativos (Pendente + EmPreparo + Pronto).
    /// Endpoint principal da KDS — chamado com polling ou SignalR.
    /// </summary>
    [HttpGet("ativos")]
    [ProducesResponseType(typeof(List<Pedido>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAtivos() =>
        Ok(await _repo.GetAtivosAsync());

    // ── GET /api/pedidos?status={status} ────────────────────────────────
    /// <summary>
    /// Retorna pedidos filtrados por status.
    /// Ex: /api/pedidos?status=EmPreparo
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Pedido>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByStatus([FromQuery] StatusPedido? status = null)
    {
        if (status.HasValue)
            return Ok(await _repo.GetByStatusAsync(status.Value));

        // Sem filtro retorna todos os ativos por padrão
        return Ok(await _repo.GetAtivosAsync());
    }

    // ── GET /api/pedidos/{id} ────────────────────────────────────────────
    /// <summary>Retorna um pedido pelo Id.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Pedido), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var pedido = await _repo.GetByIdAsync(id);
        return pedido is null ? NotFound() : Ok(pedido);
    }

    // ── GET /api/pedidos/mesa/{mesaId} ───────────────────────────────────
    /// <summary>Retorna todos os pedidos de uma mesa.</summary>
    [HttpGet("mesa/{mesaId}")]
    [ProducesResponseType(typeof(List<Pedido>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByMesa(string mesaId) =>
        Ok(await _repo.GetByMesaAsync(mesaId));

    // ── GET /api/pedidos/funcionario/{funcionarioId}?data=2026-05-30 ─────
    /// <summary>
    /// Retorna os pedidos entregues de um funcionário em uma data (RF14 / Pedidos do Dia).
    /// </summary>
    [HttpGet("funcionario/{funcionarioId}")]
    [ProducesResponseType(typeof(List<Pedido>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetByFuncionario(
        string funcionarioId,
        [FromQuery] DateTime? data = null)
    {
        var dataConsulta = data ?? DateTime.UtcNow.Date;
        return Ok(await _repo.GetByFuncionarioDataAsync(funcionarioId, dataConsulta));
    }

    // ── POST /api/pedidos ────────────────────────────────────────────────
    /// <summary>
    /// Cria e transmite um novo pedido para a KDS (RF8).
    /// Status inicial é sempre Pendente.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(Pedido), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Pedido pedido)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await _repo.CreateAsync(pedido);

        return CreatedAtAction(nameof(GetById), new { id = pedido.Id }, pedido);
    }

    // ── PATCH /api/pedidos/{id}/status ───────────────────────────────────
    /// <summary>
    /// Atualiza o status de um pedido (RF9).
    /// Registra ProntoEm ou EntregueEm automaticamente conforme o novo status.
    /// </summary>
    [HttpPatch("{id}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        string id,
        [FromBody] AtualizarStatusRequest request)
    {
        var pedido = await _repo.GetByIdAsync(id);
        if (pedido is null) return NotFound();

        // Valida transição de status — impede voltar para status anterior
        var transicaoValida = (pedido.Status, request.NovoStatus) switch
        {
            (StatusPedido.Pendente, StatusPedido.EmPreparo) => true,
            (StatusPedido.EmPreparo, StatusPedido.Pronto) => true,
            (StatusPedido.Pronto, StatusPedido.Entregue) => true,
            // Qualquer status pode ser cancelado
            (_, StatusPedido.Cancelado) => true,
            _ => false
        };

        if (!transicaoValida)
            return BadRequest(new
            {
                message = $"Transição de '{pedido.Status}' para '{request.NovoStatus}' não é permitida."
            });

        await _repo.UpdateStatusAsync(id, request.NovoStatus);
        return NoContent();
    }
}

// ── Request bodies ───────────────────────────────────────────────────────────

/// <summary>Body para PATCH /pedidos/{id}/status</summary>
public record AtualizarStatusRequest(StatusPedido NovoStatus);