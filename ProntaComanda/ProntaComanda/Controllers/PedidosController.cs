using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

[Route("pedidos")]
public class PedidosController : Controller
{
    private readonly IPedidoRepository _repo;

    public PedidosController(IPedidoRepository repo)
    {
        _repo = repo;
    }

    // ── GET /pedidos ─────────────────────────────────────────────────────
    public async Task<IActionResult> Index()
    {
        var pedidos = await _repo.GetAtivosAsync();
        return View(pedidos);
    }

    // ── GET /pedidos/ativos ──────────────────────────────────────────────
    [HttpGet("ativos")]
    public async Task<IActionResult> GetAtivos() =>
        Json(await _repo.GetAtivosAsync());

    // ── GET /pedidos/dados ───────────────────────────────────────────────
    [HttpGet("dados")]
    public async Task<IActionResult> GetByStatus([FromQuery] StatusPedido? status = null)
    {
        if (status.HasValue)
            return Json(await _repo.GetByStatusAsync(status.Value));

        return Json(await _repo.GetAtivosAsync());
    }

    // ── GET /pedidos/{id} ────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var pedido = await _repo.GetByIdAsync(id);
        return pedido is null ? NotFound() : Json(pedido);
    }

    // ── GET /pedidos/mesa/{mesaId} ───────────────────────────────────────
    [HttpGet("mesa/{mesaId}")]
    public async Task<IActionResult> GetByMesa(string mesaId) =>
        Json(await _repo.GetByMesaAsync(mesaId));

    // ── GET /pedidos/funcionario/{funcionarioId} ─────────────────────────
    [HttpGet("funcionario/{funcionarioId}")]
    public async Task<IActionResult> GetByFuncionario(
        string funcionarioId,
        [FromQuery] DateTime? data = null)
    {
        var dataConsulta = data ?? DateTime.UtcNow.Date;
        return Json(await _repo.GetByFuncionarioDataAsync(funcionarioId, dataConsulta));
    }

    // ── POST /pedidos/criar ──────────────────────────────────────────────
    [HttpPost("criar")]
    public async Task<IActionResult> Create(Pedido pedido)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetAtivosAsync());

        await _repo.CreateAsync(pedido);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /pedidos/{id}/status ────────────────────────────────────────
    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, StatusPedido novoStatus)
    {
        var pedido = await _repo.GetByIdAsync(id);
        if (pedido is null) return NotFound();

        var transicaoValida = (pedido.Status, novoStatus) switch
        {
            (StatusPedido.Pendente, StatusPedido.EmPreparo) => true,
            (StatusPedido.EmPreparo, StatusPedido.Pronto) => true,
            (StatusPedido.Pronto, StatusPedido.Entregue) => true,
            (_, StatusPedido.Cancelado) => true,
            _ => false
        };

        if (!transicaoValida)
            return BadRequest();

        await _repo.UpdateStatusAsync(id, novoStatus);
        return RedirectToAction(nameof(Index));
    }
}