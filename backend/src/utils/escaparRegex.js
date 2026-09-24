/** Escapa caracteres especiais para usar texto do usuário dentro de um RegExp/$regex. */
module.exports = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
