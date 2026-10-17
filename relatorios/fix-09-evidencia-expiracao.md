# fix-09 — Expiração em `GET /evidencias?id=`

## Data

17/10/2026

## Objetivo

Fechar a última brecha de expiração. Depois do fix-08, a expiração valia para
`GET /relatorio/:id` e `GET /nota?id=`, mas **`GET /evidencias?id=` continuava lendo depois
do prazo**. Quem tivesse o `id` de uma validação vencida ainda listava as evidências cruas.

A decisão do PO foi fechar agora. Este relatório é sobre uma linha de código e três
consequências que ela produz, duas delas de contrato.

## O que foi feito

### 1. `server.js`

```javascript
app.get('/evidencias', (req, res) => {
  const filtro = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (filtro !== undefined) {
    const validacao = buscarValidacao(filtro, arquivoValidacoes);

    if (!validacao) {
      return res.status(404).json({ error: 'Validacao nao encontrada' });
    }

    if (linkExpirado(validacao)) {
      return res.status(410).json({ error: 'Este link expirou' });
    }
  }

  const evidencias = listarEvidencias(arquivoEvidencias, filtro);
  return res.json({ total: evidencias.length, evidencias });
});
```

A ordem das checagens importa, e é a ordem que o `GET /relatorio/:id` já usava: primeiro
existe, depois está válido. Invertida, uma validação inexistente cairia no `linkExpirado` e
devolveria `410` em vez de `404` — o que seria errado, porque `410` afirma que a validação
existe.

### 2. A ambiguidade que o `200` com lista vazia escondia

Este é o ponto que merece mais destaque do que a linha de código.

Antes desta tarefa, `GET /evidencias?id=qualquer-coisa` devolvia `200` com
`{"total": 0, "evidencias": []}`. Isso era **ambíguo**: a mesma resposta significava "não há
evidência para esta ideia" e "este id não existe". E são exatamente esses dois casos que a
expiração precisa distinguir.

Sem essa distinção, o comportamento era incoerente por construção: um `id` inválido recebia
a mesma resposta que um `id` válido sem evidências, e o `404` de `/relatorio/:id` não tinha
par nas rotas de dados. O `404` não é aqui um detalhe de consistência estética — é o que
permite a expiração significar alguma coisa.

### 3. Um teste existente mudou de semântica

O teste `arquivo de evidencias corrompido não derruba /nota nem /evidencias` filtrava por
`?id=v1`, um id que **não correspondia a nenhuma validação registrada**. Ele existia para
provar que o filtro por id funciona com arquivo pela metade, e o `id` fictício servia
porque o filtro antigo aceitava qualquer string.

Com o `404`, esse teste falharia. Duas saídas possíveis: quebrar a garantia nova, ou
adaptar o teste. Adaptei, e vale explicar o que mudou, porque a primeira versão da minha
adaptação **enfraquecia o teste** sem que eu percebesse.

O teste lia:

```javascript
const filtrada = await fetch(`${base}/evidencias?id=v1`);
assert.equal(corpoFiltrado.total, 1);
```

Minha primeira tentativa foi criar uma validação nova e filtrar por ela, o que daria
`total: 0` — porque a validação recém-criada não tem evidência. Eu escrevi
`assert.equal(corpoFiltrado.total, 0)` com a justificativa de que "a validação é nova, então
não tem evidência ainda".

Isso **não testa nada sobre o filtro**. Passaria com o filtro completamente quebrado. O que
eu precisava preservar era a intenção original: as duas evidências uma linha corrompida no
meio, e o filtro achando a que sobrou. Reescrevi para criar a validação primeiro, vincular
as duas evidências ao `id` real, corromper a linha, e então filtrar esperando `total: 1`
com `'Concorrente B'`.

**A lição:** ao adaptar um teste para uma regra nova, é fácil produzir um teste que passa
sem provar nada. Comparar a **intenção** do teste antigo com o novo, e não só fazê-lo passar,
é o que evita esse erro.

### 4. Quatro testes novos, de 101 para 105

| Teste | O que fixa |
| --- | --- |
| `?id=` válido e não expirado devolve `200` | o filtro normal, com as duas evidências na ordem |
| `?id=` expirado devolve `410` | e o corpo do erro não carrega nem um trecho da evidência |
| `?id=` inexistente devolve `404` | e não lista vazia |
| sem `?id=` devolve `200` | a listagem global não tem prazo |

O teste do `410` verifica duas coisas além do status: que `corpo.evidencias` e `corpo.total`
são `undefined`, e que a linha continua no arquivo. Expirar fecha acesso, não apaga dado.

O teste da listagem global cria as evidências **sem** `id_validacao` e mesmo assim espera
`total: 2`, com a validação do cenário já expirada. É o que fixa que a rota sem filtro
ignora o prazo por completo.

## O que mudou de contrato

Vale isolar, porque é o que pode quebrar integração de terceiros:

- `GET /evidencias?id=<id inexistente>`: era `200` com lista vazia, agora é `404` com
  `{"error": "Validacao nao encontrada"}`;
- `GET /evidencias?id=<id expirado>`: era `200` com as evidências, agora é `410` com
  `{"error": "Este link expirou"}`;
- `GET /evidencias` sem filtro: inalterado, `200` com tudo.

**Quem integra e guardar um `id_validacao` sem a validação correspondente passa a receber
`404`.** Evidência sem vínculo continua existindo e continua contando na nota geral; só o
filtro por `id` mudou.

Isso está documentado em `CONTRATO.md`, em uma seção própria, e não escondido em uma nota
de rodapé de tabela.

## O que continua aberto

**A expiração é de leitura, e a escrita segue aberta.** `POST /evidencias` continua aceitando
`id_validacao` de uma validação **expirada**, e essa evidência continua contando na nota de
outras ideias. É assimétrico por escolha: escrita aberta é decisão do PO, e nenhuma tarefa
desta série mexeu nela.

Dito de outro modo, e é o que importa: **esta tarefa fechou a leitura de dado de validação
depois do prazo, e não fechou o envenenamento.** Quem não pode mais ler um relatório
vencido ainda consegue escrever contra ele.

**Validação antiga continua sem prazo.** As 6 validações deste ambiente não têm
`expires_at` e **não expiram nunca**, por decisão técnica do fix-08, documentada e aceita.
O `id` em UUID v4 continua sendo o que impede a enumeração desses relatórios.

**Não há revogação.** Um link vazado vale até o prazo. Nenhuma tarefa desta série mudou
isso, e nenhuma poderia sem campo e sem rota.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-15208-1792241638436-yaizg7.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-15208-1792241638448-dtvmjc.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-15208-1792241638457-mduyn1.jsonl por JSON invalido: 1, 2
✔ evidência válida: grava e devolve id e timestamp preenchidos (22.2928ms)
✔ evidência sem "fonte": lança erro e não grava (3.0885ms)
✔ evidência com "tipo" inválido: lança erro e não grava (3.7815ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.5466ms)
✔ listar evidências de arquivo vazio: devolve [] (5.7716ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (6.6013ms)
✔ linha corrompida é ignorada e não derruba a listagem (11.3853ms)
✔ corrupção no meio não impede o filtro por id_validacao (9.0645ms)
✔ arquivo com todas as linhas corrompidas devolve lista vazia, sem lançar (4.6353ms)
✔ linha corrompida não impede gravar registros novos (5.256ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.1734ms)
✔ tipo "monetizacao" é aceito, gravado e listado (39.38ms)
✔ o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.7333ms)
✔ tipo "alcance" é aceito, gravado e listado (7.7136ms)
✔ os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (6.6605ms)
✔ evidência com id_validacao é gravada e recuperada (6.8099ms)
✔ id_validacao ausente não é gravado, e id_validacao vazio é recusado (5.9978ms)
✔ listarEvidencias com filtro devolve só as evidencias daquele id_validacao (13.8732ms)
✔ listarEvidencias sem filtro devolve todas, na ordem de gravação (7.0619ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (9.0842ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.8277ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (1.0197ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6586ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.8219ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.836ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.6018ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5329ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.4376ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (2.3644ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.7034ms)
✔ alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.3455ms)
✔ alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.461ms)
✔ alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5596ms)
✔ alguem_paga: so o tipo monetizacao pontua neste criterio (0.5216ms)
✔ alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3744ms)
✔ alcance: 1 evidencia vale 1, que e o minimo exigido (0.3799ms)
✔ alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.356ms)
✔ alcance: so o tipo alcance pontua neste criterio (2.4273ms)
✔ derivarVeredito: cada total da escala cai na faixa correta (3.4971ms)
✔ o veredito acompanha o total em cenarios reais de evidencias (1.1493ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (2.469ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (2.3588ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (186.702ms)
✔ ideia nao mobile: 200 com tipo "outro" (25.4026ms)
✔ campo ausente: 400 e nada gravado (27.8247ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (50.4009ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (15.4943ms)
✔ body que nao e objeto JSON: 400 e nada gravado (16.484ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (16.4677ms)
✔ corpo acima de 100kb: 413 e nada gravado (18.2996ms)
✔ GET /saude: 200 com ok e servico (15.1054ms)
✔ rota desconhecida: 404 em JSON (12.6996ms)
✔ GET /validar-ideia: 405 com header Allow: POST (8.8221ms)
✔ POST /saude: 405 com header Allow: GET (34.5713ms)
✔ classificarTipo usa limite de palavra e não casa dentro de outras palavras (0.6221ms)
✔ classificação corrigida é o que o POST /validar-ideia devolve e grava (18.7096ms)
✔ nenhum teste grava no validacoes.jsonl de producao (11.7554ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (13.7172ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (10.8845ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (8.5489ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (11.1752ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (36.2944ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (38.2624ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (10.6858ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (20.8258ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (27.9481ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (22.3274ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (33.6596ms)
✔ POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério (30.8275ms)
✔ POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério (20.484ms)
✔ GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (29.6914ms)
✔ GET /nota com nota 3: veredito manda mudar o recorte (23.7682ms)
✔ GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (17.2421ms)
✔ POST /validar-ideia: a resposta inclui o id que dá acesso ao relatório (16.8614ms)
✔ GET /relatorio/:id com id válido: 200 com HTML do relatório (73.7665ms)
✔ GET /relatorio/:id com id inválido: 404 com HTML (9.5227ms)
✔ GET /dashboard: 200 com HTML, formulário e botão de copiar (8.796ms)
✔ o HTML do relatório traz @page A4 e @media print escondendo os controles (22.0083ms)
✔ POST /evidencias com id_validacao é aceito e vincula a evidência (18.508ms)
✔ GET /nota?id= calcula a nota so com as evidencias daquele id (43.8383ms)
✔ GET /nota sem ?id= mantém a nota global, sobre todas as evidencias (32.3089ms)
✔ GET /relatorio/:id mostra a nota daquela validacao, e nao a global (40.333ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-13252-1792241639887-mu8912.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-13252-1792241639887-mu8912.jsonl por JSON invalido: 2
✔ arquivo de validacoes corrompido não impede o relatório das validações boas (27.534ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-13252-1792241639915-lf8sfu.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-13252-1792241639915-lf8sfu.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-13252-1792241639915-lf8sfu.jsonl por JSON invalido: 1
✔ arquivo de evidencias corrompido não derruba /nota nem /evidencias (56.4987ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-13252-1792241639972-tm8lik.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-13252-1792241639972-jg8nxk.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-13252-1792241639972-jg8nxk.jsonl por JSON invalido: 1
✔ relatório e nota abrem mesmo com os dois arquivos corrompidos (32.1515ms)
✔ gerarId devolve um UUID v4, no formato documentado no contrato (1.7039ms)
✔ dois ids gerados em sequência são diferentes (12.7713ms)
✔ o id não carrega timestamp: não começa com 13 dígitos nem com data (2.6375ms)
✔ o link do relatório funciona com o id em formato UUID (58.9312ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (31.8161ms)
✔ POST /nota: 405 com header Allow: GET (19.5613ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (11.645ms)
✔ POST /validar-ideia devolve expires_at 30 dias no futuro (14.9849ms)
✔ GET /relatorio com link no prazo devolve 200 e a data de expiração (21.4351ms)
✔ GET /relatorio com link expirado devolve 410 e a página de expirado (79.2074ms)
✔ validação antiga sem expires_at continua abrindo: 200 (compatibilidade) (24.3831ms)
✔ o dashboard avisa que é projeto de portfólio e aponta o código-fonte (12.372ms)
✔ o relatório avisa que a evidência não é verificada (24.3773ms)
✔ GET /nota?id= com id expirado devolve 410 em JSON (27.1675ms)
✔ GET /nota?id= com id valido devolve 200 e a nota da ideia (28.1501ms)
✔ GET /nota sem ?id= continua devolvendo a nota geral, sem expiracao (22.42ms)
✔ GET /evidencias?id= com id valido e nao expirado devolve 200 com as evidencias (25.0129ms)
✔ GET /evidencias?id= com id expirado devolve 410 e nao vaza as evidencias (23.587ms)
✔ GET /evidencias?id= com id inexistente devolve 404, e nao lista vazia (20.9422ms)
✔ GET /evidencias sem ?id= continua listando todas, mesmo com validacoes expiradas (38.0282ms)
ℹ tests 105
ℹ suites 0
ℹ pass 105
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2345.7518
```

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 6
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 6
evidencias.jsonl: 3
```

## Saída real do `git log --oneline` (antes do commit desta correção)

```
1a0c973 fix-08: disclaimers, expiracao de links e vitrine de portfolio
5e4da81 fix-07: UUID v4 no ID da validacao
b6ff400 fix-06: classificacao com limite de palavra
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
server.js
server.test.js
relatorios/fix-09-evidencia-expiracao.md   (novo)
```

`package.json` não foi alterado: uma única dependência, `express`.

## O que não funcionou ou ficou pendente

1. **Um teste existente precisou ser reescrito**, não só corrigido, porque o `id` fictício
   que ele usava deixou de ser válido. Detalhado na seção 3.
2. **`POST /evidencias` continua aceitando `id_validacao` expirado.** Está em `CONTRATO.md`
   como pendência de contrato, e é decisão do PO, não esquecimento.
3. **A validação antiga não expira.** Dívida deliberada, herdada do fix-08.

## Observações técnicas para a próxima tarefa

1. **A regra agora é "onde o dado é servido, o prazo é conferido", e ela está completa.**
   As três rotas que aceitam `id` de validação conferem. Se um dia entrar uma quarta rota
   com filtro por `id`, ela precisa da mesma checagem, e o risco é alguém copiar a rota e
   esquecer a linha. Um teste que percorra as rotas procurando por `id_validacao` evitaria
   a dependência de alguém lembrar.
2. **`buscarValidacao` é chamado três vezes por requisição em Worst case.** Não é problema
   hoje: a leitura é síncrona sobre arquivo pequeno. Se o `validacoes.jsonl` crescer muito,
   as três rotas passam a varrer o arquivo cada uma. Vale notar antes de sentir.
3. **A ordem "existe, depois está válido" é uma convenção agora repetida em três rotas.**
   Ela não está extraída para um helper. Com três cópias, uma quarta rota pode inverter a
   ordem sem ninguém perceber, e o sintoma é um `410` para id que não existe. Extrair um
   `resolverValidacaoParaLeitura(req, res)` que devolve `null` ou responde seria a versão
   mais defensável disso.
4. **O `404` novo é a primeira resposta de erro em JSON numa rota que antes só devolvia
   `200`.** Vale conferir se algum consumidor trata "status diferente de 200" como falha
   fatal em vez de caso previsto.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

**Nenhum dos três mudou, e esta tarefa não tocou em nenhum.** Ela mexeu numa condição de
acesso em leitura, e o vetor de disponibilidade é outro.

- **I/O síncrono bloqueando o event loop.** `GET /evidencias` sem filtro continua fazendo
  uma leitura síncrona do arquivo inteiro e devolvendo tudo. Com o serviço público, é a
  rota mais fácil de usar para travar: não precisa escrever nada, só chamar.
- **Sem limite de taxa e sem autenticação.** Intacto. Um laço de `GET /evidencias` sem
  filtro é mais barato de montar do que um de `POST`, e o efeito é o mesmo.
- **Arquivo `.jsonl` como banco, sem backup, em disco local.** Intacto.

### 2. Onde há alucinação lógica neste fluxo

A alucinação central do `nota.js` segue intacta, e esta tarefa não tem relação com ela. Mas
a mudança introduz uma alucinação nova, e ela é do tipo silencioso.

**Um `id` que não existe agora recebe `404`, e o cliente pode ler isso como "não há
evidência".** Era o problema inverso antes, e era pior: o `200` com lista vazia era
verdadeiro e enganoso ao mesmo tempo. O `404` é **verdadeiro**, mas o significado depende
inteiramente de quem consome.

Para quem lê o contrato, a distinção é limpa. Para quem integrou em cima do comportamento
antigo e trata lista vazia como "nada registrado", o `404` chega como erro. Isso está
documentado, e continua sendo uma mudança de contrato que pode quebrar integração sem
que ninguém perceba o porquê.

E a alucinação que **não** foi tocada: a nota continua sendo uma soma de contagens de
palavras-chave apresentada com a tipografia de um dado medido. Uma evidência a mais
continua valendo exatamente o mesmo que uma evidência verificada, e nenhuma quantidade de
expiração muda isso.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Sem mudança. Comportamento único desde o fix-05: linha vazia é pulada, linha válida entra,
linha inválida é pulada com aviso, e a leitura continua.

**Um efeito de segunda ordem, e ele é novo:** `GET /evidencias?id=` agora depende de
`buscarValidacao`, ou seja, de `validacoes.jsonl`. Antes, a rota lia **um** arquivo. Agora
lê **dois** — o das evidências e o das validações. Isso significa que uma corrupção em
`validacoes.jsonl` passa a afetar uma rota que antes era independente dela.

Na prática, o efeito é benigno: arquivo corrompido devolve lista vazia de validações, e
`buscarValidacao` devolve `undefined`, o que cai no `404`. Uma validação que existia e
ficou ilegível por corrupção passa a responder `404` em vez de `200` com lista vazia. O
comportamento é razoável e o aviso de corrupção sai no `console.warn` como sempre, mas o
`404` passa a ter uma causa a mais que "id errado", e vale saber disso.

A linha corrompida continua no arquivo, e continua sem reparo nem backup.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Nada mudou em estrutura. Dentro de um processo, o I/O síncrono serializa tudo, e
`GET /evidencias` não escreve nada. Com **dois processos**, o comportamento continua **Nao
identificado nesta tarefa**.

Vale notar que esta rota ficou mais barata para um atacante, e não mais cara: o `404` evita
o trabalho de listar evidências quando o id é inválido. Um scanner de `id` agora recebe
`404` em vez de `200` com lista vazia, o que é **mais fácil de detectar**, não menos. É o
sentido correto: a resposta agora distingue o que antes não distinguia.

### 5. O que um atacante faria com este sistema

**Um caminho foi fechado. Dois continuam, e um deles piora com o que esta tarefa fez.**

**Fechado: leitura de evidências após o prazo.** Quem tivesse um `id` vencido não lista mais
as evidências cruas. Era o último caminho de leitura, e fechar ele completa a regra: as
três rotas que servem dado de validação conferem o prazo.

**Continua, e é o pior deles: envenenar a nota.** `POST /evidencias` é público, sem
autenticação e sem verificação de fonte. Não tocado, por decisão do PO. E há uma interação
que vale nomear: **a expiração agora fecha a leitura e mantém a escrita aberta**, então o
ataque fica mais limpo do que antes. Ele não precisa mais nem do link para afetar alguém —
basta ter o `id`, que é o mesmo conhecimento de antes, e escrever.

**Continua: negar serviço.** Laço de `GET /evidencias` sem filtro, ou de `POST`, sem limite
de taxa e com I/O síncrono.

**Continua, e ganhou uma nuance: link vazado vale 30 dias, sem revogação.** O prazo é o
único limite, e nenhuma tarefa desta série o reduziu.

Ou seja: **esta tarefa fechou o último caminho de leitura e não tocou em nenhum caminho de
escrita.** Ela diminue o que um atacante com o `id` consegue **ver**, e não mudou o que ele
consegue **fazer**. Num serviço público, "ver" é o vetor de menor impacto e "fazer" é o de
maior. A sequência de correções está fechando o vetor barato primeiro, e isso é um padrão
que vale dizer de novo.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que fechar a última brecha de leitura signifique fechar o problema de exposição.** O
título da tarefa é "a última brecha de expiração", e é verdade no escopo dele. Mas a
impressão que fica, se a pessoa lê só o título, é que o assunto exposto está encerrado.

Não está. Continua aberto: a escrita de evidência contra qualquer `id`, o laço sem limite, a
ausência de revogação, e a validade da nota depois do prazo — a nota geral ainda conta
evidência de validação vencida, porque ela não pertence a validação nenhuma e por isso não
tem prazo.

A segunda, mais sutil: **esta é a quarta correção de baixo custo da série**
(fix-05, fix-06, fix-07, fix-08, e agora fix-09). Cinco tarefas, todas reais, todas com
teste, e o vetor de maior impacto — escrever na nota de outra pessoa — segue intacto desde o
primeiro relatório Red Team. Um projeto com governança séria deveria olhar esse padrão com
desconfiança, e o fato de o próximo passo registrado ser "limite de taxa" em vez de
"autenticação" é o sintoma.

O honesto seria: *"fechei o quinto item mais fácil de uma lista, e o item mais importante
continua aberto porque a decisão do PO foi mantê-lo aberto"*. A segunda parte não é falha
deste projeto — é uma decisão legítima de produto. Mas o relatório não pode descrever essa decisão
de produto como se fosse risco eliminado.

## Pipeline de evolução

### Onde estamos

Fase de exposição: o produto está funcional e se declara público. A expiração de 30 dias
agora cobre **todas as rotas que servem dado de validação** — relatório, nota por ideia e
evidências vinculadas. A janela de leitura depois do prazo está fechada nas três direções.
O que continua aberto é o lado da escrita, que é decisão do PO.

### O que foi feito até aqui

- Tarefa 01: inspeção do ambiente (relatório reconstruído na Tarefa 09)
- Tarefa 02: endpoint `POST /validar-ideia`
- Tarefa 03: classificação determinística mobile/outro
- Tarefa 04: persistência em JSON Lines
- Tarefa 05: módulo `evidencias.js`
- Tarefa 06: unificação em uma única implementação
- Tarefa 07: remoção da duplicata `app/`
- Tarefa 08: organização para portfólio
- Tarefa 09: limpeza estrutural, injeção de caminho e `.gitattributes`
- Tarefa 10: atualização do `ESTADO.md` e migração para o GitHub
- Tarefa 11: `POST /evidencias` e `GET /evidencias`
- Tarefa 12: documentação das rotas de evidências
- Tarefa 13: primeiro critério da régua ("tem gente?")
- Tarefa 14: regras do projeto e convenção de nomes de relatório
- Tarefa 15: segundo critério ("tem gente insatisfeita?") e soma dos pontos
- fix-01: `405` em `/nota` e teste de `405` em `/evidencias`
- Tarefa 16: terceiro critério ("cabe mais um?")
- Tarefa 17: quarto critério ("alguém paga?") e tipo `monetizacao`
- Tarefa 18: quinto critério ("você alcança essas pessoas?") e tipo `alcance`
- Tarefa 19: veredito derivado da nota
- Tarefa 20: dashboard A4 e link de compartilhamento
- Tarefa 21: nota por ideia, vinculada ao ID da validação
- fix-02: aviso visual ao copiar link
- fix-03: pipeline de evolução em todos os relatórios
- fix-04: governança com Red Team e Contrato de Dados
- fix-05: leitura resiliente de `.jsonl`
- fix-06: classificação com limite de palavra
- fix-07: UUID v4 no ID da validação
- fix-08: disclaimers, expiração de links e vitrine de portfólio
- fix-09: expiração em `GET /evidencias?id=`

### O que falta

- [Alta] Limite de taxa em `POST /validar-ideia`, `POST /evidencias` e nas leituras. Com o
  serviço público, um laço de escrita enche o disco e segura o event loop
- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] Decisão do PO sobre escrita: `POST /evidencias` aceita `id_validacao` expirado e
  não autenticado. É o vetor de maior impacto que resta, e é escolha, não esquecimento
- [Média] Autenticação ou revogação de link. A expiração fechou a leitura, mas não há
  revogação antes do prazo
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida
- [Baixa] Extrair a checagem "existe, depois está válido" para um helper, hoje repetida em
  três rotas
- [Baixa] Link do perfil do autor: hoje aponta para o perfil no GitHub, não para um site pessoal
- [Baixa] Migração das validações antigas para `expires_at`. Hoje elas não expiram
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **`GET /evidencias?id=` exige que a validação exista**: `404` para id inexistente
- **`404` e não lista vazia**, porque "não há evidência" e "esse id não existe" são coisas
  diferentes, e a expiração depende da diferença
- **A checagem é "existe, depois está válido"**, na mesma ordem de `/relatorio/:id`
- **`410` com `{"error": "Este link expirou"}`**, e o corpo do erro não carrega dado
- **A expiração vale nas três rotas que aceitam `id` de validação**:
  `GET /relatorio/:id`, `GET /nota?id=` e `GET /evidencias?id=`
- **As duas rotas sem filtro não têm prazo**: não pertencem a uma validação
- **`POST /evidencias` continua aceitando `id_validacao` expirado**, por decisão do PO

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler este arquivo
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem revogação**: a expiração fechou a leitura, mas um link
  vazado vale até o prazo
- **Escrita continua aberta**, por decisão consciente do PO, com o risco documentado
- **`GET /evidencias?id=` mudou de contrato**: integração que guardava `id_validacao` sem
  validação correspondente passa a receber `404`
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia
  falha

### Próximo passo

**Tarefa 26 — limite de taxa nas rotas de escrita e nas leituras sem filtro.** Continua sendo
o passo que torna a publicação viável sem autenticação: sem limite, "público" significa
"disponível para ser derrubado", e `GET /evidencias` sem filtro é a rota mais barata para
quem quer tentar.

Depois, a Tarefa 22: coletar concorrentes e reclamações de verdade, com o `id` da validação
como entrada obrigatório.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-09-evidencia-expiracao.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-09-evidencia-expiracao.md").Length
30783
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-09-evidencia-expiracao.md`.
