# Tarefa 16 — Terceiro critério da régua ("cabe mais um?")

## Data

16/10/2026

## Objetivo

Implementar o terceiro critério da régua de viabilidade, "cabe mais um?", e estender a
cobertura de testes dos três critérios. A regra foi definida pelo Product Owner: **2 a 4
concorrentes valem 1 ponto; menos de 2 ou mais de 4 valem 0**.

Este critério é o primeiro da régua que **não** é uma simples contagem com mínimo. Ele tem
faixa: mínimo E máximo. Por isso não cabe na função genérica `avaliarContagem`, e a
avaliadora foi escrita na forma completa, como a especificação pedia.

## O que foi feito

### 1. `nota.js`: terceiro critério

**Constantes novas**, exportadas:

```javascript
const MINIMO_CONCORRENTES_CABE_MAIS_UM = 2;
const MAXIMO_CONCORRENTES_CABE_MAIS_UM = 4;
const PONTOS_CABE_MAIS_UM = 1;
```

**`detalharCabeMaisUm(total)`**, com os quatro casos:

```javascript
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
```

**`avaliarCabeMaisUm(evidencias)`**, escrita na forma completa, reaproveitando apenas a
contagem já existente:

```javascript
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
```

**Declaração na lista `CRITERIOS`:**

```javascript
const CRITERIOS = [
  { nome: 'tem_gente', avaliar: avaliarTemGente },
  { nome: 'tem_gente_insatisfeita', avaliar: avaliarTemGenteInsatisfeita },
  { nome: 'cabe_mais_um', avaliar: avaliarCabeMaisUm }
];
```

Nenhuma outra parte do cálculo mudou. `total` e `maximo_possivel` passaram de 2 para 3
sozinhos, por efeito da soma em laço.

### 2. `nota.test.js`

**Testes existentes atualizados.** O `maximo_possivel` foi de 2 para 3 em todos os pontos
onde aparecia. O teste da forma da resposta passou a afirmar as três chaves de critério e a
confirmar as três chaves internas de cada uma, incluindo `cabe_mais_um`.

**Totais recalculados.** Três testes que antes davam `total` 1 passaram a dar 2, porque
`cabe_mais_um` soma ponto sempre que há 2 a 4 concorrentes. Specifically:

- "2 concorrentes": `tem_gente` 1 + `cabe_mais_um` 1 = **2**
- "3 concorrentes": `tem_gente` 1 + `cabe_mais_um` 1 = **2**
- "reclamacao e dado_mercado não contam": o caso de 2 concorrentes = **2**
- "0 reclamacoes" (2 concorrentes): **2**

**Três testes novos:**

- `cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes` — cobre 0, 1, 2, 3, 4, 5 e
  10 concorrentes, verificando pontos, `maximo` e detalhe.
- `cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado` — cobre
  os quatro textos, em 0, 1, 2, 3, 4, 5 e 9 concorrentes.
- `cabe_mais_um e os limites declarados: 2 a 4 concorrentes` — fixa os valores das
  constantes exportadas.

No primeiro teste novo, o texto esperado do detalhe vem de uma função espelho definida no
próprio arquivo de teste (`detalharCabeMaisUmEsperado`). Isso é deliberado: se o teste
chamasse a função testada para montar a expectativa, ele confirmaria que a função é
consistente com ela mesma, e não que o texto está certo. Com o espelho, o texto esperado
está escrito à mão no teste.

**Teste da soma reescrito**, com os dois casos pedidos e mais dois:

| Caso                                              | Total |
| ------------------------------------------------- | ----- |
| 2 concorrentes + 1 reclamação                     | 3     |
| 2 concorrentes + 0 reclamações                    | 2     |
| 0 concorrentes + 1 reclamação                    | 1     |
| 0 concorrentes + 0 reclamações                    | 0     |
| 3 concorrentes + 0 reclamações                    | 2     |
| 5 concorrentes + 1 reclamação                     | 2     |
| 5 concorrentes + 4 reclamações (+ dado_mercado)   | 2     |
| 4 concorrentes + 1 reclamação                    | 3     |

O último caso é o mais interessante: 4 concorrentes com 1 reclamação é o único cenário em
que **os três critérios pontuam ao mesmo tempo**, totalizando 3 de 3.

### 3. `server.test.js`

Os quatro testes de `/nota` foram atualizados e um foi acrescentado.

O teste do arquivo vazio passou a afirmar a resposta completa com os três critérios. O
teste com 2 concorrentes agora espera `total` 2, e ganhou asserções sobre `cabe_mais_um`. O
testo com 1 concorrente e 1 reclamação ganhou asserções do `cabe_mais_um` valendo 0, e seu
`total` continua 1.

O teste que existia com "2 concorrentes e 1 reclamação" mudou de `total` 2 para **3**, e foi
renomeado. O passo 3c da especificação previa essa mudança, e ela não é opcional: com o
terceiro critério, aquele cenário passou a pontuar nos três.

O teste novo usa **5 concorrentes e nenhuma reclamação**, que é o cenário em que os dois
critérios de concorrentes divergem: `tem_gente` vale 1 (o mercado existe), `cabe_mais_um`
vale 0 (mercado saturado). `total` 1 de 3. A especificação admitia também a variante "ou 2
se houver reclamação"; a versão sem reclamação foi implementada por ser determinística e
não exigir ambiguidade sobre o cenário.

### 4. Documentação atualizada no mesmo commit

- `README.md`: exemplo de resposta com os três critérios e `maximo_possivel` 3, contagem de
  43 para 47 testes em três lugares, `server.test.js` de 26 para 27, `nota.test.js` de 10
  para 13, "Estado do projeto" e "Próximos passos".
- `ESTADO.md`: contagem de testes, "O que existe hoje", "2 dos 5 ainda não implementados",
  "Próximo passo" para a Tarefa 17 e a descrição do produto corrigida para "três critérios".

### 5. `package.json`

Nenhuma alteração necessária.

## Seção nova no `ESTADO.md`: "Pendências conhecidas"

A regra nova do fix-01 diz que toda pendência registrada em relatório entra no `ESTADO.md`
na mesma tarefa. Aplications: ao revisar o que existia, as três pendências de ambiente e
infraestrutura (comando `memory` inexistente, ausência de backup dos `.jsonl`, ausência de
`.env`) estavam registradas em vários relatórios antigos e **não** had any lugar canônico.

Foi criada a seção "Pendências conhecidas" no `ESTADO.md`, reunindo as três, com a
observação explícita de que nenhuma é de código. Isso cumpre a regra nova na própria tarefa
em que ela foi criada.

Nenhuma pendência nova de código foi gerada por esta tarefa. Tudo que estava em aberto
(405 de `/nota`, teste de 405 em `/evidencias`) foi resolvido no fix-01.

## Os testes novos do terceiro critério

```javascript
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
```

O teste novo de `/nota`:

```javascript
test('GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0', async () => {
  await comServidor(async ({ base }) => {
    for (const fonte of ['A', 'B', 'C', 'D', 'E']) {
      await postEvidencia(base, evidenciaValida({ fonte: `Concorrente ${fonte}` }));
    }

    const r = await getNota(base);

    assert.equal(r.status, 200);

    // 5 concorrentes ainda provam que o mercado existe.
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);

    // Mas passam do máximo de 4, então o mercado é considerado saturado.
    assert.equal(r.corpo.criterios.cabe_mais_um.pontos, 0);
    assert.equal(r.corpo.criterios.cabe_mais_um.detalhe, '5 concorrentes registrados. Mercado saturado.');

    // Sem reclamações, o segundo critério não pontua.
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 0);

    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 3);

    // As cinco evidências continuam registradas.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 5);
  });
});
```

## Uma falha esperada, e o que ela revelou

A primeira execução da suíte **falhou**, com 8 asserções erradas. Não era defeito da
implementação do critério: eram testes antigos com totais que deixaram de valer.

A saída real da falha:

```
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    actual: 2,
    expected: 1,
  ...
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    actual: { criterios: { tem_gente: [Object], tem_gente_insatisfeita: [Object], cabe_mais_um: [Object] }, total: 0, maximo_possivel: 3 },
    expected: { criterios: { tem_gente: [Object], tem_gente_insatisfeita: [Object] }, total: 0, maximo_possivel: 2 },
```

As quatro falhas em `nota.test.js` estavam nas linhas 79, 92, 123 e 135, todas em
`assert.equal(nota.total, 1)`. O motivo é o mesmo em todas: com 2 a 4 concorrentes, o
critério novo soma mais um ponto, e o total passa a 2. Uma quinta falha era o `deepEqual`
do arquivo vazio em `server.test.js`, sem `cabe_mais_um` e com `maximo_possivel` 2.

Isso é exatamente o comportamento descrito na Tarefa 15: o teste da forma da resposta existe
para quebrar quando o contrato muda. A diferença é que desta vez a quebra foi maior, porque
a forma da resposta **e** os valores mudaram ao mesmo tempo.

Vale registrar que as falhas foram corrigidas **recalculando as expectativas**, e não
ajustando a implementação para satisfazer os testes antigos. Nenhuma regra foi afrouxada.

## Saída real do `npm test`

Comando: `npm test`, depois de todas as correções

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (15.7253ms)
✔ evidência sem "fonte": lança erro e não grava (2.6767ms)
✔ evidência com "tipo" inválido: lança erro e não grava (3.3479ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.5859ms)
✔ listar evidências de arquivo vazio: devolve [] (5.1807ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (47.8855ms)
✔ nenhum teste grava no evidencias.jsonl de produção (19.1391ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (7.1346ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (1.3163ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.6123ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5947ms)
✔ reclamacao e dado_mercado não contam como concorrente (2.6771ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.6018ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.5602ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5533ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.0868ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (0.9697ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4044ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.0174ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (3.6287ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (182.5554ms)
✔ ideia nao mobile: 200 com tipo "outro" (29.7515ms)
✔ campo ausente: 400 e nada gravado (27.8104ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (27.3338ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (19.519ms)
✔ body que nao e objeto JSON: 400 e nada gravado (70.9655ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (20.7929ms)
✔ corpo acima de 100kb: 413 e nada gravado (74.1816ms)
✔ GET /saude: 200 com ok e servico (21.4823ms)
✔ rota desconhecida: 404 em JSON (57.7984ms)
✔ GET /validar-ideia: 405 com header Allow: POST (11.9534ms)
✔ POST /saude: 405 com header Allow: GET (13.8727ms)
✔ nenhum teste grava no validacoes.jsonl de producao (33.3828ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (20.694ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (19.3534ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (14.318ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (12.8505ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (36.8172ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (23.0873ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (13.2805ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (32.0828ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (30.7827ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 e maximo_possivel 3 (27.6458ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (51.1582ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (33.7817ms)
✔ POST /nota: 405 com header Allow: GET (13.0881ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (10.6455ms)
ℹ tests 47
ℹ suites 0
ℹ pass 47
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1711.0716
```

Rodada de confirmação, com a documentação já atualizada:

```
ℹ tests 47
ℹ pass 47
ℹ fail 0
ℹ duration_ms 1193.6247
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 26    | 27    | 27     |
| `evidencias.test.js` | 7     | 7     | 7      |
| `nota.test.js`       | 10    | 13    | 13     |
| **Total**            | 43    | 47    | **47** |

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
8c57b1f fix-01: 405 em /nota e teste de 405 em /evidencias
6482058 Tarefa 15: segundo criterio da regua (tem gente insatisfeita?)
cc05aa3 Tarefa 14: atualiza documentacao e define regras do projeto
```

## Arquivos alterados

```
ESTADO.md
README.md
nota.js
nota.test.js
server.test.js
relatorios/tarefa-16-terceiro-criterio.md
```

## O que não funcionou ou ficou pendente

1. **A primeira execução da suíte falhou**, com 8 asserções. Foi o comportamento esperado da
   mudança de contrato, descrito em seção acima. Corrigido recalculando as expectativas.

2. **Nenhuma pendência de código foi gerada.** As duas pendências de 405 foram resolvidas no
   fix-01, e esta tarefa não criou nenhuma nova.

3. **Uma escolha do passo 3d que registro para decisão.** O teste novo de `/nota` usa 5
   concorrentes e **nenhuma** reclamação, dando `total` 1. A especificação admitia também a
   variante "ou 2 se houver reclamação". A versão sem reclamação foi escolhida por ser
   determinística. Se preferir o cenário com os dois pontos, basta registrar uma reclamação
   no teste e mudar a expectativa para 2.

4. **A régua completa ainda não está implementada.** Faltam dois critérios, e o quinto ainda
   não tem regra definida.

5. **Pendências de ambiente e infraestrutura**, agora reunidas na nova seção "Pendências
   conhecidas" do `ESTADO.md`: comando `memory` inexistente, ausência de backup dos
   `.jsonl`, ausência de `.env`.

## Observações técnicas para a próxima tarefa

1. **O quarto critério ("alguém paga?") é o primeiro que não é contagem.** Os três
   primeiros contam registros de um tipo. "Alguém paga?" provavelmente vai precisar olhar
   `trecho_bruto`, `fonte` ou algum dado novo, e talvez exija um campo que o modelo de
   evidência atual não tem. Vale mapear isso antes: se faltar um campo, a mudança é no
   `evidencias.js` e vale fazer com o teste do módulo pronto, como nas tarefas anteriores.

2. **A função genérica `avaliarContagem` não doit ser esticada à força.** Ela cobre "conte
   tipo X, se >= N vale P". O terceiro critério mostrou que existem outras formas: faixa com
   mínimo e máximo. Se o quarto critério for outra forma, escreva outra função avaliadora.
   O que importa é o contrato `{ pontos, maximo, detalhe }` e a declaração em `CRITERIOS`.

3. **A forma da resposta vai quebrar de novo, e agora em mais lugares.** Quatro asserções
   `total` e um `deepEqual` falharam. Para o quarto critério, o esperado é o mesmo. Vale ter
   isso em mente como custo conhecido, e não como surpresa.

4. **`total` e `maximo_possivel` passam a 4 sozinhos**, sem alteração em `calcularNota`. A
   estrutura pontual da Tarefa 15 continua pagando.

5. **Os dois critérios de concorrentes usam a mesma contagem e podem divergir.** Com 5
   concorrentes, `tem_gente` vale 1 e `cabe_mais_um` vale 0. Isso é a intenção da régua —
   o mercado existe, mas está saturado. Vale lembrar ao ler notas, porque um `total` baixo
   pode vir só da saturação, e não de falta de mercado.

6. **Continua valendo a observação sobre o identificador de validação.** A nota é geral, e
   cada critério novo conta evidências de todas as ideias juntas. Com quatro de cinco
   critérios em uso, o custo de retrofitar um `id` em `POST /validar-ideia` está crescendo.

7. **Três números da documentação precisam acompanhar a próxima tarefa**: a contagem geral
   no README (47), e as linhas de `server.test.js` (27) e `nota.test.js` (13) na tabela de
   estrutura. No `ESTADO.md`, a linha de 47 e o detalhamento por arquivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-16-terceiro-criterio.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-16-terceiro-criterio.md").Length
20542
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-16-terceiro-criterio.md`,
com 20.542 bytes.