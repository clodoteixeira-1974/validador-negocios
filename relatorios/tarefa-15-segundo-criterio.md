# Tarefa 15 — Segundo critério da régua ("tem gente insatisfeita?")

## Data

16/10/2026

## Objetivo

Implementar o segundo critério da régua de viabilidade, "tem gente insatisfeita?", e
refatorar o módulo `nota.js` para suportar múltiplos critérios de forma genérica, em que o
total e o máximo possível sejam somas calculadas automaticamente.

Esta é a primeira tarefa que segue a regra nova: **documentação atualizada no mesmo
commit**. O `README.md` e o `ESTADO.md` foram alterados junto com o código.

## Uma inconsistência na especificação, e como foi resolvida

O passo 3b pedia este teste: "GET /nota após **1 concorrente + 1 reclamação** → total 2".

Isso é impossível pela própria regra do primeiro critério: `tem_gente` só concede ponto com
2 ou mais concorrentes, então 1 concorrente vale 0 pontos. Com 1 reclamação, o total
resultante seria 1, nunca 2.

O passo 2d, na mesma especificação, pede "**2 concorrentes + 1 reclamação** → total 2,
maximo_possivel 2", que é coerente com as regras.

Como o passo 2d é o único dos dois que fecha aritmeticamente, o teste foi escrito com 2
concorrentes e 1 reclamação, esperando `total` 2. Nenhuma regra foi afrouxada para
fazer o passo 3b passar, e nenhuma expectativa foi inventada. O caso "1 concorrente + 1
reclamação" também está coberto, no teste ao lado, e ele dá `total` 1, que é o correto.

## O que foi feito

### 1. Refatoração do `nota.js`

- **Cada critério agora devolve `{ pontos, maximo, detalhe }`.** O campo `maximo` é novo e
  declara quantos pontos o critério pode conceder no máximo.
- **`total` passou a ser a soma dos pontos** de todos os critérios, e **`maximo_possivel`, a
  soma dos máximos**. Os dois são calculados num laço, não escritos à mão.
- **Critérios declarados em uma lista `CRITERIOS`**, na ordem da régua. Acrescentar um
  critério novo passa a ser: escrever a função avaliadora e declarar uma linha na lista.
  Nada mais precisa mudar.
- **Função genérica `avaliarContagem`**, usada pelos dois critérios. Ela concentra a lógica
  comum — contar, comparar com o mínimo, conceder o ponto, chamar o gerador de `detalhe` —
  e recebe `tipo`, `minimo`, `pontosConcedidos` e a função de detalhe.
- **Função `contarDoTipo`**, que filtra ignorando entradas nulas ou sem `tipo`.

### 2. Novo critério `tem_gente_insatisfeita`

- Conta evidências com `tipo === 'reclamacao'`.
- Mínimo de 1, ou seja, basta uma reclamação para o ponto ser concedido.
- `maximo` igual a 1.
- Detalhe em três formas: `Nenhuma reclamacao registrada.`, `1 reclamacao registrada` e
  `N reclamacoes registradas`.

### 3. Atualização do `nota.test.js`

Os seis testes existentes foram atualizados para o novo formato, incluindo o campo
`maximo`. Nenhum foi apagado: o primeiro critério continua coberto.

- Acrescentada a asserção `maximo_possivel` igual a 2 nos testes do primeiro critério.
- Três testes novos do segundo critério: 0, 1 e 3 reclamações.
- Um teste novo para a soma, com cinco casos, incluindo "2 concorrentes + 1 reclamação" com
  total 2 e um caso com 5 concorrentes e 4 reclamações misturados com `dado_mercado`.
- O teste da forma da resposta foi reescrito para afirmar as duas chaves de critério e as
  três chaves internas de cada uma, além de que `pontos` está sempre entre 0 e `maximo`.

### 4. Atualização do `server.test.js`

Os quatro testes de `GET /nota` foram atualizados para o novo formato, incluindo
`maximo`, o segundo critério e `maximo_possivel` 2. O teste que antes checava
`total` 0 agora checava `tem_gente.pontos` 0 **e** `tem_gente_insatisfeita.pontos` 1,
porque o cenário é o mesmo e a resposta mudou de verdade.

Foi acrescentado o teste de `GET /nota` com 2 concorrentes e 1 reclamação, esperando
`total` 2 e `maximo_possivel` 2.

### 5. Documentação atualizada no mesmo commit

- `README.md`: contagem de 36 para 41 testes, `server.test.js` de 23 para 24, `nota.test.js`
  de 6 para 10, exemplo de resposta de `/nota` com os dois critérios e `maximo_possivel` 2,
  explicação da soma, "Estado do projeto" e "Próximos passos" ajustados.
- `ESTADO.md`: contagem de testes, seção "O que existe hoje", "Demais critérios da régua
  (3 dos 5)", "Próximo passo" e a convenção nova de nomes de relatório.

### 6. `package.json`

Nenhuma alteração necessária. O script já cobre os três arquivos de teste.

## Conteúdo final do `nota.js`

```javascript
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
```

## Conteúdo final do `nota.test.js`

Os seis primeiros testes cobrem o primeiro critério e foram atualizados para incluir
`maximo`:

```javascript
test('array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado', () => {
  const nota = calcularNota([]);

  assert.equal(nota.criterios.tem_gente.pontos, 0);
  assert.equal(nota.criterios.tem_gente.maximo, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, 'Nenhum concorrente registrado. Minimo: 2.');
  assert.equal(nota.total, 0);
  assert.equal(nota.maximo_possivel, 2);
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

  // Sem reclamações, só o primeiro critério pontua.
  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 0);
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 2);
});

test('3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' }),
    evidencia('concorrente', { id: 'c3' })
  ]);

  assert.equal(nota.criterios.tem_gente.pontos, 1);
  assert.equal(nota.criterios.tem_gente.detalhe, '3 concorrentes registrados');
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 2);
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
  assert.equal(comDoisConcorrentes.total, 1);
});
```

Os quatro testes novos:

```javascript
test('0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma', () => {
  const nota = calcularNota([
    evidencia('concorrente', { id: 'c1' }),
    evidencia('concorrente', { id: 'c2' })
  ]);

  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 0);
  assert.equal(nota.criterios.tem_gente_insatisfeita.maximo, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, 'Nenhuma reclamacao registrada.');
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 2);
});

test('1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido', () => {
  const nota = calcularNota([evidencia('reclamacao')]);

  assert.equal(MINIMO_RECLAMACOES, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.maximo, 1);
  assert.equal(nota.criterios.tem_gente_insatisfeita.detalhe, '1 reclamacao registrada');
  assert.equal(nota.total, 1);
  assert.equal(nota.maximo_possivel, 2);
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
  assert.equal(nota.maximo_possivel, 2);
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
      total: 2
    },
    {
      nome: '2 concorrentes + 0 reclamacoes',
      evidencias: [
        evidencia('concorrente', { id: 'c1' }),
        evidencia('concorrente', { id: 'c2' })
      ],
      total: 1
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
    }
  ];

  for (const caso of casos) {
    const nota = calcularNota(caso.evidencias);

    assert.equal(nota.total, caso.total, caso.nome);
    assert.equal(nota.maximo_possivel, 2, caso.nome);

    // O total é exatamente a soma dos pontos declarados pelos critérios.
    const somaPontos = Object.values(nota.criterios)
      .reduce((soma, criterio) => soma + criterio.pontos, 0);
    assert.equal(nota.total, somaPontos, caso.nome);

    const somaMaximos = Object.values(nota.criterios)
      .reduce((soma, criterio) => soma + criterio.maximo, 0);
    assert.equal(nota.maximo_possivel, somaMaximos, caso.nome);
  }
});
```

O teste da forma da resposta, reescrito:

```javascript
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
    assert.deepEqual(Object.keys(nota.criterios), ['tem_gente', 'tem_gente_insatisfeita']);
    assert.deepEqual(Object.keys(nota.criterios.tem_gente), ['pontos', 'maximo', 'detalhe']);
    assert.deepEqual(Object.keys(nota.criterios.tem_gente_insatisfeita), ['pontos', 'maximo', 'detalhe']);

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
  assert.equal(calcularNota(undefined).maximo_possivel, 2);
});
```

## Trecho novo do `server.test.js`

O teste de `GET /nota` com arquivo vazio, agora com a forma completa:

```javascript
test('GET /nota com arquivo de evidencias vazio: 200 com total 0', async () => {
  await comServidor(async ({ base }) => {
    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo, {
      criterios: {
        tem_gente: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhum concorrente registrado. Minimo: 2.'
        },
        tem_gente_insatisfeita: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhuma reclamacao registrada.'
        }
      },
      total: 0,
      maximo_possivel: 2
    });
  });
});
```

O cenário que mudou de verdade, porque a resposta mudou:

```javascript
test('GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);

    // 1 concorrente não atinge o mínimo de 2 do primeiro critério.
    assert.equal(r.corpo.criterios.tem_gente.pontos, 0);
    assert.equal(r.corpo.criterios.tem_gente.detalhe, '1 concorrente registrado. Minimo: 2.');

    // 1 reclamação basta para o segundo critério.
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.detalhe, '1 reclamacao registrada');

    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 2);

    // As duas evidências continuam registradas: a nota não consome nem apaga nada.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 2);
  });
});
```

O teste acrescentado, correspondente ao passo 2d:

```javascript
test('GET /nota com 2 concorrentes e 1 reclamacao: total 2 e maximo_possivel 2', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(r.corpo.total, 2);
    assert.equal(r.corpo.maximo_possivel, 2);
  });
});
```

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (54.2054ms)
✔ evidência sem "fonte": lança erro e não grava (4.7474ms)
✔ evidência com "tipo" inválido: lança erro e não grava (4.2079ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (19.851ms)
✔ listar evidências de arquivo vazio: devolve [] (10.8979ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (7.6664ms)
✔ nenhum teste grava no evidencias.jsonl de produção (8.7481ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (4.8144ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (1.3963ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.573ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5783ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.8169ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (4.0179ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.768ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (2.5269ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (2.0352ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (4.929ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (864.711ms)
✔ ideia nao mobile: 200 com tipo "outro" (68.6566ms)
✔ campo ausente: 400 e nada gravado (26.4119ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (52.8699ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (29.9523ms)
✔ body que nao e objeto JSON: 400 e nada gravado (26.8206ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (37.2046ms)
✔ corpo acima de 100kb: 413 e nada gravado (37.4248ms)
✔ GET /saude: 200 com ok e servico (19.0453ms)
✔ rota desconhecida: 404 em JSON (33.4848ms)
✔ GET /validar-ideia: 405 com header Allow: POST (14.6261ms)
✔ POST /saude: 405 com header Allow: GET (26.9275ms)
✔ nenhum teste grava no validacoes.jsonl de producao (23.796ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (36.5392ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (15.167ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (26.0553ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (19.7071ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (55.8351ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (39.3687ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (33.9607ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (33.9903ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (52.0746ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 2 e maximo_possivel 2 (49.7807ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (44.8072ms)
ℹ tests 41
ℹ suites 0
ℹ pass 41
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11862.8946
```

A suíte foi executada uma segunda vez depois de toda a documentação estar atualizada,
confirmando que nada quebrou:

```
ℹ tests 41
ℹ pass 41
ℹ fail 0
ℹ duration_ms 2651.8963
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 23    | 24    | 24     |
| `evidencias.test.js` | 7     | 7     | 7      |
| `nota.test.js`       | 6     | 10    | 10     |
| **Total**            | 36    | 41    | **41** |

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois mudou.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
cc05aa3 Tarefa 14: atualiza documentacao e define regras do projeto
52fa84c Tarefa 13: primeira nota deterministica (tem gente?)
7c2432f Corrige gitignore: cobre todas as variantes de .env
```

## Arquivos alterados nesta tarefa

```
ESTADO.md
README.md
nota.js
nota.test.js
server.test.js
relatorios/tarefa-15-segundo-criterio.md
```

Código e documentação no mesmo commit, como a regra nova determina.

## O que não funcionou ou ficou pendente

Nada falhou. Ficaram pendentes:

1. **`GET /nota` continua sem tratamento de 405.** Um `POST /nota` devolve 404, enquanto
   `/evidencias` devolve 405. Pendência da Tarefa 13, não corrigida aqui por ser alteração
   de código fora do escopo.

2. **Continua sem teste o tratamento de 405 em `/evidencias`**, pendência da Tarefa 11.

3. **A convenção de nomes não retroage.** A regra nova diz `tarefa-NN` para código,
   `doc-NN` para documentação e `fix-NN` para correções. Os relatórios anteriores já
   gravados na pasta mantêm `tarefa-` mesmo tendo sido tarefas de documentação ou de
   correção (a Tarefa 08 e a Tarefa 10, por exemplo). Renomear os arquivos antigos
   reescreveria o histórico, então não foi feito. Vale saber que a pasta hoje tem nomes
   anteriores à regra e novos seguirão o padrão.

4. **A Tarefa 14 continua numerada como "documentação", mas o próximo passo apontava para
   ela como se fosse de código.** Isso foi corrigido: o "Próximo passo" agora aponta para
   a Tarefa 16, o terceiro critério, que é de código. A colisão anterior está resolvida
   neste ponto.

5. **Pendências anteriores, sem relação com esta tarefa:** o comando `memory` do
   `AGENTS.md` não existe; não há script de backup dos `.jsonl` via `cron` na VPS; o
   `.env` não foi criado.

## Observações técnicas para a próxima tarefa

1. **O terceiro critério é mais barato do que os dois primeiros.** Com a lista `CRITERIOS`,
   a tarefa se resume a: escrever a função de detalhe, escrever a função avaliadora (ou
   reaproveitar `avaliarContagem` se o critério também for uma contagem com mínimo), e
   declarar uma linha na lista. `total` e `maximo_possivel` passam a 3 sozinhos.

2. **Nem todo critério cabe em `avaliarContagem`.** A função genérica cobre "conte tipo X,
   se >= N vale 1 ponto". Se o terceiro critério envolver outra coisa — somar valores,
   verificar texto, consultar dado externo — não dá para reaproveitá-la, e será preciso
   escrever a função avaliadora na mesma forma (`{ pontos, maximo, detalhe }`) e
   declará-la na lista. O contrato é esse, não a implementação.

3. **O terceiro critério da régua ainda não está definido no `ESTADO.md`.** Os dois
   primeiros vieram especificados na tarefa. É preciso saber qual é o terceiro e qual é a
   regra exata antes de implementar, porque o teste é o que fixa a decisão.

4. **A forma da resposta continua travada por teste, e o próximo critério vai exigir
   atualização.** O último teste de `nota.test.js` afirma
   `['tem_gente', 'tem_gente_insatisfeita']` como as chaves de `criterios`. Com o terceiro
   critério, ele falha de propósito. Isso deve ser atualizado junto com a implementação.

5. **O `README.md` tem três números que precisam acompanhar as mudanças de teste:** a
   contagem geral na seção "Como rodar", e as linhas de `server.test.js` e `nota.test.js`
   na tabela de estrutura. Hoje estão 41, 24 e 10.

6. **A nota continua geral e isso segue acumulando custo.** Cada critério novo conta
   concorrentes ou reclamações de todas as ideias registradas juntas, porque `ideia_relacionada`
   é texto livre. Continua valendo a observação: quando o PO quiser a nota por ideia, o
   caminho passa por dar um `id` a `POST /validar-ideia`.

7. **Os textos de `detalhe` seguem em português sem acento**, coerentes com as mensagens que
   o `evidencias.js` já devolve. Os comentários do código usam acentuação. Divergência
   conhecida, ainda não padronizada.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-15-segundo-criterio.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-15-segundo-criterio.md").Length
28915
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-15-segundo-criterio.md`,
com 28.915 bytes.