using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

[Route("mesas")]
public class MesasController : Controller
{
    private readonly IMesaRepository _repo;

    public MesasController(IMesaRepository repo)
    {
        _repo = repo;
    }

    // ── GET /mesas ───────────────────────────────────────────────────────
    public async Task<IActionResult> Index()
    {
        var mesas = await _repo.GetAllAsync();
        return View(mesas);
    }

    // ── GET /mesas/dados ─────────────────────────────────────────────────
    [HttpGet("dados")]
    public async Task<IActionResult> GetAll([FromQuery] bool? ocupada = null)
    {
        if (ocupada.HasValue)
            return Json(await _repo.GetByStatusAsync(ocupada.Value));

        return Json(await _repo.GetAllAsync());
    }

    // ── GET /mesas/numero/{numero} ───────────────────────────────────────
    [HttpGet("numero/{numero:int}")]
    public async Task<IActionResult> GetByNumero(int numero)
    {
        var mesa = await _repo.GetByNumeroAsync(numero);
        return mesa is null ? NotFound() : Json(mesa);
    }

    // ── POST /mesas/criar ────────────────────────────────────────────────
    [HttpPost("criar")]
    public async Task<IActionResult> Create(Mesa mesa)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetAllAsync());

        mesa.Ocupada = false;
        mesa.OcupadaEm = null;
        mesa.Comandas = [];

        await _repo.CreateAsync(mesa);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/comandas ────────────────────────────────────────
    [HttpPost("{id}/comandas")]
    public async Task<IActionResult> AddComanda(string id, Comanda comanda)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        comanda.Numero = mesa.Comandas.Count + 1;
        comanda.AbertoEm = DateTime.UtcNow;

        await _repo.AddComandaAsync(id, comanda);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/comandas/{numeroComanda}/itens ──────────────────
    [HttpPost("{id}/comandas/{numeroComanda:int}/itens")]
    public async Task<IActionResult> AddItemComanda(string id, int numeroComanda, ItemComanda item)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        var comanda = mesa.Comandas.FirstOrDefault(c => c.Numero == numeroComanda);
        if (comanda is null) return NotFound();

        await _repo.AddItemComandaAsync(id, numeroComanda, item);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/desconto ────────────────────────────────────────
    [HttpPost("{id}/desconto")]
    public async Task<IActionResult> AplicarDesconto(string id, decimal desconto, TipoDesconto tipoDesconto)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.AplicarDescontoAsync(id, desconto, tipoDesconto);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/mover ───────────────────────────────────────────
    [HttpPost("{id}/mover")]
    public async Task<IActionResult> MoverComandas(string id, string mesaDestinoId)
    {
        var origem = await _repo.GetByIdAsync(id);
        var destino = await _repo.GetByIdAsync(mesaDestinoId);

        if (origem is null || destino is null) return NotFound();
        if (id == mesaDestinoId) return BadRequest();

        await _repo.MoverComandasAsync(id, mesaDestinoId);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/fechar ──────────────────────────────────────────
    [HttpPost("{id}/fechar")]
    public async Task<IActionResult> Fechar(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.FecharMesaAsync(id);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /mesas/{id}/deletar ─────────────────────────────────────────
    [HttpPost("{id}/deletar")]
    public async Task<IActionResult> Delete(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.DeleteAsync(id);
        return RedirectToAction(nameof(Index));
    }
}