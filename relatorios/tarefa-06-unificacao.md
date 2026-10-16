# Relatório: Tarefa 06 - Unificação

**Data:** 16/10/2026

**Objetivo:**
Unificar o servidor em uma implementação única testável, garantindo que os testes automatizados não sujem o arquivo de produção `validacoes.jsonl`. A implementação alcançada separa a construção do app Express da abertura de porta (`createApp`) e permite injetar o caminho do arquivo de persistência, de modo que os testes rodem contra arquivo temporário.

**Resultado resumido:** a refatoração do `server.js` está funcionando e foi verificada por medição de linhas antes/depois. A unificação entre o servidor da raiz e o servidor em `app/`, porém, NÃO foi concluída: `app/` continua sendo uma segunda implementação completa e independente, com contrato de resposta diferente.

---

## O que foi feito

- Verificado o estado dos arquivos na raiz: `server.js`, `server.test.js`, `package.json`.
- Confirmado que `server.js` já estava no formato refatorado: `createApp({ arquivoValidacoes })` constrói o app sem abrir porta; `app.listen()` ocorre apenas no bloco `require.main === module`; `registrarValidacao(registro, arquivo)` recebe o caminho por parâmetro com default `ARQUIVO_VALIDACOES`.
- Confirmado que `server.test.js` sobe o servidor em porta efêmera (`listen(0)`) e grava em arquivo temporário em `os.tmpdir()`, removendo o arquivo no `finally`.
- Confirmado que o healthcheck na porta 3100 responde antes de qualquer teste.
- Contadas as linhas de `validacoes.jsonl` antes dos testes manuais.
- Executados os 5 testes manuais na porta 3100.
- Contadas as linhas de `validacoes.jsonl` depois dos testes manuais.
- Executado `npm test` e capturada a saída completa.
- Contadas as linhas de `validacoes.jsonl` depois do `npm test`.
- Verificada a ausência de arquivos temporários residuais em `%TEMP%`.
- Investigada a origem dos 15 testes reportados pelo runner (11 em `server.test.js` da raiz, 4 em `app/server.test.js`).

---

## Conteúdo final do server.js

```javascript
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

---

## Conteúdo final do server.test.js

```javascript
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

test('nenhum teste grava no validacoes.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_VALIDACOES).length;

  await comServidor(async ({ base }) => {
    await post(base, { ideia: 'App de receitas' });
  });

  const depois = lerLinhas(ARQUIVO_VALIDACOES).length;

  assert.equal(depois, antes);
});
```

---

## Conteúdo final do package.json

```json
{
  "name": "validador-de-ideias",
  "version": "1.0.0",
  "description": "Validador de Novos Negócios",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

---

## Dependências instaladas

Na raiz do projeto:

| Pacote | Versão declarada | Versão instalada |
|---|---|---|
| express | `^4.18.2` | 4.22.3 |

Ambiente:

| Item | Versão |
|---|---|
| Node.js | v24.14.1 |
| npm | 11.11.0 |
| node_modules na raiz | presente |
| node_modules em `app/` | **ausente** |

`app/` não possui dependências declaradas nem instaladas. A duplicação em `app/` não depende de nada externo (usa apenas `node:http`).

Não há `eslint.config.js` nem `tsconfig.json` no projeto, portanto os comandos `npx tsc --noEmit` e `npx eslint .` não se aplicam a este repositório JavaScript sem configuração. A verificação feita foi a execução dos testes.

Não existe `.git` no diretório.

---

## Comandos exatos para testar

Todos executados a partir de `C:\Users\clodo\Downloads\iavalidadora`.

Contagem de linhas:

```powershell
(Get-Content validacoes.jsonl | Measure-Object -Line).Lines
```

Subir o servidor na porta 3100 (necessário para os testes manuais):

```powershell
$env:PORT = 3100
node server.js
```

Teste manual (a) - healthcheck:

```powershell
curl.exe -s -i -X GET "http://localhost:3100/saude"
```

Testes manuais (b) a (e). **Atenção**: passar o JSON direto em `-d` no PowerShell 5.1 corrompe o corpo (as aspas duplas são removidas na passagem de argumentos para o executável nativo), e o servidor responde `400 {"error":"JSON invalido"}`. O caminho confiável é gravar o corpo em arquivo e usar `--data-binary`:

```powershell
$tmp = "$env:TEMP"
Set-Content -LiteralPath "$tmp\b.json" -NoNewline -Encoding ascii -Value '{"ideia":"App para controlar gastos"}'
Set-Content -LiteralPath "$tmp\c.json" -NoNewline -Encoding ascii -Value '{"ideia":"Consultoria de marketing"}'
Set-Content -LiteralPath "$tmp\d.json" -NoNewline -Encoding ascii -Value '{}'
Set-Content -LiteralPath "$tmp\e.json" -NoNewline -Encoding ascii -Value '{"ideia":123}'

curl.exe -s -i -X POST "http://localhost:3100/validar-ideia" -H "Content-Type: application/json" --data-binary "@$tmp\b.json"
curl.exe -s -i -X POST "http://localhost:3100/validar-ideia" -H "Content-Type: application/json" --data-binary "@$tmp\c.json"
curl.exe -s -i -X POST "http://localhost:3100/validar-ideia" -H "Content-Type: application/json" --data-binary "@$tmp\d.json"
curl.exe -s -i -X POST "http://localhost:3100/validar-ideia" -H "Content-Type: application/json" --data-binary "@$tmp\e.json"
```

Suíte automatizada:

```powershell
npm test
```

---

## Resultado observado dos testes manuais (com status HTTP)

### Primeira tentativa - FALHOU por quoting do shell, não por bug do servidor

Comando usado: `curl.exe -s -i -X POST "..." -H "Content-Type: application/json" -d '{"ideia":"App para controlar gastos"}'`

Saída real:

```
=== (b) POST valido mobile ===
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 25
ETag: W/"19-Gs0n6CmbrGn49lu+pH9zTgEi2Ug"
Date: Fri, 16 Oct 2026 10:55:30 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"JSON invalido"}

=== (c) POST valido outro ===
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 25
ETag: W/"19-Gs0n6CmbrGn49lu+pH9zTgEi2Ug"
Date: Fri, 16 Oct 2026 10:55:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"JSON invalido"}

=== (e) POST invalido com numero ===
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 25
ETag: W/"19-Gs0n6CmbrGn49lu+pH9zTgEi2Ug"
Date: Fri, 16 Oct 2026 10:55:31 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"JSON invalido"}
```

Diagnóstico: o corpo recebido era `{ideia:App para controlar gastos}` (sem aspas), que não é JSON válido. O `Content-Length: 25` é idêntico nos três casos e corresponde ao tamanho de `{ideia:123}` depois da remoção das aspas, confirmando que o PowerShell removeu todas as aspas duplas antes de entregar o argumento ao `curl.exe`. Não é defeito do servidor: o handler de `entity.parse.failed` funcionou corretamente, retornando 400 em JSON em vez de página HTML.

Observação relevante: o próprio `app/README.md` (linhas 38-49) já documenta esse problema do `curl.exe` no PowerShell e indica as duas soluções. A primeira tentativa não seguiu a documentação.

O teste (d) passou na primeira tentativa porque `{}` não contém aspas.

### Segunda tentativa - resultado válido, usando arquivo temporário

**(a) GET /saude** - HTTP 200

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 42
ETag: W/"2a-OpjhemAWRPGrcfAJRh4A/BmKM28"
Date: Fri, 16 Oct 2026 10:55:30 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"ok":true,"servico":"validador-negocios"}
```

**(b) POST valido mobile** `{"ideia":"App para controlar gastos"}` - HTTP 200

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 108
ETag: W/"6c-h/PjRDens0n29EocvjtP5rlDEWg"
Date: Fri, 16 Oct 2026 10:55:36 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"recebido":true,"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-16T10:55:36.007Z"}
```

**(c) POST valido outro** `{"ideia":"Consultoria de marketing"}` - HTTP 200

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 106
ETag: W/"6a-dYb1QOQSYAM9jZjdm/DNEukGa4Q"
Date: Fri, 16 Oct 2026 10:55:36 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"recebido":true,"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-16T10:55:36.339Z"}
```

**(d) POST invalido sem campo** `{}` - HTTP 400

```
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 42
ETag: W/"2a-yhANq5R+KHqzyjkwIyEdmA6IiLE"
Date: Fri, 16 Oct 2026 10:55:36 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Campo 'ideia' ausente ou vazio"}
```

**(e) POST invalido com numero** `{"ideia":123}` - HTTP 400

```
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 52
ETag: W/"34-2nBVvD/bQaE+F5ZFnDR6EBLoHQc"
Date: Fri, 16 Oct 2026 10:55:36 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Campo 'ideia' deve ser um texto (string)"}
```

Resumo: 5 de 5 com o comportamento esperado. Classificação mobile/outro correta, validação de campo ausente correta, validação de tipo incorreto correta, todas as respostas em JSON.

---

## Contagem de linhas do validacoes.jsonl

### Antes dos testes manuais: 3 linhas

Conteúdo:

```
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
{"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
```

As 3 linhas são remanescentes das tarefas anteriores (Tarefa 04 e script de teste).

### Depois dos testes manuais: 5 linhas (+2)

Conteúdo:

```
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
{"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-16T10:55:36.007Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-16T10:55:36.339Z"}
```

**Por que exatamente 2 linhas foram adicionadas:** apenas as requisições aceitas gravam registro. Os testes (b) e (c) são POSTs válidos e cada um gerou uma linha, com o mesmo `timestamp` devolvido na resposta, confirmando a correspondência. Os testes (a), (d) e (e) não gravaram: (a) é GET e não passa pelo handler de gravação; (d) e (e) retornaram 400, e o `server.js` chama `res.status(resultado.status).json(...)` com `return` antes de chegar em `registrarValidacao`, ou seja, a validação ocorre antes de qualquer escrita.

As 3 requisições que falharam com "JSON invalido" na primeira tentativa também não gravaram nada, pelo mesmo motivo (falha no parser, antes do handler).

O crescimento de 3 para 5 é o comportamento correto de produção: chamadas reais via HTTP devem ser persistidas.

### Depois do npm test: 5 linhas (+0)

O arquivo permaneceu com as mesmas 5 linhas, sem nenhuma alteração. Verificação adicional: não há resíduo de `validacoes-teste-*.jsonl` em `%TEMP%`, confirmando que o `fs.rmSync(arquivo, { force: true })` no bloco `finally` de `comServidor` limpou os arquivos temporários.

---

## Resultado observado do npm test (saída completa)

```
> validador-de-ideias@1.0.0 test
> node --test

✔ ideia valida: retorna recebido true, texto e timestamp (197.3126ms)
✔ campo ausente: retorna 400 (35.4732ms)
✔ ideia vazia ou com apenas espacos: retorna 400 (15.6051ms)
✔ ideia com tipo errado: retorna 400 (24.5339ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (180.9077ms)
✔ ideia nao mobile: 200 com tipo "outro" (41.2915ms)
✔ campo ausente: 400 e nada gravado (19.2504ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (28.7724ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (16.5534ms)
✔ body que nao e objeto JSON: 400 e nada gravado (17.8816ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (16.2921ms)
✔ corpo acima de 100kb: 413 e nada gravado (22.0461ms)
✔ GET /saude: 200 com ok e servico (19.3072ms)
✔ rota desconhecida: 404 em JSON (15.9252ms)
✔ nenhum teste grava no validacoes.jsonl de producao (20.7732ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1264.0124
```

15 testes, 15 passaram, 0 falharam.

Ponto importante: `server.test.js` da raiz contém **11** testes. Os 4 primeiros da listagem (`ideia valida: retorna recebido true, texto e timestamp`, `campo ausente: retorna 400`, `ideia vazia ou com apenas espacos: retorna 400`, `ideia com tipo errado: retorna 400`) não existem no arquivo da raiz. Eles vêm de `app/server.test.js`, que o runner `node --test` também descobre porque percorre o diretório recursivamente (ignorando apenas `node_modules`). A ordem de execução confirma isso, já que o `node --test` executa os arquivos em paralelo.

---

## Confirmação de que os testes automatizados NÃO alteraram o arquivo real

**Confirmado por medição direta.**

| Etapa | Linhas em `validacoes.jsonl` | Delta |
|---|---|---|
| Antes dos testes manuais | 3 | - |
| Depois dos testes manuais | 5 | +2 |
| Depois do `npm test` | 5 | +0 |

O `npm test` rodou 15 testes, sendo 3 deles com POST aceito (mobile, nao mobile, mais o teste de protecao que grava `App de receitas`), e nenhum deles apareceu no arquivo de produção. A refatoração funciona: os testes automatizados usam arquivo isolado em `os.tmpdir()`.

O motivo está em `server.test.js:18`, onde `createApp({ arquivoValidacoes: arquivo })` aponta a persistência para o arquivo temporário, combinado com o default parameter em `server.js:47` (`registroValidacao(registro, arquivo = ARQUIVO_VALIDACOES)`).

Não há teste de regressão automatizado no repositório que falhe se essa proteção for removida no futuro. O teste `nenhum teste grava no validacoes.jsonl de producao` (`server.test.js:184`) verifica o efeito colateral apenas se ele ocorrer durante a própria execução dos testes; se alguém reintroduzir o caminho fixo, ele falha, o que é aceitável. Mas se `validacoes.jsonl` for movido ou renomeado, esse teste quebra sem aviso claro, porque importa `ARQUIVO_VALIDACOES` do módulo.

---

## O que não funcionou ou ficou pendente

**1. A unificação em si NÃO foi concluída. `app/` continua duplicando a implementação.**

Este é o item principal. A pasta `app/` contém uma segunda implementação completa e independente do mesmo serviço:

| Aspecto | Raiz (`server.js`) | `app/server.js` |
|---|---|---|
| Runtime | CommonJS (`require`/`module.exports`) | ESM (`import`/`export`, `"type": "module"`) |
| HTTP | Express 4.22.3 | `node:http` puro, sem dependência |
| Campo de erro na resposta | `error` | `erro` |
| Mensagem de campo ausente | `Campo 'ideia' ausente ou vazio` | `campo 'ideia' e obrigatorio` |
| Mensagem de texto vazio | `Campo 'ideia' ausente ou vazio` | `campo 'ideia' nao pode ser vazio` |
| Campo `tipo` na resposta | sim (`mobile`/`outro`) | **não existe** |
| Persistência em JSONL | sim | **não existe** |
| `GET /saude` | 200 | 200 |
| Rota inexistente | 404 | 404 |
| `POST /saude` | 404 (cai no catch-all) | **405** com header `Allow: POST` |
| `405` para método errado | não existe | existe |
| `413` limite de corpo | via middleware do Express | via contador manual em `lerCorpo` |
| `package.json` | nome `validador-de-ideias`, v1.0.0 | nome `validador-negocios`, v0.1.0, private |

Os contratos de resposta são divergentes: um cliente que trata `erro` falha contra a raiz, e vice-versa. As mensagens de erro não batem nem em texto nem em capitalização. Isso não é uma refatoração unificada, são dois produtos diferentes convivendo no mesmo repositório.

Consequência operacional já observada: `npm test` na raiz executa os testes da duplicação também, o que é reportado como 15 testes em vez de 11. O resultado é verde, mas o número reportado não corresponde ao que o arquivo principal cobre, e o teste `'ideia valida: retorna recebido true, texto e timestamp'` da duplicação não verifica o campo `tipo` nem a persistência, criando uma falsa sensação de cobertura.

**2. Não está definido qual implementação é a canônica.** `app/` tem um README próprio (`app/README.md`, 72 linhas) com instruções de execução e tabela de rotas que descrevem o comportamento da duplicação, incluindo o endpoint 405 que a raiz não tem. Remover `app/` exige decidir se o 405 e o `Allow` header entram na implementação da raiz.

**3. `npm test` não isola o escopo.** O script é `node --test`, que varre recursivamente a partir da raiz. Após eliminar a duplicação, convém restringir o escopo explicitamente (`node --test server.test.js`) para que a suíte não volte a crecer silenciosamente com arquivos esquecidos em subdiretórios.

**4. Problema de quoting do PowerShell com `curl.exe`.** Não é bug do projeto, mas afeta todos os testes manuais e já foi documentado no `app/README.md`. Em PowerShell 5.1, `-d '{"a":"b"}'` perde as aspas duplas na fronteira com o executável nativo. O contorno confiável é `--data-binary "@arquivo"`, ou `Invoke-RestMethod`, que trata o objeto nativamente. Recomenda-se padronizar em `Invoke-RestMethod` para testes manuais.

**5. Não existe `.gitignore`.** `validacoes.jsonl`, `evidencias.jsonl` e `node_modules` seriam versionados se o projeto virar repositório. Também não há `.git`, então não há histórico para reverter a remoção de `app/`.

**6. Sem `eslint.config.js` nem `tsconfig.json`.** Os comandos de verificação globais (`npx tsc --noEmit`, `npx eslint .`) não são aplicáveis. O `server.js` contém um comentário `// eslint-disable-next-line no-unused-vars` (linha 97) apontando para uma regra que não está configurada no projeto; ele é inofensivo, mas indica herança de um template.

**7. `evidencias.js` e `testar-evidencias.js` continuam fora do servidor.** Confirmado que o módulo de evidências (Tarefa 05) não é importado por `server.js`. Não há caminho HTTP para registrar ou listar evidências. Além disso, `testar-evidencias.js` é um script de verificação manual com efeito colateral: ele faz append em `evidencias.jsonl` a cada execução e não é nomeado `*.test.js`, então `node --test` não o executa e ele tampouco é isolado.

**8. `registrarValidacao` usa `fs.appendFileSync` dentro do handler.** Escrita síncrona bloqueando o event loop a cada requisição aceita. Adequado no volume atual; é um ponto conhecido para a fase de RAG/volume.

---

## Observações técnicas para a próxima tarefa

- O padrão de isolamento já está pronto e deve ser mantido: `createApp(opcoes)` constrói o app sem abrir porta, e a dependência externa crítica (caminho do arquivo) entra por parâmetro. Qualquer novo módulo que grave em disco deve seguir o mesmo desenho (`criarModulo({ caminhoArquivo })`), e não capturar o caminho em constante de módulo no momento da_require, sob pena de reintroduzir o problema.
- Para concluir a unificação, o caminho mais direto é: migrar para a raiz os comportamentos que existem apenas em `app/` e que valem a pena (o 405 com header `Allow` é o candidato mais forte), consolidar a implementação Express em um único lugar, e então remover `app/` por inteiro, junto com `app/README.md` e `app/package.json`. A alternativa é mover a raiz para dentro de `app/`, o que é mais custoso porque a raiz já tem `evidencias.js`, `validacoes.jsonl`, `evidencias.jsonl` e histórico de relatórios ancorados nela.
- Antes de remover qualquer coisa, é preciso registrar em qual arquivo os relatórios anteriores apontam como canônico. Os relatórios `relatorios/tarefa-02` a `tarefa-05` descrevem `server.js` na raiz, então a raiz é a vencedora natural.
- Ao remover `app/`, reexecutar `npm test` e conferir que o total cai de 15 para 11 e continua verde. Essa é a verificação objetiva da unificação.
- Convém trocar `"test": "node --test"` por `"test": "node --test server.test.js"` depois da limpeza, para que a suíte não volte a inflar por acidente.
- Ao unificar o contrato, escolher um único nome de campo de erro. `error` é o que a raiz já usa em todas as respostas e o que `server.test.js` da raiz verifica em 5 asserções; adotá-lo minimiza mudança.
- Ao integrar `evidencias.js` ao `server.js`, reutilizar `registrarEvidencia` a partir do handler e injetar o caminho do `evidencias.jsonl` pelo mesmo mecanismo de `createApp`, para que os testes continuem isolados também para evidências.
- Para testes manuais no Windows, usar `Invoke-RestMethod` ou `--data-binary "@arquivo"`; nunca `-d` com JSON inline contendo aspas duplas no PowerShell 5.1.
- Considerar `git init` com `.gitignore` antes da próxima tarefa que envolva remover arquivos, para que a remoção de `app/` seja reversível.