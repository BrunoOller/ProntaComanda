using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class ProdutosController : Controller
{
    private readonly IProdutoRepository _repo;

    public ProdutosController(IProdutoRepository repo) => _repo = repo;

    // GET /Produtos
    public async Task<IActionResult> Index(string? busca = null, string? categoria = null)
    {
        List<Produto> produtos;

        if (!string.IsNullOrWhiteSpace(busca))
            produtos = await _repo.SearchByNomeAsync(busca);
        else
            produtos = await _repo.GetByFiltroAsync(categoriaId: categoria);

        ViewBag.BuscaAtual = busca;
        ViewBag.CategoriaAtual = categoria;
        return View(produtos);
    }

    // GET /Produtos/Buscar?id=xxx  → retorna JSON para o modal de edição
    [HttpGet]
    public async Task<IActionResult> Buscar(string id)
    {
        var produto = await _repo.GetByIdAsync(id);
        if (produto is null) return NotFound();
        return Json(produto);
    }

    // POST /Produtos/Criar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Criar(Produto produto)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        await _repo.CreateAsync(produto);
        TempData["Sucesso"] = $"Produto \"{produto.Nome}\" adicionado!";
        return RedirectToAction(nameof(Index));
    }

    // POST /Produtos/Editar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Editar(string id, Produto produto)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        produto.Id = id;
        await _repo.UpdateAsync(id, produto);
        TempData["Sucesso"] = $"Produto \"{produto.Nome}\" atualizado!";
        return RedirectToAction(nameof(Index));
    }

    // POST /Produtos/AlterarDisponibilidade
    [HttpPost]
    public async Task<IActionResult> AlterarDisponibilidade(string id, Disponibilidade disponibilidade)
    {
        await _repo.UpdateDisponibilidadeAsync(id, disponibilidade);
        return RedirectToAction(nameof(Index));
    }

    // POST /Produtos/Deletar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Deletar(string id)
    {
        await _repo.DeleteAsync(id);
        TempData["Sucesso"] = "Produto removido.";
        return RedirectToAction(nameof(Index));
    }
}
