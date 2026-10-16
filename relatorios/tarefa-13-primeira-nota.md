# Tarefa 13 — Primeira nota determinística ("tem gente?")

## Data

16/10/2026

## Objetivo

Implementar o primeiro critério da régua de viabilidade, o "tem gente?", do fluxograma, e
expô-lo por HTTP em `GET /nota`.

As decisões de escopo foram tomadas pelo Product Owner antes desta tarefa e foram
seguidas integralmente:

- A nota é **geral**: conta todos os concorrentes registrados, sem filtro por ideia.
- A exposição é via **recurso separado**, `GET /nota`.
- **Todos os concorrentes contam**, independentemente do campo `relevancia`.

## O que foi feito

1. **Criado `nota.js`**, módulo puro com a função `calcularNota(evidencias)`. Recebe um
   array de evidências no mesmo formato devolvido por `listarEvidencias()` e devolve a
   nota com a estrutura combinada: `criterios.tem_gente.pontos`,
   `criterios.tem_gente.detalhe`, `total` e `maximo_possivel`. Não faz I/O, não usa rede e
   não depende de nada externo.

2. **Criado `nota.test.js`** com 6 testes unitários puros, sem HTTP e sem disco,
   cobrindo array vazio, 1 concorrente, 2 concorrentes, 3 concorrentes, tipos que não
   contam e o texto do `detalhe`.

3. **Alterado `server.js`** para importar `calcularNota` e expor `GET /nota`, que lê as
   evidências com `listarEvidencias(arquivoEvidencias)` e devolve a nota. Todo o resto do
   arquivo foi mantido intacto.

4. **Adicionados 4 testes de `GET /nota` em `server.test.js`**, mais o auxiliar
   `getNota`. Cobrem o arquivo vazio, 2 concorrentes, 1 concorrente com 1 reclamação, e o
   isolamento do arquivo de produção.

5. **Atualizado `package.json`** para incluir `nota.test.js` no script `test`.

6. **Rodada a suíte**: 36 testes, 36 passando, 0 falhando.

7. **Commit e push** para o GitHub.

### Como o critério foi implementado

A regra é uma contagem: quantas evidências têm `tipo === 'concorrente'`. Com 2 ou mais, o
critério concede 1 ponto; abaixo disso, 0. Como o módulo `evidencias.js` já restringe
`tipo` a `['concorrente', 'reclamacao', 'dado_mercado']`, não há necessidade de revalidar
o valor aqui.

O texto do `detalhe` tem três formas, para ficar legível nos três casos:

| Situação           | `detalhe`                                    |
| ------------------ | -------------------------------------------- |
| 0 concorrentes     | `Nenhum concorrente registrado. Minimo: 2.`  |
| 1 concorrente      | `1 concorrente registrado. Minimo: 2.`       |
| 2 ou mais          | `N concorrentes registrados`                 |

Nos casos 0 e 1 o texto repete o mínimo, porque são justamente os casos em que o ponto
não foi atribuído e o leitor precisa saber quanto falta.

### Uma decisão tomada dentro da tarefa

A entrada fora do contrato foi tratada como lista vazia, em vez de lançar erro:
`Array.isArray(evidencias) ? evidencias : []`. A rota HTTP nunca envia nada além de um
array, então isso não muda o comportamento observável, mas evita que uma chamada futura
com argumento errado derrube a rota. O comportamento está coberto por asserção no sexto
teste (`calcularNota(undefined)` e `calcularNota(null)` devolvem `total` 0).

## Conteúdo final do `nota.js`

```javascript
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
```

## Conteúdo final do `nota.test.js`

```javascript
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
```

O sexto teste vai além da cobertura pedida e trava três propriedades que valem a pena
garantir agora: a **forma** da resposta (as chaves, sempre as mesmas, para que clientes
futuros possam confiar no contrato), o **caráter determinístico** (duas chamadas com a
mesma entrada devolvem objetos idênticos) e a **tolerância a entrada inválida**.

## Trecho novo do `server.js` (rota `GET /nota`)

O `require` acrescentado no topo do arquivo, logo abaixo do import de `./evidencias`:

```javascript
const { calcularNota } = require('./nota');
```

A rota, declarada entre o `POST /evidencias` e o `app.all('/evidencias')`:

```javascript
// Calcula a nota a partir das evidencias registradas. Por enquanto so existe
// o criterio "tem gente?". A nota e geral: conta todos os concorrentes.
app.get('/nota', (req, res) => {
  const evidencias = listarEvidencias(arquivoEvidencias);
  return res.json(calcularNota(evidencias));
});
```

A ordem resultante das rotas:

```
app.get('/saude')  ->  app.post('/saude')  ->  app.post('/validar-ideia')
  ->  app.get('/validar-ideia')  ->  app.get('/evidencias')  ->  app.post('/evidencias')
  ->  app.get('/nota')  ->  app.all('/evidencias')  ->  404  ->  middleware de erro
```

O auxiliar adicionado em `server.test.js`:

```javascript
async function getNota(base) {
  const resposta = await fetch(`${base}/nota`);
  return { status: resposta.status, corpo: await resposta.json() };
}
```

E os 4 testes da rota:

```javascript
test('GET /nota com arquivo de evidencias vazio: 200 com total 0', async () => {
  await comServidor(async ({ base }) => {
    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo, {
      criterios: {
        tem_gente: {
          pontos: 0,
          detalhe: 'Nenhum concorrente registrado. Minimo: 2.'
        }
      },
      total: 0,
      maximo_possivel: 1
    });
  });
});

test('GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente.detalhe, '2 concorrentes registrados');
    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 1);
  });
});

test('GET /nota com 1 concorrente e 1 reclamacao: 200 com tem_gente.pontos igual a 0', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 0);
    assert.equal(r.corpo.criterios.tem_gente.detalhe, '1 concorrente registrado. Minimo: 2.');
    assert.equal(r.corpo.total, 0);

    // As duas evidências continuam registradas: a nota não consome nem apaga nada.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 2);
  });
});

test('nenhum teste de /nota grava no evidencias.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await getNota(base);
  });

  const depois = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  assert.equal(depois, antes);
});
```

## `package.json`

```json
"test": "node --test server.test.js evidencias.test.js nota.test.js"
```

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (19.874ms)
✔ evidência sem "fonte": lança erro e não grava (3.3434ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.5456ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.4694ms)
✔ listar evidências de arquivo vazio: devolve [] (5.7598ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (11.1645ms)
✔ nenhum teste grava no evidencias.jsonl de produção (4.9981ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (3.5772ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7769ms)
✔ 2 concorrentes: tem_gente vale 1 e o total soma o ponto (0.5081ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5877ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.7232ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (4.1241ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (159.1822ms)
✔ ideia nao mobile: 200 com tipo "outro" (45.2998ms)
✔ campo ausente: 400 e nada gravado (22.1635ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (27.2286ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (17.6307ms)
✔ body que nao e objeto JSON: 400 e nada gravado (17.9716ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (17.9716ms)
✔ corpo acima de 100kb: 413 e nada gravado (29.7216ms)
✔ GET /saude: 200 com ok e servico (18.2445ms)
✔ rota desconhecida: 404 em JSON (19.4908ms)
✔ GET /validar-ideia: 405 com header Allow: POST (15.1307ms)
✔ POST /saude: 405 com header Allow: GET (15.8062ms)
✔ nenhum teste grava no validacoes.jsonl de producao (14.5026ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (18.2277ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (17.462ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (13.3408ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (19.2208ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (33.3951ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (21.6374ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (15.7435ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (24.7175ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: 200 com tem_gente.pontos igual a 0 (29.1955ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (26.7846ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1437.6048
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Testes |
| -------------------- | ------ |
| `server.test.js`     | 23     |
| `evidencias.test.js` | 7      |
| `nota.test.js`       | 6      |
| **Total**            | **36** |

A projeção da tarefa era "26 anteriores + ~6 + ~4 = ~36". O resultado foi exato: 26 + 6 +
4 = 36, todos passando.

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu. Isso é garantido por dois testes explícitos, que comparam a
contagem do arquivo de produção antes e depois: "nenhum teste de /evidencias grava no
evidencias.jsonl de producao" e "nenhum teste de /nota grava no evidencias.jsonl de
producao".

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
b6630fd Tarefa 12: atualiza README e ESTADO com rotas de evidencias
39a1676 Tarefa 11: expoe evidencias via HTTP
d5f36e5 Adiciona briefing-abertura.md e conversas/ ao gitignore
```

## O que não funcionou ou ficou pendente

Nada falhou. Ficaram pendentes:

1. **`GET /nota` não tem tratamento de 405.** Um `POST /nota`, por exemplo, cai no
   middleware de rota desconhecida e devolve `404`, não `405`. Isso cria uma inconsistência
   com `/evidencias`, que devolve `405` com `Allow: GET, POST`. A especificação desta
   tarefa pedia apenas a rota GET, então nada foi acrescentado além do pedido. É uma
   correção de duas linhas se for desejado.

2. **`README.md` e `ESTADO.md` continuam desatualizados.** Nenhum dos dois foi alterado,
   porque a tarefa não osincluía no escopo. Agora eles:
   - dizem "26 testes" quando são 36;
   - não listam `GET /nota` na tabela de endpoints do README;
   - não listam `nota.js` nem `nota.test.js` na tabela de estrutura;
   - em `ESTADO.md`, a seção "O que existe hoje" não menciona a nota, e a lista "O que não
     existe ainda" ainda inclui "Cálculo de nota (régua)", que deixou de ser inteiramente
     verdade;
   - o "Próximo passo" aponta para a Tarefa 13, que é esta própria tarefa.

   Esta é a segunda vez que a documentação fica para trás depois de uma entrega de código.

3. **Continua sem teste o tratamento de 405 em `/evidencias`.** Pendência herdada da
   Tarefa 11.

4. **A nota é geral, por decisão do PO, e isso tem consequência a registrar.** `GET /nota`
   considera **todas** as evidências do arquivo, sem relação com qualquer ideia. Com o
   `evidencias.jsonl` atual, que tem 3 registros fictícios de uma única ideia, isso não
   aparece. No momento em que houver evidências de ideias diferentes no mesmo arquivo, a
   nota passará a misturar contextos. Não é um defeito da implementação — é a decisão
   registrada —, mas é o limite que ela deixa e que convém ter em mente.

5. **Pendências anteriores, sem relação com esta tarefa:** o comando `memory` do
   `AGENTS.md` não existe; não há script de backup dos `.jsonl` via `cron` na VPS; o
   `.env` não foi criado; e o alerta do `.gitignore` registrado na Tarefa 09 continua
   aberto (`.env.*.local` faz `.env.production` e `.env.staging` serem versionados).

## Observações técnicas para a próxima tarefa

1. **O segundo critério da régua pode seguir exatamente o mesmo padrão.** O módulo já está
   estruturado para crescer: `detalharTemGente`, `avaliarTemGente` e `calcularNota` estão
   separadas. Um segundo critério vira uma função `avaliarX` e uma nova entrada em
   `criterios`. O ponto de atenção é o `total`, que hoje é só `temGente.pontos`: com dois
   critérios, ele passa a ser a **soma** de todos os pontos, e `maximo_possivel` passa a
   ser a soma dos máximos. Essa soma é o ponto em que a implementação atual deixa de
   servir como está, e é bom_planejá-lo já no próximo critério em vez de esperar o quinto.

2. **O texto do `detalhe` está em português sem acento, igual às mensagens do módulo
   `evidencias.js`.** Mantido por coerência com as strings que a API já devolve. Os
   comentários do código usam acentuação. A divergência é conhecida e já foi registrada
   em tarefas anteriores; vale padronizar em algum momento.

3. **A forma da resposta está travada por teste, o que é bom para clientes e restringe
   mudanças futuras.** O sexto teste de `nota.test.js` afirma exatamente as chaves
   `['criterios', 'total', 'maximo_possivel']`. Se no futuro for acrescentado, por exemplo,
   um `gerado_em` no topo, esse teste vai falhar e terá de ser atualizado de propósito.
   Isso é desejável, desde que a alteração seja consciente.

4. **`GET /nota` recalcula tudo a cada chamada, lendo o arquivo.** É a opção simples e
   adequate ao volume atual. Se o cálculo passar a pesar (cinco critérios, muitos
   registros), as saídas a considerar são manter em memória com revalidação em cada
   escrita, ou cachear com invalidação por modification time.

5. **Não há identificador de validação, e a próxima decisão sobre a nota depende disso.**
   A nota atual é geral justamente porque não existe ligação estável entre uma validação e
   suas evidências: `ideia_relacionada` é texto livre. Quando o PO quiser a nota por ideia,
   o caminho passa obrigatoriamente por um `id` em `POST /validar-ideia`. Esta é a mesma
   observação feita na Tarefa 11 e continua válida; quanto mais critérios forem somados,
   mais caro fica retrofitar.

6. **Vale incluir a atualização do `README.md` e do `ESTADO.md` na próxima tarefa, dentro do
   escopo declarado.** As duas últimas tarefas de documentação existiram só para consertar
   esse atraso.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-13-primeira-nota.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-13-primeira-nota.md").Length
22819
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-13-primeira-nota.md`,
com 22.819 bytes.