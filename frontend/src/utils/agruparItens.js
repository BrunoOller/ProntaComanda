const normalizar = (texto) => (texto ?? '').toString().trim().toLowerCase();

/**
 * Empilha (soma) itens iguais para EXIBIÇÃO: "1x Hamburguer" + "1x Hamburguer"
 * viram "2x Hamburguer". Dois itens só empilham se forem o mesmo produto, com a
 * mesma observação, o mesmo preço e o mesmo "estado" (ex.: status no KDS), para
 * nunca misturar um item já entregue com um que ainda está na fila.
 *
 * Importante: isto NÃO altera os dados nem o que é salvo; cada lançamento
 * continua existindo separado (é ele que o caixa estorna). Em `itens` do grupo
 * ficam os lançamentos originais, em ordem.
 *
 * @param itens   lista de itens da comanda
 * @param estadoDe função que devolve o "estado" do item para a chave (padrão: nenhum)
 */
export function agruparItens(itens, estadoDe = () => '') {
  const grupos = new Map();

  for (const item of itens) {
    const chave = [
      item.produto ?? normalizar(item.nomeProduto),
      normalizar(item.observacao),
      item.precoUnitario ?? '',
      estadoDe(item),
    ].join('|');

    const existente = grupos.get(chave);
    if (existente) {
      existente.quantidade += item.quantidade;
      existente.itens.push(item);
    } else {
      grupos.set(chave, { ...item, chave, quantidade: item.quantidade, itens: [item] });
    }
  }

  return [...grupos.values()];
}
