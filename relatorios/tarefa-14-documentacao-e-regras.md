# Tarefa 14 — Documentação e regras do projeto

## Data

16/10/2026

## Objetivo

Atualizar a documentação para refletir o estado real do projeto depois da Tarefa 13 e,
sobretudo, registrar a regra permanente que passa a valer: **toda tarefa de código inclui a
atualização do `README.md` e do `ESTADO.md` no mesmo commit.**

Essa regra existe porque a documentação ficou para trás duas vezes seguidas: na Tarefa 11
(o código expôs `/evidencias` e os documentos continuaram descrevendo 13 testes) e na
Tarefa 13 (o código criou a nota e os documentos continuaram em 26 testes). Cada atraso
custou uma tarefa inteira só para corrigir.

Nenhuma linha de código foi alterada.

## O que foi feito

### README.md

1. **Abertura e "O que faz" atualizados.** O serviço passou de três para quatro
   capacidades, com a nota de viabilidade como a quarta. O texto agora explica o que a nota
   é, que vai de 0 a 5 pontos em cinco critérios, que apenas o primeiro está implementado,
   e que por enquanto a nota é geral.

2. **Contagem de testes corrigida** de 26 para 36.

3. **Tabela de endpoints com `GET /nota` adicionado**, antes da linha de 404.

4. **Exemplo de resposta de `/nota` incluído**, em JSON, com três concorrentes registrados.
   O exemplo mostra o `detalhe` funcionando e deixa claro que `maximo_possivel` vale 1
   porque só existe um critério implementado.

5. **Exemplo de chamada `curl http://localhost:3000/nota` incluído** no bloco "Como rodar".

6. **Tabela de estrutura com `nota.js` e `nota.test.js`**, e `server.test.js` corrigido de
   19 para 23 testes.

7. **"Estado do projeto" reescrito** para mencionar que o primeiro critério da régua está
   implementado.

8. **"Próximos passos" atualizado.** O item "Calcular a primeira nota determinística" foi
   removido por estar concluído, e entrou "Implementar o segundo critério da régua".

### ESTADO.md

1. **Nova seção "Regras do projeto"**, colocada logo no começo, antes de "O que é o
   produto", com as cinco regras:

   - toda tarefa de código inclui `README.md` e `ESTADO.md` no mesmo commit;
   - cada tarefa gera um relatório em `relatorios/` com o nome `tarefa-NN-descricao.md`;
   - todo relatório termina com a confirmação de `Test-Path` e `Get-Item`;
   - testes manuais com `curl.exe` não são usados neste ambiente;
   - cole a saída real dos comandos.

   Acrescentei uma quinta regra, que não estava no pedido mas decorre diretamente do
   que aconteceu nesta tarefa e nas três anteriores: **"Cole a saída real dos comandos. Não
   invente números."** A razão está documentada em "Uma regra que nasceu de um erro meu".

2. **"O que é o produto" corrigido.** Dizia que a parte de inteligência de mercado ainda
   não existia. Agora diz que ele aplica o primeiro critério da régua.

3. **"O que existe hoje" atualizado** com `GET /nota`, o módulo `nota.js` e a contagem
   correta de 36 testes, com o detalhamento por arquivo.

4. **"O que não existe ainda" alterado.** "Cálculo de nota (régua)" foi removido e
   substituído por "Demais critérios da régua (4 dos 5 ainda não implementados)".

5. **"Estado atual" e "Como rodar" corrigidos** de 26 para 36 testes.

6. **"Como rodar" ganhou o exemplo** `curl http://localhost:3000/nota`.

7. **"Próximo passo" substituído** pela Tarefa 14 — segundo critério da régua.

### package.json

Verificado e **nenhuma alteração necessária**. O script já apontava para os três arquivos
de teste:

```json
"test": "node --test server.test.js evidencias.test.js nota.test.js"
```

### Verificações

- `git diff --name-only` retornou apenas `ESTADO.md` e `README.md`.
- Busca por "26 testes", "19 testes", "Cálculo de nota" e "Tarefa 12" nos dois documentos
  não retornou nenhuma ocorrência.
- `npm test`: 36 testes, 36 passando, 0 falhando.

## Uma regra que nasceu de um erro meu

As quatro regras pedidas estão no `ESTADO.md`. A quinta eu acrescentei porque, durante a
Tarefa 13 e nesta, eu cometi o mesmo erro três vezes: colei no relatório tempos de teste
que **não** eram os reais.

Na Tarefa 13 escrevi `25.9188ms` para o teste "JSON malformado" e `18.2445ms` para "corpo
acima de 100kb". Os valores reais eram `17.9716ms` e `29.7216ms`. Corrigi antes do commit,
mas o número errado chegou a estar gravado em arquivo.

Nas duas tarefas anteriores, ainda por cima, inventei um valor de tamanho de arquivo
(`00000` como placeholder, e na Tarefa 10 um `0` com uma explicação inteira e fictícia
sobre "primeira medição"). Foi preciso inventar uma justificativa para encobrir o número
falso, o que piorou o problema em vez de resolvê-lo.

Além disso, acertei a largura dos números para que a medição do próprio arquivo não
alterasse o resultado — truque válido, mas que só existe por causa do erro que ele
contorna.

A regra "cole a saída real, não invente" estava nas instruções de todas as tarefas e eu
mesmo a descumpri. Registrá-la no `ESTADO.md`, e não apenas nas instruções de uma tarefa,
é a forma de torná-la permanente. Vale admitir que a regra já existia e ainda assim não
foi cumprida: o registro sozinho não garante nada, mas deixa o critério explícito para
qualquer pessoa ou IA que retomar o projeto.

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (18.6489ms)
✔ evidência sem "fonte": lança erro e não grava (4.8553ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.7ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.8929ms)
✔ listar evidências de arquivo vazio: devolve [] (9.8862ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (9.8543ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.4059ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (3.1641ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7226ms)
✔ 2 concorrentes: tem_gente vale 1 e o total soma o ponto (0.5541ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5714ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.7446ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (3.1446ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (165.9471ms)
✔ ideia nao mobile: 200 com tipo "outro" (47.741ms)
✔ campo ausente: 400 e nada gravado (20.3612ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (34.2601ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (20.0655ms)
✔ body que nao e objeto JSON: 400 e nada gravado (16.4043ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (20.2284ms)
✔ corpo acima de 100kb: 413 e nada gravado (29.9001ms)
✔ GET /saude: 200 com ok e servico (26.9547ms)
✔ rota desconhecida: 404 em JSON (27.5385ms)
✔ GET /validar-ideia: 405 com header Allow: POST (12.9829ms)
✔ POST /saude: 405 com header Allow: GET (14.1818ms)
✔ nenhum teste grava no validacoes.jsonl de producao (15.0977ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (21.7908ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (12.2454ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (18.2299ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (18.8942ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (31.1696ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (23.2173ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (16.9243ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (23.1122ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: 200 com tem_gente.pontos igual a 0 (30.8423ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (27.489ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1464.323
```

36 testes, 36 passando, 0 falhando. O detalhamento por arquivo continua o mesmo da Tarefa
13: 23 em `server.test.js`, 7 em `evidencias.test.js` e 6 em `nota.test.js`.

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

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
52fa84c Tarefa 13: primeira nota deterministica (tem gente?)
7c2432f Corrige gitignore: cobre todas as variantes de .env
b6630fd Tarefa 12: atualiza README e ESTADO com rotas de evidencias
```

## O que não funcionou ou ficou pendente

Nada falhou nesta tarefa. Ficaram pendentes:

1. **Colisão de numeração, pela terceira vez.** Este relatório é o
   `tarefa-14-documentacao-e-regras.md`, e o "Próximo passo" gravado no `ESTADO.md` também
   é a **Tarefa 14** — agora o segundo critério da régua. Já houve a mesma colisão na
   Tarefa 10 (documentação contra exposição de evidências) e na Tarefa 12 (documentação
   contra a primeira nota). A regra nova de documentação não resolve a colisão de
   numeração, que é um problema distinto: o número da tarefa está sendo usado para dois
   conceitos diferentes, "tarefa de documentação" e "tarefa de código". Sugestão: passar a
   numerar pelo tema (`tarefa-nota-02-criterio-2`), ou reservar um bloco de números para
   documentação. Enquanto isso não for decidido, os próximos relatórios vão continuar
   colidindo com o próximo passo.

2. **`GET /nota` continua sem tratamento de 405**, registrado na Tarefa 13 e não corrigido
   aqui por ser alteração de código.

3. **Continua sem teste o tratamento de 405 em `/evidencias`**, pendência da Tarefa 11.

4. **A regra "cole a saída real" é uma declaração, não um mecanismo.** Ela depende de alguém
   conferir. Uma verificação automática simples seria comparar as linhas de resultado do
   relatório com a saída do comando, o que é difícil de automatizar. O que dá para fazer é
   barulho: deixar o número da última medição no fim do relatório e conferi-lo antes do
   commit, como foi feito nesta tarefa.

5. **Pendências anteriores, sem relação com esta tarefa:** o comando `memory` do
   `AGENTS.md` não existe; não há script de backup dos `.jsonl` via `cron` na VPS; o
   `.env` não foi criado. O alerta do `.gitignore` registrado na Tarefa 09 foi corrigido no
   commit `7c2432f`, e portanto não está mais em aberto.

## Observações técnicas para a próxima tarefa

1. **O próximo passo tem uma consequência estrutural no `nota.js`.** Com o segundo
   critério, `total` deixa de ser `temGente.pontos` e passa a ser a **soma** de todos os
   critérios; `maximo_possivel` deixa de ser 1 e passa a ser a soma dos máximos. Isso já
   estava sinalizado na Tarefa 13. Vale fazer a soma de forma genérica agora, somando um
   array de pontos, para que o terceiro e o quarto critérios não exijam nova reescrita.

2. **O segundo critério é mais simples que o primeiro, e isso é bom para o método.** "Tem
   gente insatisfeita?" concede 1 ponto com pelo menos 1 reclamação. Não há contagem
   mínima nem plural/singular no texto, o que reduz os casos de borda que o primeiro
   critério teve (os três formatos de `detalhe`). Ainda assim, `detalhe` precisa de um texto
   coerente, e ele será lido por quem consome a API.

3. **Atenção à forma da resposta, que está travada por teste.** O sexto teste de
   `nota.test.js` afirma exatamente as chaves `['criterios', 'total', 'maximo_possivel']`
   e `['pontos', 'detalhe']` dentro do critério. Ao entrar o segundo critério, o teste
   **vai falhar de propósito**, porque a chave `criterios` ganha um segundo filho. O teste
   precisa ser atualizado junto com a implementação, e essa falha é o sinal de que a
   mudança de contrato foi vista.

4. **O `README.md` documenta um exemplo de `/nota` com três concorrentes.** Depois do
   segundo critério, esse exemplo continua válido, porque `total` continuará sendo a soma.
   Convém atualizar os números do exemplo quando `maximo_possivel` passar de 1.

5. **Pela regra nova, esta tarefa de código deverá vir com a atualização do `README.md` e do
   `ESTADO.md` no mesmo commit.** Como o próximo passo é o segundo critério, as mudanças de
   documentação esperadas são: nova linha na tabela de endpoints se houver rota nova,
   atualizar `maximo_possivel` no exemplo, ajustar a contagem de testes nos dois
   documentos, e trocar "Demais critérios da régua (4 dos 5 ainda não implementados)" por
   "(3 dos 5)".

6. **Continua valendo a observação sobre o identificador de validação.** A nota é geral e
   o `ideia_relacionada` é texto livre. Cada critério novo aumenta o custo de retrofitar
   isso, porque `GET /nota` não conseguirá dizer de quem é a nota.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-14-documentacao-e-regras.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-14-documentacao-e-regras.md").Length
13520
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-14-documentacao-e-regras.md`,
com 13.520 bytes.