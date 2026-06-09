using ProntaComanda.Data;
using ProntaComanda.Repositories.Implementations;
using ProntaComanda.Repositories.Interfaces;
using ProntaComanda.Settings;

var builder = WebApplication.CreateBuilder(args);

// ── Settings ─────────────────────────────────────────────────────────────────
var mongoSettings = builder.Configuration
    .GetSection("MongoDbSettings")
    .Get<MongoDbSettings>()
    ?? throw new InvalidOperationException(
        "MongoDbSettings não encontrado no appsettings.json.");

builder.Services.AddSingleton(mongoSettings);

// ── MongoDB Context ───────────────────────────────────────────────────────────
builder.Services.AddSingleton<MongoDbContext>();

// ── Repositories ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<IFuncionarioRepository, FuncionarioRepository>();
builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();
builder.Services.AddScoped<IMesaRepository, MesaRepository>();
builder.Services.AddScoped<IPedidoRepository, PedidoRepository>();
builder.Services.AddScoped<IRelatorioRepository, RelatorioRepository>();

// ── MVC ───────────────────────────────────────────────────────────────────────
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// ════════════════════════════════════════════════════════════════════════════
var app = builder.Build();
// ════════════════════════════════════════════════════════════════════════════

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Produtos}/{action=Index}/{id?}");

app.Run();