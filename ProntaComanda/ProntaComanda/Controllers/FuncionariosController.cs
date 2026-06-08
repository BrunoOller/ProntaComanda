using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

[Route("funcionarios")]
public class FuncionariosController : Controller
{
    private readonly IFuncionarioRepository _repo;

    public FuncionariosController(IFuncionarioRepository repo)
    {
        _repo = repo;
    }

    // ── GET /funcionarios ────────────────────────────────────────────────
    public async Task<IActionResult> Index()
    {
        var funcionarios = await _repo.GetAllAsync();
        return View(funcionarios);
    }

    // ── GET /funcionarios/dados ──────────────────────────────────────────
    [HttpGet("dados")]
    public async Task<IActionResult> GetAll() =>
        Json(await _repo.GetAllAsync());

    // ── GET /funcionarios/funcao/{funcao} ────────────────────────────────
    [HttpGet("funcao/{funcao}")]
    public async Task<IActionResult> GetByFuncao(FuncaoUsuario funcao) =>
        Json(await _repo.GetByFuncaoAsync(funcao));

    // ── GET /funcionarios/{id} ───────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var funcionario = await _repo.GetByIdAsync(id);
        return funcionario is null ? NotFound() : Json(funcionario);
    }

    // ── POST /funcionarios/criar ─────────────────────────────────────────
    [HttpPost("criar")]
    public async Task<IActionResult> Create(Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetAllAsync());

        funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);

        await _repo.CreateAsync(funcionario);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /funcionarios/{id}/editar ───────────────────────────────────
    [HttpPost("{id}/editar")]
    public async Task<IActionResult> Update(string id, Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return View("Index", await _repo.GetAllAsync());

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        if (funcionario.SenhaHash != existente.SenhaHash)
            funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);

        funcionario.Id = id;
        await _repo.UpdateAsync(id, funcionario);
        return RedirectToAction(nameof(Index));
    }

    // ── POST /funcionarios/{id}/deletar ──────────────────────────────────
    [HttpPost("{id}/deletar")]
    public async Task<IActionResult> Delete(string id)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        await _repo.DeleteAsync(id);
        return RedirectToAction(nameof(Index));
    }
}