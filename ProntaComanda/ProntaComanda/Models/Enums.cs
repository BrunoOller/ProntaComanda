namespace ProntaComanda.Models;

/// <summary>
/// Função/cargo do usuário no sistema.
/// Determina o nível de acesso (RF13).
/// </summary>
public enum FuncaoUsuario
{
    Garcom,
    Cozinheiro,
    Gerente,
    Administrador,
    Desenvolvedor
}

/// <summary>
/// Especialidade culinária — aplicável apenas a Cozinheiros.
/// </summary>
public enum EspecialidadeCozinha
{
    NA,
    Chapeiro,
    Confeiteiro,
    Sushiman
}

/// <summary>
/// Status de disponibilidade de um produto no cardápio (RF2).
/// </summary>
public enum Disponibilidade
{
    Disponivel,
    Indisponivel,
    Esgotado
}

/// <summary>
/// Estágio de um pedido no fluxo de produção (RF9).
/// </summary>
public enum StatusPedido
{
    Pendente,
    EmPreparo,
    Pronto,
    Entregue,
    Cancelado
}

/// <summary>
/// Tipo de desconto aplicável a uma mesa (RF12).
/// </summary>
public enum TipoDesconto
{
    Valor,       // valor fixo em reais
    Percentual,  // percentual sobre o subtotal
    Cortesia     // 100% do subtotal — zera a conta
}

/// <summary>
/// Dias da semana para regras de Happy Hour.
/// </summary>
public enum DiaSemana
{
    Domingo = 0,
    Segunda = 1,
    Terca = 2,
    Quarta = 3,
    Quinta = 4,
    Sexta = 5,
    Sabado = 6
}