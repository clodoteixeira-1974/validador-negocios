# Tarefa 09 — Limpeza estrutural

## Data

16/10/2026

## Objetivo

Corrigir a base antes de construir em cima dela. O problema central era o `evidencias.js`
fixar o caminho do arquivo de persistencia com `path.join(__dirname, 'evidencias.jsonl')`,
sem nenhuma forma de injecao. Isso e inconsistente com o `server.js`, que aceita
`arquivoValidacoes` via `createApp({ arquivoValidacoes })`. Se a proxima tarefa criasse
rotas HTTP para evidencias com testes, os testes escreveriam no arquivo de producao.

Alem do modulo, esta tarefa fechou pendencias de organizacao apontadas no relatorio da
Tarefa 08: `.gitattributes`, `.env.example` no `.gitignore`, remocao de um relatorio
duplicado e a falta de um relatorio da Tarefa 01.

## O que foi feito

1. **Refatorado `evidencias.js`** para aceitar caminho opcional em `registrarEvidencia` e
   `listarEvidencias`, com `ARQUIVO_EVIDENCIAS` como valor padrao. A assinatura original
   continua funcionando, entao `testar-evidencias.js` nao quebrou.

2. **Criado `evidencias.test.js`** com 7 testes no mesmo padrao de `server.test.js`
   (modulo `node:test`, `assert/strict`, arquivo temporario em `os.tmpdir()`, limpeza em
   `finally`).

3. **Ajustado `package.json`**: o script `test` agora roda os dois arquivos de teste.

4. **Corrigido `.gitignore`**: adicionado `!.env.example` no final, para que
   `.env` e `.env.local` continuem ignorados e `.env.example` passe a ser versionado.

5. **Criado `.gitattributes`** com `* text=auto eol=lf`, para eliminar os avisos de
   conversao LF para CRLF.

6. **Removido o relatorio duplicado** `relatorios/tarefa-03-classificacao-tipo.md`, depois
   de confirmar que era byte a byte identico a `tarefa-03-analise-mobile.md`.

7. **Criado relatorio retroativo da Tarefa 01**
   (`relatorios/tarefa-01-inspecao-ambiente.md`), marcado como reconstruido.

8. **Rodado `npm test`**: 20 testes, todos passando. `validacoes.jsonl` e
   `evidencias.jsonl` nao cresceram.

9. **Commit** das mudancas.

Nao foram alterados `server.js`, `server.test.js`, `validacoes.jsonl`,
`evidencias.jsonl` nem o `AGENTS.md`.

## Conteudo final de `evidencias.js`

Assinaturas das funcoes principais:

```javascript
const ARQUIVO_EVIDENCIAS = path.join(__dirname, 'evidencias.jsonl');

function gerarId() { ... }

function validarEvidencia(evidencia) { ... }

function registrarEvidencia(evidencia, arquivo = ARQUIVO_EVIDENCIAS) { ... }

function listarEvidencias(arquivo = ARQUIVO_EVIDENCIAS) { ... }
```

Mudancas feitas no corpo:

- `registrarEvidencia`: o `fs.appendFileSync` passou a gravar em `arquivo`, em vez de
  `ARQUIVO_EVIDENCIAS` fixo.
- `listarEvidencias`: o `fs.existsSync` e o `fs.readFileSync` passaram a operar sobre
  `arquivo`.
- `listarEvidencias`: a mensagem de erro de JSON corrompido passou a citar
  `path.basename(arquivo)` em vez do texto fixo `evidencias.jsonl`, para que a mensagem
  continue correta quando o arquivo temporario dos testes for lido.
- Comentarios de documentacao das duas funcoes foram atualizados no mesmo estilo do
  `server.js`, incluindo a frase "O caminho e opcional: os testes automatizados passam um
  arquivo temporario."

Verificacao de que nao sobrou nenhum uso fixo: `ARQUIVO_EVIDENCIAS` aparece 4 vezes no
arquivo, sendo 1 a propria declaracao e as outras 3 como valor padrao dos parametros.

Compatibilidade retroativa verificada em tempo de execucao:

```
exports: registrarEvidencia, listarEvidencias, validarEvidencia, gerarId,
         ARQUIVO_EVIDENCIAS, CAMPOS_OBRIGATORIOS, TIPOS, RELEVANCIAS
registrarEvidencia arity (params obrigatorios): 1
listarEvidencias arity (params obrigatorios): 0
ARQUIVO_EVIDENCIAS default: C:\Users\clodo\Downloads\iavalidadora\evidencias.jsonl
listarEvidencias() no arquivo de producao devolve: 3 registros
```

`listarEvidencias()` sem argumento leu 3 registros do arquivo de producao, o que confirma
que a chamada sem caminho continua usando o padrao. `testar-evidencias.js` chama as duas
funcoes sem argumento nos passos 1, 2 e 4, entao continua funcionando. O script nao foi
executado de proposito: ele faz append em `evidencias.jsonl` e nao e idempotente. A
compatibilidade foi conferida por `node --check testar-evidencias.js` (sintaxe valida) e
pela chamada direta acima, que nao escreve nada.

## Conteudo final de `evidencias.test.js`

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  registrarEvidencia,
  listarEvidencias,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

// Cada teste grava em um arquivo temporário. O evidencias.jsonl de produção
// nunca é tocado. O caminho é passado como segundo argumento das funções.
function arquivoTemporario() {
  const sufixo = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return path.join(os.tmpdir(), `evidencias-teste-${sufixo}.jsonl`);
}

// Executa fn com um arquivo temporário limpo e garante a remoção ao final.
async function comArquivo(fn) {
  const arquivo = arquivoTemporario();

  try {
    return await fn(arquivo);
  } finally {
    fs.rmSync(arquivo, { force: true });
  }
}

function lerLinhas(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  return fs.readFileSync(arquivo, 'utf8').split('\n').filter((linha) => linha.trim() !== '');
}

function contagemLinhas(arquivo) {
  return lerLinhas(arquivo).length;
}

// Evidência válida, sem id e sem timestamp: os dois devem ser preenchidos pelo módulo.
function definicaoValida(extra = {}) {
  return Object.assign({
    tipo: 'concorrente',
    fonte: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=exemplo.financas',
    trecho_bruto: 'Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas.',
    ideia_relacionada: 'App para controlar gastos',
    relevancia: 'alta'
  }, extra);
}

test('evidência válida: grava e devolve id e timestamp preenchidos', async () => {
  await comArquivo(async (arquivo) => {
    const gravada = registrarEvidencia(definicaoValida(), arquivo);

    assert.equal(gravada.tipo, 'concorrente');
    assert.equal(gravada.fonte, 'Google Play');
    assert.equal(gravada.url, 'https://play.google.com/store/apps/details?id=exemplo.financas');
    assert.equal(gravada.relevancia, 'alta');
    assert.notEqual(gravada.id, '');
    assert.match(gravada.id, /^\d+-[a-z0-9]+$/);
    assert.match(gravada.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    // O arquivo temporário recebeu exatamente uma linha, com os mesmos campos.
    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), gravada);
  });
});

test('evidência sem "fonte": lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    const semFonte = definicaoValida();
    delete semFonte.fonte;

    assert.throws(
      () => registrarEvidencia(semFonte, arquivo),
      (erro) => {
        assert.ok(erro instanceof Error);
        assert.match(erro.message, /Evidência inválida/);
        assert.ok(Array.isArray(erro.erros));
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"fonte"')));
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('evidência com "tipo" inválido: lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    assert.throws(
      () => registrarEvidencia(definicaoValida({ tipo: 'blog' }), arquivo),
      (erro) => {
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"tipo"')));
        assert.match(erro.message, /aceitos: concorrente, reclamacao, dado_mercado/);
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('evidência com "relevancia" inválida: lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    assert.throws(
      () => registrarEvidencia(definicaoValida({ relevancia: 'muito alta' }), arquivo),
      (erro) => {
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"relevancia"')));
        assert.match(erro.message, /aceitos: alta, media, baixa/);
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('listar evidências de arquivo vazio: devolve []', async () => {
  await comArquivo(async (arquivo) => {
    // Arquivo existe, mas está vazio.
    fs.writeFileSync(arquivo, '', 'utf8');

    assert.deepEqual(listarEvidencias(arquivo), []);

    // Arquivo inexistente também devolve [].
    fs.rmSync(arquivo, { force: true });
    assert.deepEqual(listarEvidencias(arquivo), []);
  });
});

test('listar evidências após registrar 3: devolve 3 na ordem de gravação', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'Fonte A' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'reclamacao', fonte: 'Fonte B', relevancia: 'media' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'dado_mercado', fonte: 'Fonte C', relevancia: 'baixa' }), arquivo);

    const evidencias = listarEvidencias(arquivo);

    assert.equal(evidencias.length, 3);
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.fonte),
      ['Fonte A', 'Fonte B', 'Fonte C']
    );
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado']
    );
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.relevancia),
      ['alta', 'media', 'baixa']
    );

    // Cada registro tem o mesmo conjunto de campos, na ordem do módulo.
    const camposEsperados = ['id', 'tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'timestamp', 'relevancia'];
    for (const evidencia of evidencias) {
      assert.deepEqual(Object.keys(evidencia), camposEsperados);
    }

    // Os ids gerados são distintos.
    assert.equal(new Set(evidencias.map((evidencia) => evidencia.id)).size, 3);
  });
});

test('nenhum teste grava no evidencias.jsonl de produção', async () => {
  const antes = contagemLinhas(ARQUIVO_EVIDENCIAS);

  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'Somente teste' }), arquivo);
    listarEvidencias(arquivo);
  });

  const depois = contagemLinhas(ARQUIVO_EVIDENCIAS);

  assert.equal(depois, antes);
});
```

Os 7 testes cobrem exatamente a lista pedida: (a) evidencia valida com `id` e `timestamp`
preenchidos, (b) sem `fonte`, (c) `tipo` invalido, (d) `relevancia` invalida, (e) listagem
de arquivo vazio, (f) listagem de 3 registros em ordem, (g) nenhum teste toca o arquivo de
producao.

Dois pontos que valem registro sobre esse arquivo:

- O teste (a) passa a evidencia **sem** `id` e **sem** `timestamp`, o que exercita
  `gerarId()` e o preenchimento automatico. O relatorio da Tarefa 05 registrou como
  pendencia que `gerarId()` nunca era exercitada, porque o script manual sempre fornecia
  `id`. Essa lacuna esta fechada.
- O teste (f) usa `assert.deepEqual` nas chaves de cada registro, o que trava a ordem dos
  campos no arquivo gravado. Se essa ordem mudar no `evidencias.js`, o teste avisa.

## Conteudo final de `.gitignore` e `.gitattributes`

`.gitignore`:

```
node_modules/
*.jsonl
.env
.env.*
*.log
.DS_Store
Thumbs.db
desktop.ini
body-tmp.json
*.tmp

# The .env.* pattern above would also ignore .env.example, which must be
# versioned as documentation of the environment variables.
!.env.example
```

`.gitattributes`:

```
* text=auto eol=lf
```

Comportamento verificado com `git check-ignore`, usando o codigo de saida do comando
(codigo 0 significa ignorado, codigo diferente de zero significa versionado):

```
.env                             -> IGNORADO (nao versiona)
.env.local                       -> IGNORADO (nao versiona)
.env.example                     -> VERSIONADO (versiona)
validacoes.jsonl                 -> IGNORADO (nao versiona)
evidencias.jsonl                 -> IGNORADO (nao versiona)
node_modules/express/package.json -> IGNORADO (nao versiona)
body-tmp.json                    -> IGNORADO (nao versiona)
x.log                            -> IGNORADO (nao versiona)
desktop.ini                      -> IGNORADO (nao versiona)
```

`package.json`, script `test`:

```json
"test": "node --test server.test.js evidencias.test.js"
```

## Confirmacao de remocao do relatorio duplicado

A duplicidade foi confirmada por hash antes de apagar. Os dois arquivos tinham o mesmo
SHA-256, ou seja, eram o mesmo byte a byte:

```
analise-mobile : CDC4A3918D08FD0663B7CE37007C80F6F255B6544A38AC25584ECAEAC853ADB8
classificacao  : CDC4A3918D08FD0663B7CE37007C80F6F255B6544A38AC25584ECAEAC853ADB8
IDENTICOS: True
```

Apois a remocao:

```
Removido: relatorios\tarefa-03-classificacao-tipo.md

Length Name
------ ----
21382 status-geral-2026-10-16.md
  2016 tarefa-02-endpoint-validar-ideia.md
  6416 tarefa-03-analise-mobile.md
 10150 tarefa-04-persistencia.md
 21690 tarefa-05-estrutura-evidencias.md
 31006 tarefa-06-unificacao.md
 26386 tarefa-07-remocao-app.md
 13578 tarefa-08-organizacao-portfolio.md

analise-mobile existe: True
classificacao-tipo existe: False
```

`tarefa-03-analise-mobile.md` continua existindo, com os 6416 bytes originais.

## Confirmacao de criacao do relatorio retroativo da Tarefa 01

Criado `relatorios/tarefa-01-inspecao-ambiente.md`. O arquivo tem um aviso no topo
declarando que foi reconstruido em 16/10/2026 durante esta tarefa, que a Tarefa 01 nao
produziu relatorio original, e que o conteudo vem de fontes secundarias
(`status-geral-2026-10-16.md` e `ESTADO.md`).

Secoes entregues: inspecao da pasta, stack decidida (Node.js com Express, com as tres
justificativas ja registradas), remocao do Dockerfile, arquivos de configuracao ausentes
e ambiente de execucao (Node.js v24.14.1).

Marcado explicitamente como reconstrucao, e nao registro:

- A **secao "O que nao funcionou ou ficou pendente"** da Tarefa 01 nao pode ser
  reconstituida. O status geral registra: "Tarefa 01 (inspecao): sem relatorio na pasta,
  portanto sem pendencias/nao-funcionou registrados." O que consta nessa secao sao
  pendencias **consequentes** ao estado registrado, cada uma com a tarefa que resolveu.
- A **data da remocao do Dockerfile** nao tem como ser confirmada. O status geral mostra
  que nao havia Dockerfile na raiz em 16/10, mas nao diz quando ele saiu. O relatorio
  marca isso como inferencia.

## Saida real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (17.1564ms)
✔ evidência sem "fonte": lança erro e não grava (2.0355ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.8214ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.4628ms)
✔ listar evidências de arquivo vazio: devolve [] (4.9094ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (7.9849ms)
✔ nenhum teste grava no evidencias.jsonl de produção (9.1711ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (146.3578ms)
✔ ideia nao mobile: 200 com tipo "outro" (48.2885ms)
✔ campo ausente: 400 e nada gravado (22.6174ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (26.0421ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (18.6995ms)
✔ body que nao e objeto JSON: 400 e nada gravado (21.6916ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (15.9638ms)
✔ corpo acima de 100kb: 413 e nada gravado (19.7013ms)
✔ GET /saude: 200 com ok e servico (18.914ms)
✔ rota desconhecida: 404 em JSON (21.1295ms)
✔ GET /validar-ideia: 405 com header Allow: POST (15.9119ms)
✔ POST /saude: 405 com header Allow: GET (16.7825ms)
✔ nenhum teste grava no validacoes.jsonl de producao (14.5328ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1060.4117
```

Detalhamento: **13 testes** de `server.test.js` (lista de 14 a 26 acima) e **7 testes** de
`evidencias.test.js` (lista de 1 a 7). Total 20, todos passando.

A execucao foi repetida depois do commit, ja com o `.gitattributes` em vigor:

```
ℹ tests 20
ℹ pass 20
ℹ fail 0
ℹ duration_ms 1537.2466
```

## Contagem de linhas dos arquivos de producao, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois arquivos cresceu. Os testes usam arquivos temporarios em `os.tmpdir()`,
removidos no `finally`.

## Saida real do `git log --oneline`

```
2e1b0cc Torna o comentario do .gitignore ASCII para evitar ambiguidade de encoding
8c6d8ea Corrige base: injecao em evidencias.js, testes, gitignore, gitattributes
d37d8fe Relatorio da tarefa 08 - organizacao para portfolio
407f0fa Estrutura inicial do Validador de Novos Negócios
```

Arquivos do commit principal:

```
[main 8c6d8ea] Corrige base: injecao em evidencias.js, testes, gitignore, gitattributes
 7 files changed, 323 insertions(+), 157 deletions(-)
 create mode 100644 .gitattributes
 create mode 100644 evidencias.test.js
 create mode 100644 relatorios/tarefa-01-inspecao-ambiente.md
 delete mode 100644 relatorios/tarefa-03-classificacao-tipo.md
```

Estado final:

```
On branch main
nothing to commit, working tree clean
```

O commit principal mudou 7 arquivos: `.gitattributes`, `.gitignore`, `evidencias.js`,
`evidencias.test.js`, `package.json`, e os dois relatorios. `server.js`, `server.test.js`,
`validacoes.jsonl`, `evidencias.jsonl` e `AGENTS.md` nao aparecem no commit.

Houve um segundo commit, `2e1b0cc`, nao previsto: durante a conferencia final, o
comentario acrescentado ao `.gitignore` estava em portugues acentuado e aparecia como
caracteres corrompidos na saida do terminal. A leitura direta do arquivo e a decodificacao
dos bytes confirmaram que o arquivo estava em UTF-8 correto e que o problema era apenas o
console do PowerShell. Ainda assim, como `.gitignore` e um arquivo que o Git le, o
comentario foi reescrito em ASCII, eliminando a duvida. O comportamento dos padroes foi
reconferido depois da mudanca e continua identico.

## O que nao funcionou ou ficou pendente

Nada falhou. Os quatro comandos previstos funcionaram na primeira execucao, sem erro.
Ficaram pendentes, porem, itens fora do alcance desta tarefa:

1. **O comando `memory` do `AGENTS.md` continua inexistente.**
   A pendencia da Tarefa 08 segue aberta. O `AGENTS.md` nao foi alterado, conforme a regra
   da tarefa.

2. **O relatorio da Tarefa 01 e uma reconstrucao, nao um registro.**
   Nao ha como recuperar o que foi realmente executado em 15/10/2026. O relatorio marca
   isso no titulo e nas secoes mais sensiveis.

3. **Alem dos binarios grandes, ja sinalizados na Tarefa 08, nada mais foi alterado.**
   Os PDFs (~1,1 MB), o SVG e os dois CSV do ClickUp continuam versionados. O
   `.gitignore` nao os cobre e nao havia instrucao para isso.

## Observacoes tecnicas para a proxima tarefa

1. **O `evidencias.js` ja aceita injecao de caminho — a base esta pronta.**
   `registrarEvidencia(evidencia, arquivo)` e `listarEvidencias(arquivo)` aceitam caminho
   como argumento. Para expor evidencias via HTTP sem tocar nos arquivos de producao,
   o padrao a seguir e o mesmo do `server.js`: a rota recebe o caminho de uma opcao
   recebida por `createApp`, e os testes passam um arquivo temporario.

2. **Divergencia de estilo que importa para a proxima tarefa.**
   `server.js` injeta o caminho pela opcao de `createApp` (`{ arquivoValidacoes }`),
   enquanto `evidencias.js` injeta por parametro de funcao. As duas abordagens coexistem
   e funcionam, mas nao sao iguais. Para as novas rotas, o mais simples e passar o caminho
   por parametro, como `evidencias.js` faz — evita espalhar a opcao por todo o `createApp`.

3. **Contrato de erro ja definido, e ele determina o status HTTP.**
   `registrarEvidencia` lanca `Error` com a propriedade `.erros` (array de mensagens) e a
   mensagem comeca com "Evidencia invalida: ". Os tres casos ja cobertos por teste sao
   campo obrigatorio ausente ou vazio, `tipo` fora de `['concorrente', 'reclamacao',
   'dado_mercado']` e `relevancia` fora de `['alta', 'media', 'baixa']`. Todos devem virar
   **400**, com o corpo no mesmo formato de erro ja usado no servidor:
   `{"error": "..."}`. Vale registrar que `server.js` usa `error` (anglicismo) e nao
   `erro`; manter a coerencia importa para quem consome a API.

4. **`listarEvidencias` lanca excecao em linha corrompida.**
   Se um `.jsonl` tiver uma linha com JSON invalido, a leitura inteira quebra, com erro
   indicando o numero da linha. Isso foi registrado na Tarefa 05 e continua valendo. Ao
   expor a listagem por HTTP, isso vira resposta 500. Decidir se vale pular a linha e
   avisar, ou manter o erro, e uma escolha de produto.

5. **Nao ha limite de quantidade na listagem.**
   `listarEvidencias()` le o arquivo inteiro e devolve o array completo. Para uma rota
   HTTP, vale decidir se ha paginacao desde o inicio ou se o volume justifies. No volume
   atual (3 registros) nao ha problema.

6. **A relacao entre validacao e evidencia continua sendo apenas o texto da ideia.**
   O campo `ideia_relacionada` e uma string livre, nao um identificador. Este ponto foi
   registrado na Tarefa 05 e nao foi resolvido aqui. Se a proxima tarefa juntar as duas
   coisas em um relatorio, essa e a hora de decidir se vale um id estavel de validacao.

7. **`testar-evidencias.js` continua nao idempotente.**
   Executar `node testar-evidencias.js` faz append em `evidencias.jsonl` e duplica as
   evidencias ficticias a cada execucao; a limpeza e manual. Agora que existe
   `evidencias.test.js` com 7 testes automatizados cobrindo o mesmo modulo, o script manual
   tem valor reducido. Candidatos a remocao, mas isso nao foi feito aqui porque estava
   fora do escopo pedido.

8. **`os.tmpdir()` e onde os arquivos temporarios vao.**
   Em Windows isso equivale a pasta temporaria do usuario; os arquivos sao removidos no
   `finally`, mas se um teste quebrar com excecao antes do `finally` ainda pode sobrar um
   arquivo `evidencias-teste-*.jsonl`. Nao ha impacto no repositorio, ja que o `.gitignore`
   cobre `*.tmp` mas nao esse padrao — e o padrao fica em `%TEMP%`, fora da pasta do
   projeto.

9. **Ficou um commit a mais do que o previsto.** Detalhado acima. O historico linear esta
   limpo e a arvore esta limpa; nada foi reescrito com `--amend` ou `--force`.