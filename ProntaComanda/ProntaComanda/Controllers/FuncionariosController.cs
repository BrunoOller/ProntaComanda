using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

/// <summary>
/// Gerencia os funcionários do restaurante (RF13).
/// Base: /api/funcionarios
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class FuncionariosController : ControllerBase
{
    private readonly IFuncionarioRepository _repo;

    public FuncionariosController(IFuncionarioRepository repo)
    {
        _repo = repo;
    }

    // ── GET /api/funcionarios ────────────────────────────────────────────
    /// <summary>Retorna todos os funcionários ordenados por nome.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Funcionario>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll() =>
        Ok(await _repo.GetAllAsync());

    // ── GET /api/funcionarios/funcao/{funcao} ────────────────────────────
    /// <summary>Retorna funcionários filtrados por função.</summary>
    [HttpGet("funcao/{funcao}")]
    [ProducesResponseType(typeof(List<Funcionario>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByFuncao(FuncaoUsuario funcao) =>
        Ok(await _repo.GetByFuncaoAsync(funcao));

    // ── GET /api/funcionarios/{id} ───────────────────────────────────────
    /// <summary>Retorna um funcionário pelo Id.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Funcionario), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        var funcionario = await _repo.GetByIdAsync(id);
        return funcionario is null ? NotFound() : Ok(funcionario);
    }

    // ── POST /api/funcionarios ───────────────────────────────────────────
    /// <summary>Cria um novo funcionário.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(Funcionario), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Hash da senha antes de persistir — nunca salvar em texto puro
        funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);

        await _repo.CreateAsync(funcionario);

        return CreatedAtAction(nameof(GetById), new { id = funcionario.Id }, funcionario);
    }

    // ── PUT /api/funcionarios/{id} ───────────────────────────────────────
    /// <summary>Atualiza um funcionário existente.</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] Funcionario funcionario)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existente = await _repo.GetByIdAsync(id);
        if (existente is null) return NotFound();

        // Só refaz o hash se a senha foi alterada (diferente do hash atual)
        if (funcionario.SenhaHash != existente.SenhaHash)
            funcionario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(funcionario.SenhaHash);

        funcionario.Id = id;
        await _repo.UpdateAsync(id, funcionario);

        return NoContent();
    }

    // ── DELETE /api/funcionarios/{id} ────────────────────────────────────
    /// <summary>Remove um funcionário pelo Id.</summary>
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