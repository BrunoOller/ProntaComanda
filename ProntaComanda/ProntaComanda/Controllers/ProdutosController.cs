using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

/// <summary>
/// Gerencia o cardápio digital (RF1, RF2, RF3).
/// Base: /api/produtos
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProdutosController : ControllerBase
{
    private readonly IProdutoRepository _repo;

    public ProdutosController(IProdutoRepository repo)
    {
        _repo = repo;
    }

    // ── GET /api/produtos ────────────────────────────────────────────────
    /// <summary>
    /// Retorna produtos com filtros opcionais por categoria e disponibilidade.
    /// Também suporta busca por nome via query string.
    /// Ex: /api/produtos?categoriaId=abc&disponibilidade=Disponivel&busca=pizza
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Produto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? categoriaId = null,
        [FromQuery] Disponibilidade? disponibilidade = null,
        [FromQuery] string? busca = null)
    {
        // Se tiver busca por nome, ignora os outros filtros
        if (!string.IsNullOrWhiteSpace(busca))
            return Ok(await _repo.SearchByNomeAsync(busca));

        return Ok(await _repo.GetByFiltroAsync(categoriaId, disponibilidade));
    }

    // ── GET /api/produtos/{id} ───────────────────────────────────────────
    /// <summary>Retorna um produto pelo Id.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Produto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var produto = await _repo.GetByIdAsync(id);
        return produto is null ? NotFound() : Ok(produto);
    }

    // ── POST /api/produtos ───────────────────────────────────────────────
    /// <summary>Cria um novo produto no cardápio (RF1).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(Produto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Produto produto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await _repo.CreateAsync(produto);

        return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
    }

    // ── PUT /api/produtos/{id} ───────────────────────────────────────────
    /// <summary>Atualiza um produto existente (RF1).</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] Produto produto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        produto.Id = id;
        await _repo.UpdateAsync(id, produto);

        return NoContent();
    }

    // ── PATCH /api/produtos/{id}/disponibilidade ─────────────────────────
    /// <summary>
    /// Atualiza apenas a disponibilidade de um produto (RF2).
    /// Operação cirúrgica — não reescreve o documento inteiro.
    /// </summary>
    [HttpPatch("{id}/disponibilidade")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDisponibilidade(
        string id,
        [FromBody] Disponibilidade disponibilidade)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        await _repo.UpdateDisponibilidadeAsync(id, disponibilidade);
        return NoContent();
    }

    // ── DELETE /api/produtos/{id} ────────────────────────────────────────
    /// <summary>Remove um produto do cardápio (RF1).</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        await _repo.DeleteAsync(id);
        return NoContent();
    }
}