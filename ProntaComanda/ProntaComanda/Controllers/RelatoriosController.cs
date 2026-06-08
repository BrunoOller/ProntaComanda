using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

[Route("relatorios")]
public class RelatoriosController : Controller
{
    private readonly IRelatorioRepository _repo;

    public RelatoriosController(IRelatorioRepository repo)
    {
        _repo = repo;
    }

    // ── GET /relatorios ──────────────────────────────────────────────────
    public async Task<IActionResult> Index()
    {
        var relatorio = await _repo.GerarAsync(
            new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            DateTime.UtcNow);
        return View(relatorio);
    }

    // ── GET /relatorios/periodo ──────────────────────────────────────────
    [HttpGet("periodo")]
    public async Task<IActionResult> GetByPeriodo([FromQuery] string periodo = "month")
    {
        var (inicio, fim) = periodo.ToLower() switch
        {
            "today" => (DateTime.UtcNow.Date, DateTime.UtcNow),
            "week" => (DateTime.UtcNow.Date.AddDays(-7), DateTime.UtcNow),
            "month" => (new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc), DateTime.UtcNow),
            "year" => (new DateTime(DateTime.UtcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), DateTime.UtcNow),
            _ => ((DateTime?)null, (DateTime?)null)
        };

        if (inicio is null)
            return BadRequest();

        return Json(await _repo.GerarAsync(inicio.Value, fim!.Value));
    }

    // ── GET /relatorios/personalizado ────────────────────────────────────
    [HttpGet("personalizado")]
    public async Task<IActionResult> GetPersonalizado(
        [FromQuery] DateTime inicio,
        [FromQuery] DateTime fim)
    {
        if (inicio > fim) return BadRequest();

        return Json(await _repo.GerarAsync(inicio, fim));
    }

    // ── GET /relatorios/historico ────────────────────────────────────────
    [HttpGet("historico")]
    public async Task<IActionResult> GetHistorico([FromQuery] int limite = 12) =>
        Json(await _repo.GetHistoricoAsync(limite));

    // ── POST /relatorios/gerar ───────────────────────────────────────────
    [HttpPost("gerar")]
    public async Task<IActionResult> Gerar(DateTime inicio, DateTime fim)
    {
        if (inicio > fim) return BadRequest();

        var relatorio = await _repo.GerarAsync(inicio, fim);
        await _repo.SalvarAsync(relatorio);

        return RedirectToAction(nameof(Index));
    }
}