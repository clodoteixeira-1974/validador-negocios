# Tarefa 21 — Nota por ideia, vinculada ao ID da validação

## Data

16/10/2026

## Objetivo

Corrigir um erro de produto que vinha registrado como pendência desde a Tarefa 13: **a nota
não era da ideia, era de todas as ideias juntas**. O relatório tinha o identificador da
validação no cabeçalho, mas mostrava a nota calculada sobre todas as evidências gravadas, e
associava "evidências relacionadas" comparando o texto da ideia por substring.

Agora cada evidência pode ser vinculada a uma validação pelo campo `id_validacao`, e a nota,
o relatório e o dashboard passam a falar de uma ideia só.

## O que foi feito

### 1. `evidencias.js`

- **`CAMPOS_OPCIONAIS`**, constante nova com `id_validacao`. É a distinção que faltava: os
  campos obrigatórios continuam sendo sete, e o vínculo é aceito, validado quando presente
  e opcional.
- **Validação do campo opcional**: se presente, tem de ser string, e não pode ser vazio ou
  só com espaços. Um id em branco pareceria vinculado a uma validação que não existe, então é
  recusado com mensagem explicando que o campo deve ser apagado para desvincular.
- **`registrarEvidencia`**: remove o campo quando ele é `undefined` ou `null`. Ausente é
  diferente de vazio, e a distinção é explícita no comentário.
- **Ordem dos campos**: `id_validacao` entra **por último**, para não mudar a ordem dos
  campos já gravados no arquivo. Registros antigos continuam lendo igual.
- **`listarEvidencias(arquivo, idValidacao)`**: segundo parâmetro. Com string preenchida,
  devolve só as evidências com `id_validacao` igual; com `undefined`, `null` ou string
  vazia, devolve todas. Filtrar não apaga nada do arquivo.

A função foi exportada com a assinatura nova. Nenhuma chamada existente precisou mudar,
porque todas passavam apenas o caminho.

### 2. `server.js`

- **`CAMPOS_EVIDENCIA`** ganhou `id_validacao`, então `POST /evidencias` passa a aceitar e
  repassar o campo.
- **`GET /evidencias?id=<id>`**: filtra por validação. Sem o parâmetro, devolve todas.
- **`GET /nota?id=<id>`**: idem, e é o que faz a nota ser por ideia.
- **`GET /relatorio/:id`**: passa a calcular a nota **só com as evidências daquele id**, e a
  listar só com elas.
- **`evidenciasRelacionadas` foi removida** e substituída por `evidenciasDaValidacao(id,
  arquivo)`, que filtra pelo campo. Era a função da comparação por substring, e a Tarefa 20
  registrou explicitamente que ela deveria sumir em vez de ser melhorada.

### 3. `relatorio.js`

O JavaScript do dashboard passou a chamar `/nota?id=<id da validação>` em vez de `/nota`.
Sem isso, o painel — que é a interface principal do produto — continuaria mostrando a nota
geral enquanto o relatório mostraria a nota da ideia. Seriam dois números diferentes na
mesma tela.

### 4. `evidencias.test.js`: de 11 para 15 testes

- `evidência com id_validacao é gravada e recuperada`
- `id_validacao ausente não é gravado, e id_validacao vazio é recusado` — cobre os três
  casos: ausente não aparece no arquivo, vazio é recusado, e tipo errado é recusado.
- `listarEvidencias com filtro devolve só as evidencias daquele id_validacao` — com quatro
  evidências de vínculos diferentes, confere o filtro em dois ids, o id sem evidências
  (devolve vazio, não todas) e o filtro vazio (ignorado, devolve todas).
- `listarEvidencias sem filtro devolve todas, na ordem de gravação` — e confirma que o
  arquivo continua com as três linhas depois de filtrar.

### 5. `server.test.js`: de 37 para 41 testes

- `POST /evidencias com id_validacao é aceito e vincula a evidência`
- `GET /nota?id= calcula a nota so com as evidencias daquele id` — o teste central da
  tarefa: duas validações, cada uma com suas evidências, e confirma que **as evidências de
  uma não contam para a outra**, nos dois sentidos.
- `GET /nota sem ?id= mantém a nota global, sobre todas as evidencias`
- `GET /relatorio/:id mostra a nota daquela validacao, e nao a global` — duas validações, uma
  fraca e uma forte; o relatório da fraca não pode herdar a nota da forte, e nenhum dos dois
  pode mostrar evidências do outro.

### Um teste existente precisou ser ajustado, e a falha é o registro da correção

`GET /relatorio/:id com id válido` registrava a evidência com `ideia_relacionada` e sem
`id_validacao`, e esperava vê-la no relatório. Com o filtro estrito, ela não aparece mais —
e a falha mostrou exatamente isso:

```
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Concorrente A/.
```

Esse é o comportamento novo funcionando: evidência sem vínculo não entra em relatório. O
teste passou a enviar `id_validacao`.

### Um erro de implementação meu, e um de expectativa

**Erro de implementação.** A primeira versão de `registrarEvidencia` apagava `id_validacao`
quando não era string **ou** estava em branco, antes da validação. Isso tornava a checagem de
vazio código morto, e meu próprio teste falhou com `actual: undefined`. O comportamento
correto é estrito: tipo errado e valor em branco são recusados, para que a API diga ao
usuário que houve erro em vez de desvincular a evidência em silêncio. A condição ficou só
para `undefined` e `null`.

**Erro de expectativa.** No teste da nota global, escrevi que `cabe_mais_um` valeria 0.
Não vale: são 3 concorrentes no total, dentro da faixa de 2 a 4, então valem 1 ponto. O
`total` 3 que eu esperava estava certo — as três somas não, só uma delas. O
teste foi corrigido e o comentário explica por que o valor é 1.

### 6. Documentação atualizada no mesmo commit

`README.md` e `ESTADO.md` foram atualizados: campo `id_validacao`, query param `?id=`,
contagem de testes, estado do projeto dizendo que a nota é por ideia, e a remoção da
pendência da nota geral.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (30.2376ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (7.5175ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.9385ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (3.9236ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (3.3572ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (9.7498ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (5.4592ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (9.0755ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (6.9282ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (7.676ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.8899ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (7.9075ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (6.2766ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (16.442ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (11.2709ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (18.0182ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (4.8916ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (2.9317ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6777ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.8562ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.6533ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.6697ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (1.1891ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (6.4209ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (7.4183ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (1.1312ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4476ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4032ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5714ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (6.6167ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3662ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.3906ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.7899ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (1.0206ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (3.5071ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.6163ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.5609ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (7.576ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (204.5685ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (47.3803ms)
Ô£ö campo ausente: 400 e nada gravado (18.062ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (33.4515ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (16.9698ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (19.5218ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (16.8879ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (30.9676ms)
Ô£ö GET /saude: 200 com ok e servico (18.3124ms)
Ô£ö rota desconhecida: 404 em JSON (14.6404ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (16.4939ms)
Ô£ö POST /saude: 405 com header Allow: GET (14.6205ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (13.5731ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (18.6812ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (15.3561ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (9.9838ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (14.6992ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (29.4428ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (19.9808ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (11.9514ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (22.6178ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (78.3244ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (193.1637ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (393.433ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (110.4281ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (222.021ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (68.4485ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (73.3175ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (71.7902ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (85.4936ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (408.392ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (60.4773ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (77.5623ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (128.2491ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (156.4664ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (282.8561ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (283.5036ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (326.3544ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (108.4086ms)
Ô£ö POST /nota: 405 com header Allow: GET (24.4106ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (31.8895ms)
Ôä╣ tests 79
Ôä╣ suites 0
Ôä╣ pass 79
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 4732.0327
```

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu. Vale notar: `POST /evidencias` agora grava um campo a mais quando
o vínculo é informado, e ainda assim os arquivos de produção não mudaram, porque os testes
usam arquivos temporários.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
6e82468 Tarefa 20: dashboard A4 e compartilhamento por link
8031b7f Tarefa 19: veredito a partir da nota
1989fc1 Tarefa 18: quinto criterio da regua (alcance)
```

## Arquivos alterados

```
ESTADO.md
README.md
evidencias.js
evidencias.test.js
relatorio.js
server.js
server.test.js
relatorios/tarefa-21-nota-por-ideia.md
```

`package.json` não foi alterado. O projeto segue com **uma única dependência**, `express`.

## O que não funcionou ou ficou pendente

Um erro de implementação e um de expectativa, ambos descritos acima e corrigidos antes do
commit. Nada ficou quebrado.

Ficou pendente, e foi registrado no `ESTADO.md` conforme a regra do projeto:

1. **O vínculo depende do cliente.** O `id_validacao` precisa ser enviado a cada evidência.
   Quem integra o serviço precisa validar a ideia, guardar o id e repassá-lo. Nada preenche
   isso sozinho ainda.
2. **Evidências sem vínculo continuam existindo** e contam na nota geral. Isso é intencional
   — serve para material que não pertence a uma ideia — mas significa que um relatório só
   mostra o que foi vinculado a ele.
3. **Registros gravados antes desta tarefa não têm vínculo.** Como os `.jsonl` são ignorados
   pelo Git, isso não afeta quem clona o repositório. As 3 evidências que existem aqui na
   máquina, da Tarefa 05, continuam sem vínculo.
4. **Pendências de ambiente e infraestrutura**, mantidas em "Pendências conhecidas": comando
   `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`, e o link de
   compartilhamento sem controle de acesso.

## Observações técnicas para a próxima tarefa

1. **A coleta de dados agora tem uma entrada obrigatória que não tinha.** O coletor precisa
   do id da validação para vincular cada evidência. Se a coleta rodar sem ideia definida,
   tudo que ela trouxer cai na nota geral e não aparece em relatório nenhum. Isso precisa
   ser uma decisão explícita do produto, não um detalhe de implementação.

2. **A heurística por substring foi eliminada, não melhorada.** `evidenciasRelacionadas` não
   existe mais. Não sobrou caminho que associe evidência a ideia por texto.

3. **A escala de subconjuntos ficou pequena de propósito.** Com o filtro, `?id=` devolve só
   o que pertence à ideia. Vale um teste futuro para o caso em que a evidência pertence a
   validação inexistente: hoje devolve lista vazia, que é o comportamento correto.

4. **O relatório não mostra a qual evidência falta vínculo.** Se alguém coletar bastante
   material e esquecer de vincular, o relatório vai mostrar "nenhuma evidência registrada"
   sem explicar que existem evidências órfãs. Um contador ajudaria, mas é melhoria, não
   correção.

5. **Números da documentação para a próxima tarefa:** total geral no README (79), e as linhas
   de `server.test.js` (41), `evidencias.test.js` (15) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 79 e o detalhamento por arquivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-21-nota-por-ideia.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-21-nota-por-ideia.md").Length
16510
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-21-nota-por-ideia.md`,
com 16.510 bytes.
