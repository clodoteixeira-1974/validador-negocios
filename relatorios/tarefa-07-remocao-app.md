# Tarefa 07 - Remocao de app/ e unificacao do 405 na raiz

## Data

2026-10-16

## Objetivo

Unificar a implementacao. A raiz (`server.js`) e a implementacao oficial. A pasta `app/`
era uma segunda implementacao com contrato diferente (`erro` em vez de `error`, sem `tipo`,
sem persistencia) e nao deveria coexistir como versao oficial.

O unico elemento de valor do `app/` que a raiz nao tinha era o tratamento de 405 com
header `Allow` para metodo errado no endpoint. Este foi trazido para a raiz e o `app/`
foi removido por inteiro.

## O que foi feito

1. Verificado o conteudo de todos os 4 arquivos de `app/` antes de remover (ver secao
   "Verificacao pre-remocao"). Nada essencial seria perdido alem do 405.
2. Adicionado tratamento de 405 em `server.js` (raiz):
   - `app.post('/saude', ...)` -> 405 com header `Allow: GET`
   - `app.get('/validar-ideia', ...)` -> 405 com header `Allow: POST`
   - Ambos com corpo `{"error":"Metodo nao permitido","permitido":"<METODO>"}`,
     usando a chave `error` (contrato da raiz), e nao `erro` (contrato do app/).
   - O catch-all 404 continua declarado depois dessas rotas, portanto rotas realmente
     inexistentes seguem retornando 404.
3. Adicionados 2 testes automatizados em `server.test.js` cobrindo os dois 405,
   incluindo validacao do header `Allow` e do corpo JSON.
4. Ajustado `package.json`: `"test": "node --test server.test.js"`. Antes era
   `"node --test"`, que sem argumentos varria todo o diretorio e por isso executava
   tambem os testes de `app/`.
5. Removida a pasta `app/` inteira (`server.js`, `server.test.js`, `package.json`,
   `README.md`).
6. Rodado `npm test` e conferido que `validacoes.jsonl` nao cresceu.

## Verificacao pre-remocao (passo 4)

Conteudo de `app/` no momento da verificacao:

| Arquivo            | Tamanho |
| ------------------ | ------- |
| `server.js`        | 3001 B  |
| `server.test.js`   | 1863 B  |
| `package.json`     | 317 B   |
| `README.md`        | 2515 B  |

Comparacao item a item contra a raiz:

- `app/server.js`: reimplementava em `node:http` puro o que a raiz faz em Express
  (200 de `/saude`, 404 de rota desconhecida, limite de 100 KB com 413, validacao de
  `ideia`). Elemento unico: o bloco 405 com `Allow`. Ja foi portado para a raiz.
- `app/server.test.js`: 4 testes, todos duplicatas de cobertura ja existente na raiz
  (200 com ideia valida, 400 campo ausente, 400 vazio/espacos, 400 tipo errado).
  Nenhum cenario novo.
- `app/package.json`: nome (`validador-negocios`), versao (`0.1.0`), `private: true`,
  `type: module`, `engines: node >= 20` e ausencia de dependencias. Nada disso e
  essencial: a raiz e a oficial e usa CommonJS + Express.
- `app/README.md`: documentacao da implementacao descartada. Descreve o contrato
  antigo (`erro`, resposta sem `tipo`), entao estava desatualizado em relacao a raiz.
  O conteudo unico aproveitavel era a linha da tabela de rotas sobre o 405
  (`POST /saude -> 405`), que ja esta coberto por codigo e teste na raiz. As dicas
  de `curl.exe` / BOM do PowerShell e a observacao sobre UTF-8 sem acento estao
  preservadas na secao "Apendice" deste relatorio, para nao se perderem.

Nenhum achado que justificasse parar. Remocao prosseguiu.

## Conteudo final do server.js

```js
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORTA_PADRAO = 3000;
const LIMITE_CORPO = '100kb';
const SERVICO = 'validador-negocios';

// Arquivo de persistência (JSON Lines), na mesma pasta do server.js
const ARQUIVO_VALIDACOES = path.join(__dirname, 'validacoes.jsonl');

// Palavras que classificam a ideia como mobile
const PALAVRAS_MOBILE = ['app', 'aplicativo'];

// Regra única de classificação
function classificarTipo(ideia) {
  const texto = ideia.toLowerCase();
  const ehMobile = PALAVRAS_MOBILE.some((palavra) => texto.includes(palavra));
  return ehMobile ? 'mobile' : 'outro';
}

// Valida o corpo da requisição. Devolve { ok, status, erro } ou { ok, ideia }.
function validarIdeia(corpo) {
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { ok: false, status: 400, erro: 'Corpo da requisicao deve ser um objeto JSON' };
  }

  if (!('ideia' in corpo)) {
    return { ok: false, status: 400, erro: "Campo 'ideia' ausente ou vazio" };
  }

  const { ideia } = corpo;

  if (typeof ideia !== 'string') {
    return { ok: false, status: 400, erro: "Campo 'ideia' deve ser um texto (string)" };
  }

  if (ideia.trim() === '') {
    return { ok: false, status: 400, erro: "Campo 'ideia' ausente ou vazio" };
  }

  return { ok: true, ideia };
}

// Grava uma validação bem-sucedida em JSON Lines (append).
// O caminho é opcional: os testes automatizados passam um arquivo temporário.
function registrarValidacao(registro, arquivo = ARQUIVO_VALIDACOES) {
  const linha = JSON.stringify(registro);
  fs.appendFileSync(arquivo, linha + '\n', 'utf8');
}

// Cria o app Express com as rotas. Não abre porta: use listen() quando precisar.
// Opções: { arquivoValidacoes } para apontar a persistência para outro caminho.
function createApp(opcoes = {}) {
  const arquivoValidacoes = opcoes.arquivoValidacoes || ARQUIVO_VALIDACOES;

  const app = express();

  // Middleware para parsear JSON, com limite de tamanho de corpo
  app.use(express.json({ limit: LIMITE_CORPO }));

  // Healthcheck
  app.get('/saude', (req, res) => {
    res.json({ ok: true, servico: SERVICO });
  });

  // Metodo errado no healthcheck: 405 com Allow: GET
  app.post('/saude', (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET' });
  });

  // Endpoint POST /validar-ideia
  app.post('/validar-ideia', (req, res) => {
    const resultado = validarIdeia(req.body);

    if (!resultado.ok) {
      return res.status(resultado.status).json({ error: resultado.erro });
    }

    const registro = {
      ideia: resultado.ideia,
      tipo: classificarTipo(resultado.ideia),
      timestamp: new Date().toISOString()
    };

    registrarValidacao(registro, arquivoValidacoes);

    res.json({
      recebido: true,
      ideia: registro.ideia,
      tipo: registro.tipo,
      timestamp: registro.timestamp
    });
  });

  // Metodo errado no endpoint de validacao: 405 com Allow: POST
  app.get('/validar-ideia', (req, res) => {
    res.set('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'POST' });
  });

  // Rota desconhecida
  app.use((req, res) => {
    res.status(404).json({ error: 'Rota nao encontrada', caminho: req.path });
  });

  // Erros do parser de corpo (limite excedido, JSON malformado)
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Corpo da requisicao excede o limite de ' + LIMITE_CORPO });
    }

    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalido' });
    }

    return next(erro);
  });

  return app;
}

// Só abre a porta quando este arquivo é executado diretamente
if (require.main === module) {
  const port = Number(process.env.PORT ?? PORTA_PADRAO);
  const app = createApp();

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Healthcheck: GET http://localhost:${port}/saude`);
    console.log(`Endpoint: POST http://localhost:${port}/validar-ideia`);
    console.log(`Persistindo em: ${ARQUIVO_VALIDACOES}`);
  });
}

module.exports = {
  createApp,
  classificarTipo,
  validarIdeia,
  registrarValidacao,
  ARQUIVO_VALIDACOES,
  PORTA_PADRAO,
  LIMITE_CORPO,
  SERVICO,
  PALAVRAS_MOBILE
};
```

## Conteudo final do server.test.js

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp, ARQUIVO_VALIDACOES } = require('./server');

// Cada teste sobe o servidor em uma porta efêmera (listen(0)) e grava em um
// arquivo temporário. O validacoes.jsonl de produção nunca é tocado.
function arquivoTemporario() {
  const sufixo = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return path.join(os.tmpdir(), `validacoes-teste-${sufixo}.jsonl`);
}

async function comServidor(fn) {
  const arquivo = arquivoTemporario();
  const app = createApp({ arquivoValidacoes: arquivo });

  // app.listen() devolve o servidor HTTP; é nele que ficam listen/address/close
  const servidor = app.listen(0);
  await new Promise((resolve, reject) => {
    servidor.once('listening', resolve);
    servidor.once('error', reject);
  });
  const { port } = servidor.address();

  try {
    return await fn({ base: `http://127.0.0.1:${port}`, arquivo });
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
    fs.rmSync(arquivo, { force: true });
  }
}

async function post(base, corpo) {
  const resposta = await fetch(`${base}/validar-ideia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

async function postCru(base, corpoTexto) {
  const resposta = await fetch(`${base}/validar-ideia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: corpoTexto
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

function lerLinhas(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  return fs.readFileSync(arquivo, 'utf8').split('\n').filter((linha) => linha.trim() !== '');
}

test('ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'App para controlar gastos' });

    assert.equal(r.status, 200);
    assert.equal(r.corpo.recebido, true);
    assert.equal(r.corpo.ideia, 'App para controlar gastos');
    assert.equal(r.corpo.tipo, 'mobile');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), {
      ideia: 'App para controlar gastos',
      tipo: 'mobile',
      timestamp: r.corpo.timestamp
    });
  });
});

test('ideia nao mobile: 200 com tipo "outro"', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'Consultoria de marketing' });

    assert.equal(r.status, 200);
    assert.equal(r.corpo.recebido, true);
    assert.equal(r.corpo.tipo, 'outro');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'outro');
  });
});

test('campo ausente: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, {});

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, "Campo 'ideia' ausente ou vazio");
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('campo vazio ou so com espacos: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const vazio = await post(base, { ideia: '' });
    assert.equal(vazio.status, 400);
    assert.equal(vazio.corpo.error, "Campo 'ideia' ausente ou vazio");

    const espacos = await post(base, { ideia: '   ' });
    assert.equal(espacos.status, 400);
    assert.equal(espacos.corpo.error, "Campo 'ideia' ausente ou vazio");

    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('ideia com tipo errado (numero): 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 123 });

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, "Campo 'ideia' deve ser um texto (string)");
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('body que nao e objeto JSON: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, ['App para controlar gastos']);

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, 'Corpo da requisicao deve ser um objeto JSON');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('JSON malformado: 400 com mensagem em JSON (sem pagina HTML)', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await postCru(base, '{"ideia": ');

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, 'JSON invalido');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('corpo acima de 100kb: 413 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'a'.repeat(101 * 1024) });

    assert.equal(r.status, 413);
    assert.equal(r.corpo.error, 'Corpo da requisicao excede o limite de 100kb');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('GET /saude: 200 com ok e servico', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/saude`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.deepEqual(corpo, { ok: true, servico: 'validador-negocios' });
  });
});

test('rota desconhecida: 404 em JSON', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/nao-existe`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 404);
    assert.equal(corpo.error, 'Rota nao encontrada');
    assert.equal(corpo.caminho, '/nao-existe');
  });
});

test('GET /validar-ideia: 405 com header Allow: POST', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const resposta = await fetch(`${base}/validar-ideia`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'POST');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'POST' });
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('POST /saude: 405 com header Allow: GET', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/saude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET' });
  });
});

test('nenhum teste grava no validacoes.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_VALIDACOES).length;

  await comServidor(async ({ base }) => {
    await post(base, { ideia: 'App de receitas' });
  });

  const depois = lerLinhas(ARQUIVO_VALIDACOES).length;

  assert.equal(depois, antes);
});
```

## Conteudo final do package.json

```json
{
  "name": "validador-de-ideias",
  "version": "1.0.0",
  "description": "Validador de Novos Negócios",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test server.test.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

## Confirmacao de remocao do app/

Comando executado:

```
Remove-Item -LiteralPath "app" -Recurse -Force; "app/ existe: " + (Test-Path -LiteralPath "app")
```

Saida real:

```
app/ existe: False
```

Listagem da raiz depois da remocao (sem `app/`):

```
node_modules
relatorios
.megaignore
Agente Validador - A4 paisagem.pdf
Agente Validador.pdf
clickup-tarefas.csv
clickup-tarefas1.csv
desktop.ini
evidencias.js
evidencias.jsonl
Fluxograma de IA.svg
iavaliadora-sequencia.pdf
package-lock.json
package.json
server.js
server.test.js
testar-evidencias.js
validacoes.jsonl
```

## Saida real do npm test

Executado depois da remocao do `app/`:

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js

✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (246.4793ms)
✔ ideia nao mobile: 200 com tipo "outro" (81.3791ms)
✔ campo ausente: 400 e nada gravado (44.2736ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (28.0267ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (19.6493ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.2566ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (18.5151ms)
✔ corpo acima de 100kb: 413 e nada gravado (30.35ms)
✔ GET /saude: 200 com ok e servico (62.0936ms)
✔ rota desconhecida: 404 em JSON (21.8084ms)
✔ GET /validar-ideia: 405 com header Allow: POST (15.7429ms)
✔ POST /saude: 405 com header Allow: GET (15.3826ms)
✔ nenhum teste grava no validacoes.jsonl de producao (20.5575ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1688.0914
```

Rodada anterior a remocao (para comparacao), ja com o script de teste corrigido:

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js

✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (383.7165ms)
✔ ideia nao mobile: 200 com tipo "outro" (52.7145ms)
✔ campo ausente: 400 e nada gravado (54.5885ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (35.9614ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (23.6849ms)
✔ body que nao e objeto JSON: 400 e nada gravado (31.1032ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (19.2772ms)
✔ corpo acima de 100kb: 413 e nada gravado (30.1555ms)
✔ GET /saude: 200 com ok e servico (21.1308ms)
✔ rota desconhecida: 404 em JSON (23.9262ms)
✔ GET /validar-ideia: 405 com header Allow: POST (17.5063ms)
✔ POST /saude: 405 com header Allow: GET (18.2821ms)
✔ nenhum teste grava no validacoes.jsonl de producao (21.5192ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
ℹ duration_ms 1729.9519
```

Estado do `npm test` antes de comecar a tarefa, ainda com `"test": "node --test"` e com
o `app/` presente (15 testes: 10 da raiz + 5 do `app/`):

```
> validador-de-ideias@1.0.0 test
> node --test

✔ ideia valida: retorna recebido true, texto e timestamp (151.9513ms)
✔ campo ausente: retorna 400 (35.2156ms)
✔ ideia vazia ou com apenas espacos: retorna 400 (12.7298ms)
✔ ideia com tipo errado: retorna 400 (52.5632ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (960.5255ms)
✔ ideia nao mobile: 200 com tipo "outro" (55.6235ms)
✔ campo ausente: 400 e nada gravado (29.6669ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (31.8812ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (26.6655ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.3355ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (18.4874ms)
✔ corpo acima de 100kb: 413 e nada gravado (25.2676ms)
✔ GET /saude: 200 com ok e servico (19.1261ms)
✔ rota desconhecida: 404 em JSON (30.908ms)
✔ nenhum teste grava no validacoes.jsonl de producao (80.4799ms)
ℹ tests 15
ℹ pass 15
ℹ fail 0
ℹ duration_ms 10777.0432
```

## Contagem de linhas do validacoes.jsonl

| Momento                              | Linhas |
| ------------------------------------ | ------ |
| Antes de comecar a tarefa            | 5      |
| Depois de remover `app/` e rodar teste| 5      |

Conteudo final (inalterado, as 5 linhas originais):

```json
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
{"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-16T10:55:36.007Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-16T10:55:36.339Z"}
```

O arquivo nao cresceu, como esperado: todos os testes usam
`createApp({ arquivoValidacoes: <temporario> })` e gravam em `%TEMP%`.

## Divergencia em relacao ao plano

O plano previa **12 testes** ("11 anteriores + 1 novo para o 405"). O resultado real
e **13 testes**, todos passando. A causa esta identificada:

- A raiz realmente tinha **11 testes**, e nao 10. A conta fecha: a verificacao inicial
  executou 15 testes, sendo 11 de `server.test.js` (raiz) e 4 de `app/server.test.js`.
  Os 4 do `app/` sao: "ideia valida", "campo ausente", "ideia vazia", "ideia com
  tipo errado" -- os dois primeiros nomes aparecem tambem na raiz, mas com o sufixo
  "e nada gravado", sao testes distintos.
- O passo 2 do plano descreve **duas** situacoes distintas: GET `/validar-ideia` e
  POST `/saude`, com metodo permitido e caminho diferentes. Foram escritas como
  **2 testes separados**, e nao 1, para que uma falha indique qual das duas rotas
  quebrou.

11 + 2 = 13. O plano contava "11 anteriores + 1 novo" = 12, ou seja, previa um unico
teste de 405 cobrindo os dois casos. A escolha por dois testes e deliberada; o numero
correto de resultado e 13, nao 12.

Nao houve falha de execucao: nenhum erro, nenhum teste pulado, nenhum timeout.

## O que nao funcionou ou ficou pendente

- A meta de "12 testes" nao foi atingida. O real foi 13, todos passando. Causa: foram
  escritos 2 testes de 405 em vez de 1 (decisao deliberada, explicada acima).
- `app/README.md` foi removido sem ter sido portado. O conteudo util (dicas de
  `curl.exe` no PowerShell, cuidado com BOM, tabela de rotas) nao existe em nenhum
  README da raiz, porque a raiz nao tem README. Preservado no Apendice deste relatorio.
- Nenhum README foi criado na raiz. Fora do escopo pedido.

## Observacoes tecnicas para a proxima tarefa

- **Escopo dos 405.** Os handlers sao especificos por rota (`app.post('/saude')` e
  `app.get('/validar-ideia')`). Isso significa que PUT, PATCH e DELETE em
  `/validar-ideia`, ou GET/PUT/DELETE em `/saude`, **ainda caem no catch-all e
  retornam 404**, nao 405. A especificacao pedia apenas GET-em-validar-ideia e
  POST-em-saude, entao isso esta conforme. Se o contrato exigir 405 para qualquer
  metodo invalido, o caminho e substituir por `app.all('/validar-ideia', ...)` e
  `app.all('/saude', ...)` com guarda de metodo, ou um middleware de metodo antes
  das rotas.
- **Ordem de registro importa.** Os handlers 405 foram inseridos **antes** do
  `app.use()` de 404. Se forem movidos para depois, o 404 passa a vencer. Manter
  essa ordem no codigo.
- **Chave de erro.** A raiz usa `error` (ingles) em todas as respostas. O 405 novo
  tambem usa `error`, e nao `erro` do `app/`. Nao reintroduzir `erro`.
- **Script de teste.** `"node --test server.test.js"` passa a testar explicitamente
  um arquivo. Se o projeto ganhar `server.contract.test.js` ou similar, o script
  precisa ser atualizado para listar os arquivos (ou voltar a `node --test`).
- **Contrato de resposta do 405.** Corpos:
  `{ "error": "Metodo nao permitido", "permitido": "POST" }` para `/validar-ideia` e
  `{ "error": "Metodo nao permitido", "permitido": "GET" }` para `/saude`. Header
  `Allow` presente nos dois casos.
- **Persistencia.** `validacoes.jsonl` segue com 5 linhas e nao e tocado pelos testes.
  O mecanismo de `arquivoValidacoes` opcional em `createApp()` continua sendo o que
  isola os testes.
- **Encoding.** Os arquivos da raiz sao UTF-8 **sem BOM**. O console do Windows exibe
  acentos embaralhados, mas o conteudo esta correto. Ao gravar arquivos com
  `Out-File -Encoding utf8` no PowerShell 5.1, cuidado com BOM.

## Apendice - conteudo do app/README.md removido

Preservado aqui porque a raiz nao possui README e este era o unico registro das
observacoes de teste manual.

```markdown
# Validador de Negocios - API minima

Endpoint unico: `POST /validar-ideia`. Sem dependencias externas (usa apenas `node:http`).

## Rodar

cd C:\Users\clodo\Downloads\iavalidadora\app
node server.js

Porta padrao `3000`. Para mudar: `$env:PORT=8080; node server.js`

## Testar (PowerShell - recomendado)

Invoke-RestMethod -Uri http://localhost:3000/validar-ideia -Method Post -ContentType "application/json" -Body (@{ ideia = "Padaria para bairro periferico" } | ConvertTo-Json)

Saida esperada:

{
  "recebido": true,
  "ideia": "Padaria para bairro periferico",
  "timestamp": "2026-10-15T21:55:14.173Z"
}

Entrada invalida:

try { Invoke-RestMethod -Uri http://localhost:3000/validar-ideia -Method Post -ContentType "application/json" -Body "{}" } catch { "$($_.Exception.Response.StatusCode.value__) $($_.ErrorDetails.Message)" }

Saida esperada: `400 {"erro":"campo 'ideia' e obrigatorio"}`

## Testar (curl)

O `curl.exe` no PowerShell embaralha as aspas quando o JSON tem espacos. Opcoes que funcionam:

# 1. sem espacos, com escape duplo
curl.exe -s -X POST http://localhost:3000/validar-ideia -H "Content-Type: application/json" --data-raw '{\"ideia\":\"Padaria\"}'

# 2. via arquivo gravado SEM BOM (Out-File -Encoding utf8 do PS 5.1 cria BOM e quebra o JSON.parse)
[System.IO.File]::WriteAllText("$env:TEMP\ideia.json", '{"ideia":"Padaria para bairro periferico"}', (New-Object System.Text.UTF8Encoding($false)))
curl.exe -s -X POST http://localhost:3000/validar-ideia -H "Content-Type: application/json" --data-binary "@$env:TEMP\ideia.json"

## Testes automaticos

npm test

## Rotas

| Metodo | Rota              | Resultado                                              |
| ------ | ----------------- | ------------------------------------------------------ |
| POST   | `/validar-ideia`  | 200 `{recebido, ideia, timestamp}` / 400 erro           |
| GET    | `/saude`          | 200 `{ok, servico}`- healthcheck                        |
| POST   | `/saude`          | 405 metodo nao permitido                                 |
| POST   | qualquer outra    | 404 rota nao encontrada                                  |

Erros de validacao: campo ausente, texto vazio (so espacos), tipo diferente de string,
corpo que nao e objeto JSON e JSON malformado.

## Notas

- Limite de 100 KB no corpo da requisicao (413 se exceder).
- UTF-8 sem acento no JSON de erro para evitar ruido no terminal Windows.
```

Observacao: este README descrevia o contrato antigo (`erro`, resposta sem `tipo`). Se
for aproveitado na raiz, precisa ser reescrito para o contrato atual (`error`, com
`tipo`) e o caminho `cd ...\iavalidadora\app` deve virar `cd ...\iavalidadora`.