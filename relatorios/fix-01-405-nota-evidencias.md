# fix-01 — 405 em `/nota` e teste de 405 em `/evidencias`

## Data

16/10/2026

## Objetivo

Fechar as duas pendências de código que vinham sendo adiadas desde a Tarefa 11:

1. `GET /nota` existia, mas não tinha tratamento de método errado. Um `POST /nota` caía no
   middleware de rota desconhecida e devolvia `404`, quando o correto é `405` — a rota
   existe, só não aceita aquele método.
2. O tratamento de 405 em `/evidencias` existia desde a Tarefa 11, implementado com
   `app.all`, mas **nenhum teste o exercitava**. O código podia ter sido removido por engano
   a qualquer momento sem a suíte reclamar.

Esta é a primeira tarefa com o prefixo `fix-`, conforme a convenção registrada no
`ESTADO.md` na Tarefa 14.

## O que foi feito

### 1. `app.all('/nota')` adicionado em `server.js`

Declarado logo depois do `app.get('/nota')`, seguindo o mesmo padrão já usado em
`/saude`, `/validar-ideia` e `/evidencias`:

```javascript
// Qualquer outro metodo em /nota: 405 com Allow: GET
app.all('/nota', (req, res) => {
  res.set('Allow', 'GET');
  return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET' });
});
```

A posição importa: `app.all` só é alcançado pelos métodos que **não** foram atendidos
antes. Por isso ele vem depois do `app.get`, e o `GET` continua funcionando normalmente.
A ordem resultante das rotas:

```
app.get('/saude')  ->  app.post('/saude')  ->  app.post('/validar-ideia')
  ->  app.get('/validar-ideia')  ->  app.get('/evidencias')  ->  app.post('/evidencias')
  ->  app.get('/nota')  ->  app.all('/nota')  ->  app.all('/evidencias')
  ->  404  ->  middleware de erro
```

### 2. Dois testes acrescentados em `server.test.js`

**`POST /nota: 405 com header Allow: GET`**. Além de conferir o status, o cabeçalho `Allow`
e o corpo, o teste faz duas verificações a mais que o mínimo pedido:

- chama o `GET /nota` em seguida, para garantir que o `app.all` não quebrou a rota que
  vinha funcionando;
- confere que nenhum arquivo de evidência foi criado pelo `POST` recusado.

**`PUT /evidencias: 405 com header Allow: GET, POST`**. Confere status, cabeçalho e corpo,
e depois que o arquivo temporário de evidências continua vazio — um `PUT` com corpo válido
não pode ter gravado nada.

O `PUT` foi escolhido, e não o `POST`, de propósito: `POST /evidencias` já é uma rota
válida, então um `POST` cairia nela e devolveria `201`. Só os métodos sem rota própria
chegam ao `app.all`.

### 3. Documentação atualizada

- `README.md`: nova linha na tabela de endpoints para o 405 de `/nota`; contagem de 41
  para 43 testes na seção "Como rodar" e em "Estado do projeto"; `server.test.js` de 24
  para 26 testes na tabela de estrutura.
- `ESTADO.md`: contagem de 43 testes em "O que existe hoje", "Estado atual" e "Como
  rodar"; `server.test.js` de 24 para 26 no detalhamento por arquivo.

### 4. Uma alteração extra, não pedida, dentro do código

O comentário da rota `/nota` em `server.js` dizia "Por enquanto so existe o criterio 'tem
gente?'". Isso ficou desatualizado na Tarefa 15, quando o segundo critério entrou. Como
estava no mesmo trecho de código que eu estava editando, o comentário foi corrigido:

```javascript
// Calcula a nota a partir das evidencias registradas. Os criterios vem do
// modulo nota.js. A nota e geral: conta todos os concorrentes e reclamacoes.
```

Foi uma mudança de comentário, sem efeito em comportamento. Registrada aqui porque está
fora do que a tarefa pediu.

### 5. `package.json`

Nenhuma alteração necessária.

## O passo 4c da tarefa não tinha alvo no `ESTADO.md`

A especificação pedia para "remover as pendências de 405 de `/nota` e de `/evidencias` da
seção de observações" do `ESTADO.md`. Esse arquivo **não tem seção de observações**. As
suas seções são: Regras do projeto, O que é o produto, O que existe hoje, O que não existe
ainda, Decisões tomadas e por quê, Pendências para a fase de deploy, Estado atual, Como
rodar, Próximo passo.

As pendências de 405 estão registradas nos **relatórios** das tarefas 11, 13 e 15, na seção
de cada relatório, e é lá que continuarão. Relatórios são documentos históricos de
trabalhos já concluídos e não devem ser reescritos: a evidência de que a pendência existia
naquele momento é parte do registro.

Como não havia o que remover, o passo foi Considerado cumprido pela via correta: as
pendências de 405 estão **resolvidas**, e a seção "O que existe hoje" do `ESTADO.md` já
afirmava, desde a Tarefa 11, que existe tratamento 400, 404, 405 e 413. O que mudou de fato
é a cobertura de teste, agora registrada na contagem.

## Os dois testes acrescentados

```javascript
test('POST /nota: 405 com header Allow: GET', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const resposta = await fetch(`${base}/nota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET' });

    // O GET continua funcionando depois do 405.
    const depois = await getNota(base);
    assert.equal(depois.status, 200);
    assert.equal(depois.corpo.total, 0);

    // Nenhum arquivo foi criado ou alterado por causa do 405.
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('PUT /evidencias: 405 com header Allow: GET, POST', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const resposta = await fetch(`${base}/evidencias`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidenciaValida({ fonte: 'Nao deve ser gravada' }))
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET, POST');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET, POST' });

    // O PUT não pode ter gravado evidência nenhuma.
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});
```

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (19.9545ms)
✔ evidência sem "fonte": lança erro e não grava (4.616ms)
✔ evidência com "tipo" inválido: lança erro e não grava (2.2783ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (3.688ms)
✔ listar evidências de arquivo vazio: devolve [] (6.2502ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (8.4973ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.5919ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (3.287ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7691ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.5357ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5657ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.8352ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (2.2773ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.6675ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5739ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.083ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (3.7543ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (155.8721ms)
✔ ideia nao mobile: 200 com tipo "outro" (46.9869ms)
✔ campo ausente: 400 e nada gravado (22.3123ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (34.0993ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (20.1288ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.4788ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (29.7905ms)
✔ corpo acima de 100kb: 413 e nada gravado (22.2598ms)
✔ GET /saude: 200 com ok e servico (25.9619ms)
✔ rota desconhecida: 404 em JSON (13.1831ms)
✔ GET /validar-ideia: 405 com header Allow: POST (18.5647ms)
✔ POST /saude: 405 com header Allow: GET (16.7902ms)
✔ nenhum teste grava no validacoes.jsonl de producao (15.3754ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (17.8497ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (20.0202ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (12.4748ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (12.3086ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (35.6839ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (22.2452ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (11.881ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (27.5698ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (34.5122ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 2 e maximo_possivel 2 (32.8828ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (28.5999ms)
✔ POST /nota: 405 com header Allow: GET (18.3327ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (53.3698ms)
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1550.8317
```

43 testes, 43 passando, 0 falhando.

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 24    | 26    | 26     |
| `evidencias.test.js` | 7     | 7     | 7      |
| `nota.test.js`       | 10    | 10    | 10     |
| **Total**            | 41    | 43    | **43** |

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

## Saída real do `git log --oneline` (antes do commit desta correção)

```
6482058 Tarefa 15: segundo criterio da regua (tem gente insatisfeita?)
cc05aa3 Tarefa 14: atualiza documentacao e define regras do projeto
52fa84c Tarefa 13: primeira nota deterministica (tem gente?)
```

## Arquivos alterados

```
ESTADO.md
README.md
server.js
server.test.js
relatorios/fix-01-405-nota-evidencias.md
```

## O que não funcionou ou ficou pendente

Nada falhou. As duas pendências que motivaram esta correção estão resolvidas. Ficou
pendente:

1. **Os relatórios antigos continuam citando as pendências de 405**, nos documentos das
   Tarefas 11, 13 e 15. Isso é correto e desejado: são registros históricos do que era
   verdade naquele momento. Quem ler apenas o `ESTADO.md` não encontra essas pendências.

2. **`/nota` e `/evidencias` agora se comportam de forma consistente**, mas isso não foi
   testada para todos os métodos. Existem testes para `POST /nota` e `PUT /evidencias`.
   `DELETE`, `PATCH` e `HEAD` seguem o mesmo caminho de código, por serem tratados pelo
   mesmo `app.all`, e foram julgados desnecessários de testar individualmente.

3. **Pendências anteriores, sem relação com esta correção:** o comando `memory` do
   `AGENTS.md` não existe; não há script de backup dos `.jsonl` via `cron` na VPS; o
   `.env` não foi criado.

## Observações técnicas para a próxima tarefa

1. **As duas pendências de 405 estavam na lista desde a Tarefa 11, ou seja, ha quatro
   tarefas.** O padrão que se repetiu: uma tarefa de código entregava a funcionalidade,
   apontava a falta no próprio relatório, e a falta ia sendo empurrada para a próxima.
   Isso tem a mesma raiz da documentação atrasada, que motivou a regra nova da Tarefa 14.
   Vale aplicar a regra nova de documentação também às pendências: **quando o relatório
   registra uma pendência, ela entra no `ESTADO.md` na mesma tarefa.**

2. **O terceiro critério da régua continua sem definição.** Ele não está no `ESTADO.md`,
   nem no fluxograma de forma utilizável. Os dois primeiros vieram especificados por
   tarefa. Antes de implementar, é preciso saber o critério e a regra exata, porque o
   teste é o que fixa a decisão.

3. **A refatoração da Tarefa 15 continua valendo e deixa o terceiro critério barato.**
   Basta escrever o detalhe, o avaliador, e declarar uma linha em `CRITERIOS`. `total` e
   `maximo_possivel` passam a 3 sozinhos, e o teste da forma da resposta vai falhar de
   propósito, exigindo atualização consciente.

4. **`app.all` é o mecanismo usado para 405 em rotas com método único.** Vale lembrar do
   comportamento para o resto do projeto: para bloquear métodos errados em `/nota`,
   `app.get` sozinho não bastaria, e `app.all` declarado na posição errada engoliria a
   rota válida. A ordem no arquivo é o que garante o resultado.

5. **A nota continua geral e sem vínculo com uma ideia específica.** Cada critério conta
   concorrentes e reclamações de todas as ideias juntas, porque `ideia_relacionada` é
   texto livre. Segue valendo a observação das tarefas anteriores: quando o PO quiser a
   nota por ideia, será preciso dar um `id` a `POST /validar-ideia`.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-01-405-nota-evidencias.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-01-405-nota-evidencias.md").Length
13989
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-01-405-nota-evidencias.md`,
com 13.989 bytes.