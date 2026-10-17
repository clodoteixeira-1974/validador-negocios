// Leitura e escrita de arquivos JSON Lines (um objeto JSON por linha).
//
// Este módulo existe para que validações.jsonl e evidencias.jsonl se comportem
// igual: uma linha corrompida é ignorada, gera aviso, e a leitura das demais
// linhas continua. Antes, cada arquivo tinha um comportamento próprio — um
// lançava exceção e derrubava as rotas, o outro pulava a linha em silêncio — e a
// diferença não tinha teste.
//
// Regra única, aplicada por lerJsonl:
//   linha vazia        -> ignorada, sem aviso
//   linha válida       -> entra no resultado
//   linha inválida     -> ignorada, com o número da linha registrado no aviso
//
// O aviso registra o NÚMERO da linha, nunca o conteúdo. Uma linha corrompida
// costuma conter lixo ou dado parcial, e não é lugar para vazar em log.

const fs = require('node:fs');

/**
 * Lê um arquivo JSON Lines.
 *
 * @param {string} arquivo caminho do arquivo; pode não existir
 * @returns {{ registros: object[], linhasIgnoradas: number[] }}
 *          registros válidos, na ordem do arquivo, e os números das linhas
 *          que não puderam ser interpretadas
 */
function lerJsonl(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return { registros: [], linhasIgnoradas: [] };
  }

  const conteudo = fs.readFileSync(arquivo, 'utf8');
  const registros = [];
  const linhasIgnoradas = [];
  const linhas = conteudo.split('\n');

  for (let indice = 0; indice < linhas.length; indice++) {
    const linha = linhas[indice];

    if (linha.trim() === '') {
      continue;
    }

    try {
      registros.push(JSON.parse(linha));
    } catch (erro) {
      linhasIgnoradas.push(indice + 1);
    }
  }

  return { registros, linhasIgnoradas };
}

/**
 * Acrescenta um registro ao final de um arquivo JSON Lines.
 *
 * @param {string} arquivo caminho do arquivo
 * @param {object} registro objeto a serializar
 */
function escreverJsonl(arquivo, registro) {
  fs.appendFileSync(arquivo, JSON.stringify(registro) + '\n', 'utf8');
}

/**
 * Avisa sobre linhas ignoradas. Só fala quando houve alguma, para não poluir a
 * saída de um servidor saudável.
 *
 * @param {string} arquivo caminho, usado só na mensagem
 * @param {number[]} linhasIgnoradas números das linhas
 */
function avisarLinhasIgnoradas(arquivo, linhasIgnoradas) {
  if (!Array.isArray(linhasIgnoradas) || linhasIgnoradas.length === 0) {
    return;
  }

  const lista = linhasIgnoradas.slice(0, 20).join(', ');

  console.warn(
    `[jsonl] ${linhasIgnoradas.length} linha(s) ignorada(s) em ${arquivo} por JSON invalido: ${lista}`
    + (linhasIgnoradas.length > 20 ? ' ...' : '')
  );
}

module.exports = {
  lerJsonl,
  escreverJsonl,
  avisarLinhasIgnoradas
};
