# fix-04 — Governança com Red Team e Contrato de Dados

## Data

17/10/2026

## Objetivo

Formalizar a governança do projeto em três peças, a partir de uma sugestão externa:

1. **Auditoria Red Team** obrigatória em todo relatório, com seis perguntas fixas.
2. **`CONTRATO.md`**, o formato dos dados do projeto, com regra de atualização.
3. **Passagem de bastão**, escrita de quem valida o quê.

O fluxo principal está completo: ideia, classificação, evidências, nota, veredito, relatório.
O que falta não é funcionalidade, é o que impede um projeto assim de se enganar sozinho.

**Nenhum arquivo de código foi alterado.** A suíte roda para confirmar que nada quebrou.

## O que foi feito

### 1. Auditoria Red Team no template

`relatorios/TEMPLATE-PIPELINE.md` ganhou a seção `## Auditoria Red Team`, **antes** do
pipeline. A ordem não é estética: a leitura do progresso começa pelo risco, não pelo que deu
certo.

O template registra as seis perguntas obrigatórias e duas regras de conduta:

- **"Nao identificado nesta tarefa"** para pergunta sem resposta, com a justificativa de que
  a lacuna é informação;
- a pergunta 6, sobre a mentira mais confortável do relatório, **não pode ser omitida**
  mesmo quando a resposta for "nenhuma".

Enquanto escrevia o template, a primeira versão ficou com seções duplicadas e texto
corrompido. Reescrevi o arquivo inteiro, que é mais seguro do que remendar, e conferi a
estrutura ao final.

### 2. `CONTRATO.md` na raiz

Cinco entidades, com todos os campos conferidos **no código**, não de memória:

| Entidade | Onde vive |
| --- | --- |
| Validação | `validacoes.jsonl` |
| Evidência | `evidencias.jsonl` |
| Nota | resposta de `GET /nota`, não persistida |
| Veredito | campo dentro da Nota |
| Relatório | HTML em memória, não persistido |

Cada campo tem tipo, obrigatoriedade, onde é gerado e onde é consumido. Valores aceitos de
`tipo` e `relevancia`, formato do `id` e as quatro regras de `id_validacao` também estão
documentados.

O `CONTRATO.md` termina com uma seção de **pendências do contrato**, e elas não são
decorativas — são três achados da conferência:

- **`relevancia` é validada, gravada e usada por nenhum critério.** Campo morto por decisão
  consciente do PO, e ainda assim uma pergunta em aberto.
- **`url` é gravada e não exibida no relatório**, sendo o campo mais útil para quem quiser
  conferir a evidência.
- **`ideia_relacionada` não é validada contra a Validação**, e pode discordar do
  `id_validacao` sem que nada acuse.

### 3. `ESTADO.md`

- **Regras do projeto**: duas regras novas. A Auditoria Red Team é obrigatória em todo
  relatório, e toda tarefa que mexer em campo de dado atualiza o `CONTRATO.md` no mesmo
  commit, com o texto "campo novo sem contrato é dívida".
- **Seção "Passagem de bastão"**, com tabela de seis etapas: quem faz, o que confere e onde
  o resultado fica. Inclui uma regra de ouro e, explicitamente, **o que não é validado por
  agente**: aparência do A4 impresso, comportamento do navegador e verossimilhança das
  evidências.

### 4. `relatorios/fix-03-pipeline-evolucao.md`

Recebeu a Auditoria Red Team ao final, antes do pipeline. As respostas foram obtidas
**executando o código**, não de leitura.

## A auditoria, e o que ela encontrou

A auditoria do fix-03 está naquele arquivo, na íntegra. Ela é longa de propósito. O resumo do
que ela encontrou é o motivo de esta tarefa existir.

### Quatro defeitos que nenhum dos 79 testes pegaria

Estes foram reproduzidos durante esta tarefa, e nenhum aparece na suíte:

**1. Classificação com falso positivo.** A classificação `mobile` usa substring `app`, e
`"Pineapple shop"` é classificado como `mobile`. A ideia de um pêssego vira aplicativo.

**2. Uma linha corrompida derruba todas as leituras.** Com uma linha inválida em
`evidencias.jsonl`, `listarEvidencias` lança exceção, e nenhuma rota trata. O resultado é 500
em `GET /evidencias`, `GET /nota` e `GET /relatorio/:id`. Uma única linha ruim no fim do
arquivo quebra um produto que funcionava. E o pior: `validacoes.jsonl` faz o **oposto**, ignora
a linha e segue. Os dois arquivos reagem de modo oposto à corrupção, e o comportamento
perigoso é o do arquivo de evidências.

**3. A nota é envenenável por chamada pública.** `POST /evidencias` não tem autenticação nem
verificação de fonte. Quem chamar a API com `id_validacao` de uma ideia alheia e registrar
`concorrente`, `reclamacao`, `monetizacao` e `alcance` leva aquela nota a 5 de 5 e o
veredito a `SEGUIR`. O relatório passa a citar fontes inventadas com aparência de pesquisa.

**4. O `id` das validações é enumerável.** O formato é `<timestamp ms>-<6 base36>`. O sufixo
tem 2.176.782.336 combinações, o que parece forte, mas o prefixo é `Date.now()` monotônico e
quem valida uma ideia conhece o próprio timestamp com precisão de milissegundo. Sem bloqueio
de tentativa e sem controle de acesso no relatório, a busca é viável.

### Uma lacuna honestamente não verificada

**Comportamento com dois processos acessando o mesmo `.jsonl`: Nao identificado nesta
tarefa.** Não há trava de arquivo no projeto, e rodar duas instâncias é plausível em deploy.
Não testei e não vou afirmar.

O que **segue** disso é favorável e verificado: dentro de um único processo, o I/O síncrono
impede que escritas se embaralhem. A segunda requisição espera a primeira.

### A resposta à pergunta 6

A mentira mais confortável que este relatório conta é a própria frase **"79 testes, todos
passando"**. Ela soa como garantia de qualidade. Não há teste de concorrência, de carga, de
arquivo corrompido, nem qualquer teste que rode navegador — o dashboard, o veredito exibido e
o aviso de cópia **nunca foram executados de verdade**, e o relatório A4 **nunca foi visto por
ninguém**. As asserções do dashboard procuram texto no HTML, o que não prova que a tela
funciona.

A frase honesta seria: *"79 testes cobrindo regras de negócio e contrato HTTP, sem cobertura de
concorrência, de integridade de arquivo e de navegador"*.

### Um ponto onde a auditoria ajuda e não atrapalha

O teste de XSS **passa, e a proteção é real**. `escapar()` foi verificado com
`<script>alert(1)</script>`, e o relatório não tem JavaScript. É um ponto genuinamente bom,
e a auditoria também serve para registrar o que está certo, não só o que está errado.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (16.5599ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (4.9657ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.5252ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (2.0592ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (8.6767ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (13.0108ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (6.8908ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (6.9639ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.0794ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (7.1308ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (9.1242ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (5.9967ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (6.7386ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (15.7259ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (9.28ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (9.6038ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7032ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.8996ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6769ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.791ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.5436ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.5402ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5066ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.1663ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.7678ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4346ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4118ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4959ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4948ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.497ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3171ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.3401ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (2.7285ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.4672ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.8013ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.5988ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.3164ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.6041ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (173.21ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (39.6459ms)
Ô£ö campo ausente: 400 e nada gravado (21.4909ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (27.9818ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (15.2226ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (18.5112ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (14.5259ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (22.1883ms)
Ô£ö GET /saude: 200 com ok e servico (16.0059ms)
Ô£ö rota desconhecida: 404 em JSON (16.8222ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (13.3436ms)
Ô£ö POST /saude: 405 com header Allow: GET (11.6758ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (12.9189ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (16.3659ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (12.3547ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (12.7364ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (10.5657ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (31.1561ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (17.6524ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (13.3871ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (19.2464ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (25.5983ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (34.9418ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (40.0672ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (32.6214ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (33.2866ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (41.778ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (43.7397ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (48.8731ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (36.7864ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (132.0755ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (14.107ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (16.6841ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (31.0959ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (47.9405ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (57.6369ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (40.5676ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (47.8145ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (22.8503ms)
Ô£ö POST /nota: 405 com header Allow: GET (13.5792ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (17.5931ms)
Ôä╣ tests 79
Ôä╣ suites 0
Ôä╣ pass 79
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 2084.5466
```

Nenhum arquivo de código foi alterado. A suíte roda igual: 79 testes, 79 passando.

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
c6c74d0 fix-03: pipeline de evolucao em todos os relatorios
2518858 fix-02: aviso visual ao copiar link
89d0b73 Tarefa 21: nota por ideia vinculada ao ID da validacao
```

## Arquivos alterados

```
CONTRATO.md                                       (novo)
ESTADO.md
relatorios/TEMPLATE-PIPELINE.md
relatorios/fix-03-pipeline-evolucao.md
relatorios/fix-04-governanca-red-team-contrato.md (novo)
```

`package.json` não foi alterado: uma única dependência, `express`. Nenhum arquivo de código
foi alterado.

## O que não funcionou ou ficou pendente

1. **A auditoria criou uma pendência de código que ela mesma mercearia:** `.jsonl`
   corrompido derruba todas as leituras, e os dois arquivos reagem de modo oposto. Isso é um
   defeito, não uma melhoria, e vale entrar na próxima tarefa de código.

2. **A nota continua envenenável.** A auditoria descreveu o ataque com precisão, e a correção
   exige decisão do PO: autenticação, limite de taxa, verificação de fonte, ou alguma combinacao disso. Não é uma linha de código, é política de produto.

3. **O relatório impresso e o dashboard continuam sem verificação visual.** Registrado na
   seção "Passagem de bastão" como fora do alcance do agente.

4. **A lista "O que falta" do `ESTADO.md` continua se sobrepondo** à seção "O que não existe
   ainda", como apontado no fix-03.

## Observações técnicas para a próxima tarefa

1. **Se a próxima tarefa for de código, o `CONTRATO.md` pode ser obrigatório.** Corrigir
   `.jsonl` corrompido não muda campo nenhum, então o contrato não é acionado. Mas qualquer
   campo novo — e o `GET /nota?id=` já_DEVIA ter um contrato para o parâmetro — precisa
   entrar nele.

2. **A assimetria de corrupção entre os dois arquivos é o defeito mais acionável.** As duas
   funções leem JSON Lines do mesmo jeito e se comportam de maneiras opostas diante de
   arquivo ruim. Escolher um comportamento só, com teste, fecha o problema e elimina a
   surpresa.

3. **Corroborar a auditoria com teste é o passo natural.** Cada um dos quatro defeitos
   achados pela Red Team vira um teste que falha hoje e passa depois. É o jeito de a
   governança deixar de ser papel e virar mecanismo.

4. **A pergunta 6 vai incomodar, e é para isso que existe.** Os próximos relatórios vão
   ter que responder o que está sendo exaggerado ou omitido. É o mecanismo que impede o
   projeto de virar um conjunto de numeros conferidos.

5. **Números da documentação**: não mudaram. Segue 79 testes (41 em `server.test.js`, 15 em
   `evidencias.test.js`, 23 em `nota.test.js`).

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

Os mesmos três da auditoria do fix-03, que continuam válidos e que esta tarefa não alterou:
I/O síncrono bloqueando o event loop em cada requisição; ausência de limite de taxa e de
autenticação; e `.jsonl` como banco único, sem backup e em disco local.

Nenhuma melhoria nesta tarefa alterou o comportamento de execução. **Esta tarefa é de
documentação: o risco de execução é exatamente o mesmo que era antes.**

### 2. Onde há alucinação lógica neste fluxo

O conjunto completo está na auditoria do fix-03: a régua conta um `tipo` que o cliente
inventa, não há deduplicação, `cabe_mais_um` pune mercado saturado, a classificação por
substring tem falso positivo comprovado, `ideia_relacionada` não é validada contra a
validação, e o veredito não sabe qual critério falhou.

Esta tarefa documentou três dessas fraquezas no `CONTRATO.md` — `relevancia` sem uso, `url`
não exibida e `ideia_relacionada` sem validação. **Documentar não corrige.**

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Conferido nesta tarefa: `evidencias.jsonl` com uma linha inválida lança exceção e derruba
`GET /evidencias`, `GET /nota` e `GET /relatorio/:id` com 500. `validacoes.jsonl` ignora a
linha e segue. Comportamento oposto, e nenhum dos dois tem teste.

**Esta é a pendência de código mais concreta que a governança produziu.**

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Dentro de um processo, as escritas não se embaralham, porque o I/O é síncrono; a segunda
requisição espera. Com **dois processos**, o comportamento continua **Nao identificado nesta
tarefa** — não há trava de arquivo e nada foi testado.

### 5. O que um atacante faria com este sistema

Os quatro vetores da auditoria do fix-03 seguem abertos: envenenamento de nota por chamada
pública, enumeração de relatórios por `id` previsível, enchimento de disco por laço de
`POST`, e exposição por escuta em todas as interfaces. A proteção de XSS continua valendo e
verificada.

Nenhuma mitigação foi implementada nesta tarefa. **A auditoria descreveu o ataque; ninguém o
fez menos possível ainda.**

### 6. Qual é a mentira mais confortável que este relatório conta

**Que "governança" signifique melhoria do produto.** Este relatório adiciona Template,
Contrato e Passagem de Bastão, e parece um avanço. O que mudou no produto é **nada**: o
event loop ainda bloqueia, a nota ainda é envenenável, o `.jsonl` corrompido ainda derruba
tudo, e o relatório impresso continua sem ter sido visto por ninguém.

O ganho é real, mas é de **visibilidade**, não de comportamento: agora o risco está escrito,
e um próximo agente vai lê-lo em vez de redescobri-lo. Dizer "corrigimos o risco" seria a
mentira. O honesto é "tornamos o risco visível ebatido, e o próximo passo tem nome".

## Pipeline de evolução

### Onde estamos

Fase de consolidação: o fluxo do produto está completo e o projeto ganhou governança
escrita — auditoria de risco obrigatória, contrato de dados e passagem de bastão. O próximo
passo é transformar risco documentado em risco testado.

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

### O que falta

- [Alta] Tratar `.jsonl` corrompido, hoje com comportamento oposto entre os dois arquivos e
  sem teste. Defeito confirmado pela auditoria, não melhoria
- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Mitigação do envenenamento de nota: autenticação, limite de taxa e verificação de
  fonte. Exige decisão de produto
- [Média] Testes que corroborem os defeitos da auditoria, para transformar risco escrito em
  risco testado
- [Média] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] Publicação do serviço, hoje sem controle de acesso
- [Baixa] Verificação visual do relatório A4 e do dashboard, que exige navegador
- [Baixa] Integração com LLM e RAG
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **Auditoria Red Team obrigatória em todo relatório**, antes do pipeline, com resposta
  honesta e "Nao identificado nesta tarefa" para lacuna
- **`CONTRATO.md` na raiz**, atualizado no mesmo commit de qualquer tarefa que mexa em campo
- **Passagem de bastão escrita**, com a regra de que correção do PO deve ser registrada no
  relatório, e com a lista explícita do que agente não valida
- **O contrato documenta também o que está errado**: `relevancia` sem uso, `url` não exibida e
  `ideia_relacionada` sem validação

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler o `ESTADO.md`
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**, o que torna o `id` enumerável um
  problema real
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia falha

### Próximo passo

**Tarefa 22 — fechar o `.jsonl` corrompido com teste**, escolhendo um único comportamento
para os dois arquivos e escrevendo o teste que hoje falha. É o defeito mais concreto que a
governança produziu, e é a forma de transformar a auditoria em mecanismo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-04-governanca-red-team-contrato.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-04-governanca-red-team-contrato.md").Length
23400
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-04-governanca-red-team-contrato.md`,
com 23.400 bytes.
