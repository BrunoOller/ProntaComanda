using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class FuncionariosController : Controller
{
    private readonly IFuncionarioRepository _repo;

    public FuncionariosController(IFuncionarioRepository repo) => _repo = repo;

    // GET /Funcionarios
    public async Task<IActionResult> Index()
        => View(await _repo.GetAllAsync());

    // GET /Funcionarios/Buscar?id=xxx
    [HttpGet]
    public async Task<IActionResult> Buscar(string id)
    {
        var f = await _repo.GetByIdAsync(id);
        if (f is null) return NotFound();
        return Json(f);
    }

    // POST /Funcionarios/Criar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Criar(Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);
        await _repo.CreateAsync(funcionario);
        return RedirectToAction(nameof(Index));
    }

    // POST /Funcionarios/Editar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Editar(string id, Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return RedirectToAction(nameof(Index));

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        if (funcionario.SenhaHash != existente.SenhaHash)
            funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);

        funcionario.Id = id;
        await _repo.UpdateAsync(id, funcionario);
        return RedirectToAction(nameof(Index));
    }

    // POST /Funcionarios/Deletar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Deletar(string id)
    {
        await _repo.DeleteAsync(id);
        return RedirectToAction(nameof(Index));
    }
}
