# fix-08 — Disclaimers, expiração de links e vitrine de portfólio

## Data

17/10/2026

## Objetivo

Implementar as quatro decisões de produto do PO sobre acesso e apresentação:

1. O serviço é público, de portfólio, com disclaimer visível.
2. `POST /evidencias` continua aberto, com disclaimer de qualidade.
3. Links de relatório expiram em 30 dias.
4. O dashboard tem link para o perfil do autor e para o código-fonte.

Até aqui, o projeto vinha fechando correção de baixo custo: `id` previsível, classificação
por substring, leitura frágil de `.jsonl`. Esta é a **primeira tarefa em que o PO decide
algo**, e a decisão foi **não bloquear o acesso e declarar o produto**. Isso muda a natureza
do que está em jogo: antes o risco era técnico, agora ele é de positioning.

## O que foi feito

### 1. `expires_at` e expiração em `server.js`

```javascript
const DIAS_EXPIRACAO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
```

```javascript
function gerarExpiracao(agora = Date.now()) {
  return new Date(agora + DIAS_EXPIRACAO * MS_POR_DIA).toISOString();
}
```

`GET /relatorio/:id` ganhou a checagem, e o caso expirado responde `410`:

```javascript
if (linkExpirado(validacao)) {
  return res.status(410).type('html').send(paginaExpirada(formatarData(validacao.expires_at)));
}
```

O `410` em vez de `404` é escolha deliberada. `404` diz que a validação não existe; `410`
diz que ela existe e que o acesso deixou de valer. Para quem consome a API, a diferença é
real: no `404` a resposta legítima seria repetir a requisição; no `410` é gerar outra
validação.

### 2. A decisão de compatibilidade, e por que ela não é óbvia

Validação antiga **não tem `expires_at`**, e o tratamento é "não expirada". Registrei o
raciocínio em `CONTRATO.md`, porque a escolha contrária pareceria mais segura:

- **Tratar o campo ausente como expirado quebraria relatórios que já funcionavam**, sem
  caminho de volta. Um relatório fechado sem aviso é pior do que um relatório aberto.
- **Não migrar o dado.** Preencher `expires_at` a partir do `timestamp` antigo inventaria um
  prazo que ninguém nunca aceitou. O `.jsonl` é dado do usuário.
- **O custo é assimétrico.** O erro de fechar cedo é irreversível e visível; o de deixar
  aberto é o estado em que o relatório já estava.

O custo aceito está escrito: **as validações antigas não expiram nunca**. São 6 neste
ambiente, e o rodapé delas diz "Validação anterior à expiração: este link não tem data de
expiração" em vez de omitir a linha. Um rodapé calado pode ser lido como "não expira" quando
o oposto também é verdade, e esse relatório específico não expira de fato.

### 3. Avisos na interface

Dashboard, no topo:

- banner: "Este é um projeto de portfólio. Os dados são fictícios ou de demonstração. Não
  use para decisões de negócio reais";
- aviso de qualidade: "As evidências são fornecidas por usuários. A qualidade da nota depende
  da qualidade das evidências."

Rodapé do dashboard, a vitrine de portfólio: autor com link para o perfil e botão
"Ver código-fonte" para o repositório.

Relatório, no rodapé: o aviso de que as evidências vêm de usuários e não há verificação de
fonte, mais a data de expiração.

A identidade ficou em **três constantes** no topo de `relatorio.js`, e não espalhada no
HTML, para que trocar o nome do autor seja uma edição de um lugar só.

### 4. Um conflito entre teste e decisão de produto

Um teste da Tarefa 20 falhou no primeiro `npm test` desta tarefa:

```
✖ GET /dashboard: 200 com HTML, formulário e botão de copiar (12.2465ms)
  AssertionError [ERR_ASSERTION]: nenhuma URL absoluta
```

O teste afirmava que o dashboard **não contém nenhuma URL absoluta**, e a decisão 4 do PO
exige um link para o GitHub. Não é possível satisfazer os dois literalmente.

O comentário do teste dizia o que ele de fato protegia: *"O dashboard não carrega nada de
fora."* Isso é sobre **recurso baixado** — fonte, script, imagem — e não sobre link de
navegação. Um `<a href>` não carrega nada até alguém clicar.

Estreitei a asserção para o que ela pretendia:

```javascript
assert.ok(!/<script[^>]+src=/.test(corpo), 'nenhum script externo');
assert.ok(!/<link[^>]+href=/.test(corpo), 'nenhuma folha de estilo externa');
assert.ok(!/<img[^>]+src=/.test(corpo), 'nenhuma imagem externa');
assert.ok(!corpo.includes('@import'), 'nenhum @import de fonte');
assert.ok(!/<iframe/.test(corpo), 'nenhum iframe');
```

**O que não fiz:** simplesmente apagar o teste. Era o caminho mais rápido, e teria escondido
uma garantia real do projeto — a página não fala com terceiros sem a pessoa pedir. A
propriedade continua testada, agora no nível certo.

### 5. Nove testes novos, de 92 para 101

| Teste | O que fixa |
| --- | --- |
| `POST /validar-ideia` devolve `expires_at` 30 dias no futuro | o campo existe, é ISO, está no intervalo certo e **é gravado no arquivo** |
| link no prazo devolve `200` e a data | o relatório mostra a expiração |
| link expirado devolve `410` | e a validação continua existindo |
| validação antiga sem `expires_at` devolve `200` | a compatibilidade |
| dashboard avisa que é portfólio e aponta o código-fonte | os avisos e os dois links |
| relatório avisa que a evidência não é verificada | o disclaimer do relatório |
| `GET /nota?id=` com id expirado devolve `410` | a expiração cobre o **dado**, não só a página |
| `GET /nota?id=` com id válido devolve `200` | a nota por ideia continua funcionando |
| `GET /nota` sem `?id=` devolve `200` | a nota geral não tem prazo |

O teste de expiração não espera 30 dias: ele grava a validação, reescreve o `expires_at` no
arquivo temporário e deixa o servidor decidir. O caminho exercitado é o de leitura real do
produto, não um mock.

O primeiro teste também verifica que a validação **continua no arquivo depois de expirar**,
com `assert.equal(lerLinhas(arquivo).length, 1)`. Expirar é fechar acesso, não apagar dado:
uma expiração que removesse o registro destruiria a nota junto.

### 6. A expiração passou a cobrir o dado, não só a página

Isto mudou depois de eu ter escrito a primeira versão deste relatório, e é a correção mais
importante que a tarefa ganhou.

Na primeira versão, eu mesmo tinha escrito, na seção "O que esta tarefa NÃO resolve", que
`GET /nota?id=` **não** verificava expiração. O PO respondeu que a expiração deve cobrir o
dado. Ele estava certo, e o argumento é direto:

> Fechar a página e deixar o dado acessível por outra rota faz da expiração uma medida de
> **aparência**. O relatório some da tela, a informação não.

`GET /nota` ganhou a verificação antes de calcular a nota:

```javascript
if (filtro !== undefined) {
  const validacao = buscarValidacao(filtro, arquivoValidacoes);

  if (linkExpirado(validacao)) {
    return res.status(410).json({ error: 'Este link expirou' });
  }
}
```

`410` e não `404`, pela mesma razão do relatório: a validação existe, o acesso é que não. E o
corpo do erro é `{"error": "Este link expirou"}`, sem `total` nem `criterios` — o teste
verifica explicitamente que a nota **não vaza** dentro da resposta de erro.

A nota geral, sem `?id=`, fica de fora de propósito: ela agrega evidências sem vínculo e não
pertence a nenhuma validação, então não tem `expires_at` de onde tirar um prazo. O teste
confirma isso com todas as validações do cenário já expiradas.

**O que continua aberto depois dessa mudança:** `GET /evidencias?id=` é a última rota de
leitura que aceita um `id` de validação, e ela **não** verifica expiração. Quem tiver o `id`
ainda consegue listar as evidências cruas depois do prazo. Não fechei porque muda o contrato
de `GET /evidencias`, e a tarefa não pediu. Está registrado como pendência em `CONTRATO.md` e
`ESTADO.md`.

### 7. O nome do autor

`AUTOR_PROJETO`, em `relatorio.js`, passou de `'[seu nome]'` para **`Clodoaldo Teixeira`**,
confirmado pelo PO.

Na primeira versão deste relatório eu **tinha parado antes do commit** por causa disso, e o
motivo continua válido: um placeholder `[seu nome]` num rodapé de portfólio público é pior
que não ter nome nenhum. Concentrar o valor numa constante fez a troca ser uma edição só, e
os dois rodapés — dashboard e relatório — mudaram juntos.

## O envenenamento de nota: decisão consciente do PO

**O risco de envenenamento de nota permanece e está documentado como decisão consciente do
PO.**

O PO confirmou o volume exato, para não haver dúvida sobre o que foi decidido e o que não
foi:

- **`POST /evidencias` continua aberto**, sem autenticação e sem limite de taxa;
- a decisão é **consciente**, e não uma pendência esquecida;
- a mitigação escolhida é **comunicação**: o rodapé de todo relatório diz que as evidências
  vêm de usuários e que não há verificação de fonte, e o dashboard avisa que a qualidade da
  nota depende da qualidade das evidências;
- **aviso não é controle.** Quem escreve não passa pelo aviso, e a nota continua sendo uma
  função de entradas que qualquer pessoa pode enviar.

Não implementei limite de taxa nem autenticação porque isso seria contrariar uma decisão
explícita de produto. O que me cabe é deixar o risco escrito no lugar onde ele será lido:
`README.md`, `CONTRATO.md`, `ESTADO.md`, o rodapé de cada relatório, e aqui.

Quem decide rever essa decisão é o PO. E a tentativa de deixar a publicação segura sem
autenticação passa por limite de taxa, que é a Tarefa 26 proposta.

## O que esta tarefa NÃO resolve

**A expiração não é controle de acesso.** Um link vazado vale por 30 dias. Não há revogação,
e o prazo é o único limite. Quem tem o link tem o relatório enquanto ele valer.

**`GET /evidencias?id=` continua lendo depois do prazo.** A expiração foi estendida para
`GET /relatorio/:id` e `GET /nota?id=`, mas essa é a última rota de leitura que aceita um
`id` de validação e ela **não** confere o prazo. Quem souber o `id` ainda lista as evidências
cruas depois do vencimento. Fechá-la muda o contrato de `GET /evidencias`, e está registrado
como pendência.

**O envenenamento de nota segue inteiro**, por decisão do PO, na seção acima.

**Nenhuma validação antiga expira.** Decisão deliberata, custo aceito, descrito acima.

**O aviso no relatório não acompanha o conteúdo fora do site.** Ele está no rodapé e
sobrevive ao `@media print`, mas um PDF repostado sem rodapé perde o aviso.

## Uma falha de processo que vale registrar

No meio desta tarefa, um comando meu de escrita em PowerShell falhou e, mesmo assim, executou
o `WriteAllText` com conteúdo nulo. **O relatório ficou com 0 bytes** e, por ainda não estar
versionado, não havia como recuperá-lo. Tive de reescrever o arquivo inteiro.

A lição é técnica e específica: em PowerShell, `WriteAllText` não é abortado por uma exceção
anterior na mesma linha. O padrão `$x = $algo.Substring(...)` seguido de escrita é
inseguro quando o índice pode ser `-1`. Vale escrever para arquivo temporário, validar, e só
então mover. E vale o hábito de `git add` do relatório **antes** de terminar a tarefa, para
que exista uma cópia no índice mesmo sem commit.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14904-1792240838016-btulfc.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14904-1792240838026-re7064.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14904-1792240838037-wiqfl6.jsonl por JSON invalido: 1, 2
✔ evidência válida: grava e devolve id e timestamp preenchidos (18.3663ms)
✔ evidência sem "fonte": lança erro e não grava (2.6657ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.6095ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.5208ms)
✔ listar evidências de arquivo vazio: devolve [] (5.1199ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (17.9246ms)
✔ linha corrompida é ignorada e não derruba a listagem (10.0492ms)
✔ corrupção no meio não impede o filtro por id_validacao (10.273ms)
✔ arquivo com todas as linhas corrompidas devolve lista vazia, sem lançar (6.3339ms)
✔ linha corrompida não impede gravar registros novos (6.1214ms)
✔ nenhum teste grava no evidencias.jsonl de produção (15.996ms)
✔ tipo "monetizacao" é aceito, gravado e listado (18.8172ms)
✔ o tipo "monetizacao" convive com os outros tres na mesma gravacao (15.632ms)
✔ tipo "alcance" é aceito, gravado e listado (7.8755ms)
✔ os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.6641ms)
✔ evidência com id_validacao é gravada e recuperada (31.5525ms)
✔ id_validacao ausente não é gravado, e id_validacao vazio é recusado (20.0097ms)
✔ listarEvidencias com filtro devolve só as evidencias daquele id_validacao (17.68ms)
✔ listarEvidencias sem filtro devolve todas, na ordem de gravação (8.5964ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (6.3531ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.8289ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7779ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.642ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.8086ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.5747ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.5413ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5531ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.2471ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.2388ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.5316ms)
✔ alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.461ms)
✔ alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4728ms)
✔ alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5826ms)
✔ alguem_paga: so o tipo monetizacao pontua neste criterio (0.6459ms)
✔ alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.5498ms)
✔ alcance: 1 evidencia vale 1, que e o minimo exigido (0.4502ms)
✔ alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.568ms)
✔ alcance: so o tipo alcance pontua neste criterio (2.8712ms)
✔ derivarVeredito: cada total da escala cai na faixa correta (3.3773ms)
✔ o veredito acompanha o total em cenarios reais de evidencias (1.0768ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (2.1737ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (4.376ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (172.8461ms)
✔ ideia nao mobile: 200 com tipo "outro" (31.1815ms)
✔ campo ausente: 400 e nada gravado (21.1966ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (37.3015ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (17.8956ms)
✔ body que nao e objeto JSON: 400 e nada gravado (15.7331ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (21.956ms)
✔ corpo acima de 100kb: 413 e nada gravado (32.303ms)
✔ GET /saude: 200 com ok e servico (16.8812ms)
✔ rota desconhecida: 404 em JSON (13.476ms)
✔ GET /validar-ideia: 405 com header Allow: POST (15.2618ms)
✔ POST /saude: 405 com header Allow: GET (12.3753ms)
✔ classificarTipo usa limite de palavra e não casa dentro de outras palavras (0.4531ms)
✔ classificação corrigida é o que o POST /validar-ideia devolve e grava (20.4457ms)
✔ nenhum teste grava no validacoes.jsonl de producao (13.9725ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (15.9546ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (12.1626ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (11.5416ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (10.0503ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (25.5816ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (16.7921ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (11.1931ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (18.763ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (28.4749ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (22.2511ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (34.3598ms)
✔ POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério (21.4722ms)
✔ POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério (26.2093ms)
✔ GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (31.0586ms)
✔ GET /nota com nota 3: veredito manda mudar o recorte (26.8133ms)
✔ GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (22.8098ms)
✔ POST /validar-ideia: a resposta inclui o id que dá acesso ao relatório (15.4075ms)
✔ GET /relatorio/:id com id válido: 200 com HTML do relatório (64.8538ms)
✔ GET /relatorio/:id com id inválido: 404 com HTML (8.4496ms)
✔ GET /dashboard: 200 com HTML, formulário e botão de copiar (11.4957ms)
✔ o HTML do relatório traz @page A4 e @media print escondendo os controles (17.9299ms)
✔ POST /evidencias com id_validacao é aceito e vincula a evidência (18.2593ms)
✔ GET /nota?id= calcula a nota so com as evidencias daquele id (43.7391ms)
✔ GET /nota sem ?id= mantém a nota global, sobre todas as evidencias (38.8861ms)
✔ GET /relatorio/:id mostra a nota daquela validacao, e nao a global (39.8954ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-8768-1792240839520-uprnh9.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-8768-1792240839520-uprnh9.jsonl por JSON invalido: 2
✔ arquivo de validacoes corrompido não impede o relatório das validações boas (27.5527ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-8768-1792240839548-alyfb1.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-8768-1792240839548-alyfb1.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-8768-1792240839548-alyfb1.jsonl por JSON invalido: 1
✔ arquivo de evidencias corrompido não derruba /nota nem /evidencias (31.8677ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-8768-1792240839580-q9ol9z.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-8768-1792240839580-l79nt8.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-8768-1792240839580-l79nt8.jsonl por JSON invalido: 1
✔ relatório e nota abrem mesmo com os dois arquivos corrompidos (24.7798ms)
✔ gerarId devolve um UUID v4, no formato documentado no contrato (1.0775ms)
✔ dois ids gerados em sequência são diferentes (1.8915ms)
✔ o id não carrega timestamp: não começa com 13 dígitos nem com data (0.7726ms)
✔ o link do relatório funciona com o id em formato UUID (21.3663ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (28.6732ms)
✔ POST /nota: 405 com header Allow: GET (14.5077ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (13.3903ms)
✔ POST /validar-ideia devolve expires_at 30 dias no futuro (13.5377ms)
✔ GET /relatorio com link no prazo devolve 200 e a data de expiração (19.4363ms)
✔ GET /relatorio com link expirado devolve 410 e a página de expirado (21.6413ms)
✔ validação antiga sem expires_at continua abrindo: 200 (compatibilidade) (23.3396ms)
✔ o dashboard avisa que é projeto de portfólio e aponta o código-fonte (10.5922ms)
✔ o relatório avisa que a evidência não é verificada (21.912ms)
✔ GET /nota?id= com id expirado devolve 410 em JSON (21.8898ms)
✔ GET /nota?id= com id valido devolve 200 e a nota da ideia (21.8344ms)
✔ GET /nota sem ?id= continua devolvendo a nota geral, sem expiracao (23.7943ms)
ℹ tests 101
ℹ suites 0
ℹ pass 101
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2144.3694
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

As 6 validações existentes continuam **sem `expires_at`**, e isso é verificado, não
suposto: a contagem de registros sem o campo é 6 de 6 antes e depois. Nenhum teste escreve nos
`.jsonl` de produção — todos usam arquivo temporário.

## Saída real do `git log --oneline` (antes do commit desta correção)

```
5e4da81 fix-07: UUID v4 no ID da validacao
b6ff400 fix-06: classificacao com limite de palavra
5025918 fix-05: leitura resiliente de .jsonl
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
relatorio.js
server.js
server.test.js
relatorios/fix-08-disclaimers-expiracao.md   (novo)
```

`package.json` não foi alterado: uma única dependência, `express`. `crypto` continua sendo
usado pelo `randomUUID()` do fix-07, e nenhuma dependência foi acrescentada.

## O que não funcionou ou ficou pendente

1. **Um teste da Tarefa 20 precisou ser estreitado**, por conflito direto com a decisão 4 do
   PO. Detalhado acima.
2. **`GET /evidencias?id=` continua sem verificação de expiração.** É a última rota de
   leitura que aceita um `id` de validação, e a estender até lá muda o contrato dela.
   Registrado em `CONTRATO.md` e `ESTADO.md`.
3. **O nome do autor bloqueou o commit até o PO responder.** Não é um defeito, é o
   funcionamento da regra de parar e perguntar. Está na seção 7.
4. **O relatório foi apagado por um erro meu de script e reescrito.** Está na seção de
   processo, e é a única parte desta tarefa que me deu problema.

## Observações técnicas para a próxima tarefa

1. **Limite de taxa é a próxima tarefa, e é o que fecha a publicação.** Sem ele, as duas
   rotas de escrita são um laço de `POST` público. E o I/O síncrono faz o dano ser maior:
   cada escrita segura o event loop.
2. **`expires_at` é o primeiro campo com semântica de tempo no contrato.** Vale lembrar que
   a comparação é feita com `Date.now()` no servidor, sem fuso, sobre ISO com `Z`. Isso evita
   o bug clássico de validação que "vive" para sempre por comparação de string.
3. **A função `definirExpiracao` no teste reescreve o arquivo.** Ela existe para evitar
   esperar 30 dias. Se um dia o prazo mudar, o teste continua válido: ele só troca a data
   para o passado.
4. **A identidade do projeto está em três constantes** em `relatorio.js`:
   `AUTOR_PROJETO`, `PERFIL_AUTOR`, `REPOSITORIO`. Qualquer mudança de marca passa pelas três.
5. **O teste de "não carrega nada de fora" voltou a existir em nível correto.** Se um dia
   alguém adicionar um `<script src>` para uma fonte externa, ele quebra — e deve.
6. **A checagem de expiração tem dois lugares e não pode virar três por esquecimento.** Hoje
   são `GET /relatorio/:id` e `GET /nota?id=`. Se entrar uma terceira rota que aceite `id` de
   validação, ela precisa da mesma linha, e o risco é alguém copiar a rota e esquecer o
   prazo. Vale um teste que percorra as rotas de leitura procurando por `id_validacao`.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

**O primeiro piorou, e essa é a resposta honesta à pergunta.** Antes desta tarefa, o serviço
não tinha decisão de produto, e "público" era uma hipótese. Agora é um fato: qualquer pessoa
na internet pode chamar `POST /evidencias` em laço, e **não há limite de taxa**. O I/O é
síncrono, então cada requisição segura o event loop inteiro. Isso é o vetor de
disponibilidade número um, e a decisão do PO o mantém aberto de forma consciente.

**O segundo é o envenenamento de nota**, que segue idêntico: `POST /evidencias` aberto,
aceita `id_validacao` de qualquer validação, sem verificação de fonte. A nota é uma função
das evidências, e as evidências são escritas por qualquer um. O disclaimer não muda o
cálculo.

**O terceiro é o disco.** `validacoes.jsonl` e `evidencias.jsonl` crescem sem limite, sem
rotação e sem backup, e são ignorados pelo Git. Um laço de escrita enche o disco da VPS, e
o sistema não tem degradação graciosa: a leitura de arquivo enorme é síncrona também.

### 2. Onde há alucinação lógica neste fluxo

A alucinação central do `nota.js` não mudou, e a expiração não tem relação com ela. Mas esta
tarefa **tornou uma alucinação visível ao leitor**, e isso é relevante: o rodapé do relatório
diz agora que não há verificação de fonte. Uma pessoa que leia o relatório recebe a
informação correta e, ainda assim, um número com duas casas decimais de aparência precisa.

O relatório apresenta `4 de 5 pontos` com a mesma tipografia de um dado medido. A nota é uma
**soma de contagens de palavras-chave**, e o layout não faz essa diferença. O disclaimer
corrige a omissão; ele não corrige a **aparência de precisão**.

E há uma alucinação nova, introduzida por esta tarefa. O rodapé diz "Este link expira em
16/11/2026", e isso sugere um controle sobre a duração do acesso. Não existe controle: existe
uma data que o servidor compara, e **quem tem o link pode copiar o conteúdo na hora**. A
expiração governa a página, não o conhecimento adquirido.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Sem mudança desde o fix-05: linha vazia é pulada, linha válida entra, linha inválida é
pulada com aviso, a leitura continua, e a linha ruim **continua no arquivo**.

Um efeito novo e pequeno: **`expires_at` aumenta a superfície de corrupção**. Um registro
com `expires_at` ilegível é tratado como não expirado, por decisão deliberada e documentada.
A alternativa — tratar como expirado — fecharia o acesso a um relatório que a pessoa já
tinha, por causa de um campo ruim. Um `expires_at` corrompido é, portanto, um pedido de
acesso permanente. É o mesmo princípio do resto do projeto: **um campo danificado não deve
fechar o que estava aberto.**

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Nada mudou em estrutura, e continua **Nao identificado nesta tarefa** para o caso de dois
processos.

Dentro de um processo, o I/O síncrono serializa as escritas: `POST /validar-ideia` gera o
`expires_at` com `Date.now()` e grava antes da próxima requisição ser atendida. Dois
registros seguidos têm `expires_at` distintos quando há mudança de milissegundo, e **iguais
quando não há** — o que é correto, não é defeito.

O detalhe que merece registro: **`expires_at` não usa o relógio do cliente**, e isso é o
que fecha a coerência. Se o carimbo viesse do cliente, um relógio errado produzindo um prazo
errado seria gravado como verdade. O servidor é a única fonte do tempo, e o `id` é gerado
com `crypto.randomUUID()`, que é thread-safe por construção.

### 5. O que um atacante faria com este sistema

Um vetor foi parcialmente contido e três seguem de pé. **Nenhum foi fechado.**

**Contido parcialmente: exposição de link.** Antes, um link vazado expunha o relatório para
sempre. Agora a janela é de 30 dias. É uma redução real e é o que a tarefa entrega. Ela não
muda o cenário do atacante que **recebe** o link, que é o cenário normal de compartilhamento.

**Fechado no caminho, por insistência do PO: leitura da nota depois do prazo.** Na primeira
versão desta tarefa, `GET /nota?id=` ignorava `expires_at`, e eu tinha escrito isso na seção
"O que NÃO resolve". O PO mandou fechar, e está certo: com a nota aberta, a expiração
protegia a **página** e não o **dado**, e um atacante com o `id` lia a mesma informação pelo
endpoint JSON. Era proteção aparente. Agora são `410` nas duas rotas.

Resta uma brecha da mesma família, e ela é da mesma natureza: **`GET /evidencias?id=`
continua lendo depois do prazo.** Quem tiver o `id` ainda lê as evidências cruas. Não fechei
porque muda o contrato daquela rota e a tarefa não pediu, mas nomear isso aqui importa tanto
quanto nomear a correção: a regra "expiração vale onde o dado é servido" ainda tem uma
exceção, e ela está escrita.

**Continuam:**

- **Envenenar a nota.** `POST /evidencias` público, sem autenticação e sem verificação de
  fonte. Não tocado, por decisão consciente do PO.
- **Negar serviço.** Laço de `POST` sem limite, com I/O síncrono. Não tocado, e agora com
  menos desculpa: o serviço é público por decisão.
- **Usar o próprio link contra a vítima.** O atacante que tem um relatório pode registrar
  evidência contra o `id` daquela validação e alterar a nota. **A expiração não protege
  disso**, porque ele não depende de tempo, e sim de ter o `id` — que está na URL.

Ou seja: **a decisão do PO trocou um vetor de impacto baixo (link eterno) por um de impacto
alto (endpoint de escrita aberto, em serviço público), e compensou com transparência.** É
uma escolha legítima e coerente para portfólio. Só não é uma escolha de segurança, e o
relatório não deveria dizer que é.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que "o link expira" seja proteção de acesso.** A frase aparece em três documentos, e em
nenhum deles há a palavra "controle de acesso" ao lado. O relatório está correto nas
palavras e omite a frase que importa: o atacante que já tem o link não perde nada com essa
tarefa. O que a tarefa faz é **dar prazo de validade ao documento hospedado**, o que é
higiene de produto e não defesa.

E a segunda, que é a que me incomoda mais: **o número 30 dias parece arbitrado e não é.**
Nenhum cálculo levou a 30. É um prazo administrativo escolhido por um PO — o que é
perfeitamente legítimo, e vale dizer assim. Mas o relatório poderia facilmente deixar o 30
parecer resultado de uma análise de risco, e não é. Ele é um número que alguém escolheu, e
ninguém sabe dizer qual é o pior caso se for maior ou menor. **Um prazo escolhido sem
justificativa explícita é uma decisão, não uma constante** — e vale revisar quando houver
dado real sobre vazamento.

A terceira: **os disclaimers parecem resolver o problema de acesso, e não resolvem.** Ler o
banner do portfólio leva uma pessoa a entender que o dado é de demonstração. Isso é
verdade e é útil. Não impede ninguém de registrar mil evidências para inflar uma nota, e o
banner está na tela de **leitura**, não na de escrita.

## Pipeline de evolução

### Onde estamos

Fase de exposição: o produto está funcional de ponta a ponta e agora se declara público. O
PO resolveu a questão de acesso pelo caminho da transparência em vez da autenticação, e o
projeto absorveu isso com avisos na interface, prazo de 30 dias no link e vitrine de
portfólio com código-fonte e autor. O `id` em UUID v4 do fix-07 e o `expires_at` deste
fix-08 fecham a janela de exposição do relatório e da nota por ideia. O que falta é proteger
as rotas de escrita.

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

### Decisões do PO implementadas

1. Serviço público de portfólio, com disclaimer visível
2. `POST /evidencias` aberto, com disclaimer de qualidade. O risco de envenenamento de nota
   permanece e está documentado como decisão consciente do PO
3. Link de relatório expira em 30 dias, e a expiração cobre também `GET /nota?id=`
4. Dashboard com perfil do autor e link do código-fonte, com `Clodoaldo Teixeira` no rodapé

### O que falta

- [Alta] Limite de taxa em `POST /validar-ideia` e `POST /evidencias`. Com o serviço
  público, um laço de escrita enche o disco e segura o event loop
- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] Autenticação ou revogação de link. A expiração fecha o relatório e a nota por
  ideia, mas não dá revogação antes do prazo
- [Média] Expiração também em `GET /evidencias?id=`, a última rota de leitura que aceita um
  `id` de validação e ainda não confere o prazo
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida
- [Baixa] Link do perfil do autor: hoje aponta para o perfil no GitHub, não para um site pessoal
- [Baixa] Migração das validações antigas para `expires_at`. Hoje elas não expiram
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **`expires_at` = `timestamp` + 30 dias**, em ISO 8601, gerado pelo servidor
- **`410 Gone` para link expirado**, e não `404`: a validação existe, o acesso é que não
- **A expiração cobre `GET /relatorio/:id` E `GET /nota?id=`**: fechar só a página deixava o
  mesmo dado acessível por outra rota, o que tornava a medida aparente
- **`GET /nota` sem `?id=` não tem prazo**: a nota geral não pertence a uma validação
- **O nome do autor é `Clodoaldo Teixeira`**, confirmado pelo PO
- **`POST /evidencias` segue aberto, por decisão consciente do PO**, com o risco
  documentado e sem tentativa de contornar a decisão no código
- **Validação antiga sem `expires_at` nunca expira**, por compatibilidade deliberada
- **`expires_at` ilegível também não expira**: campo danificado não fecha acesso
- **O prazo é do link, não do documento**: PDF impresso continua válido
- **Identidade do projeto em três constantes** em `relatorio.js`

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler este arquivo
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**, agora com expiração de 30 dias no
  relatório e na nota por ideia
- **`GET /evidencias?id=` ainda lê depois do prazo**, e é a última rota nesse formato
- **Envenenamento de nota permanece**, por decisão consciente do PO, com o risco documentado
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia
  falha

### Próximo passo

**Tarefa 26 — limite de taxa nas rotas de escrita.** É o que torna a publicação segura sem
autenticação: sem limite, "público" significa "disponível para ser derrubado".

Depois, a Tarefa 22 segue na fila: coletar concorrentes e reclamações de verdade, com o `id`
da validação como entrada obrigatório.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-08-disclaimers-expiracao.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-08-disclaimers-expiracao.md").Length
37412
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-08-disclaimers-expiracao.md`.
