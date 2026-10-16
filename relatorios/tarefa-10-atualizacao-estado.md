# Tarefa 10 — Atualização do ESTADO.md

## Data

16/10/2026

## Objetivo

Atualizar o `ESTADO.md`, que estava desatualizado em relação ao estado real do projeto,
para registrar o repositório no GitHub, as decisões de backup, as pendências da fase de
deploy e o próximo passo. Conferir se o `README.md` continuava correto, rodar os testes e
publicar a atualização no GitHub.

## O que foi feito

1. **Conferido o estado real do repositório antes de editar.** O contexto informava
   21 arquivos versionados e 3 commits. Os números reais são diferentes. Ver a seção
   "Divergências entre o contexto informado e o estado real".

2. **Atualizado o `ESTADO.md`** em quatro pontos:
   - "Estado atual": repositório GitHub, branch `main` e total de 20 testes (13 + 7).
   - "Decisões tomadas e por quê": migração para o GitHub, MEGA como backup de arquivos e
     GitHub como backup do histórico git.
   - Nova seção "Pendências para a fase de deploy", com os três itens pedidos.
   - "Próximo passo": Tarefa 10 — expor evidências via HTTP (`POST /evidencias` e
     `GET /evidencias`).
   - Três números de teste que estavam desatualizados (13) foram corrigidos para 20, em
     "O que existe hoje", "Estado atual" e no comentário do bloco "Como rodar".

3. **Corrigido o `README.md`**, que estava desatualizado em três pontos. Ver a seção
   "O que foi corrigido no README.md".

4. **Rodado `npm test`**: 20 testes, todos passando.

5. **Commit e push** para o GitHub.

Nenhum arquivo de código foi alterado: `server.js`, `server.test.js`, `evidencias.js` e
`evidencias.test.js` estão intactos. `validacoes.jsonl` e `evidencias.jsonl` também, e o
`AGENTS.md` não foi tocado.

## Divergências entre o contexto informado e o estado real

Antes de editar, o repositório foi verificado com `git ls-files`, `git rev-list` e
`git ls-remote`. Três informações do contexto não conferem:

| Informação no contexto | Estado real verificado |
|---|---|
| 21 arquivos versionados | **29 arquivos** versionados |
| 3 commits no histórico | **5 commits** antes desta tarefa, **6** depois |
| Repositório no GitHub, branch `main` | Confere: `origin` aponta para `https://github.com/clodoteixeira-1974/validador-negocios.git` e o `main` remoto estava em `89c1129`, igual ao HEAD local |

A migração é real e está validada — o remote existe e o histórico estava sincronizado. O
que não confere são as contagens. A provável origem é o arquivo
`conversas/chat-completo-deepseek.md`, que registra um resumo do estado do projeto dizendo
"3 commits, working tree limpo". Esse texto foi escrito antes dos commits das Tarefas 08 e
09 e ficou desatualizado, e é de onde parece vir a contagem de 3.

Nenhum número foi ajustado para bater com o contexto. Este relatório e o `ESTADO.md`
usam os valores verificados.

## O que foi corrigido no README.md

O `README.md` estava desatualizado em três pontos, todos corrigidos:

1. **Contagem de testes.** Dizia "coberto por 13 testes que passam" na seção "Estado do
   projeto". Agora diz 20, e menciona que o módulo de evidências está pronto e testado
   mas ainda não conectado ao servidor.
2. **`evidencias.test.js` não aparecia na tabela de estrutura.** A tabela listava
   `server.test.js` ("Os 13 testes automatizados") mas não tinha linha para
   `evidencias.test.js`, que existe desde a Tarefa 09. Adicionada, com a indicação de que
   os dois arquivos usam arquivos temporários.
3. **Link do repositório ausente.** Para um README de portfólio, o endereço do GitHub é
   informação de primeira linha. Adicionado logo abaixo da apresentação.

Também foi acrescentado o `.gitattributes` à tabela de estrutura, que ficou de fora quando
o arquivo foi criado na Tarefa 09.

O restante do README foi conferido e continua correto: os oito casos da tabela de
endpoints batem com o comportamento real do `server.js`, os comandos de execução conferem
com o `package.json`, e a estrutura descrita corresponde à pasta.

## Conteúdo final do ESTADO.md

```markdown
# ESTADO

Documento de memória de trabalho. Qualquer pessoa (ou IA) que abrir este repositório
começa por aqui para saber onde o projeto está.

## O que é o produto

O Validador de Novos Negócios é um serviço HTTP que recebe a descrição de uma ideia de
negócio, classifica o tipo dela, registra a validação com data e hora e, em etapas
futuras, deve cruzar a ideia com evidências de mercado (concorrentes, reclamações de
usuários e dados de setor) para produzir uma nota de viabilidade. Hoje ele valida e
classifica; a parte de inteligência de mercado ainda não existe.

## O que existe hoje

- Endpoint `POST /validar-ideia`
- Classificação mobile/outro (palavras-chave `app`, `aplicativo`)
- Persistência em `validacoes.jsonl`
- Módulo `evidencias.js` (não integrado ao servidor ainda), com caminho de arquivo
  injetável para que os testes não toquem os dados de produção
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 20 testes automatizados (13 em `server.test.js` + 7 em `evidencias.test.js`)

## O que não existe ainda

Alinhado ao fluxograma do projeto:

- Exposição de evidências via HTTP
- Coleta real de concorrentes
- Extração de reclamações
- Cálculo de nota (régua)
- Integração com LLM
- RAG
- Relatório em PDF
- Frontend
- Deploy

## Decisões tomadas e por quê

- **Node.js em vez de Python**: já instalado, leve, compatível com VPS.
- **Sem Docker**: economia de 4 GB em SSD com 11 GB livres.
- **Express em vez de `node:http`**: padrão de mercado, legível para portfólio.
- **JSON Lines em vez de SQLite**: volume baixo, zero dependência, auditável.
- **Remoção do `app/`**: duas implementações com contrato diferente confundem.
- **Space Bunny como executor**: mais honesto e estruturado que DeepSeek Flash.
- **Migração do `.git/` local para o GitHub**: backup duplo, evita risco de corrupção no
  MEGA e dá presença em portfólio.
- **MEGA mantido como backup de arquivos**: a pasta `iavalidadora` continua sincronizada
  lá; é a cópia do conteúdo de trabalho.
- **GitHub mantido como backup de histórico git**: guarda o histórico de commits, que o
  MEGA não garante da mesma forma.

Os dois backups têm papéis diferentes e complementares: o MEGA guarda os arquivos, o
GitHub guarda o histórico. Nenhum dos dois deve ser abandonado.

## Pendências para a fase de deploy

- **Script de backup automático dos arquivos `.jsonl`**, para rodar via `cron` na VPS.
  Hoje os dados de execução existem apenas na máquina local e são ignorados pelo Git.
- **Ajuste do `AGENTS.md`**: remover a dependência do comando `memory`, que não existe
  neste ambiente, e passar a usar a leitura deste arquivo como memória de trabalho.
- **Configuração de `.env`** para as chaves de API, quando a LLM for integrada.

## Estado atual

- Servidor: não está rodando. Para iniciar: `npm start`
- Porta padrão: 3000 (configurável via `PORT`)
- Testes: `npm test` (20 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 20 testes automatizados
```

Exemplos de chamada:

```bash
curl http://localhost:3000/saude

curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"
```

Para usar outra porta: `PORT=8080 npm start` (Linux/macOS) ou
`$env:PORT=8080; npm start` (PowerShell).

## Próximo passo

**Tarefa 10 — expor evidências via HTTP**: criar `POST /evidencias` e `GET /evidencias`,
conectando o módulo `evidencias.js` (já escrito e com 7 testes) ao servidor Express. As
rotas devem passar o caminho do arquivo por parâmetro, como o módulo já faz, para que os
testes continuem usando arquivos temporários.
```

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (38.879ms)
✔ evidência sem "fonte": lança erro e não grava (32.2563ms)
✔ evidência com "tipo" inválido: lança erro e não grava (2.1625ms)
✔ evidência com "relevancia" inválido: lança erro e não grava (2.7118ms)
✔ listar evidências de arquivo vazio: devolve [] (5.1265ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (7.9675ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.4145ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (214.7806ms)
✔ ideia nao mobile: 200 com tipo "outro" (49.3323ms)
✔ campo ausente: 400 e nada gravado (19.0648ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (28.0337ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (18.0933ms)
✔ body que nao e objeto JSON: 400 e nada gravado (17.2262ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (22.4874ms)
✔ corpo acima de 100kb: 413 e nada gravado (40.3198ms)
✔ GET /saude: 200 com ok e servico (17.9456ms)
✔ rota desconhecida: 404 em JSON (23.8705ms)
✔ GET /validar-ideia: 405 com header Allow: POST (21.0027ms)
✔ POST /saude: 405 com header Allow: GET (17.0315ms)
✔ nenhum teste grava no validacoes.jsonl de producao (12.2929ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1440.7213
```

20 testes, 0 falhas, nada quebrou. Os arquivos de produção continuaram com 5 linhas em
`validacoes.jsonl` e 3 linhas em `evidencias.jsonl`, conferidos depois da execução.

## Saída real do `git log --oneline` (últimos 5 commits)

```
df0a494 Atualiza ESTADO.md com repositorio GitHub e pendencias
89c1129 Relatorio da tarefa 09 - limpeza estrutural
2e1b0cc Torna o comentario do .gitignore ASCII para evitar ambiguidade de encoding
8c6d8ea Corrige base: injecao em evidencias.js, testes, gitignore, gitattributes
d37d8fe Relatorio da tarefa 08 - organizacao para portfolio
```

Detalhe do commit desta tarefa:

```
[main df0a494] Atualiza ESTADO.md com repositorio GitHub e pendencias
 2 files changed, 36 insertions(+), 10 deletions(-)
```

Push:

```
89c1129..df0a494  main -> main
```

Conferência do remoto depois do push:

```
## main...origin/main

df0a49484984a9a09da15eac84808dca36c65eda	refs/heads/main
```

O `main` local e o `main` remoto estão no mesmo commit, `df0a494`. Sem divergência.

Nota sobre a saída do `git push`: o PowerShell exibiu uma mensagem de erro junto com a
saída do `git push`. Isso acontece porque o Git escreve o progresso da conexão em `stderr`,
e o PowerShell 5.1 converte qualquer escrita em `stderr` em registro de erro. O push em si
foi bem-sucedido, como confirmam a linha `89c1129..df0a494 main -> main` e a comparação
dos hashes local e remoto.

## O que não funcionou ou ficou pendente

Nada falhou na execução. Ficaram pendentes, porém, quatro pontos:

1. **Há dois itens não versionados na pasta, e nenhum dos dois é ignorado.**

   ```
   ?? briefing-abbertura.md
   ?? conversas/
   ```

   - `conversas/chat-completo-deepseek.md` (68 KB): transcrição de uma conversa de
     trabalho. É a provável origem do texto desatualizado que originou as contagens
     erradas do contexto.
   - `briefing-abertura.md` (12.993 bytes, 196 linhas): briefing de abertura do projeto,
     datado de 15/10/2026, com papéis "Gerente técnico cotidiano: DeepSeek online",
     "Executor de código: OpenCode com DeepSeek Flash" e "Orientação macro e pedagógica:
     ChatGPT".

   Os dois aparecem como não rastreados, e **não** estão no `.gitignore`. Nenhum foi
   adicionado ao commit, porque a tarefa pediu `git add ESTADO.md README.md`. Isso é uma
   decisão em aberto:

   - Se forem versionados, basta `git add`; a transcrição de conversa e o briefing são
     documentos de processo legíveis e servem a um portfólio.
   - Se não forem, precisam entrar no `.gitignore`, **antes** de alguém rodar
     `git add .` e incluí-los sem querer.

   Enquanto isso não for decidido, um `git add .` acidental engulfaria os dois.

2. **Colisão de numeração de tarefas.** O relatório desta tarefa foi gravado em
   `relatorios/tarefa-10-atualizacao-estado.md`, conforme a especificação. Mas o
   "Próximo passo" agora no `ESTADO.md` também é chamado de **Tarefa 10** (expor
   evidências via HTTP). Existem duas "Tarefa 10" diferentes na linha do tempo. Segui a
   especificação ao pé da letra nos dois pontos e não renomeei nada, porque a renomeação
   é decisão de numeração do projeto. Sugestão: renumerar a exposição de evidências como
   Tarefa 11, ou renomear este relatório. A correção é de uma linha em cada arquivo.

3. **A pendência do comando `memory` segue aberta.** O `AGENTS.md` continua pedindo
   `memory --action read --target daily`, comando que não existe neste ambiente. Ela foi
   registrada na seção "Pendências para a fase de deploy" do `ESTADO.md`, mas o
   `AGENTS.md` não foi alterado, conforme a regra da tarefa.

4. **Os dados de execução continuam sem backup automatizado.** `validacoes.jsonl` e
   `evidencias.jsonl` são ignorados pelo Git e existem apenas nesta máquina, e agora
   apenas localmente também. Com o repositório no GitHub, essa é a lacuna mais concreta
   que a pendência de script de backup via `cron` na VPS precisa fechar.

## Observações técnicas para a próxima tarefa

1. **A base para expor evidências está pronta.** `evidencias.js` já aceita caminho por
   parâmetro (`registrarEvidencia(evidencia, arquivo)` e `listarEvidencias(arquivo)`), e os
   7 testes cobrem registro válido, três casos de rejeição, listagem vazia, ordem de
   gravação e isolamento do arquivo de produção. Não é preciso mexer no módulo para criar
   as rotas.

2. **O padrão a seguir nas rotas é passar o caminho por parâmetro, não por opção do
   `createApp`.** O `server.js` usa a opção `{ arquivoValidacoes }`, mas o `evidencias.js`
   usa parâmetro de função. Manter o parâmetro é mais simples e evita espalhar a nova
   opção por todo o `createApp`. Se as rotas novas usarem o caminho de produção por
   padrão, os testes devem passar um arquivo temporário, como já é feito nos dois arquivos
   de teste.

3. **O contrato de erro determina o status HTTP.** `registrarEvidencia` lança `Error` com
   a propriedade `.erros` (array de mensagens) e a mensagem começa com "Evidência inválida: ".
   Os casos já cobertos por teste — campo obrigatório ausente ou vazio, `tipo` fora de
   `['concorrente', 'reclamacao', 'dado_mercado']` e `relevancia` fora de `['alta',
   'media', 'baixa']` — devem virar **400** com o corpo no mesmo formato já usado pelo
   servidor: `{"error": "..."}`. Vale manter a coerência do nome `error` (anglicismo já
   presente em `server.js`).

4. **Dois riscos concretos de `GET /evidencias`.**

   - `listarEvidencias()` lança exceção se uma linha do `.jsonl` estiver corrompida, o
     que interrompe a leitura inteira e, via HTTP, viraria 500. Isso foi registrado na
     Tarefa 05 e continua valendo.
   - Não há paginação nem limite: a função lê o arquivo inteiro e devolve tudo. No volume
     atual (3 registros) é irrelevante, mas é mais barato decidir o contrato de
     paginação agora do que depois.

5. **A relação entre validação e evidência ainda é só texto.** O campo
   `ideia_relacionada` é uma string livre, não um identificador. Se a próxima tarefa juntar
   os dois em um relatório, é a hora de decidir se entra um id estável de validação.

6. **Antes de qualquer trabalho, vale decidir o destino dos dois arquivos não
   versionados** (`briefing-abertura.md` e `conversas/`). Enquanto eles estiverem sem
   `.gitignore` e sem commit, um `git add .` os leva para o repositório público. Se a
   decisão for não versionar, adicionar ao `.gitignore` **antes** disso acontecer.

7. **O `.gitignore` já está preparado para o `.env`**, com `!.env.example`. Quando a
   integração com LLM criar as variáveis, basta criar o `.env.example` com os nomes das
   chaves e o `.gitignore` deixa passar; o `.env` real continua fora do repositório.

8. **Para esta tarefa em particular, nada foi além de documentação.** Nenhuma linha de
   código de produção mudou, e o comportamento do serviço é idêntico ao de antes. O
   único efeito observável no repositório remoto é a documentação corrigida.