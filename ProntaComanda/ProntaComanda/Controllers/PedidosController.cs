using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class PedidosController : Controller
{
    private readonly IPedidoRepository _repo;

    public PedidosController(IPedidoRepository repo) => _repo = repo;

    // GET /Pedidos  → página KDS
    public async Task<IActionResult> Index()
    {
        var pedidos = await _repo.GetAtivosAsync();
        return View(pedidos);
    }

    // GET /Pedidos/Ativos  → JSON para polling do JS
    [HttpGet]
    public async Task<IActionResult> Ativos()
        => Json(await _repo.GetAtivosAsync());

    // POST /Pedidos/Criar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Criar(Pedido pedido)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        await _repo.CreateAsync(pedido);
        return RedirectToAction(nameof(Index));
    }

    // POST /Pedidos/AtualizarStatus
    // POST /Pedidos/AtualizarStatus
    [HttpPost]
    public async Task<IActionResult> AtualizarStatus(string id, StatusPedido novoStatus)
    {
        var pedido = await _repo.GetByIdAsync(id);
        if (pedido is null)
            return Json(new { success = false, message = "Pedido não encontrado." });

        var valida = (pedido.Status, novoStatus) switch
        {
            (StatusPedido.Pendente, StatusPedido.EmPreparo) => true,
            (StatusPedido.EmPreparo, StatusPedido.Pronto) => true,
            (StatusPedido.Pronto, StatusPedido.Entregue) => true,
            (_, StatusPedido.Cancelado) => true,
            _ => false
        };

        if (valida)
        {
            await _repo.UpdateStatusAsync(id, novoStatus);
            return Json(new { success = true, novoStatus = novoStatus.ToString() });
        }

        return Json(new { success = false, message = "Transição de status inválida." });
    }
}
