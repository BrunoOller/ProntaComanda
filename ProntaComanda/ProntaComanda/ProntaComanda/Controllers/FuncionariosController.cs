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
    public async Task<IActionResult> Criar([FromBody] CriarFuncionarioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || string.IsNullOrWhiteSpace(request.SenhaHash))
            return BadRequest(new { mensagem = "Nome e senha são obrigatórios." });

        var funcionario = new Funcionario
        {
            Nome = request.Nome,
            Funcao = Enum.Parse<FuncaoUsuario>(request.Funcao),
            Especialidade = Enum.Parse<EspecialidadeCozinha>(request.Especialidade),
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.SenhaHash)
        };

        await _repo.CreateAsync(funcionario);
        return Ok();
    }

    // POST /Funcionarios/Editar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Editar([FromBody] EditarFuncionarioRequest request)
    {
        var existente = await _repo.GetByIdAsync(request.FuncionarioId);
        if (existente is null) return NotFound();

        existente.Nome = request.Funcionario.Nome;
        existente.Funcao = Enum.Parse<FuncaoUsuario>(request.Funcionario.Funcao);
        existente.Especialidade = Enum.Parse<EspecialidadeCozinha>(request.Funcionario.Especialidade);

        if (!string.IsNullOrWhiteSpace(request.Funcionario.SenhaHash))
            existente.SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.Funcionario.SenhaHash);
        // se senha vazia, mantém o hash existente

        await _repo.UpdateAsync(request.FuncionarioId, existente);
        return Ok();
    }

    // POST /Funcionarios/Deletar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Deletar([FromBody] DeletarFuncionarioRequest request)
    {
        await _repo.DeleteAsync(request.Id);
        return Ok();
    }
}

// ── Request records ──────────────────────────────────────────────────────────
public record CriarFuncionarioRequest(string Nome, string Funcao, string Especialidade, string SenhaHash);
public record FuncionarioEditData(string Nome, string Funcao, string Especialidade, string SenhaHash);
public record EditarFuncionarioRequest(string FuncionarioId, FuncionarioEditData Funcionario);
public record DeletarFuncionarioRequest(string Id);