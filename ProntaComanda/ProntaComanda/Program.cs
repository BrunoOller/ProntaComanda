using ProntaComanda.Data;
using ProntaComanda.Repositories.Implementations;
using ProntaComanda.Repositories.Interfaces;
using ProntaComanda.Settings;

var builder = WebApplication.CreateBuilder(args);

// ── Settings ────────────────────────────────────────────────────────────────
// Lê a seção "MongoDbSettings" do appsettings.json e injeta como singleton
var mongoSettings = builder.Configuration
    .GetSection("MongoDbSettings")
    .Get<MongoDbSettings>()
    ?? throw new InvalidOperationException(
        "MongoDbSettings não encontrado no appsettings.json.");

builder.Services.AddSingleton(mongoSettings);

// ── MongoDB Context ──────────────────────────────────────────────────────────
// Singleton — uma conexão compartilhada por toda a aplicação (padrão recomendado)
builder.Services.AddSingleton<MongoDbContext>();

// ── Repositories ─────────────────────────────────────────────────────────────
// Scoped — uma instância por requisição HTTP
builder.Services.AddScoped<IFuncionarioRepository, FuncionarioRepository>();
builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();
builder.Services.AddScoped<IMesaRepository, MesaRepository>();
builder.Services.AddScoped<IPedidoRepository, PedidoRepository>();
builder.Services.AddScoped<IRelatorioRepository, RelatorioRepository>();

// ── Controllers ─────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serializa enums como string na API (ex: "Disponivel" em vez de 0)
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());

        // Mantém camelCase nas respostas JSON
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// ── CORS ─────────────────────────────────────────────────────────────────────
// Permite o front-end (VS Code / Live Server) chamar a API
var corsOrigins = builder.Configuration
    .GetSection("Cors:Origins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontEndPolicy", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ── Swagger ──────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "ProntaComanda API",
        Version = "v1",
        Description = "API REST do sistema administrativo para restaurantes."
    });
});

// ════════════════════════════════════════════════════════════════════════════
var app = builder.Build();
// ════════════════════════════════════════════════════════════════════════════

// ── Pipeline ─────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ProntaComanda API v1");
        c.RoutePrefix = "swagger"; // acessa em /swagger
    });
}

app.UseHttpsRedirection();

// CORS deve vir antes de MapControllers
app.UseCors("FrontEndPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();