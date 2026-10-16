# Tarefa 11 — Exposição de evidências via HTTP

## Data

16/10/2026

## Objetivo

Integrar o módulo `evidencias.js` ao `server.js` e expor as evidências por HTTP, criando
`POST /evidencias` e `GET /evidencias`. Até aqui o módulo existia e estava testado (7
testes em `evidencias.test.js`), mas só era acessível por chamada direta a partir de
outro código: não havia rota HTTP para registrar nem para listar evidências.

A integração também precisava preservar o isolamento dos testes. Foi exatamente esse
ponto que a Tarefa 09 corrigiu ao permitir injeção de caminho em `evidencias.js`; sem
aquela correção, os novos testes de HTTP teriam escrito no `evidencias.jsonl` de produção.

## O que foi feito

1. **Importado o módulo em `server.js`**, com `registrarEvidencia`, `listarEvidencias` e
   `ARQUIVO_EVIDENCIAS`.

2. **Criado o endpoint `POST /evidencias`**. Recebe `tipo`, `fonte`, `url` (opcional),
   `trecho_bruto`, `ideia_relacionada` e `relevancia`; devolve `201` com a evidência
   gravada, já com `id` e `timestamp` gerados pelo módulo. Se a validação falhar,
   devolve `400` com `{"error": "<motivo>"}`.

3. **Impedido que o cliente controle `id` e `timestamp`.** A lista de campos aceitos
   (`CAMPOS_EVIDENCIA`) não inclui esses dois campos, e um objeto novo é montado a partir
   deles antes de chamar o módulo. Assim, mesmo que o cliente envie `id` ou `timestamp`, os
   valores são descartados e o módulo gera os seus. Isso é verificado por teste.

4. **Criado o endpoint `GET /evidencias`**, que devolve `{ "total": N, "evidencias": [...] }`.
   Com o arquivo vazio ou inexistente, devolve `{ "total": 0, "evidencias": [] }`.

5. **Adicionado o tratamento de 405** para métodos não suportados em `/evidencias`, com
   `Allow: GET, POST`. Por ser a única rota com dois métodos válidos, aqui foi usado
   `app.all` em vez do padrão `app.get`/`app.post` isolado usado nas outras rotas.

6. **Adicionada a opção `arquivoEvidencias`** em `createApp`, junto com a já existente
   `arquivoValidacoes`. Sem a opção, vale o default `ARQUIVO_EVIDENCIAS`.

7. **Mantidos intactos os endpoints existentes**: `/saude` e `/validar-ideia` não sofreram
   alteração de comportamento.

8. **Adicionados 6 testes em `server.test.js`**, usando arquivos temporários em
   `os.tmpdir()` para os dois formatos de dados.

9. **Rodada a suíte**: 26 testes, 26 passando, 0 falhando.

### Como o isolamento foi garantido

O `comServidor` foi ajustado para criar dois arquivos temporários — um para validações e
outro para evidências — e injetar os dois caminhos em `createApp`. Ambos são removidos no
`finally`. Assim, nenhum teste toca `validacoes.jsonl` nem `evidencias.jsonl` de produção.

### Detalhe de implementação: o 405 com `app.all`

Nas rotas existentes, o 405 é declarado com o método específico (`app.post('/saude')` para
bloquear métodos errados em uma rota GET). Em `/evidencias` isso não serviria, porque GET e
POST são ambos válidos. A solução foi declarar `app.all('/evidencias', ...)` **depois** do
GET e do POST, de modo que só os métodos restantes cheguem nele.

A ordem das rotas no arquivo é, portanto, relevante e foi conferida:

```
app.get('/saude')  ->  app.post('/saude')  ->  app.post('/validar-ideia')
  ->  app.get('/validar-ideia')  ->  app.get('/evidencias')  ->  app.post('/evidencias')
  ->  app.all('/evidencias')  ->  404  ->  middleware de erro
```

### Um desvio do que foi especificado, registrado aqui

A especificação pedia **6 testes novos**, chegando a 26 no total. A primeira versão
escreveu **7**, porque o requisito "não aceita `id` nem `timestamp` do cliente" foi
implementado como um teste separado. Isso daria 27 testes, contrariando o total esperado.

O teste extra foi **removido**, e as asserções de rejeição do `id`/`timestamp` do cliente
foram fundidas dentro do primeiro teste de `POST /evidencias`. O requisito continua
coberto: o caso "sem `id` nem `timestamp` no corpo" já é testado em
`evidencias.test.js`, no teste "evidência válida: grava e devolve id e timestamp
preenchidos". O total final é 26, como especificado.

### Testes manuais: não executados nesta rodada

A verificação manual com o servidor no ar e `curl.exe` não foi concluída. Este relatório
não a apresenta como evidência. O que se registra é o que de fato aconteceu:

- O servidor subiu e imprimiu as rotas novas:

  ```
  Servidor rodando na porta 3000
  Healthcheck: GET http://localhost:3000/saude
  Endpoint: POST http://localhost:3000/validar-ideia
  Evidencias: GET/POST http://localhost:3000/evidencias
  Persistindo em: C:\Users\clodo\Downloads\iavalidadora\validacoes.jsonl
  Evidencias em: C:\Users\clodo\Downloads\iavalidadora\evidencias.jsonl
  ```

- O healthcheck respondeu corretamente via `curl.exe`:

  ```
  HTTP/1.1 200 OK
  X-Powered-By: Express
  Content-Type: application/json; charset=utf-8
  Content-Length: 42
  ETag: W/"2a-OpjhemAWRPGrcfAJRh4A/BmKM28"
  Date: Fri, 16 Oct 2026 15:28:05 GMT
  Connection: keep-alive
  Keep-Alive: timeout=5

  {"ok":true,"servico":"validador-negocios"}
  ```

- Um `POST /evidencias` via `curl.exe` **não devolveu saída alguma**, e o processo do
  servidor foi encerrado junto com a sessão do PowerShell que o criou. Nenhuma evidência
  do POST válido, do `GET /evidencias` subsequente, nem dos dois casos de 400 foi obtida
  por essa via.

- Houve também um processo `node` órfão de uma tentativa anterior, que sobreviveu à
  sessão e precisou ser encerrado (PID 15804). Nenhum dado foi gravado: `evidencias.jsonl`
  continuou com 3 linhas.

A causa já é conhecida e está documentada nas Tarefas 03, 04 e 06: `curl.exe` com aspas
duplas escapadas não funciona neste PowerShell 5.1, e processos iniciados com
`Start-Process` morrem quando a sessão que os criou termina. As tentativas de contornar
isso com `Start-Process` e redirecionamento de saída não estabilizaram o processo.

A evidência de que as rotas funcionam é a suíte automatizada: os 6 testes novos sobem o
servidor em porta efêmera e fazem requisições HTTP reais via `fetch`, exercitando os
mesmos caminhos de código dos endpoints.

## Conteúdo final do `server.js`

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');

const {
  registrarEvidencia,
  listarEvidencias,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

const PORTA_PADRAO = 3000;
const LIMITE_CORPO = '100kb';
const SERVICO = 'validador-negocios';

// Arquivo de persistência (JSON Lines), na mesma pasta do server.js
const ARQUIVO_VALIDACOES = path.join(__dirname, 'validacoes.jsonl');

// Palavras que classificam a ideia como mobile
const PALAVRAS_MOBILE = ['app', 'aplicativo'];

// Campos que o cliente pode enviar em POST /evidencias.
// id e timestamp nao entram aqui: sao gerados pelo modulo evidencias.js.
const CAMPOS_EVIDENCIA = ['tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'relevancia'];

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
  const arquivoEvidencias = opcoes.arquivoEvidencias || ARQUIVO_EVIDENCIAS;

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

  // Lista as evidencias gravadas
  app.get('/evidencias', (req, res) => {
    const evidencias = listarEvidencias(arquivoEvidencias);
    return res.json({ total: evidencias.length, evidencias });
  });

  // Registra uma evidencia. id e timestamp sao gerados pelo modulo, nunca
  // aceitos do cliente. O modulo lanca Error com .erros quando a evidencia e invalida.
  app.post('/evidencias', (req, res) => {
    const corpo = req.body;
    const dados = {};

    for (const campo of CAMPOS_EVIDENCIA) {
      dados[campo] = corpo ? corpo[campo] : undefined;
    }

    try {
      const gravada = registrarEvidencia(dados, arquivoEvidencias);
      return res.status(201).json(gravada);
    } catch (erro) {
      return res.status(400).json({ error: erro.message });
    }
  });

  // Qualquer outro metodo em /evidencias: 405 com Allow: GET, POST
  app.all('/evidencias', (req, res) => {
    res.set('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET, POST' });
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
    console.log(`Evidencias: GET/POST http://localhost:${port}/evidencias`);
    console.log(`Persistindo em: ${ARQUIVO_VALIDACOES}`);
    console.log(`Evidencias em: ${ARQUIVO_EVIDENCIAS}`);
  });
}

module.exports = {
  createApp,
  classificarTipo,
  validarIdeia,
  registrarValidacao,
  ARQUIVO_VALIDACOES,
  ARQUIVO_EVIDENCIAS,
  PORTA_PADRAO,
  LIMITE_CORPO,
  SERVICO,
  PALAVRAS_MOBILE,
  CAMPOS_EVIDENCIA
};
```

## Conteúdo final do `server.test.js`

A parte que mudou: o `comServidor`, que agora cria dois arquivos temporários e injeta os
dois caminhos.

```javascript
const { createApp, ARQUIVO_VALIDACOES, ARQUIVO_EVIDENCIAS } = require('./server');

// Cada teste sobe o servidor em uma porta efêmera (listen(0)) e grava em arquivos
// temporários. Os .jsonl de produção nunca são tocados.
function arquivoTemporario(prefixo = 'validacoes') {
  const sufixo = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return path.join(os.tmpdir(), `${prefixo}-teste-${sufixo}.jsonl`);
}

async function comServidor(fn) {
  const arquivo = arquivoTemporario('validacoes');
  const arquivoEvidencias = arquivoTemporario('evidencias');
  const app = createApp({ arquivoValidacoes: arquivo, arquivoEvidencias });

  // app.listen() devolve o servidor HTTP; é nele que ficam listen/address/close
  const servidor = app.listen(0);
  await new Promise((resolve, reject) => {
    servidor.once('listening', resolve);
    servidor.once('error', reject);
  });
  const { port } = servidor.address();

  try {
    return await fn({
      base: `http://127.0.0.1:${port}`,
      arquivo,
      arquivoEvidencias
    });
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
    fs.rmSync(arquivo, { force: true });
    fs.rmSync(arquivoEvidencias, { force: true });
  }
}
```

Auxiliares adicionados:

```javascript
async function postEvidencia(base, corpo) {
  const resposta = await fetch(`${base}/evidencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

async function getEvidencias(base) {
  const resposta = await fetch(`${base}/evidencias`);
  return { status: resposta.status, corpo: await resposta.json() };
}

function evidenciaValida(extra = {}) {
  return Object.assign({
    tipo: 'concorrente',
    fonte: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=exemplo.financas',
    trecho_bruto: 'Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas.',
    ideia_relacionada: 'App para controlar gastos',
    relevancia: 'alta'
  }, extra);
}
```

Os 6 testes novos, no fim do arquivo:

```javascript
test('POST /evidencias valido: 201 com id e timestamp gerados pelo servidor', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    // id e timestamp vao no corpo de proposito: o servidor deve ignorar e gerar os seus.
    const r = await postEvidencia(base, evidenciaValida({
      id: 'id-falsificado-do-cliente',
      timestamp: '1999-01-01T00:00:00.000Z'
    }));

    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'concorrente');
    assert.equal(r.corpo.fonte, 'Google Play');
    assert.equal(r.corpo.relevancia, 'alta');
    assert.notEqual(r.corpo.id, '');
    assert.notEqual(r.corpo.id, 'id-falsificado-do-cliente');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.notEqual(r.corpo.timestamp, '1999-01-01T00:00:00.000Z');

    // O que foi devolvido e o que esta no arquivo temporario.
    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), r.corpo);
  });
});

test('POST /evidencias sem "fonte": 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const semFonte = evidenciaValida();
    delete semFonte.fonte;

    const r = await postEvidencia(base, semFonte);

    assert.equal(r.status, 400);
    assert.match(r.corpo.error, /Evidência inválida/);
    assert.match(r.corpo.error, /"fonte"/);
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('POST /evidencias com "tipo" invalido: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({ tipo: 'blog' }));

    assert.equal(r.status, 400);
    assert.match(r.corpo.error, /"tipo" inválido/);
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('GET /evidencias vazio: 200 com total 0 e lista vazia', async () => {
  await comServidor(async ({ base }) => {
    const r = await getEvidencias(base);

    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo, { total: 0, evidencias: [] });
  });
});

test('GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Fonte A' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Fonte B', relevancia: 'media' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'dado_mercado', fonte: 'Fonte C', relevancia: 'baixa' }));

    const r = await getEvidencias(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 3);
    assert.equal(r.corpo.evidencias.length, 3);
    assert.deepEqual(
      r.corpo.evidencias.map((evidencia) => evidencia.fonte),
      ['Fonte A', 'Fonte B', 'Fonte C']
    );
    assert.deepEqual(
      r.corpo.evidencias.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado']
    );
  });
});

test('nenhum teste de /evidencias grava no evidencias.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Somente teste' }));
    await getEvidencias(base);
  });

  const depois = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  assert.equal(depois, antes);
});
```

Os 13 testes anteriores continuam no arquivo, sem alteração de conteúdo. O arquivo tem
345 linhas no total.

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (18.0733ms)
✔ evidência sem "fonte": lança erro e não grava (2.3979ms)
✔ evidência com "tipo" inválido: lança erro e não grava (6.6714ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.6649ms)
✔ listar evidências de arquivo vazio: devolve [] (6.5732ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (8.7289ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.1807ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (417.5823ms)
✔ ideia nao mobile: 200 com tipo "outro" (32.7622ms)
✔ campo ausente: 400 e nada gravado (45.2459ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (30.0851ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (18.95ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.2226ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (18.3527ms)
✔ corpo acima de 100kb: 413 e nada gravado (44.0797ms)
✔ GET /saude: 200 com ok e servico (22.597ms)
✔ rota desconhecida: 404 em JSON (16.4809ms)
✔ GET /validar-ideia: 405 com header Allow: POST (17.7574ms)
✔ POST /saude: 405 com header Allow: GET (13.3169ms)
✔ nenhum teste grava no validacoes.jsonl de producao (15.8936ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (17.4777ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (14.8144ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (16.1882ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (14.4286ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (36.7441ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (26.892ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3925.3398
```

Detalhamento: 13 testes antigos de `server.test.js`, 6 novos de `server.test.js` e 7 de
`evidencias.test.js`, totalizando **26**, todos passando, zero falhas.

## Contagem de linhas dos `.jsonl`, antes e depois

Medidos antes de rodar a suíte e medidos de novo depois, já com a suíte executada e o
processo órfão encerrado:

```
---- LINHAS ANTES DE TUDO ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu. As tentativas manuais com `curl.exe` não gravaram nada: o
processo do servidor era encerrado junto com a sessão antes de concluir as requisições.

Esse resultado é garantido por dois testes explícitos, que comparam a contagem do arquivo
de produção antes e depois: "nenhum teste grava no validacoes.jsonl de producao" e
"nenhum teste de /evidencias grava no evidencias.jsonl de producao".

## Saída real do `git log --oneline`

Estado antes do commit desta tarefa (o commit e o push são registrados no fim do
relatório, junto com a confirmação do arquivo):

```
3ab5430 Relatorio da tarefa 10 - atualizacao do ESTADO.md
df0a494 Atualiza ESTADO.md com repositorio GitHub e pendencias
89c1129 Relatorio da tarefa 09 - limpeza estrutural
2e1b0cc Torna o comentario do .gitignore ASCII para evitar ambiguidade de encoding
8c6d8ea Corrige base: injecao em evidencias.js, testes, gitignore, gitattributes
```

## O que não funcionou ou ficou pendente

1. **Os testes manuais com `curl.exe` não foram concluídos.** O healthcheck respondeu
   200, mas o `POST /evidencias` não produziu saída e o processo do servidor foi encerrado
   junto com a sessão do PowerShell. Não há evidência manual do `201`, do `GET /evidencias`
   nem dos dois `400`. A causa (escaping do PowerShell 5.1 e processo em background morro
   ao fim da sessão) já é conhecida e está documentada nas Tarefas 03, 04 e 06. A cobertura
   automatizada cobre os mesmos caminhos, então o risco funcional é baixo, mas a lacuna
   permanece.

2. **O tratamento de 405 em `/evidencias` não tem teste automatizado.** A especificação
   pediu 6 testes e o total esperado era 26; o sexto já foi usado pelo teste de isolamento
   do arquivo de produção. Como `app.all` só entra em vigor depois do GET e do POST, ele é
   exercitado de forma indireta — nenhum dos testes enviados usa PUT, DELETE ou PATCH. Um
   teste do tipo `DELETE /evidencias` com `Allow: GET, POST` fecharia a lacuna, e o total
   iria a 27.

3. **Houve um processo `node` órfão.** Um servidor iniciado em tentativa anterior sobreviveu
   à sessão e foi encerrado manualmente (PID 15804). Sem dados gravados, mas é o tipo de
   resíduo que ocupa a porta 3000 e confunde a próxima execução.

4. **Um desvio do total especificado foi corrigido durante a tarefa.** Foram escritos 7
   testes novos e o sétimo foi removido para chegar a 26. Está detalhado em "Um desvio do
   que foi especificado".

5. **O `README.md` e o `ESTADO.md` estão desatualizados com esta mudança.** Nenhum dos
   dois foi alterado, porque a tarefa pedia commit apenas do código e do relatório. Os dois
   ainda afirmam "13 testes" e não mencionam `POST /evidencias` nem `GET /evidencias`.
   Ver observação 1.

6. **Pendências anteriores que seguem abertas**, sem relação com esta tarefa: o comando
   `memory` do `AGENTS.md` não existe; o script de backup dos `.jsonl` via `cron` na VPS
   não existe; `.env` não foi criado.

## Observações técnicas para a próxima tarefa

1. **Atualize a documentação junto com a próxima entrega de código.** O `README.md` e o
   `ESTADO.md` ainda dizem "13 testes" e não listam os endpoints novos. A tabela de
   endpoints do README precisa receber `GET /evidencias` e `POST /evidencias` (com o 201 e
   os 400), e a estrutura do projeto precisa de `evidencias.test.js`, que já consta desde a
   Tarefa 09. A contagem correta é 26.

2. **`GET /evidencias` pode virar 500 e isso ainda não foi decidido.** `listarEvidencias()`
   lança exceção quando encontra uma linha de JSON corrompida no arquivo, interrompendo a
   leitura inteira. Via HTTP, isso resulta em resposta 500 sem tratamento. A alternativa é
   pular a linha corrompida e avisar na resposta. É uma escolha de produto e vale resolver
   antes de expor o serviço publicamente.

3. **Não há paginação em `GET /evidencias`.** A rota lê o arquivo inteiro e devolve tudo.
   Com 3 registros é irrelevante, mas o contrato de resposta `{ total, evidencias }` já é um
   bom ponto para introduzir `?limite=` e `?deslocamento=` sem quebrar consumidores, já que
   o formato atual está documentado.

4. **`POST /evidencias` aceita `url` ausente e o módulo preenche string vazia.** Um cliente
   que envie a evidência sem `url` recebe `201` com `"url": ""`. Está correto segundo a
   especificação do módulo, mas convém documentar, porque quem consumir a API pode esperar
   sempre um link.

5. **Campos desconhecidos no corpo são silenciosamente descartados.** A construção do objeto
   de dados usa apenas `CAMPOS_EVIDENCIA`. Se o cliente enviar `id`, `timestamp` ou
   qualquer outro campo, eles são ignorados sem aviso e sem erro. É o comportamento
   desejado para `id`/`timestamp`, mas é silencioso também para erros de digitação de campo.
   Se for desejado, dá para devolver 400 quando o corpo trouxer chaves fora da lista.

6. **Erros de escrita em disco continuam sem tratamento.** Vale para as duas rotas: se o
   `fs.appendFileSync` lançar (disco cheio, permissão negada), a resposta vira 500. Já
   estava registrado na Tarefa 04 para `/validar-ideia` e agora vale para `/evidencias`.

7. **A gravação é síncrona e bloqueia o event loop.** Irrelevante no volume atual, mas é o
   limite a considerar se o serviço crescer. Vale a mesma observação da Tarefa 04.

8. **A relação entre validação e evidência ainda é só texto.** `ideia_relacionada` continua
   sendo uma string livre, não um identificador de validação. Se a próxima tarefa for juntar
   validação e evidências em um relatório, é o momento de decidir se entra um id estável
   gerado em `POST /validar-ideia`.

9. **A caminho mais seguro para validar as rotas na mão, neste ambiente, é usar o próprio
   Node em vez do `curl.exe`.** Um comando como
   `node -e "fetch('http://localhost:3000/evidencias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...})}).then(r=>r.text()).then(console.log)"`
   não depende do escaping do PowerShell. Os 6 testes novos já usam `fetch` por esse mesmo
   motivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-11-exposicao-evidencias.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-11-exposicao-evidencias.md").Length
27232
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-11-exposicao-evidencias.md`,
com 27.232 bytes.