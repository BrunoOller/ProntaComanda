using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class MesasController : Controller
{
    private readonly IMesaRepository _repo;

    public MesasController(IMesaRepository repo) => _repo = repo;

    // GET /Mesas
    public async Task<IActionResult> Index()
    {
        var mesas = await _repo.GetAllAsync();
        return View(mesas);
    }

    // GET /Mesas/Buscar?id=xxx  → retorna JSON para a sidebar
    [HttpGet]
    public async Task<IActionResult> Buscar(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();
        return Json(mesa);
    }

    // GET /Mesas/Todas  → retorna JSON com todas as mesas (para polling)
    [HttpGet]
    public async Task<IActionResult> Todas()
        => Json(await _repo.GetAllAsync());

    // POST /Mesas/Criar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Criar(int numero)
    {
        var mesa = new Mesa { Numero = numero };
        await _repo.CreateAsync(mesa);
        return RedirectToAction(nameof(Index));
    }

    // POST /Mesas/AdicionarComanda
    [HttpPost]
    public async Task<IActionResult> AdicionarComanda(string mesaId)
    {
        var mesa = await _repo.GetByIdAsync(mesaId);
        if (mesa is null) return NotFound();

        var comanda = new Comanda
        {
            Numero = mesa.Comandas.Count + 1,
            AbertoEm = DateTime.UtcNow
        };
        await _repo.AddComandaAsync(mesaId, comanda);
        return RedirectToAction(nameof(Index));
    }

    // POST /Mesas/AplicarDesconto
    [HttpPost]
    public async Task<IActionResult> AplicarDesconto(string mesaId, decimal desconto, TipoDesconto tipoDesconto)
    {
        await _repo.AplicarDescontoAsync(mesaId, desconto, tipoDesconto);
        return RedirectToAction(nameof(Index));
    }

    // POST /Mesas/MoverMesa
    [HttpPost]
    public async Task<IActionResult> MoverMesa(string mesaOrigemId, string mesaDestinoId)
    {
        if (mesaOrigemId == mesaDestinoId) return BadRequest();
        await _repo.MoverComandasAsync(mesaOrigemId, mesaDestinoId);
        return RedirectToAction(nameof(Index));
    }

    // POST /Mesas/FecharMesa
    [HttpPost]
    public async Task<IActionResult> FecharMesa(string mesaId)
    {
        await _repo.FecharMesaAsync(mesaId);
        TempData["Sucesso"] = "Mesa fechada com sucesso.";
        return RedirectToAction(nameof(Index));
    }

    // POST /Mesas/Deletar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Deletar(string mesaId)
    {
        await _repo.DeleteAsync(mesaId);
        return RedirectToAction(nameof(Index));
    }
}
