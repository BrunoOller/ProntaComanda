using Microsoft.AspNetCore.Mvc;
using ProntaComanda.Models;
using ProntaComanda.Repositories.Interfaces;

namespace ProntaComanda.Controllers;

public class ProdutosController : Controller
{
    private readonly IProdutoRepository _repo;
    private readonly IWebHostEnvironment _env;

    public ProdutosController(IProdutoRepository repo, IWebHostEnvironment env)
    {
        _repo = repo;
        _env = env;
    }

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
    public async Task<IActionResult> Criar([FromForm] Produto produto, IFormFile? ImagemUpload)
    {
        if (!ModelState.IsValid)
        {
            // Captura exatamente quais campos falharam na validação
            var erros = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            return BadRequest(new { success = false, message = "Dados inválidos.", errors = erros });
        }

        if (ImagemUpload != null && ImagemUpload.Length > 0)
        {
            string uploadsFolder = Path.Combine(_env.WebRootPath, "img", "produtos");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            string uniqueFileName = Guid.NewGuid().ToString() + "_" + ImagemUpload.FileName;
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await ImagemUpload.CopyToAsync(stream);
            }

            produto.ImagemUrl = $"/img/produtos/{uniqueFileName}";
        }

        await _repo.CreateAsync(produto);
        TempData["Sucesso"] = $"Produto \"{produto.Nome}\" adicionado!";
        return Ok(new { success = true });
    }

    // POST /Produtos/Editar
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Editar([FromForm] Produto produto, IFormFile? ImagemUpload)
    {
        // Se o Id vier como a string "undefined" ou nulo, o banco vai quebrar (Erro 500)
        if (string.IsNullOrEmpty(produto.Id) || produto.Id == "undefined")
            return BadRequest(new { success = false, message = "O ID do produto não foi enviado ou é inválido." });

        if (!ModelState.IsValid)
        {
            var erros = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            return BadRequest(new { success = false, message = "Dados inválidos.", errors = erros });
        }

        try
        {
            var existente = await _repo.GetByIdAsync(produto.Id);
            if (existente is null)
                return NotFound(new { success = false, message = "Produto não encontrado." });

            if (ImagemUpload != null && ImagemUpload.Length > 0)
            {
                string uploadsFolder = Path.Combine(_env.WebRootPath, "img", "produtos");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                string uniqueFileName = Guid.NewGuid().ToString() + "_" + ImagemUpload.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await ImagemUpload.CopyToAsync(stream);
                }

                produto.ImagemUrl = $"/img/produtos/{uniqueFileName}";
            }
            else
            {
                produto.ImagemUrl = existente.ImagemUrl;
            }

            await _repo.UpdateAsync(produto.Id, produto);
            TempData["Sucesso"] = $"Produto \"{produto.Nome}\" atualizado!";
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            // Se der erro no banco (MongoDB), vai cair aqui em vez de quebrar o sistema
            return StatusCode(500, new { success = false, message = "Erro interno no banco de dados.", detalhe = ex.Message });
        }
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