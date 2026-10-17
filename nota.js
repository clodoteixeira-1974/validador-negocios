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

// Critério 3 da régua: "cabe mais um?".
// Diferente dos outros dois, este tem mínimo E máximo: o mercado precisa ter
// concorrentes suficientes para provar que existe demanda, mas não tanto a
// ponto de estar saturado. A faixa que vale ponto é de 2 a 4 concorrentes.
const MINIMO_CONCORRENTES_CABE_MAIS_UM = 2;
const MAXIMO_CONCORRENTES_CABE_MAIS_UM = 4;
const PONTOS_CABE_MAIS_UM = 1;

// Critério 4 da régua: "alguém paga?".
// Conta as evidências do tipo "monetizacao", que mostram que alguém já paga
// por um serviço parecido. Basta uma para o ponto ser atribuído.
const MINIMO_MONETIZACOES = 1;
const PONTOS_ALGUEM_PAGA = 1;

// Critério 5 da régua: "você alcança essas pessoas?".
// Conta as evidências do tipo "alcance", que mostram um caminho para chegar ao
// público-alvo. Basta uma para o ponto ser atribuído.
const MINIMO_ALCANCE = 1;
const PONTOS_ALCANCE = 1;

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

// Monta o texto do campo "detalhe" do critério "cabe_mais_um".
function detalharCabeMaisUm(total) {
  if (total === 0) {
    return 'Nenhum concorrente registrado. Mercado vazio.';
  }

  if (total === 1) {
    return '1 concorrente registrado. Mercado pequeno.';
  }

  const situacao = total <= MAXIMO_CONCORRENTES_CABE_MAIS_UM
    ? 'Ha espaco para mais um.'
    : 'Mercado saturado.';

  return `${total} concorrentes registrados. ${situacao}`;
}

// Monta o texto do campo "detalhe" do critério "alguem_paga".
function detalharAlguemPaga(total) {
  if (total === 0) {
    return 'Nenhuma evidencia de monetizacao registrada.';
  }

  if (total === 1) {
    return '1 evidencia de monetizacao registrada.';
  }

  return `${total} evidencias de monetizacao registradas.`;
}

// Monta o texto do campo "detalhe" do critério "alcance".
function detalharAlcance(total) {
  if (total === 0) {
    return 'Nenhuma evidencia de alcance registrada.';
  }

  if (total === 1) {
    return '1 evidencia de alcance registrada.';
  }

  return `${total} evidencias de alcance registradas.`;
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

// Avalia o critério "cabe mais um?".
// Não usa avaliarContagem: este critério tem mínimo E máximo, e a função
// genérica só sabe lidar com um mínimo. O formato devolvido é o mesmo dos
// outros, com pontos, maximo e detalhe.
function avaliarCabeMaisUm(evidencias) {
  const encontrados = contarDoTipo(evidencias, 'concorrente');

  const dentroDaFaixa = encontrados >= MINIMO_CONCORRENTES_CABE_MAIS_UM
    && encontrados <= MAXIMO_CONCORRENTES_CABE_MAIS_UM;

  return {
    pontos: dentroDaFaixa ? PONTOS_CABE_MAIS_UM : 0,
    maximo: PONTOS_CABE_MAIS_UM,
    detalhe: detalharCabeMaisUm(encontrados)
  };
}

// Avalia o critério "alguém paga?".
// Cabe em avaliarContagem: é uma contagem com mínimo, sem máximo.
function avaliarAlguemPaga(evidencias) {
  return avaliarContagem(
    evidencias,
    'monetizacao',
    MINIMO_MONETIZACOES,
    PONTOS_ALGUEM_PAGA,
    detalharAlguemPaga
  );
}

// Avalia o critério "você alcança essas pessoas?".
// Cabe em avaliarContagem: é uma contagem com mínimo, sem máximo.
function avaliarAlcance(evidencias) {
  return avaliarContagem(
    evidencias,
    'alcance',
    MINIMO_ALCANCE,
    PONTOS_ALCANCE,
    detalharAlcance
  );
}

// Lista os critérios implementados, na ordem da régua. Para acrescentar um
// critério novo, basta declarar a função avaliadora e incluí-la aqui.
const CRITERIOS = [
  { nome: 'tem_gente', avaliar: avaliarTemGente },
  { nome: 'tem_gente_insatisfeita', avaliar: avaliarTemGenteInsatisfeita },
  { nome: 'cabe_mais_um', avaliar: avaliarCabeMaisUm },
  { nome: 'alguem_paga', avaliar: avaliarAlguemPaga },
  { nome: 'alcance', avaliar: avaliarAlcance }
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
  PONTOS_TEM_GENTE_INSATISFEITA,
  MINIMO_CONCORRENTES_CABE_MAIS_UM,
  MAXIMO_CONCORRENTES_CABE_MAIS_UM,
  PONTOS_CABE_MAIS_UM,
  MINIMO_MONETIZACOES,
  PONTOS_ALGUEM_PAGA,
  MINIMO_ALCANCE,
  PONTOS_ALCANCE
};