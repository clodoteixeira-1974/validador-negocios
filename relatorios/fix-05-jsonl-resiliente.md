# fix-05 — Leitura resiliente de `.jsonl`

## Data

17/10/2026

## Objetivo

Fechar o defeito mais concreto que a auditoria Red Team do fix-04 encontrou: os dois
arquivos `.jsonl` tinham **comportamentos opostos** diante de uma linha corrompida.

| Arquivo | Antes | Efeito |
| --- | --- | --- |
| `evidencias.jsonl` | lançava exceção | 500 em `GET /evidencias`, `GET /nota` e `GET /relatorio/:id` |
| `validacoes.jsonl` | pulava a linha em silêncio | seguia normal, sem avisar nada |

Decisão do PO: **um único comportamento para os dois** — ignorar a linha corrompida,
registrar um aviso, e continuar processando as demais.

## O que foi feito

### 1. `jsonl.js` (arquivo novo)

Módulo compartilhado com três funções:

- **`lerJsonl(arquivo)`** — devolve `{ registros, linhasIgnoradas }`. Arquivo inexistente
  devolve os dois vazios. Linha vazia é pulada sem aviso; linha válida entra no resultado
  na ordem do arquivo; linha inválida é pulada e **o número da linha** vai para
  `linhasIgnoradas`. **Nunca lança** por conteúdo corrompido.
- **`escreverJsonl(arquivo, registro)`** — acréscimo de uma linha. Mantém o comportamento
  anterior, sem mudança.
- **`avisarLinhasIgnoradas(arquivo, linhasIgnoradas)`** — `console.warn`, e **só fala
  quando houve alguma**, para não poluir a saída de um servidor saudável. Acima de 20
  linhas, lista as primeiras 20 e acrescenta reticências.

Uma decisão deliberada: **o aviso registra o número da linha, nunca o conteúdo.** Uma linha
corrompida costuma ser lixo ou um registro pela metade, e não é lugar para vazar em log. O
teste verifica que uma evidência com texto de usuário não aparece no aviso.

### 2. `evidencias.js`

- `listarEvidencias` passou a usar `lerJsonl` e a avisar. O filtro por `id_validacao` e o
  comportamento de arquivo inexistente continuam iguais.
- A gravação passou a usar `escreverJsonl`.
- **A exceção de JSON inválido saiu do módulo.** Ela existia só para formatar a mensagem, e
  a função que dependia dela foi substituída.

### 3. `server.js`

- `buscarValidacao` passou a usar `lerJsonl` e a avisar.
- `registrarValidacao` passou a usar `escreverJsonl`.
- `fs` ficou **sem uso** nos dois módulos e o `require` foi removido. `path` continua, para
  o `path.join` das constantes de arquivo.

### 4. Testes: de 79 para 86

**`evidencias.test.js`, de 15 para 19** — quatro testes novos:

- linha corrompida é ignorada e não derruba a listagem (3 registros, corrompe o do meio,
  os outros dois são servidos)
- corrupção no meio não impede o filtro por `id_validacao`
- arquivo com todas as linhas corrompidas devolve lista vazia, sem lançar
- linha corrompida não impede gravar registros novos

**`server.test.js`, de 41 para 44** — três testes novos, que exercitam as rotas de verdade:

- arquivo de validações corrompido não impede o relatório das validações boas
- arquivo de evidências corrompido não derruba `/nota` nem `/evidencias`
- relatório e nota abrem mesmo com **os dois arquivos** corrompidos

### 5. Documentação no mesmo commit

- **`CONTRATO.md`**: nova seção "Comportamento de leitura de `.jsonl`", com a tabela dos três
  casos, o formato do aviso, e o que a resiliência **não** resolve.
- **`README.md`**: parágrafo sobre leitura resiliente, `jsonl.js` na tabela de estrutura,
  contagem atualizada.
- **`ESTADO.md`**: leitura resiliente em "O que existe hoje", contagem atualizada, e item de
  pendência **substituído** em "O que falta".

## Dois erros meus, e um deles quase passou

**Erro no teste.** Escrevi "2 linhas válidas + 1 corrompida" e, ao executar, corrompi a
segunda de **duas** linhas — então sobrava uma, e o teste falhou com `actual: 1, expected: 2`.
Corrigi para gravar três registros e corromper o do meio, que é o cenário que a tarefa
descreve.

**Erro de API no teste, mais difícil de achar.** Escrevi `nota.total` num teste que usa o
auxiliar `getNota`, que devolve `{ status, corpo }`. O correto era `nota.corpo.total`, e o
resultado foi `actual: undefined`. **Verifiquei o comportamento real antes de mexer na
expectativa**: subi o servidor, registrei duas evidências, corrompi uma e imprimi o corpo de
`GET /nota`. O serviço respondia `200` com o JSON certo e `total` 0. Ou seja, o código
estava certo e o teste é que estava errado — o que é exatamente o oposto do que a falha
sugeria, e por isso vale registrar o caminho.

**Quase passou um terceiro.** Digitei `comArquidor` em vez de `comServidor`. O erro de
sintaxe pegou antes de rodar. Já tinha acontecido com nome de teste duplicado, e o padrão
ficou: conferir nome de função depois de colar.

## O que a auditoria do fix-04 disse e o que é verdade agora

A afirmação do fix-04 era: *"uma única linha corrompida no fim do arquivo derruba a leitura
de todas as evidências"*. **Isso deixou de ser verdade**, e há teste que prova, nas três
rotas que eram atingidas.

O que **não** mudou, e vale não vender como resolvido:

- a linha corrompida **continua no arquivo**. Ela é ignorada na leitura, não apagada, e não
  existe caminho no código para removê-la;
- **não há detecção de perda nem reparo**, e os arquivos seguem sem backup;
- o aviso é um `console.warn`, e ninguém observa o log em produção porque **não há
  produção**.

O item saiu de "O que falta" como `[Alta] correção de .jsonl corrompido` e entrou como
`[Média] detecção de perda e reparo`, com o texto dizendo o que sobra. Trocar o defeito por
meio defeito não seria honesto.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14308-1792237387632-h3bzgo.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14308-1792237387665-dnh689.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14308-1792237387693-qfpl3e.jsonl por JSON invalido: 1, 2
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (56.6038ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (4.4274ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (3.7784ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (2.2936ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (5.9781ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (6.9015ms)
Ô£ö linha corrompida ├® ignorada e n├úo derruba a listagem (31.5196ms)
Ô£ö corrup├º├úo no meio n├úo impede o filtro por id_validacao (29.3314ms)
Ô£ö arquivo com todas as linhas corrompidas devolve lista vazia, sem lan├ºar (5.4541ms)
Ô£ö linha corrompida n├úo impede gravar registros novos (11.5939ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (67.0068ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (10.1535ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.8845ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (10.8729ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.0669ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (7.6637ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (6.0031ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (17.649ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (8.6489ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (6.5752ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (2.1656ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (1.4918ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6724ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.8422ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.5895ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.4267ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.4612ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.127ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (2.2831ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.7337ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4699ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.3507ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.6812ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (1.9061ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.4815ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (1.2542ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (2.3189ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.4365ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.5758ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.5929ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.2439ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.7173ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (197.6365ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (53.1599ms)
Ô£ö campo ausente: 400 e nada gravado (22.8378ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (29.0985ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (20.0289ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (20.1722ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (19.5542ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (23.6153ms)
Ô£ö GET /saude: 200 com ok e servico (26.9934ms)
Ô£ö rota desconhecida: 404 em JSON (12.6526ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (12.9517ms)
Ô£ö POST /saude: 405 com header Allow: GET (11.6821ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (16.3847ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (18.2517ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (18.6861ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (15.1339ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (15.4808ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (31.7998ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (20.5258ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (13.4039ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (27.8665ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (29.7752ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (31.1488ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (43.9357ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (34.1576ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (31.0664ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (40.5368ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (41.5543ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (19.862ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (18.6645ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (62.0429ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (10.1142ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (7.6444ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (22.6203ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (19.4191ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (40.9303ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (32.9572ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (39.0679ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-14972-1792237389444-zxlbz6.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-14972-1792237389444-zxlbz6.jsonl por JSON invalido: 2
Ô£ö arquivo de validacoes corrompido n├úo impede o relat├│rio das valida├º├Áes boas (25.7193ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14972-1792237389470-qd0hp7.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14972-1792237389470-qd0hp7.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14972-1792237389470-qd0hp7.jsonl por JSON invalido: 1
Ô£ö arquivo de evidencias corrompido n├úo derruba /nota nem /evidencias (35.7227ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-14972-1792237389506-97i60g.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14972-1792237389506-7wuzub.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14972-1792237389506-7wuzub.jsonl por JSON invalido: 1
Ô£ö relat├│rio e nota abrem mesmo com os dois arquivos corrompidos (25.9886ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (19.151ms)
Ô£ö POST /nota: 405 com header Allow: GET (12.4225ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (10.2073ms)
Ôä╣ tests 86
Ôä╣ suites 0
Ôä╣ pass 86
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 2442.0381
```

**Os avisos `[jsonl]` aparecem nesta saída.** Eles são o comportamento novo funcionando: os
sete testes de corrupção gravam arquivo de propósito e o aviso aparece. Nenhum aviso aparece
nos 79 testes que não corrompem nada.

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
93b1d74 fix-04: governanca com Red Team e Contrato de Dados
c6c74d0 fix-03: pipeline de evolucao em todos os relatorios
2518858 fix-02: aviso visual ao copiar link
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
jsonl.js                                          (novo)
evidencias.js
evidencias.test.js
server.js
server.test.js
relatorios/fix-05-jsonl-resiliente.md            (novo)
```

`package.json` não foi alterado: uma única dependência, `express`.

## O que não funcionou ou ficou pendente

Nada ficou quebrado. Ficou pendente:

1. **A linha corrompida não é removida**, e não há reparo nem detecção de perda. Ver acima.
2. **O aviso não é observável em produção**, porque ainda não existe produção nem coletor de
   log. Um `console.warn` que ninguém lê é meio consolo.
3. **Nenhuma pendência de ambiente foi resolvida**: comando `memory` inexistente, ausência
   de backup dos `.jsonl`, ausência de `.env`, link de compartilhamento sem controle de
   acesso.

## Observações técnicas para a próxima tarefa

1. **Os outros dois defeitos da auditoria continuam abertos**, e nenhum é tão fácil quanto
   este foi: a classificação `"Pineapple shop"` como `mobile` é uma linha de teste; o
   envenenamento de nota e a enumeração de `id` exigem decisão de produto antes de virar
   código.

2. **`lerJsonl` é agora o ponto único de leitura.** Qualquer leitura nova de `.jsonl` deve
   passar por ela, e não por `fs.readFileSync` direto. Vale notar que a auditoria do fix-04
   viu dois arquivos lendo JSON Lines de maneiras diferentes **justamente porque não havia
   função compartilhada**; a lição é o motivo de `jsonl.js` existir.

3. **`console.warn` é o canal errado para produção.** Vale trocar por um logger com
   contagem, junto com a decisão de onde o log vai. Não é urgente enquanto não há
   produção, e é enganoso fingir que já está resolvido.

4. **Os testes de corrupção usam `fs.readFileSync` direto** para corromper o arquivo de
   propósito. É o uso legítimo que sobrou no projeto, e está em arquivo de teste, não em
   código de produção.

5. **Números da documentação para a próxima tarefa:** total geral no README (86), e as linhas
   de `server.test.js` (44), `evidencias.test.js` (19) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 86 e o detalhamento por arquivo.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

Inalterados, e esta tarefa não toca em nenhum deles:

- **I/O síncrono bloqueando o event loop.** `lerJsonl` usa `fs.readFileSync` e
  `escreverJsonl` usa `fs.appendFileSync`. `GET /relatorio/:id` continua lendo o arquivo de
  validações e o de evidências, ou seja, dois I/O bloqueantes por requisição. A
  resiliência melhorou a corretude e **não mudou o desempenho**, que é o problema real sob
  tráfego.
- **Sem limite de requisições e sem autenticação.** Continua valendo, e agora há mais
  `console.warn` para saturar.
- **Arquivo `.jsonl` como banco, sem backup e em disco local.** Continua. E a gravação é
  só acréscimo: agora há ainda menos caminho para corrigir registro ruim, porque a única
  leitura possível já não é a que falhava.

### 2. Onde há alucinação lógica neste fluxo

O conjunto continua o mesmo da auditoria do fix-04: a régua conta um `tipo` que o cliente
inventa, não há deduplicação, `cabe_mais_um` pune mercado saturado, a classificação por
substring tem falso positivo comprovado (`"Pineapple shop"` como `mobile`),
`ideia_relacionada` não é validada contra a validação, e o veredito não sabe qual critério
falhou.

**Nenhuma dessas foi tocada.** Documentar o comportamento de leitura não altera nenhuma lógica
de negócio.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

**Esta é a pergunta que esta tarefa respondeu.** Comportamento único para os dois arquivos:
linha vazia é pulada sem aviso, linha válida entra, linha inválida é pulada com aviso, e a
leitura continua. Arquivo inexistente é vazio, arquivo todo corrompido é lista vazia.
Nenhuma rota devolve 500 por conteúdo corrompido, e há sete testes novos que travam isso.

**O que continua verdade e não foi resolvido:** a linha corrompida permanece no arquivo, e
não há reparo, detecção de perda nem backup.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Nada mudou nesta tarefa, que não toca em concorrência. O que se sabia continua valendo:
dentro de um único processo o I/O síncrono impede que escritas se embaralhem; com **dois
processos** o comportamento continua **Nao identificado nesta tarefa**.

Ponto honesto: a unificação **torna a corrida menor, não a resolve**. As duas funções agora
passam pelo mesmo caminho, o que reduz a superfície, mas a ausência de trava de arquivo é a
mesma.

### 5. O que um atacante faria com este sistema

Os quatro vetores seguem abertos, sem mitigação nova:

- **envenenar a nota** por `POST /evidencias` público, sem autenticação e sem verificação
  de fonte;
- **enumerar relatórios** pelo `id` previsível, sem bloqueio de tentativa e sem controle de
  acesso;
- **encher o disco** com laço de `POST`, sem limite de taxa;
- **exposição de rede**, porque o serviço escuta em todas as interfaces.

E há um vetor **novo, pequeno**, criado por esta tarefa: o `console.warn` escreve no log o
**nome do arquivo** e os **números das linhas** corrompidas. Não é conteúdo de usuário, e a
decisão de não logar o conteúdo evitou o pior. Ainda assim, em um log acessível, o nome do
arquivo e a contagem de linhas dão a um atacante a informação de que o arquivo existe e está
parcialmente quebrado. É baixo, e é o preço de avisar.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que "corrigir o defeito mais grave da auditoria" signifique ter resolvido o problema de
integridade de dados.** Não é. O que foi resolvido é **resiliência de leitura**: uma linha
ruim não derruba mais o serviço. O que continua exatamente igual: a linha ruim continua no
arquivo, o arquivo continua sem backup, e `console.warn` continua sem ninguém para leer.

Ou seja: **um arquivo pela metade agora é servível, e continua irrecuperável.** Um relatório
de sistema íntegro diria que um banco de dados com 40% das linhas ilegíveis não tem
integridade, mesmo que as consultas não retornem erro 500.

E há uma segunda confortavelmente ignorada: **esta tarefa nao adiciona protecao nenhuma contra
ataque**, e o próximo item do "O que falta" com prioridade `[Alta]` segue sendo
envenenamento de nota. Um relatório que termina com um `[fix]` e parece fechar a governança
dá a impressão de que os riscos estão sob controle. Dois dos quatro vetores continuam
intactos.

## Pipeline de evolução

### Onde estamos

Fase de consolidação da governança: a auditoria Red Team do fix-04 produziu quatro defeitos,
e o primeiro e mais concreto, a leitura de `.jsonl`, foi corrigido e testado. Os outros três
continuam abertos.

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

### O que falta

- [Alta] Mitigação do envenenamento de nota: autenticação, limite de taxa e verificação de
  fonte. Exige decisão de produto
- [Alta] Corrigir o falso positivo da classificação: `"Pineapple shop"` como `mobile`, por
  `Pineapple` conter `app`
- [Alta] Coleta real de concorrentes e reclamações
- [Média] Publicação do serviço, hoje sem controle de acesso
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida. A leitura já é resiliente e a
  linha ruim é ignorada com aviso, mas ela **continua no arquivo** e não existe caminho para
  removê-la
- [Média] Vínculo automático entre ideia e evidência na hora de coletar
- [Baixa] `console.warn` não é observável: falta logger e destino de log
- [Baixa] Verificação visual do relatório A4 e do dashboard, que exige navegador
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **Um único comportamento de leitura para os dois arquivos `.jsonl`**: ignorar a linha
  corrompida, avisar, seguir. Antes eles divergiam e o comportamento perigoso era o do
  arquivo de evidências
- **`jsonl.js` como módulo compartilhado**, para que a leitura não dependa de cada chamador
  lembrar de ser tolerante a falha
- **O aviso registra o número da linha, nunca o conteúdo**, porque linha corrompida costuma
  ser lixo ou registro pela metade
- **A resiliência é de leitura, não de integridade**: a linha ruim continua gravada, e o
  `CONTRATO.md` diz isso explicitamente

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler o `ESTADO.md`
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**, o que torna o `id` enumerável um
  problema real
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia falha

### Próximo passo

**Tarefa 23 — os dois defeitos de baixo custo da auditoria**: trocar a classificação por
substring por comparação com limite de palavra, com o teste de `"Pineapple shop"` que falha
hoje, e decidir o canal do aviso de linha ignorada. São as duas pendências que a auditoria
descreveu com precisão e que não dependem de decisão de produto.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-05-jsonl-resiliente.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-05-jsonl-resiliente.md").Length
26412
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-05-jsonl-resiliente.md`,
com 26.412 bytes.
