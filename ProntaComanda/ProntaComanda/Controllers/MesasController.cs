using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

/// <summary>
/// Gerencia as mesas e comandas do restaurante (RF4, RF5, RF6, RF7, RF11, RF12).
/// Base: /api/mesas
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class MesasController : ControllerBase
{
    private readonly IMesaRepository _repo;

    public MesasController(IMesaRepository repo)
    {
        _repo = repo;
    }

    // ── GET /api/mesas ───────────────────────────────────────────────────
    /// <summary>
    /// Retorna todas as mesas.
    /// Filtro opcional por status: /api/mesas?ocupada=true
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Mesa>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] bool? ocupada = null)
    {
        if (ocupada.HasValue)
            return Ok(await _repo.GetByStatusAsync(ocupada.Value));

        return Ok(await _repo.GetAllAsync());
    }

    // ── GET /api/mesas/{id} ──────────────────────────────────────────────
    /// <summary>Retorna uma mesa pelo Id.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        return mesa is null ? NotFound() : Ok(mesa);
    }

    // ── GET /api/mesas/numero/{numero} ───────────────────────────────────
    /// <summary>Retorna uma mesa pelo número.</summary>
    [HttpGet("numero/{numero:int}")]
    [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByNumero(int numero)
    {
        var mesa = await _repo.GetByNumeroAsync(numero);
        return mesa is null ? NotFound() : Ok(mesa);
    }

    // ── POST /api/mesas ──────────────────────────────────────────────────
    /// <summary>Cadastra uma nova mesa no sistema.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(Mesa), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Mesa mesa)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Garante que a mesa começa livre
        mesa.Ocupada = false;
        mesa.OcupadaEm = null;
        mesa.Comandas = [];

        await _repo.CreateAsync(mesa);

        return CreatedAtAction(nameof(GetById), new { id = mesa.Id }, mesa);
    }

    // ── POST /api/mesas/{id}/comandas ────────────────────────────────────
    /// <summary>
    /// Abre uma nova comanda na mesa — inicia o atendimento (RF5).
    /// Marca a mesa como ocupada automaticamente.
    /// </summary>
    [HttpPost("{id}/comandas")]
    [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddComanda(string id, [FromBody] Comanda comanda)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        // Número da comanda sequencial dentro da mesa
        comanda.Numero = mesa.Comandas.Count + 1;
        comanda.AbertoEm = DateTime.UtcNow;

        await _repo.AddComandaAsync(id, comanda);

        return Ok(await _repo.GetByIdAsync(id));
    }

    // ── POST /api/mesas/{id}/comandas/{numeroComanda}/itens ──────────────
    /// <summary>
    /// Adiciona um item a uma comanda existente (RF6).
    /// </summary>
    [HttpPost("{id}/comandas/{numeroComanda:int}/itens")]
    [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddItemComanda(
        string id,
        int numeroComanda,
        [FromBody] ItemComanda item)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        var comanda = mesa.Comandas.FirstOrDefault(c => c.Numero == numeroComanda);
        if (comanda is null)
            return NotFound(new { message = $"Comanda {numeroComanda} não encontrada na mesa." });

        await _repo.AddItemComandaAsync(id, numeroComanda, item);

        return Ok(await _repo.GetByIdAsync(id));
    }

    // ── PATCH /api/mesas/{id}/desconto ───────────────────────────────────
    /// <summary>
    /// Aplica desconto, cortesia ou taxa de serviço na mesa (RF12).
    /// </summary>
    [HttpPatch("{id}/desconto")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AplicarDesconto(
        string id,
        [FromBody] AplicarDescontoRequest request)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.AplicarDescontoAsync(id, request.Desconto, request.TipoDesconto);
        return NoContent();
    }

    // ── POST /api/mesas/{id}/mover ───────────────────────────────────────
    /// <summary>
    /// Transfere todas as comandas para outra mesa (RF7).
    /// </summary>
    [HttpPost("{id}/mover")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MoverComandas(
        string id,
        [FromBody] MoverComandasRequest request)
    {
        var origem = await _repo.GetByIdAsync(id);
        var destino = await _repo.GetByIdAsync(request.MesaDestinoId);

        if (origem is null || destino is null)
            return NotFound(new { message = "Mesa de origem ou destino não encontrada." });

        if (id == request.MesaDestinoId)
            return BadRequest(new { message = "Mesa de origem e destino não podem ser iguais." });

        await _repo.MoverComandasAsync(id, request.MesaDestinoId);
        return NoContent();
    }

    // ── POST /api/mesas/{id}/fechar ──────────────────────────────────────
    /// <summary>
    /// Fecha a mesa após pagamento — limpa comandas e libera a mesa.
    /// </summary>
    [HttpPost("{id}/fechar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Fechar(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.FecharMesaAsync(id);
        return NoContent();
    }

    // ── DELETE /api/mesas/{id} ───────────────────────────────────────────
    /// <summary>Remove uma mesa do sistema.</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        var mesa = await _repo.GetByIdAsync(id);
        if (mesa is null) return NotFound();

        await _repo.DeleteAsync(id);
        return NoContent();
    }
}

// ── Request bodies ───────────────────────────────────────────────────────────

/// <summary>Body para PATCH /mesas/{id}/desconto</summary>
public record AplicarDescontoRequest(decimal Desconto, TipoDesconto TipoDesconto);

/// <summary>Body para POST /mesas/{id}/mover</summary>
public record MoverComandasRequest(string MesaDestinoId);