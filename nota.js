// Cálculo da nota de viabilidade, um critério por vez.
// Módulo puro: não lê disco, não usa rede e não depende de nada externo.
// Recebe um array de evidências (o mesmo formato devolvido por
// listarEvidencias) e devolve a nota como objeto.

// Primeiro critério da régua: "tem gente?".
// Conta as evidências do tipo "concorrente". Com 2 ou mais, o ponto é atribuído.
// Este é um critério geral: conta todos os concorrentes registrados, sem filtrar
// por ideia e sem considerar o campo "relevancia".
const MINIMO_CONCORRENTES = 2;
const PONTOS_TEM_GENTE = 1;

// Monta o texto do campo "detalhe" do critério.
function detalharTemGente(total) {
  if (total === 0) {
    return `Nenhum concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`;
  }

  if (total === 1) {
    return `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`;
  }

  return `${total} concorrentes registrados`;
}

// Avalia um único critério e devolve { pontos, detalhe }.
function avaliarTemGente(evidencias) {
  const concorrentes = evidencias.filter((evidencia) => evidencia && evidencia.tipo === 'concorrente').length;
  const pontos = concorrentes >= MINIMO_CONCORRENTES ? PONTOS_TEM_GENTE : 0;

  return { pontos, detalhe: detalharTemGente(concorrentes) };
}

// Calcula a nota completa. Por enquanto, apenas o critério "tem_gente".
function calcularNota(evidencias) {
  const lista = Array.isArray(evidencias) ? evidencias : [];

  const temGente = avaliarTemGente(lista);

  return {
    criterios: {
      tem_gente: temGente
    },
    total: temGente.pontos,
    maximo_possivel: PONTOS_TEM_GENTE
  };
}

module.exports = {
  calcularNota,
  MINIMO_CONCORRENTES,
  PONTOS_TEM_GENTE
};