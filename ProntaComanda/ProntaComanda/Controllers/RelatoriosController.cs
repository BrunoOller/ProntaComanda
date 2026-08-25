using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class RelatoriosController : Controller
{
    private readonly IRelatorioRepository _repo;

    public RelatoriosController(IRelatorioRepository repo) => _repo = repo;

    // GET /Relatorios
    public async Task<IActionResult> Index()
    {
        var relatorio = await _repo.GerarAsync(
            new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            DateTime.UtcNow);
        return View(relatorio);
    }

    // GET /Relatorios/Dados?periodo=month  → JSON para o dashboard JS
    [HttpGet]
    public async Task<IActionResult> Dados(string periodo = "month")
    {
        var (inicio, fim) = periodo.ToLower() switch
        {
            "today" => (DateTime.UtcNow.Date, DateTime.UtcNow),
            "week"  => (DateTime.UtcNow.Date.AddDays(-7), DateTime.UtcNow),
            "year"  => (new DateTime(DateTime.UtcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), DateTime.UtcNow),
            _       => (new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc), DateTime.UtcNow)
        };

        return Json(await _repo.GerarAsync(inicio, fim));
    }

    // POST /Relatorios/Gerar
    [HttpPost]
    public async Task<IActionResult> Gerar(DateTime inicio, DateTime fim)
    {
        if (inicio > fim) return BadRequest();
        var relatorio = await _repo.GerarAsync(inicio, fim);
        await _repo.SalvarAsync(relatorio);
        return RedirectToAction(nameof(Index));
    }
}
