using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

[Route("produtos")]
public class ProdutosController : Controller
{
    private readonly IProdutoRepository _repo;

    public ProdutosController(IProdutoRepository repo)
    {
        _repo = repo;
    }

    // ── GET /produtos ────────────────────────────────────────────────────
    public async Task<IActionResult> Index()
    {
        var produtos = await _repo.GetByFiltroAsync(null, null);
        return View(produtos);
    }

    // ── GET /produtos/dados ──────────────────────────────────────────────
    [HttpGet("dados")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? categoriaId = null,
        [FromQuery] Disponibilidade? disponibilidade = null,
        [FromQuery] string? busca = null)
    {
        if (!string.IsNullOrWhiteSpace(busca))
            return Json(await _repo.SearchByNomeAsync(busca));

        return Json(await _repo.GetByFiltroAsync(categoriaId, disponibilidade));
    }

    // ── GET /produtos/{id} ───────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var produto = await _repo.GetByIdAsync(id);
        return produto is null ? NotFound() : Json(produto);
    }

    // ── POST /produtos/criar ─────────────────────────────────────────────
    [HttpPost("criar")]
    public async Task<IActionResult> Create(Produto produto)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetByFiltroAsync(null, null));

        await _repo.CreateAsync(produto);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /produtos/{id}/editar ───────────────────────────────────────
    [HttpPost("{id}/editar")]
    public async Task<IActionResult> Update(string id, Produto produto)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetByFiltroAsync(null, null));

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        produto.Id = id;
        await _repo.UpdateAsync(id, produto);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /produtos/{id}/disponibilidade ──────────────────────────────
    [HttpPost("{id}/disponibilidade")]
    public async Task<IActionResult> UpdateDisponibilidade(string id, Disponibilidade disponibilidade)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        await _repo.UpdateDisponibilidadeAsync(id, disponibilidade);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /produtos/{id}/deletar ──────────────────────────────────────
    [HttpPost("{id}/deletar")]
    public async Task<IActionResult> Delete(string id)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        await _repo.DeleteAsync(id);
        return RedirectToAction(nameof(Index));
    }
}