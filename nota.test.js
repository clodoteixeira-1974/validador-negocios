const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularNota,
  MINIMO_CONCORRENTES,
  MINIMO_RECLAMACOES,
  MINIMO_CONCORRENTES_CABE_MAIS_UM,
  MAXIMO_CONCORRENTES_CABE_MAIS_UM,
  PONTOS_CABE_MAIS_UM
} = require('./nota');

// Testes unitários puros: nenhuma leitura de disco, nenhuma requisição HTTP.
// Só a função calcularNota é exercitada.

// Espelho em teste do texto que detalharCabeMaisUm deve produzir. Existe para
// que o detalhe esperado não dependa da própria função testada.
function detalharCabeMaisUmEsperado(total) {
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

// Evidência mínima, no mesmo formato devolvido por listarEvidencias.
function evidencia(tipo, extras = {}) {
  return Object.assign({
    id: `id-${tipo}`,
    tipo,
    fonte: 'Fonte de teste',
    url: '',
    trecho_bruto: 'Trecho de teste.',
    ideia_relacionada: 'App para controlar gastos',
    timestamp: '2026-10-16T12:00:00.000Z',
    relevancia: 'alta'
  }, extras);
}

test('array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado', () => {
  const nota = calcularNota([]);

  assert.equal(nota.criterios.tem_gente.pontos, 0);
  assert.equal(nota.criterios.tem_gente.maximo, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, 'Nenhum concorrente registrado. Minimo: 2.');
  assert.equal(nota.total, 0);
  assert.equal(nota.maximo_possivel, 3);
});

test('1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2', () => {
  const nota = calcularNota([evidencia('concorrente')]);

  assert.equal(nota.criterios.tem_gente.pontos, 0);
  assert.equal(nota.criterios.tem_gente.maximo, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`);
  assert.equal(nota.total, 0);
});

test('2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' })
  ]);

  assert.equal(nota.criterios.tem_gente.pontos, 1);
  assert.equal(nota.criterios.tem_gente.maximo, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, '2 concorrentes registrados');

  // Sem reclamações, pontuam o primeiro e o terceiro critério.
  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 0);
  assert.equal(nota.criterios.cabe_mais_um.pontos, 1);
  assert.equal(nota.total, 2);
  assert.equal(nota.maximo_possivel, 3);
});

test('3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' }),
    evidencia('concorrente', { id: 'c3' })
  ]);

  assert.equal(nota.criterios.tem_gente.pontos, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, '3 concorrentes registrados');
  assert.equal(nota.criterios.cabe_mais_um.pontos, 1);
  assert.equal(nota.total, 2);
  assert.equal(nota.maximo_possivel, 3);
});

test('reclamacao e dado_mercado não contam como concorrente', () => {
  const semConcorrentes = calcularNota([
    evidencia('reclamacao'),
    evidencia('dado_mercado'),
    evidencia('reclamacao')
  ]);

  assert.equal(semConcorrentes.criterios.tem_gente.pontos, 0);
  assert.equal(semConcorrentes.criterios.tem_gente.detalhe, 'Nenhum concorrente registrado. Minimo: 2.');

  // Só 1 concorrente misturado a outros tipos ainda não atinge o mínimo.
  const comUmConcorrente = calcularNota([
    evidencia('concorrente'),
    evidencia('dado_mercado')
  ]);

  assert.equal(comUmConcorrente.criterios.tem_gente.pontos, 0);
  assert.equal(comUmConcorrente.criterios.tem_gente.detalhe, `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`);

  // 2 concorrentes misturados a outros tipos atingem o mínimo.
  const comDoisConcorrentes = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('dado_mercado'),
    evidencia('concorrente', { id: 'c2' })
  ]);

  assert.equal(comDoisConcorrentes.criterios.tem_gente.pontos, 1);
  assert.equal(comDoisConcorrentes.criterios.cabe_mais_um.pontos, 1);
  assert.equal(comDoisConcorrentes.total, 2);
});

test('0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' })
  ]);

  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 0);
  assert.equal(nota.criterios.tem_gente_insatisfeita.maximo, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, 'Nenhuma reclamacao registrada.');
  assert.equal(nota.criterios.cabe_mais_um.pontos, 1);
  assert.equal(nota.total, 2);
  assert.equal(nota.maximo_possivel, 3);
});

test('1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido', () => {
  const nota = calcularNota([evidencia('reclamacao')]);

  assert.equal(MINIMO_RECLAMACOES, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.maximo, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, '1 reclamacao registrada');
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 3);
});

test('3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem', () => {
  const nota = calcularNota([
    evidencia('reclamacao', { id: 'r1' }),
    evidencia('reclamacao', { id: 'r2' }),
    evidencia('reclamacao', { id: 'r3' })
  ]);

  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, '3 reclamacoes registradas');
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 3);
});

test('cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes', () => {
  const faixas = [
    { concorrentes: 0, pontos: 0 },
    { concorrentes: 1, pontos: 0 },
    { concorrentes: 2, pontos: 1 },
    { concorrentes: 3, pontos: 1 },
    { concorrentes: 4, pontos: 1 },
    { concorrentes: 5, pontos: 0 },
    { concorrentes: 10, pontos: 0 }
  ];

  for (const faixa of faixas) {
    const evidencias = [];
    for (let i = 0; i < faixa.concorrentes; i++) {
      evidencias.push(evidencia('concorrente', { id: `c${i}` }));
    }

    const nota = calcularNota(evidencias);

    assert.equal(nota.criterios.cabe_mais_um.pontos, faixa.pontos, `${faixa.concorrentes} concorrentes`);
    assert.equal(nota.criterios.cabe_mais_um.maximo, 1);
    assert.equal(
      nota.criterios.cabe_mais_um.detalhe,
      detalharCabeMaisUmEsperado(faixa.concorrentes),
      `${faixa.concorrentes} concorrentes`
    );
  }
});

test('cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado', () => {
  const detalhes = [
    { concorrentes: 0, esperado: 'Nenhum concorrente registrado. Mercado vazio.' },
    { concorrentes: 1, esperado: '1 concorrente registrado. Mercado pequeno.' },
    { concorrentes: 2, esperado: '2 concorrentes registrados. Ha espaco para mais um.' },
    { concorrentes: 3, esperado: '3 concorrentes registrados. Ha espaco para mais um.' },
    { concorrentes: 4, esperado: '4 concorrentes registrados. Ha espaco para mais um.' },
    { concorrentes: 5, esperado: '5 concorrentes registrados. Mercado saturado.' },
    { concorrentes: 9, esperado: '9 concorrentes registrados. Mercado saturado.' }
  ];

  for (const detalhe of detalhes) {
    const evidencias = [];
    for (let i = 0; i < detalhe.concorrentes; i++) {
      evidencias.push(evidencia('concorrente', { id: `c${i}` }));
    }

    const nota = calcularNota(evidencias);

    assert.equal(nota.criterios.cabe_mais_um.detalhe, detalhe.esperado);
  }
});

test('cabe_mais_um e os limites declarados: 2 a 4 concorrentes', () => {
  assert.equal(MINIMO_CONCORRENTES_CABE_MAIS_UM, 2);
  assert.equal(MAXIMO_CONCORRENTES_CABE_MAIS_UM, 4);
  assert.equal(PONTOS_CABE_MAIS_UM, 1);
});

test('o total e a soma dos criterios e o maximo_possivel e a soma dos maximos', () => {
  const casos = [
    {
      nome: '2 concorrentes + 1 reclamacao',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('reclamacao', { id: 'r1' })
      ],
      total: 3
    },
    {
      nome: '2 concorrentes + 0 reclamacoes',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' })
      ],
      total: 2
    },
    {
      nome: '0 concorrentes + 1 reclamacao',
      evidencias: [
        evidencia('reclamacao', { id: 'r1' })
      ],
      total: 1
    },
    {
      nome: '0 concorrentes + 0 reclamacoes',
      evidencias: [],
      total: 0
    },
    {
      nome: '3 concorrentes + 0 reclamacoes',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('concorrente', { id: 'c3' })
      ],
      total: 2
    },
    {
      nome: '5 concorrentes + 1 reclamacao',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('concorrente', { id: 'c3' }),
        evidencia('concorrente', { id: 'c4' }),
        evidencia('concorrente', { id: 'c5' }),
        evidencia('reclamacao', { id: 'r1' })
      ],
      total: 2
    },
    {
      nome: '5 concorrentes + 4 reclamacoes, com dado_mercado no meio',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('reclamacao', { id: 'r1' }),
        evidencia('dado_mercado', { id: 'd1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('reclamacao', { id: 'r2' }),
        evidencia('concorrente', { id: 'c3' }),
        evidencia('reclamacao', { id: 'r3' }),
        evidencia('concorrente', { id: 'c4' }),
        evidencia('reclamacao', { id: 'r4' }),
        evidencia('concorrente', { id: 'c5' })
      ],
      total: 2
    },
    {
      nome: '4 concorrentes + 1 reclamacao, tudo pontua',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('concorrente', { id: 'c3' }),
        evidencia('concorrente', { id: 'c4' }),
        evidencia('reclamacao', { id: 'r1' })
      ],
      total: 3
    }
  ];

  for (const caso of casos) {
    const nota = calcularNota(caso.evidencias);

    assert.equal(nota.total, caso.total, caso.nome);
    assert.equal(nota.maximo_possivel, 3, caso.nome);

    // O total é exatamente a soma dos pontos declarados pelos critérios.
    const somaPontos = Object.values(nota.criterios)
      .reduce((soma, criterio) => soma + criterio.pontos, 0);
    assert.equal(nota.total, somaPontos, caso.nome);

    const somaMaximos = Object.values(nota.criterios)
      .reduce((soma, criterio) => soma + criterio.maximo, 0);
    assert.equal(nota.maximo_possivel, somaMaximos, caso.nome);
  }
});

test('o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada', () => {
  const casos = [
    {
      evidencias: [],
      concorrentes: 'Nenhum concorrente registrado. Minimo: 2.',
      reclamacoes: 'Nenhuma reclamacao registrada.'
    },
    {
      evidencias: [evidencia('concorrente')],
      concorrentes: `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`,
      reclamacoes: 'Nenhuma reclamacao registrada.'
    },
    {
      evidencias: [evidencia('concorrente'), evidencia('concorrente')],
      concorrentes: '2 concorrentes registrados',
      reclamacoes: 'Nenhuma reclamacao registrada.'
    },
    {
      evidencias: [evidencia('reclamacao')],
      concorrentes: 'Nenhum concorrente registrado. Minimo: 2.',
      reclamacoes: '1 reclamacao registrada'
    },
    {
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('concorrente', { id: 'c3' }),
        evidencia('concorrente', { id: 'c4' }),
        evidencia('reclamacao', { id: 'r1' }),
        evidencia('reclamacao', { id: 'r2' })
      ],
      concorrentes: '4 concorrentes registrados',
      reclamacoes: '2 reclamacoes registradas'
    }
  ];

  for (const caso of casos) {
    const nota = calcularNota(caso.evidencias);

    assert.equal(nota.criterios.tem_gente.detalhe, caso.concorrentes);
    assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, caso.reclamacoes);

    // A forma da resposta é sempre a mesma, com as mesmas chaves.
    assert.deepEqual(Object.keys(nota), ['criterios', 'total', 'maximo_possivel']);
    assert.deepEqual(Object.keys(nota.criterios), ['tem_gente', 'tem_gente_insatisfeita', 'cabe_mais_um']);
    assert.deepEqual(Object.keys(nota.criterios.tem_gente), ['pontos', 'maximo', 'detalhe']);
    assert.deepEqual(Object.keys(nota.criterios.tem_gente_insatisfeita), ['pontos', 'maximo', 'detalhe']);
    assert.deepEqual(Object.keys(nota.criterios.cabe_mais_um), ['pontos', 'maximo', 'detalhe']);

    for (const criterio of Object.values(nota.criterios)) {
      assert.equal(typeof criterio.pontos, 'number');
      assert.equal(typeof criterio.maximo, 'number');
      assert.equal(typeof criterio.detalhe, 'string');
      assert.ok(criterio.pontos >= 0 && criterio.pontos <= criterio.maximo);
    }
  }

  // Uma chamada repetida devolve exatamente o mesmo resultado: é determinístico.
  const entrada = [evidencia('concorrente'), evidencia('reclamacao')];
  assert.deepEqual(calcularNota(entrada), calcularNota(entrada));

  // Entrada fora do contrato não quebra o cálculo.
  assert.equal(calcularNota(undefined).total, 0);
  assert.equal(calcularNota(null).total, 0);
  assert.equal(calcularNota(undefined).maximo_possivel, 3);
});