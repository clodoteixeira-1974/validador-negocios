# fix-03 — Pipeline de evolução em todos os relatórios

## Data

17/10/2026

## Objetivo

Criar a seção **"Pipeline de evolução"**, que todo relatório passa a ter ao final, e um
template que define o padrão.

A motivação é prática: quem retoma o projeto — pessoa ou IA — precisa saber em um lugar só
onde estamos no fluxograma, o que já foi feito, o que falta, quais decisões foram tomadas,
quais pendências estão abertas e qual é o próximo passo. Hoje essa informação existe,
mas espalhada por 23 relatórios e pelo `ESTADO.md`.

**Nenhum arquivo de código foi alterado.** O teste da suíte roda para confirmar que nada
quebrou, como sempre.

## O que foi feito

### 1. `relatorios/TEMPLATE-PIPELINE.md` (arquivo novo)

O molde da seção, para que os próximos relatórios sigam o mesmo padrão. Ele registra:

- as **seis seções obrigatórias**, na ordem em que devem aparecer;
- que a seção vai **imediatamente antes** da confirmação de existência e tamanho;
- que a lista "O que foi feito até aqui" é **cumulativa**, e o mesmo vale para as listas de
  pendências e do que falta;
- que **item concluído sai da lista do que falta**, e **pendência resolvida sai da lista de
  pendências** — essa remoção é o registro de que foi resolvida.

O template **não é um relatório** e não entra na lista de tarefas. É infraestrutura de
documentação.

### 2. `relatorios/fix-02-aviso-copia-link.md`

Recebeu a seção Pipeline de evolução ao final, antes da confirmação de existência. A lista
do que foi feito é cumulativa e já inclui `fix-03`, porque este relatório é justamente o que
estabelece o padrão.

### 3. `ESTADO.md`

A seção **Pipeline de evolução** foi criada no topo do arquivo, logo abaixo da
apresentação e antes de "Regras do projeto".

Ela fica no topo por um motivo concreto: `ESTADO.md` é o que se lê primeiro, e a seção é o
resumo executivo. Quem abrir o arquivo tem a situação geral na primeira tela, sem precisar
rolar até a seção "Próximo passo", que fica a 150 linhas.

O conteúdo é o mesmo do fix-02, com duas adaptações: as listas de decisões e de pendências
remetem às seções detalhadas que já existem no próprio arquivo, em vez de repetir. Isso
evita duas listas que divergem com o tempo.

### O que a seção tem

| Subseção | Conteúdo |
| --- | --- |
| Onde estamos | fase do fluxograma e a tarefa em andamento |
| O que foi feito até aqui | 23 entradas, em ordem cronológica |
| O que falta | 7 itens com prioridade `[Alta]`, `[Média]`, `[Baixa]` |
| Decisões tomadas | 7 decisões que mudam o caminho futuro |
| Pendências conhecidas | 5 pendências, cada uma com a origem |
| Próximo passo | uma tarefa exata, com objetivo |

## Como a lista do que foi feito foi montada

Não foi de memória. As duas fontes foram lidas antes de escrever:

- `relatorios/` tem 23 arquivos de relatório;
- `git log --oneline --reverse` tem 25 commits.

A lista usa a numeração dos **relatórios**, não a dos commits, porque existem commits que não
têm relatório (a estruturação inicial e dois ajustes de `.gitignore`) e um relatório que foi
reescrito depois (a Tarefa 12, que na verdade era a atualização do `ESTADO.md`, mas o
arquivo se chama `tarefa-12-atualizacao-documentacao.md`).

Duas entradas merecem nota:

- **Tarefa 01** aparece como "relatório reconstruído na Tarefa 09". A tarefa foi executada em
  15/10, mas nunca produziu relatório; o que existe foi reconstruído na Tarefa 09 a partir
  de fontes secundárias.
- **Tarefa 12** aparece como "documentação das rotas de evidências", que é o que o arquivo
  descreve. O `ESTADO.md` daquele momento apontava o próximo passo como "Tarefa 12", e a
  colisão de numeração foi registrada no próprio relatório.

## Um risco que o padrão cria, e como foi tratado

Manter a mesma lista em 23 relatórios é garantia de divergência. Duas listas iguais
divergem assim que uma é atualizada e a outra não.

A mitigação adotada é o contrário de replicar o texto: **os relatórios futuros devem copiar
o esqueleto do template e gerar a lista a partir do que o próprio relatório fez**. A lista
cresce, mas cada relatório escreve a sua entrada e as anteriores vêm do contexto. Na
prática, o `ESTADO.md` é a fonte canônica e os relatórios são o histórico.

Se a lista do `ESTADO.md` virar a única mantida, e os relatórios passarem a apontar para
ela, o custo é perder o histórico em cada ponto do tempo. Não é a escolha feita agora.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (47.8719ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (9.1924ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.5486ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (2.5077ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (6.6734ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (8.188ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (5.7715ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (6.9448ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.4917ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (6.7284ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (8.4118ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (6.1536ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (6.2698ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (23.1775ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (12.5234ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (8.8583ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7864ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7918ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.64ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (1.095ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.8078ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.6171ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (1.6571ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (2.48ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (2.5262ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.5135ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4791ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.3644ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (1.0243ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.5486ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (2.7056ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (2.4991ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4514ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.4895ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.5467ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.5585ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (4.6659ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.7778ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (251.9328ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (52.7776ms)
Ô£ö campo ausente: 400 e nada gravado (21.0892ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (33.3216ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (18.2053ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (20.0595ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (17.2447ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (27.0926ms)
Ô£ö GET /saude: 200 com ok e servico (28.8153ms)
Ô£ö rota desconhecida: 404 em JSON (14.7569ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (12.7983ms)
Ô£ö POST /saude: 405 com header Allow: GET (15.7362ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (15.6599ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (19.611ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (21.785ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (16.8533ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (15.0522ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (34.7067ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (27.3014ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (14.0085ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (28.0595ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (37.3348ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (37.9176ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (69.4452ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (51.8261ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (39.2334ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (41.8434ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (36.5971ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (22.6436ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (25.5662ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (98.9357ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (13.4988ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (12.0656ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (31.0699ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (28.5487ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (57.4127ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (47.7761ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (58.5715ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (27.1484ms)
Ô£ö POST /nota: 405 com header Allow: GET (26.844ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (17.4261ms)
Ôä╣ tests 79
Ôä╣ suites 0
Ôä╣ pass 79
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 2416.9734
```

Nenhum arquivo de código foi alterado nesta tarefa. A suíte roda para confirmar que nada
quebrou, e roda igual: 79 testes, 79 passando.

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
2518858 fix-02: aviso visual ao copiar link
89d0b73 Tarefa 21: nota por ideia vinculada ao ID da validacao
6e82468 Tarefa 20: dashboard A4 e compartilhamento por link
```

## Arquivos alterados

```
ESTADO.md
relatorios/TEMPLATE-PIPELINE.md            (novo)
relatorios/fix-02-aviso-copia-link.md
relatorios/fix-03-pipeline-evolucao.md     (novo)
```

`package.json` não foi alterado: uma única dependência, `express`. Nenhum arquivo de
código foi alterado.

## O que não funcionou ou ficou pendente

Nada falhou. Ficou pendente, e é a consequência esperada de criar um padrão:

1. **Os 21 relatórios anteriores não têm a seção.** A regra vale a partir de agora. Reescrever
   relatório já concluído apagaria o registro do que era verdade naquele momento — é a mesma
   razão pela qual relatórios antigos continuam citando as pendências de `405` que o fix-01
   resolveu. A alternativa seria um índice, e ele é exatamente o que a seção do `ESTADO.md`
   faz.

2. **O `README.md` não foi alterado.** A tarefa não pediu, e o README é vitrine, não memória
   de trabalho. A seção do `ESTADO.md` é o lugar certo.

3. **Nenhuma pendência de código foi criada.** As de ambiente seguem abertas: comando
   `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`, link de
   compartilhamento sem controle de acesso, e `navigator.clipboard` exigindo contexto
   seguro.

## Observações técnicas para a próxima tarefa

1. **Todo relatório novo precisa terminar com a seção Pipeline e depois com a confirmação de
   existência e tamanho.** A ordem importa: a confirmação é a última coisa do arquivo, e é o
   que fecha.

2. **A seção do `ESTADO.md` é atualizada na mesma tarefa.** É a regra do projeto desde a
   Tarefa 14, generalize para documento: código e memória de trabalho andam juntos.

3. **Ao fechar uma pendência, remova a linha da lista.** A remoção é o registro. O mesmo vale
   para "O que falta": tarefa concluída sai da lista.

4. **A lista do que falta do `ESTADO.md` e a seção "O que não existe ainda" se sobrepõem.**
   Hoje as duas existem e podem divergir. Se a seção Pipeline ficar sendo a canônica, a
   "O que não existe ainda" vira redundante e pode sair na próxima tarefa.

5. **Números da documentação**: não mudaram. Segue 79 testes (41 em `server.test.js`, 15 em
   `evidencias.test.js`, 23 em `nota.test.js`).

## Auditoria Red Team

Resposta às seis perguntas obrigatórias, sobre o estado do projeto depois desta tarefa. As
respostas de comportamento foram conferidas executando o código, não de memória.

### 1. Os 3 maiores pontos de falha sob alto tráfego

**a) Event loop bloqueado por I/O síncrono, em requisição.** Toda leitura e escrita é
`fs.readFileSync` e `fs.appendFileSync`. `listarEvidencias` lê o arquivo inteiro, e
`GET /relatorio/:id` faz isso **duas vezes**: uma para buscar a validação e outra para as
evidências. Numa única requisição, o processo para de atender qualquer outro cliente. É o
primeiro ponto a quebrar, e quebra de forma total, não gradual.

**b) Sem limite de requisições nem autenticação.** `express.json` limita o corpo a 100 KB, e
é só isso. Não há rate limit, não há autenticação, não há teto de registros. `POST /evidencias`
aceita chamadas indefinidas, e cada uma acrescenta uma linha ao arquivo. Um `GET /nota`
recebe o arquivo inteiro sem paginação.

**c) Arquivo `.jsonl` como banco, sem backup e em disco local.** O arquivo é a única fonte
de verdade dos dados, é ignorado pelo Git e está sem backup. Se o disco encher ou falhar, a
perda é total, e não há segunda via. Some-se a isso que a gravação é só *append*: não existe
caminho no código para remover ou corrigir um registro.

### 2. Onde há alucinação lógica neste fluxo

**a) A régua conta quantidade de um `tipo`, e o `tipo` é uma string que o cliente inventa.**
Esta é a falha lógica mais grave do projeto. Registrar duas evidências com
`"tipo": "concorrente"` concede 1 ponto, e o sistema não tem como saber se elas são reais.
Não existe verificação de fonte, nem de data, nem de vínculo com um site real. A nota mede
**quantidade declarada**, não qualidade de mercado. Um relatório que diz `SEGUIR` está
medindo a vontade de quem digitou, não o mercado.

**b) Não há verificação de duplicidade.** Nenhum código confere se a mesma fonte já foi
registrada. As mesmas três evidências podem entrar com `fonte` idêntica e viram três
concorrentes, o que concede os pontos de `tem_gente` e de `cabe_mais_um` de uma vez. A
deduplicação é o antídoto mais óbvio contra a falha (a), e não existe.

**c) `cabe_mais_um` pune mercado saturado como se o mercado não existisse.** Com 5 ou mais
concorrentes, o critério vale 0. Uma ideia num mercado claramente existente, porém saturado,
perde o ponto. Quem quisesse maximizar a nota teria um incentivo real para registrar
exatamente 4 concorrentes. O critério está modelado como premissa do PO, e está aqui para
ser contestada se um dia a régua for calibrada com dado real.

**d) A classificação `mobile`/`outro` é por substring, e produz falso positivo verificável.**
Conferido agora no código: `"Pineapple shop"` é classificado como `mobile`, porque
`Pineapple` contém `app`. O mesmo teste classifica corretamente `Apple Watch` e
`aplicativo de shear`. A ideia do usuário é que um pedaço de fruta vire aplicativo.

**e) `ideia_relacionada` não é validada contra a validação.** Uma evidência pode trazer
`id_validacao` de uma validação e `ideia_relacionada` com outro texto, e o sistema aceita
sem reclamar. As duas informações podem discordar sem que nada acuse.

**f) O veredito não sabe *qual* critério falhou.** `4 de 5` é `SEGUIR` venha de onde vier. Um
ponto em `alguem_paga` e nenhum em `cabe_mais_um` produz a mesma nota e o mesmo veredito que
o inverso. A informação existe no campo `criterios`, e o veredito não a usa.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Conferido executando o código com um arquivo de teste:

- **`evidencias.jsonl` com uma linha inválida: `listarEvidencias` lança exceção.** A
  exceção sai da leitura e **não é tratada** por nenhuma das rotas. O resultado é resposta
  **500**, e ela atinge `GET /evidencias`, `GET /nota` e `GET /relatorio/:id`. Uma única
  linha corrompida no fim do arquivo **derruba a leitura de todas as evidências**. Isso
  inclui o relatório, ou seja, um arquivo parcialmente danificado quebra um produto que já
  estava funcionando.
- **`validacoes.jsonl` com uma linha inválida: `buscarValidacao` ignora a linha.** O `try`
  com `continue` faz a leitura seguir, e a validação procurada é encontrada normalmente,
  desde que esteja depois da linha ruim.

Ou seja: os dois arquivos têm **comportamentos opostos** diante de corrupção, e o
comportamento perigoso é o do arquivo de evidências. A falha é assimétrica por construção, e
ninguém testou esse cenário: não há teste de `.jsonl` corrompido no projeto.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

**Num único processo Node, a gravação não se embaralha.** `appendFileSync` é síncrono e
bloqueante: o Node executa um statement por vez, então duas requisições concorrentes não
intercalam bytes no arquivo. Isso é um ponto a favor do desenho atual.

**O que existe é serializacao com espera, nao concorrencia.** Como o I/O bloqueia o event
loop, a segunda requisição **aguarda** a primeira. Nenhuma requisição falha por isso. O custo
é de vazão: a taxa de atendimento é a recíproca do tempo de I/O, e **todo** processamento de
outros clientes para durante cada operação de disco.

**Não verificado, e é uma lacuna real:** o comportamento com **dois processos** lendo e
escrevendo o mesmo arquivo não foi testado, e o projeto não tem trava de arquivo. Rodar duas
instâncias em paralelo, coisa plausível em deploy, não tem garantia de que as escritas de
linha longa não se intercalem. Isso é **Nao identificado nesta tarefa**.

**O risco maior de concorrência aqui não é corrupção de arquivo, é perda de dado:** com duas
pessoas validando ao mesmo tempo, as duas gravações entram, e o sistema não tem nenhum
mecanismo de serializacao entre "validar ideia" e "registrar evidência" — o `id_validacao`
precisa ser repassado pelo cliente, e uma requisição que chega fora de ordem vincula a
evidência a um id que ainda não foi lido pelo coletor.

### 5. O que um atacante faria com este sistema

**a) Envenenar a nota de qualquer ideia, sem autenticação.** `POST /evidencias` é público.
Com o `id_validacao` de uma validação, o atacante registra duas evidências `concorrente`, uma
`reclamacao`, uma `monetizacao` e uma `alcance`. A nota vai a 5 de 5 e o veredito vira
`SEGUIR`. **Não há nada que impeça**: não há autenticação, não há verificação de fonte, não
há teto de registros. O relatório daquela ideia passa a afirmar que o mercado é bom, com
citações inventadas. Este é o ataque mais direto e o de maior impacto, porque não exige
conhecimento técnico: basta chamar a API.

**b) Enumerar relatórios alheios.** O `id` é `<timestamp em ms>-<6 caracteres base36>`. O
prefixo é `Date.now()`, que é monotônico e aproximadamente público: quem valida uma ideia
sabe o próprio timestamp com precisão de milissegundo. O sufixo tem 2.176.782.336 combinações,
o que **parece** forte, mas com a janela de timestamp conhecida o espaco de busca efetivo e bem
menor que isso, e não há bloqueio de tentativa. Como o relatório abre com `200` para qualquer id
existente e **não há controle de acesso**, o atacante consegue baixar relatórios de outros
usuários por força bruta.

**c) Encher o disco.** `POST /evidencias` em laço, sem limite de taxa e sem teto de
registros, escreve linhas indefinidamente. Como a escrita é bloqueante, isso também degrada o
serviço para os demais enquanto escreve. Combina com a ausência de backup: o disco cheio
atinge exatamente o arquivo que não tem cópia.

**d) Injeção de HTML no relatório: bloqueada.** Este ponto foi conferido e **está
protegido**. `escapar()` transforma `<script>alert(1)</script>` em
`&lt;script&gt;...`, e a verificação está num teste que falha se o HTML deixar de conter
`<script`. O relatório não tem JavaScript, o que reduz muito a superfície.

**e) A página de 404 devolve o id sem escape completo.** `paginaNaoEncontrada` remove `<` e
`>` do id, mas não escapa aspas. Como o id é inserido em **corpo de texto**, e não em
atributo, isso não quebra a página hoje. É uma linha frágil: mudar esse id para dentro de um
atributo abriria XSS.

**f) O servidor escuta em todas as interfaces.** `app.listen(port)` sem `host` escuta em
todas as interfaces, e o projeto não tem firewall, TLS nem autenticação. Não é uma falha do
código, é a ausência do controle de acesso que já está registrado como pendência.

### 6. Qual é a mentira mais confortável que este relatório conta

**A que este relatório conta: "79 testes, todos passando" soa como garantia de qualidade, e
não é.** Os 79 testes cobrem caminho feliz e alguns caminhos de erro, com servidor em porta
efêmera e requisição HTTP real. O que **não** existe em lugar nenhum do projeto:

- nenhum teste de concorrência, nenhum de carga, nenhum de arquivo corrompido;
- **nenhum teste roda navegador**, então o dashboard, o veredito exibido e o aviso de cópia
  nunca foram executados de verdade. As asserções do dashboard procuram texto no HTML, e
  isso não prova que a tela funciona;
- **o relatório A4 nunca foi visto por ninguém.** As asserções confirmam `@page`,
  `size: A4`, `margin: 2cm` e `@media print` presentes no texto — que é o oposto de ver a
  impressão;
- a auditoria acima encontrou quatro defeitos que nenhum teste pegaria: `Pineapple` virando
  `mobile`, `.jsonl` corrompido derrubando todas as leituras, ID enumerável e nota
  envenenável por chamada pública.

Ou seja: os testes dão uma **sensação** de solidez que a auditoria não confirma. A frase
honesta seria "79 testes cobrindo regras de negócio e o contrato HTTP, sem cobertura de
concorrência, de integridade de arquivo e de navegador".

E há uma segunda mentira, menor e maisstructural: o exemplo de resposta do README mostra
nota 5 de 5 com `SEGUIR`, o que parece o produto funcionando. Com os dados que existem hoje
na máquina, a nota real é 1 de 5 com `PARAR`, e **nenhuma evidência registrada é real** — todas
as que existem são fictícias, digitadas à mão nas Tarefas 05 e 21.

## Pipeline de evolução

### Onde estamos

Fase em que a ideia vira um documento legível por outra pessoa: régua completa, veredito,
nota por ideia e link de compartilhamento. Esta tarefa criou a convenção de documentação que
o projeto passa a seguir.

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

### O que falta

- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] Publicação do serviço, hoje sem controle de acesso
- [Média] Extração de reclamações
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **Todo relatório termina com a seção Pipeline de evolução**, antes da confirmação de
  existência e tamanho, conforme o padrão em `relatorios/TEMPLATE-PIPELINE.md`
- **A seção do `ESTADO.md` fica no topo do arquivo**, antes de "Regras do projeto", por ser
  o resumo executivo do projeto
- **As listas de decisões e de pendências do `ESTADO.md` remetem às seções detalhadas** do
  próprio arquivo, em vez de repetir o texto, para não haver duas listas que divergem

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler o `ESTADO.md`
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia falha

### Próximo passo

**Tarefa 22 — coletar concorrentes e reclamações de verdade**, com o `id` da validação como
entrada obrigatória, para que toda evidência coletada já nasça vinculada a uma ideia.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-03-pipeline-evolucao.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-03-pipeline-evolucao.md").Length
17718
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-03-pipeline-evolucao.md`,
com 17.718 bytes.
