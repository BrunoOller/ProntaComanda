/**
 * Utilitários de CPF.
 * O CPF é sempre armazenado e comparado SOMENTE com dígitos (11 caracteres),
 * assim "123.456.789-09" e "12345678909" representam o mesmo funcionário.
 */
function normalizarCpf(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function calcularDigito(base) {
  const soma = base
    .split('')
    .reduce((acc, digito, i) => acc + Number(digito) * (base.length + 1 - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** Valida tamanho, sequências repetidas (111.111.111-11) e dígitos verificadores. */
function validarCpf(valor) {
  const cpf = normalizarCpf(valor);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const d1 = calcularDigito(cpf.slice(0, 9));
  const d2 = calcularDigito(cpf.slice(0, 10));

  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

module.exports = { normalizarCpf, validarCpf };
