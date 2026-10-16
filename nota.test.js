const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calcularNota, MINIMO_CONCORRENTES } = require('./nota');

// Testes unitários puros: nenhuma leitura de disco, nenhuma requisição HTTP.
// Só a função calcularNota é exercitada.

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
  assert.equal(nota.total, 0);
  assert.equal(nota.maximo_possivel, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, 'Nenhum concorrente registrado. Minimo: 2.');
});

test('1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2', () => {
  const nota = calcularNota([evidencia('concorrente')]);

  assert.equal(nota.criterios.tem_gente.pontos, 0);
  assert.equal(nota.total, 0);
  assert.equal(nota.criterios.tem_gente.detalhe, `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`);
});

test('2 concorrentes: tem_gente vale 1 e o total soma o ponto', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' })
  ]);

  assert.equal(nota.criterios.tem_gente.pontos, 1);
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, '2 concorrentes registrados');
});

test('3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' }),
    evidencia('concorrente', { id: 'c3' })
  ]);

  assert.equal(nota.criterios.tem_gente.pontos, 1);
  assert.equal(nota.total, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, '3 concorrentes registrados');
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
    evidencia('reclamacao'),
    evidencia('dado_mercado')
  ]);

  assert.equal(comUmConcorrente.criterios.tem_gente.pontos, 0);
  assert.equal(comUmConcorrente.criterios.tem_gente.detalhe, `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.`);

  // 2 concorrentes misturados a outros tipos atingem o mínimo.
  const comDoisConcorrentes = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('reclamacao'),
    evidencia('concorrente', { id: 'c2' }),
    evidencia('dado_mercado')
  ]);

  assert.equal(comDoisConcorrentes.criterios.tem_gente.pontos, 1);
  assert.equal(comDoisConcorrentes.total, 1);
});

test('o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada', () => {
  const casos = [
    { evidencias: [], esperado: 'Nenhum concorrente registrado. Minimo: 2.' },
    { evidencias: [evidencia('concorrente')], esperado: `1 concorrente registrado. Minimo: ${MINIMO_CONCORRENTES}.` },
    { evidencias: [evidencia('concorrente'), evidencia('concorrente')], esperado: '2 concorrentes registrados' },
    {
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' }),
        evidencia('concorrente', { id: 'c3' }),
        evidencia('concorrente', { id: 'c4' })
      ],
      esperado: '4 concorrentes registrados'
    }
  ];

  for (const caso of casos) {
    const nota = calcularNota(caso.evidencias);

    assert.equal(nota.criterios.tem_gente.detalhe, caso.esperado);

    // A forma da resposta é sempre a mesma, com as mesmas chaves.
    assert.deepEqual(Object.keys(nota), ['criterios', 'total', 'maximo_possivel']);
    assert.deepEqual(Object.keys(nota.criterios), ['tem_gente']);
    assert.deepEqual(Object.keys(nota.criterios.tem_gente), ['pontos', 'detalhe']);
    assert.equal(typeof nota.criterios.tem_gente.pontos, 'number');
    assert.equal(typeof nota.criterios.tem_gente.detalhe, 'string');
  }

  // Uma chamada repetida devolve exatamente o mesmo resultado: é determinístico.
  const entrada = [evidencia('concorrente'), evidencia('concorrente')];
  assert.deepEqual(calcularNota(entrada), calcularNota(entrada));

  // Entrada fora do contrato não quebra o cálculo.
  assert.equal(calcularNota(undefined).total, 0);
  assert.equal(calcularNota(null).total, 0);
});