# fix-07 — UUID v4 no ID da validação

## Data

17/10/2026

## Objetivo

Trocar o gerador de `id` da validação por `crypto.randomUUID()`, fechando o vetor de
**enumeração de relatórios** que a auditoria Red Team do fix-04 descreveu.

O formato antigo era `<Date.now()>-<6 caracteres base36>`. O prefixo é um timestamp
monotônico: quem valida uma ideia conhece o próprio timestamp com precisão de milissegundo,
o que reduzia muito o espaço de busca dos 2.176.782.336 candidatos do sufixo. Como o `id`
aparece na URL do relatório, que é exatamente o caminho que um atacante percorre, isso
importava.

## O que foi feito

### 1. `server.js`

```javascript
const { randomUUID } = require('crypto');
```

```javascript
// Gera o id de uma validação.
// É um UUID v4: 122 bits de entropia vinda de fonte criptográfica. Antes era
// "<timestamp em ms>-<6 caracteres>", e o timestamp monotônico permitia adivinhar
// o id por força bruta com muito menos tentativas — o id aparece na URL do
// relatório, que é o caminho que o atacante percorre.
function gerarId() {
  return randomUUID();
}
```

`Date.now()` e `Math.random()` **não aparecem mais em nenhum lugar do `server.js`**. Isso é
verificável, e é a diferença que importa: não é um sufixo melhorado, é a ausência do
mecanismo previsível.

### 2. Testes: de 88 para 92

Quatro testes novos, os quatro pedidos pela tarefa:

- `gerarId devolve um UUID v4, no formato documentado no contrato` — 200 amostras
- `dois ids gerados em sequência são diferentes` — 500 amostras, sem repetição
- `o id não carrega timestamp: não começa com 13 dígitos nem com data` — 100 amostras
- `o link do relatório funciona com o id em formato UUID` — o caminho HTTP completo

O regex do formato foi para uma constante nomeada, `REGEX_UUID_V4`, com o motivo de os dois
blocos que definem a versão anotados ao lado:

```javascript
const REGEX_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

### 3. Três asserções existentes precisaram mudar

Havia três testes que afirmavam o formato antigo, e eu não os vi antes de rodar:

```
L113: assert.match(r.corpo.id, /^\d+-[a-z0-9]+$/);
L120: assert.match(gravado.id, /^\d+-[a-z0-9]+$/);
L711: assert.match(r.corpo.id, /^\d+-[a-z0-9]+$/);
```

As três foram trocadas por `REGEX_UUID_V4`. Vale registrar o detalhe: o teste da linha 711,
`POST /validar-ideia: a resposta inclui o id`, foi escrito na **Tarefa 20** para "conferir o
formato do id", e ele **travava o formato antigo**. Um teste que fixa o formato do
identificador não é decorativo: ele impede a troca de gerador. Neste caso, atrapalhou
legitimamente, e foi atualizado.

### 4. Documentação no mesmo commit

- **`CONTRATO.md`**: formato do `id` reescrito, com o exemplo UUID pedido, os 122 bits, o
  motivo da troca, e um registro explícito de que o `id` **não é segredo**. Acrescentei
  também a nota de que o `id` da **Evidência** segue no formato antigo, porque não aparece
  em URL e não é chave de acesso.
- **`README.md`**: o `id` na tabela de endpoints, a seção do dashboard e do link, com o
  aviso de que **quem tem o link abre o relatório**.
- **`ESTADO.md`**: "O que existe hoje" com o UUID v4 e o motivo, contagem atualizada, e a
  pendência do link reescrita — o item do `id` previsível saiu de "O que falta".

## Uma verificação que quase me fez errar

Antes de editar, testei `randomUUID()` contra o regex da tarefa. **Todos os seis UUIDs
deram `false`.**

Duas leituras possíveis: `randomUUID()` não geraria v4, ou o meu teste estava errado. A
segunda é bem mais provável, e a causa foi o escape: escrevi o regex dentro de `node -e` com
aspas duplas do PowerShell, e o `$` do fim do padrão virou outra coisa no caminho para o
Node.

Refiz a verificação em arquivo, com o regex intacto:

```
3f89dc17-49ca-4b98-b520-822e2f0e5954 | casa v4: true | comeca com 13 digitos: false
3dac9af5-97cb-4c23-9aff-9e46af49a64f | casa v4: true | comeca com 13 digitos: false
0bd2679a-dfea-4f6c-8790-fc78ce0a2621 | casa v4: true | comeca com 13 digitos: false
e9b30a93-db6d-4092-8174-c5a8357cbc69 | casa v4: true | comeca com 13 digitos: false
986ccbb6-b043-4ae2-b456-c58ee5a42b4a | casa v4: true | comeca com 13 digitos: false
6a453875-5c16-492c-9d6c-71014545235a | casa v4: true | comeca com 13 digitos: false
unicos: true
versao do node: v24.14.1
```

Confirmado: `crypto.randomUUID()` gera v4 válido em Node 24.14.1. **O teste estava errado,
não o gerador.** Se eu tivesse "corrigido" a implementação para agradar a verificação, teria
trocado UUID por outra coisa sem motivo.

É a mesma lição do fix-05, quando um `nota.total` versus `nota.corpo.total` me quase fez
mexer em código correto: **verificar o comportamento real antes de mexer na implementação.**

## O que esta correção NÃO resolve

**Continua sem controle de acesso.** O `id` é muito mais difícil de adivinhar, e isso é
tudo que mudou. O relatório abre para qualquer pessoa com o link, não há autenticação, e o
link continua sendo a única proteção.

A distinção importa e está escrita no `CONTRATO.md` e no `ESTADO.md`:

- **antes**: `id` barato de adivinhar, o que permitia encontrar relatórios por varredura;
- **depois**: `id` caro de adivinhar, o que torna a varredura inviável;
- **nos dois casos**: quem recebe o link abre o documento. Quem tem o link já tinha acesso,
  e isso não mudou.

Ou seja: esta tarefa fechou **enumeração**, não **vazamento por link compartilhado**.

**O `evidencias.js` continua com o gerador fraco.** Ele tem o próprio `gerarId()`, com
`Date.now()` e `Math.random()`, e a tarefa pedia a troca só em `server.js`. Os `id` de
evidência não aparecem em URL e não são chave de acesso, então o risco é menor. Deixei
explícito no `CONTRATO.md` que os dois formatos são diferentes de propósito. **Se um dia o
`id` de evidência entrar em algum link, isso precisa ser revisto.**

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16784-1792238862247-k07syx.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16784-1792238862257-uywxzd.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16784-1792238862267-jl1cc5.jsonl por JSON invalido: 1, 2
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (38.9849ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (7.9423ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (4.9405ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (2.2737ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (3.489ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (9.7007ms)
Ô£ö linha corrompida ├® ignorada e n├úo derruba a listagem (10.1376ms)
Ô£ö corrup├º├úo no meio n├úo impede o filtro por id_validacao (9.6778ms)
Ô£ö arquivo com todas as linhas corrompidas devolve lista vazia, sem lan├ºar (4.5691ms)
Ô£ö linha corrompida n├úo impede gravar registros novos (5.4233ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (5.1924ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (34.842ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (6.7692ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (8.6795ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (6.9323ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (6.6458ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (6.5095ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (17.6874ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (8.5008ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (6.6408ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.8525ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7183ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5733ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.7392ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.5471ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.5473ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5066ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.0907ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.1108ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4762ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.3673ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4302ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4512ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.5225ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3273ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.346ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (8.5868ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.3909ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.9807ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.6233ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.4107ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.9939ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (166.3927ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (45.0469ms)
Ô£ö campo ausente: 400 e nada gravado (18.7544ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (31.3586ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (18.463ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (16.5066ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (21.1466ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (21.8722ms)
Ô£ö GET /saude: 200 com ok e servico (19.5566ms)
Ô£ö rota desconhecida: 404 em JSON (14.0173ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (11.8828ms)
Ô£ö POST /saude: 405 com header Allow: GET (13.9426ms)
Ô£ö classificarTipo usa limite de palavra e n├úo casa dentro de outras palavras (0.5773ms)
Ô£ö classifica├º├úo corrigida ├® o que o POST /validar-ideia devolve e grava (22.9606ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (17.6936ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (18.894ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (11.7824ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (12.4872ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (10.6731ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (26.3137ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (16.8268ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (10.3831ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (18.8036ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (26.639ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (25.5068ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (61.4367ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (24.2661ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (20.0576ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (31.5765ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (29.0093ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (21.2561ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (17.3856ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (67.7133ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (11.4309ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (17.2543ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (17.1587ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (20.2407ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (41.6275ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (35.2339ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (85.2114ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16736-1792238863752-ru5kg4.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16736-1792238863752-ru5kg4.jsonl por JSON invalido: 2
Ô£ö arquivo de validacoes corrompido n├úo impede o relat├│rio das valida├º├Áes boas (93.4111ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16736-1792238863846-3m1ynd.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16736-1792238863846-3m1ynd.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16736-1792238863846-3m1ynd.jsonl por JSON invalido: 1
Ô£ö arquivo de evidencias corrompido n├úo derruba /nota nem /evidencias (83.5783ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16736-1792238863930-6aeq6q.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16736-1792238863930-r113h5.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16736-1792238863930-r113h5.jsonl por JSON invalido: 1
Ô£ö relat├│rio e nota abrem mesmo com os dois arquivos corrompidos (41.0044ms)
Ô£ö gerarId devolve um UUID v4, no formato documentado no contrato (1.5157ms)
Ô£ö dois ids gerados em sequ├¬ncia s├úo diferentes (2.1215ms)
Ô£ö o id n├úo carrega timestamp: n├úo come├ºa com 13 d├¡gitos nem com data (1.2024ms)
Ô£ö o link do relat├│rio funciona com o id em formato UUID (31.2599ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (23.9371ms)
Ô£ö POST /nota: 405 com header Allow: GET (16.4429ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (11.5611ms)
Ôä╣ tests 92
Ôä╣ suites 0
Ôä╣ pass 92
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 2146.1801
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

Vale notar que as seis linhas de `validacoes.jsonl` que já existiam têm `id` no **formato
antigo**, e continuam válidas: `buscarValidacao` compara o id como string, e não faz
análise de formato. Nenhuma validação antiga quebrou, e nenhum dado precisou ser migrado.

## Saída real do `git log --oneline` (antes do commit desta correção)

```
b6ff400 fix-06: classificacao com limite de palavra
5025918 fix-05: leitura resiliente de .jsonl
93b1d74 fix-04: governanca com Red Team e Contrato de Dados
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
server.js
server.test.js
relatorios/fix-07-uuid-validacao.md   (novo)
```

`package.json` não foi alterado: uma única dependência, `express`. `crypto` é um módulo
nativo do Node.js, então **nenhuma dependência foi acrescentada**.

## O que não funcionou ou ficou pendente

Nada falhou na implementação. Ficou pendente:

1. **O link de compartilhamento continua sem controle de acesso.** Ver a seção acima. É o
   vetor de maior impacto que resta, e ele exige decisão do PO.
2. **O envenenamento de nota segue sem mitigação.** Trocar o `id` não teve nenhuma relação
   com ele, e não resolve nada dele.
3. **`evidencias.js` mantém o gerador antigo**, por decisão de escopo.
4. **Nenhuma pendência de ambiente foi resolvida**: comando `memory` inexistente, ausência
   de backup dos `.jsonl`, ausência de `.env`.

## Observações técnicas para a próxima tarefa

1. **A próxima tarefa precisa ser decisão de produto, não código.** Restam dois vetores:
   envenenamento de nota e acesso por link. Nenhum dos dois se resolve com uma linha. As
   opções reais para o acesso são: autenticação, token no link com expiração, ou link
   descartável. Para o envenenamento: autenticação, limite de taxa, verificação de fonte,
   ou aceitar que o produto é de uso interno.

2. **O teste de formato do `id` vai atrapalhar de novo, e está certo assim.** Ele existe
   para travar o contrato descrito no `CONTRATO.md`. Se o formato mudar de novo, o teste
   falha e o contrato tem de mudar junto.

3. **`crypto` é nativo e não entrou como dependência.** Vale lembrar disso se um dia
   alguem, numa auditoria de seguranca, pegar o `require('crypto')` e achar que foi
   adicionada uma biblioteca. Nao foi: `crypto` e nativo do Node.js.

4. **122 bits é bastante, e ainda assim não é permissão.** A matemática a favor é real: o
   espaço de busca deixou de ser viável. Nenhum teste de força bruta no projeto vai
   comprovar isso, porque o ganho está em não haver espaço de busca, e não em um teste
   passar.

5. **Números da documentação para a próxima tarefa:** total geral no README (92), e as linhas
   de `server.test.js` (50), `evidencias.test.js` (19) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 92 e o detalhamento por arquivo.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

Inalterados. Esta tarefa mexeu numa função de geração de id, e nada de I/O, limite ou
persistência:

- **I/O síncrono bloqueando o event loop.** `randomUUID()` é mais rápido que
  `Math.random()` sobre string, o que é irrelevante: o gargalo é
  `lerJsonl`/`escreverJsonl`, que continuam síncronos, e `GET /relatorio/:id` continua
  fazendo dois I/O por requisição.
- **Sem limite de requisições e sem autenticação.** Intacto. Esta tarefa **não** adicionou
  autenticação nenhuma, e é importante não confundir "id difícil" com "acesso restrito".
- **Arquivo `.jsonl` como banco, sem backup, em disco local.** Intacto.

### 2. Onde há alucinação lógica neste fluxo

A classificação foi corrigida no fix-06. O que continua alucinado, sem mudança:

- a régua conta um `tipo` que o cliente inventa, e não há deduplicação;
- `cabe_mais_um` pune mercado saturado;
- `ideia_relacionada` não é validada contra a validação;
- o veredito não sabe qual critério falhou;
- a classificação só reconhece `app` e `aplicativo`.

**E há uma alucinação nova, introduzida por esta tarefa, que vale dizer.** O relatório passa
a citar "122 bits de entropia" e a Documentation passa a dizer que o `id` "não é
adivinhável". As duas frases são verdadeiras no sentido matemático e **induzem uma conclusão
errada**: leu-las faz alguém achar que o relatório está protegido. Ele não está. A frase
correta seria "o `id` é caro de adivinhar", e eu a escrevi no `CONTRATO.md`, mas não nos
dois documentos voltados a quem avalia o produto.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Sem mudança. Comportamento único desde o fix-05: linha vazia é pulada, linha válida entra,
linha inválida é pulada com aviso, e a leitura continua.

**Continua verdade:** a linha corrompida permanece no arquivo, e não há reparo, detecção de
perda nem backup.

Uma observação específica desta tarefa: **a validação com id antigo ainda é encontrada.**
`buscarValidacao` compara o id como string, sem análise de formato, então as seis validações
existentes na máquina continuam abrindo relatório normalmente. Isso é o comportamento
desejado, e evita migração de dado — mas também significa que **o sistema convive com dois
formatos de id sem saber qual é qual**, o que é dívida pequena e registrada aqui.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Nada mudou. Dentro de um processo, o I/O síncrono impede embaralhamento de escrita; com
**dois processos** o comportamento continua **Nao identificado nesta tarefa**.

Ponto honesto sobre a geração de id: **`randomUUID()` é thread-safe por construção**, então
a troca também reduz o risco de colisão em cenários concorrentes, mesmo que o projeto não
tenha teste de concorrência. É um benefício real e **não verificado por teste**.

### 5. O que um atacante faria com este sistema

Um vetor **caiu** e três continuam de pé.

**Caiu: enumeração de relatórios.** O espaço de busca deixa de ser viável. Um atacante não
descobre mais relatórios alheios por varredura de `id`.

**Continuam:**

- **envenenar a nota** por `POST /evidencias` público, sem autenticação e sem verificação
  de fonte. Não foi tocado por esta tarefa, e continua sendo o vetor de maior impacto.
- **encher o disco** com laço de `POST`, sem limite de taxa. Ao fazer isso, um atacante
  ainda pode **usar a falta de limite como oráculo**: escrever evidências até o arquivo ficar
  grande, alterando a nota alheia, sem precisar conhecer nenhum `id`. A dificuldade de
  adivinhar `id` não protege esse caminho, porque ele não passa por `id`.
- **acesso por link**: quem recebe o link abre o relatório. Trocar o `id` **não muda nada**
  para quem já tem o link, e não há revogação: um link vazado continua válido para sempre.

Ou seja: **o vetor mais fácil de explorar caiu, e o vetor mais lucrativo continua
intacto.** Um relatório que terminasse em "vulnerabilidade corrigida" estaria mente.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que "o `id` agora tem entropia real" seja uma melhoria de segurança do produto.** É uma
melhoria de uma feature, e o relatório diz isso. Mas a consequência prática é menor do que
parece: antes, alguém precisava de esforço computacional alto **e** de uma taxa de resposta
para varrer relatórios; agora precisa apenas do link. Quem já tinha o link — que é o modo
normal de compartilhar — **não ganhou nem perdeu nada**.

E a segunda, mais séria: **esta tarefa é a terceira correção de baixo custo em sequência**
(fix-05, fix-06, fix-07), e o padrão está começando a parecer progresso. Três correções
pequenas, todas reais, todas com teste, e **nenhum dos dois vetores de maior impacto
envenenamento de nota e acesso por link** foi tocado. Um projeto com governança séria deveria
olhar esse padrão com desconfiança: é fácil fechar os itens baratos da lista e adiar os
caros, e o resultado é uma lista que esvazia enquanto o risco não cai.

O honesto seria: *"corrigi o terceiro defeito mais fácil de uma lista em que os dois
primeiros exigem decisão de produto, e essa decisão não aconteceu"*.

## Pipeline de evolução

### Onde estamos

Três dos quatro defeitos da auditoria Red Team do fix-04 foram fechados, todos de baixo
custo: leitura de `.jsonl` (fix-05), classificação por palavra (fix-06) e `id` com
entropia real (fix-07). Os dois vetores de maior impacto — envenenamento de nota e acesso
por link — continuam abertos e à espera de decisão do PO.

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

### O que falta

- [Alta] Mitigação do envenenamento de nota: autenticação, limite de taxa e verificação de
  fonte. **Exige decisão do PO, e é o vetor de maior impacto que resta**
- [Alta] Acesso ao relatório: token no link com expiração, autenticação, ou link
  descartável. Hoje o link é a única proteção e não há revogação
- [Alta] Coleta real de concorrentes e reclamações
- [Média] Publicação do serviço, hoje sem controle de acesso
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida
- [Média] Vínculo automático entre ideia e evidência na hora de coletar
- [Baixa] `evidencias.js` mantém o gerador de id antigo (`Date.now()` + `Math.random()`).
  Não aparece em URL, mas precisa mudar se um dia entrar em link
- [Baixa] Convivência de dois formatos de `id` nas validações já gravadas, sem migração
- [Baixa] Classificação de tipo ainda é por palavra-chave, e só reconhece `app` e
  `aplicativo`
- [Baixa] `console.warn` não é observável: falta logger e destino de log
- [Baixa] Verificação visual do relatório A4 e do dashboard, que exige navegador
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **`id` de validação é UUID v4, gerado por `crypto.randomUUID()`**, sem dependência nova:
  `crypto` é nativo do Node.js
- **O `id` continua sendo string e não é segredo.** O que mudou foi o custo de adivinhá-lo,
  não o controle de acesso
- **Validação antiga continua válida sem migração**, porque `buscarValidacao` compara o id
  como string e não analisa formato
- **O `id` de evidência mantém o formato antigo**, por estar fora de qualquer URL

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler o `ESTADO.md`
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**: agora com `id` caro de adivinhar, mas
  **sem revogação** e sem autenticação. Um link vazado continua válido
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia falha

### Próximo passo

**Tarefa 25 — decisão do PO sobre os dois vetores de acesso.** Não é uma tarefa de código, e
registrar isso é o passo honesto: as três correções anteriores foram de baixo custo, e o
padrão de fechar o item barato e adiar o caro já apareceu. As perguntas a responder são:

1. O serviço é público na internet ou de uso interno? Isso decide se há ataque real.
2. Quem pode registrar evidência? Se qualquer pessoa, a nota não significa nada.
3. Um link de relatório precisa expirar ou poder ser revogado?

Sem essas três respostas, escrever código de autenticação ou de token seria chute.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-07-uuid-validacao.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-07-uuid-validacao.md").Length
29115
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-07-uuid-validacao.md`,
com 29.115 bytes.
