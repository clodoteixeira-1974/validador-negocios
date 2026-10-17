// Cálculo da nota de viabilidade, um critério por vez.
// Módulo puro: não lê disco, não usa rede e não depende de nada externo.
// Recebe um array de evidências (o mesmo formato devolvido por
// listarEvidencias) e devolve a nota como objeto.
//
// Cada critério devolve tres coisas: os pontos que concedeu, o maximo de pontos
// que poderia conceder e o texto explicando como chegou ao resultado. O total e
// a soma dos pontos de todos os criterios, e o maximo_possivel e a soma dos
// maximos. Assim, acrescentar um criterio novo nao exige mudar a forma da nota.

// Critério 1 da régua: "tem gente?".
// Conta as evidências do tipo "concorrente". Com 2 ou mais, o ponto é atribuído.
// Critério geral: conta todos os concorrentes registrados, sem filtrar por
// ideia e sem considerar o campo "relevancia".
const MINIMO_CONCORRENTES = 2;
const PONTOS_TEM_GENTE = 1;

// Critério 2 da régua: "tem gente insatisfeita?".
// Basta uma reclamação registrada para o ponto ser atribuído.
// Também é um critério geral e ignora o campo "relevancia".
const MINIMO_RECLAMACOES = 1;
const PONTOS_TEM_GENTE_INSATISFEITA = 1;

// Monta o texto do campo "detalhe" do critério "tem_gente".
function detalharTemGente(total) {
  if (total === 0) {
    return `Nenhum concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`;
  }

  if (total === 1) {
    return `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`;
  }

  return `${total} concorrentes registrados`;
}

// Monta o texto do campo "detalhe" do critério "tem_gente_insatisfeita".
function detalharReclamacoes(total) {
  if (total === 0) {
    return 'Nenhuma reclamacao registrada.';
  }

  if (total === 1) {
    return '1 reclamacao registrada';
  }

  return `${total} reclamacoes registradas`;
}

// Conta as evidências de um tipo, ignorando entradas nulas ou sem tipo.
function contarDoTipo(evidencias, tipo) {
  return evidencias.filter((evidencia) => evidencia && evidencia.tipo === tipo).length;
}

// Avalia um único critério: quantos do tipo pedido existem, e o que isso vale.
function avaliarContagem(evidencias, tipo, minimo, pontosConcedidos, detalhe) {
  const encontrados = contarDoTipo(evidencias, tipo);
  const pontos = encontrados >= minimo ? pontosConcedidos : 0;

  return {
    pontos,
    maximo: pontosConcedidos,
    detalhe: detalhe(encontrados)
  };
}

// Avalia o critério "tem gente?".
function avaliarTemGente(evidencias) {
  return avaliarContagem(
    evidencias,
    'concorrente',
    MINIMO_CONCORRENTES,
    PONTOS_TEM_GENTE,
    detalharTemGente
  );
}

// Avalia o critério "tem gente insatisfeita?".
function avaliarTemGenteInsatisfeita(evidencias) {
  return avaliarContagem(
    evidencias,
    'reclamacao',
    MINIMO_RECLAMACOES,
    PONTOS_TEM_GENTE_INSATISFEITA,
    detalharReclamacoes
  );
}

// Lista os critérios implementados, na ordem da régua. Para acrescentar um
// critério novo, basta declarar a função avaliadora e incluí-la aqui.
const CRITERIOS = [
  { nome: 'tem_gente', avaliar: avaliarTemGente },
  { nome: 'tem_gente_insatisfeita', avaliar: avaliarTemGenteInsatisfeita }
];

// Calcula a nota completa.
function calcularNota(evidencias) {
  const lista = Array.isArray(evidencias) ? evidencias : [];

  const criterios = {};
  let total = 0;
  let maximoPossivel = 0;

  for (const criterio of CRITERIOS) {
    const resultado = criterio.avaliar(lista);

    criterios[criterio.nome] = resultado;
    total += resultado.pontos;
    maximoPossivel += resultado.maximo;
  }

  return {
    criterios,
    total,
    maximo_possivel: maximoPossivel
  };
}

module.exports = {
  calcularNota,
  MINIMO_CONCORRENTES,
  PONTOS_TEM_GENTE,
  MINIMO_RECLAMACOES,
  PONTOS_TEM_GENTE_INSATISFEITA
};