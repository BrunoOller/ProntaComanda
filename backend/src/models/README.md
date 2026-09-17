# Modelagem MongoDB — Pronta Comanda

## Coleções

| Coleção | Cobre |
|---|---|
| `Funcionario` | RF01 (RBAC), RF02, RNF07 |
| `Categoria` | RF03 |
| `Produto` | RF03, RF22 |
| `ObservacaoFrequente` | RF21 |
| `Mesa` | RF04 |
| `Comanda` (com `itens` embutidos) | RF05–RF09, RF23–RF26 |
| `Pagamento` | RF11, RF12 |
| `Insumo` / `MovimentacaoEstoque` | RF10, RF22 |
| `ResumoMensal` | RF14–RF16, RF17 |
| `LogAuditoria` | RF08, RNF10 |

## Decisões principais

1. **Itens embutidos na Comanda, não em coleção própria.** KDS, fechamento
   de mesa e espelho de consumo sempre leem/escrevem a comanda inteira, e o
   volume por comanda é pequeno. Embutir evita `populate`/joins no caminho
   mais quente do sistema (RNF09: resposta < 1s).

2. **Snapshot de preço e nome no item.** `nomeProduto` e `precoUnitario` são
   copiados do Produto no momento do lançamento, para que uma edição futura
   no cardápio não altere o valor de comandas/pedidos já fechados
   (necessário para o RF14 — consolidação mensal fiel ao que foi vendido).

3. **Soft delete (RNF11) via campo `ativo`/`estornado`** em vez de remover
   documentos: `Funcionario`, `Categoria`, `Produto`, `Mesa`, `Insumo` usam
   `ativo`; `ItemComanda` e `Pagamento` usam `estornado`. Nada é apagado
   fisicamente até o expurgo mensal (RF15), que atua apenas sobre dados já
   consolidados no `ResumoMensal`.

4. **Uma Mesa pode ter várias Comandas abertas simultaneamente** (visto no
   design: "Comanda #001", "Comanda #002" na mesma mesa) — por isso
   `Comanda.mesa` é uma referência N:1, e não o contrário.

5. **RBAC no campo `Funcionario.perfil`.** Este documento não define os
   middlewares de autorização (isso é código de rota, não de schema), mas
   todo model foi desenhado para que cada ação sensível (desconto, estorno,
   ajuste de estoque, reabertura) grave `quem fez` — dado que o middleware
   de RBAC vai exigir e a auditoria (RF08/RNF10) vai consumir.

6. **`ResumoMensal` é a única coleção pensada para crescer indefinidamente
   sem expurgo** — é justamente o resultado do rollup do RF14, então os
   dados detalhados (Comanda/Pagamento) do mês fechado podem ser apagados
   com segurança (RF15) depois que o resumo for salvo.

## Próximos passos sugeridos
- Middleware de autorização por `perfil` (RF01) lendo o JWT.
- Job `node-cron` de virada de mês (RF14/RF15/RF16), rodando às 00:05 do
  dia 1, dentro de uma transação Mongo (rollup → confirma → expurga).
- Hook `post-save` em `ItemComanda.observacao` para popular
  `ObservacaoFrequente` via upsert `$inc`.
- Índice TTL ou job de arquivamento para `LogAuditoria` se o volume crescer
  muito (fora do escopo dos RFs, mas comum em produção).
