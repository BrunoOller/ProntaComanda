using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

/// <summary>
/// Gera e consulta relatórios de vendas e produtividade (RF14).
/// Base: /api/relatorios
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class RelatoriosController : ControllerBase
{
    private readonly IRelatorioRepository _repo;

    public RelatoriosController(IRelatorioRepository repo)
    {
        _repo = repo;
    }

    // ── GET /api/relatorios?periodo=today|week|month ─────────────────────
    /// <summary>
    /// Gera um relatório on-the-fly para o período informado.
    /// Usado pelo Dashboard para popular métricas e gráficos.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(RelatorioVendas), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
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
            return BadRequest(new { message = "Período inválido. Use: today, week, month ou year." });

        var relatorio = await _repo.GerarAsync(inicio.Value, fim!.Value);
        return Ok(relatorio);
    }

    // ── GET /api/relatorios/personalizado?inicio=...&fim=... ─────────────
    /// <summary>
    /// Gera um relatório para um intervalo de datas personalizado.
    /// </summary>
    [HttpGet("personalizado")]
    [ProducesResponseType(typeof(RelatorioVendas), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPersonalizado(
        [FromQuery] DateTime inicio,
        [FromQuery] DateTime fim)
    {
        if (inicio > fim)
            return BadRequest(new { message = "A data de início não pode ser maior que a data de fim." });

        var relatorio = await _repo.GerarAsync(inicio, fim);
        return Ok(relatorio);
    }

    // ── GET /api/relatorios/historico ────────────────────────────────────
    /// <summary>
    /// Retorna os últimos relatórios salvos (histórico).
    /// </summary>
    [HttpGet("historico")]
    [ProducesResponseType(typeof(List<RelatorioVendas>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistorico([FromQuery] int limite = 12) =>
        Ok(await _repo.GetHistoricoAsync(limite));

    // ── POST /api/relatorios ─────────────────────────────────────────────
    /// <summary>
    /// Gera e salva um relatório do período informado para consulta histórica.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(RelatorioVendas), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Gerar([FromBody] GerarRelatorioRequest request)
    {
        if (request.Inicio > request.Fim)
            return BadRequest(new { message = "A data de início não pode ser maior que a data de fim." });

        var relatorio = await _repo.GerarAsync(request.Inicio, request.Fim);
        await _repo.SalvarAsync(relatorio);

        return CreatedAtAction(nameof(GetHistorico), relatorio);
    }
}

// ── Request bodies ───────────────────────────────────────────────────────────

/// <summary>Body para POST /relatorios</summary>
public record GerarRelatorioRequest(DateTime Inicio, DateTime Fim);