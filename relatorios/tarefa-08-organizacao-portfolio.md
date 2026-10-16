# Tarefa 08 — Organizacao para portfolio

## Data

16/10/2026

## Objetivo

Preparar o projeto Validador de Novos Negocios para ser apresentado como portfolio:
criar os tres documentos de raiz (.gitignore, ESTADO.md, README.md), inicializar o
repositorio git e confirmar que os testes continuam passando.

## O que foi feito

1. **Verificacao previa do ambiente**
   - `git --version` -> `git version 2.54.0.windows.1` (instalado)
   - `git config user.name` -> `clodoteixeira-1974`
   - `git config user.email` -> `clodoteixeira@gmail.com`
   - Confirmado que nao existia `.git` na pasta antes de inicializar.

2. **Criacao do `.gitignore`** na raiz, com a lista definida na tarefa.

3. **Criacao do `ESTADO.md`** na raiz, como documento de memoria de trabalho.

4. **Criacao do `README.md`** na raiz, como documento de vitrine para avaliador humano.

5. **Inicializacao do repositorio git**
   - `git init -b main` (branch principal ja criada como `main`)
   - `git add .`
   - `git commit -m "Estrutura inicial do Validador de Novos Negocios"`
   - Resultado: commit `407f0fa`, 25 arquivos, 4628 insercoes.

6. **Execucao dos testes** apos o commit: 13 de 13 passando.

7. **Verificacao do resultado**: listagem da raiz e checagem de arquivos versionados.

Nenhum arquivo de codigo foi alterado. `server.js`, `server.test.js`, `evidencias.js`,
`testar-evidencias.js`, `validacoes.jsonl` e `evidencias.jsonl` permanecem como estavam.

## Conteudo do `.gitignore`

```
node_modules/
*.jsonl
.env
.env.*
*.log
.DS_Store
Thumbs.db
desktop.ini
body-tmp.json
*.tmp
```

Justificativa registrada: `node_modules` e reinstalavel; `*.jsonl` contem dados de
execucao, nao codigo; `.env` contem segredos futuros.

## Conteudo do `ESTADO.md`

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
- Módulo `evidencias.js` (não integrado ao servidor ainda)
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 13 testes automatizados

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

## Estado atual

- Servidor: não está rodando. Para iniciar: `npm start`
- Porta padrão: 3000 (configurável via `PORT`)
- Testes: `npm test` (13 passando)

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 13 testes automatizados
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

Organização para portfólio está sendo concluída. Depois: **Tarefa 8 — expor evidências
via HTTP**, que conecta o módulo `evidencias.js` (já escrito e testado) ao servidor
Express, criando rotas de listagem e de registro.
```

## Conteudo do `README.md`

O README foi escrito para um avaliador humano (recrutador, colega, entrevistador), e
nao para o executor de codigo. Seções criadas conforme especificado: titulo e frase de
abertura, "O que faz", "Como rodar", "Endpoints" (tabela com metodo, rota e resposta
para os oito casos, incluindo os codigos de erro), "Estrutura do projeto" (tabela de
arquivos e funcoes), "Estado do projeto" e " proximos passos". O README tambem aponta
para `ESTADO.md` e para a pasta `relatorios/`.

Trecho de abertura, para registro:

```markdown
# Validador de Novos Negócios

Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela e registra
a validação. É o primeiro passo de um projeto maior: cruzar a ideia com evidências de
mercado para dar uma nota de viabilidade.
```

## Saida real do `git status` apos o commit

Comando: `git status`

```
On branch main
nothing to commit, working tree clean
```

Branch principal: `main`

Saida do commit:

```
[main (root-commit) 407f0fa] Estrutura inicial do Validador de Novos Negócios
 25 files changed, 4628 insertions(+)
```

Lista de arquivos versionados (25):

```
.gitignore
.megaignore
AGENTS.md
Agente Validador - A4 paisagem.pdf
Agente Validador.pdf
ESTADO.md
Fluxograma de IA.svg
README.md
clickup-tarefas.csv
clickup-tarefas1.csv
evidencias.js
iavaliadora-sequencia.pdf
package-lock.json
package.json
relatorios/status-geral-2026-10-16.md
relatorios/tarefa-02-endpoint-validar-ideia.md
relatorios/tarefa-03-analise-mobile.md
relatorios/tarefa-03-classificacao-tipo.md
relatorios/tarefa-04-persistencia.md
relatorios/tarefa-05-estrutura-evidencias.md
relatorios/tarefa-06-unificacao.md
relatorios/tarefa-07-remocao-app.md
server.js
server.test.js
testar-evidencias.js
```

## Confirmacao de que node_modules e *.jsonl NAO estao versionados

Verificado com contagem sobre `git ls-files`:

- Arquivos versionados contendo `node_modules`: **0**
- Arquivos versionados com extensao `.jsonl`: **0**

Alem disso, `git status` retorna `working tree clean` com `node_modules/`,
`validacoes.jsonl`, `evidencias.jsonl` e `desktop.ini` presentes na pasta: os quatro
existem em disco e nenhum aparece como pendencia, o que confirma que estao ignorados.

Conteudo final da raiz (com arquivos ocultos):

```
Mode   Name
----   ----
d--h-- .git
d----- node_modules
d----- relatorios
-a---- .gitignore
-a-h-- .megaignore
-a---- Agente Validador - A4 paisagem.pdf
-a---- Agente Validador.pdf
-a---- AGENTS.md
-a---- clickup-tarefas.csv
-a---- clickup-tarefas1.csv
---hs- desktop.ini
-a---- ESTADO.md
-a---- evidencias.js
-a---- evidencias.jsonl
-a---- Fluxograma de IA.svg
-a---- iavaliadora-sequencia.pdf
-a---- package-lock.json
-a---- package.json
-a---- README.md
-a---- server.js
-a---- server.test.js
-a---- testar-evidencias.js
-a---- validacoes.jsonl
```

## Saida real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js

✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (536.162ms)
✔ ideia nao mobile: 200 com tipo "outro" (36.9243ms)
✔ campo ausente: 400 e nada gravado (19.6505ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (33.7523ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (16.9066ms)
✔ body que nao e objeto JSON: 400 e nada gravado (13.8531ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (41.6098ms)
✔ corpo acima de 100kb: 413 e nada gravado (21.8637ms)
✔ GET /saude: 200 com ok e servico (78.333ms)
✔ rota desconhecida: 404 em JSON (16.022ms)
✔ GET /validar-ideia: 405 com header Allow: POST (46.9346ms)
✔ POST /saude: 405 com header Allow: GET (16.3958ms)
✔ nenhum teste grava no validacoes.jsonl de producao (21.0326ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7815.0109
```

Resultado: 13 passando, 0 falhando. Nada quebrou.

## O que nao funcionou ou ficou pendente

1. **O comando `memory` do AGENTS.md nao existe neste ambiente.**
   O `AGENTS.md` da raiz instrui a ler o log diario com
   `memory --action read --target daily`. A verificacao retornou "memory command not
   found". Nao ha como cumprir essa etapa. Nenhum arquivo foi alterado por causa disso,
   e o log diario nao foi consultado. Se existe uma ferramenta de memoria esperada,
   ela precisa ser instalada ou o AGENTS.md precisa ser ajustado.

2. **Nenhum remoto git foi configurado.**
   O repositorio e local. Nao foi criado remote nem feito push, porque a tarefa pedia
   apenas `git init`, `git add`, `git commit` e branch principal. Para publicar em um
   repositorio remoto (GitHub, por exemplo) ainda e necessario criar o repositorio
   remoto e configurar a origem.

3. **Nada foi enviado para nenhum repositorio remoto.**
   Confirmacao do item 2: nenhum comando de rede foi executado.

## Observacoes tecnicas para a proxima tarefa

1. **`.env.*` tambem ignora `.env.example`.**
   O padrao `.env.*` casa com qualquer arquivo que comece com `.env.`, incluindo
   `.env.example`, que normalmente deve ser versionado como documentacao. Se o projeto
   passar a ter variaveis de ambiente (chaves de LLM, por exemplo), sera preciso trocar
   por:
   ```
   .env
   .env.*
   !.env.example
   ```
   Nao fiz essa alteracao agora porque a tarefa especificou a lista exata.

2. **Arquivos binarios grandes foram versionados.**
   O commit inclui cerca de 1,1 MB de PDFs, um SVG de 193 KB e dois CSV do ClickUp
   (~28 KB juntos). Nenhum desses esta no `.gitignore` especificado, entao foram
   versionados conforme instrucao. Para um portfolio publico, considere mover os PDFs
   e os CSV para fora do repositorio ou para a pasta `relatorios/`, mantendo apenas o
   fluxograma. Isso nao foi feito agora por estar fora do escopo, mas evita que cada
   novo commit carregue binarios.

3. **Falta um `.gitattributes`.**
   O `git add` emitiu avisos de conversao LF para CRLF em 18 arquivos (comportamento
   normal do Git no Windows). Nao ha `.gitattributes` no projeto, o que significa que
   o comportamento depende do `core.autocrlf` local de cada pessoa. Um
   `.gitattributes` com `* text=auto eol=lf` evitaria diffs ruidosos entre maquinas.

4. **Um clone novo nao tera os arquivos `.jsonl`.**
   Como `*.jsonl` esta ignorado, um clone do repositorio comeca sem
   `validacoes.jsonl` e sem `evidencias.jsonl`. Isso nao quebra o servidor: o
   `appendFileSync` do `server.js` cria o arquivo na primeira gravacao, e
   `listarEvidencias()` do `evidencias.js` ja trata arquivo inexistente devolvendo
   array vazio. Mesmo assim, e um ponto a considerar quando a Tarefa 8 criar as rotas
   de evidencias.

5. **Ponto de atencao para a Tarefa 8 — `evidencias.js` usa caminho fixo.**
   Este e o detalhe mais importante para a proxima tarefa. Diferente do `server.js`,
   que aceita a opcao `arquivoValidacoes` para os testes apontarem para um arquivo
   temporario, o `evidencias.js` fixa `ARQUIVO_EVIDENCIAS` com `path.join(__dirname,
   'evidencias.jsonl')` e nao recebe caminho por parametro nem por opcao. Isso
   significa que, no estado atual, qualquer teste HTTP que grave evidencias usaria o
   arquivo de producao. O padrao ja adotado pelo `server.js` (opcao no `createApp`
   e arquivo temporario em `os.tmpdir()`, como em `arquivoTemporario()` do
   `server.test.js`) deve ser replicado no `evidencias.js` antes de expor as rotas,
   para manter o mesmo isolamento. Como esta tarefa proibe alterar `evidencias.js`,
   a mudanca fica para a Tarefa 8.

6. **Contrato de `registrarEvidencia` ja esta definido.**
   Vale registrar como esta hoje, para a Tarefa 8 nao ter que descobrir: a funcao lanca
   `Error` com a propriedade `.erros` (array de mensagens) quando a evidencia e
   invalida, preenche sozinha `id`, `timestamp` e `url` quando ausentes, grava sempre
   com a mesma ordem de campos e devolve o registro gravado. `listarEvidencias()` le o
   arquivo inteiro, ignora linhas em branco e lanca erro indicando o numero da linha
   quando um JSON esta corrompido. Os campos `url` e `ideia_relacionada` sao de
   preenchimento obrigatorio no `CAMPOS_OBRIGATORIOS`, exceto `url`, que pode ser
   string vazia.

7. **Relatorios com nome possivelmente duplicado.**
   Em `relatorios/` existem `tarefa-03-analise-mobile.md` e
   `tarefa-03-classificacao-tipo.md`, ambos com 6416 bytes, alem de nao existir
   relatorio da tarefa 01. Nao foi nada alterado; registrado aqui para decisao do
   proximo ciclo de organizacao.

8. **Diferenca de idioma entre codigo e documentacao.**
   O codigo e as mensagens de erro usam portugues sem acentos ("requisicao",
   "Metodo nao permitido"), enquanto `README.md` e `ESTADO.md` usam portugues com
   acentos. A diferenca e intencional e nao quebra nada: as assercoes dos testes
   conferem as strings do codigo. Vale definir um padrao unico no futuro.

9. **Nenhum comando de verificacao de lint ou typecheck foi executado.**
   O AGENTS.md global menciona `npx tsc --noEmit` e `npx eslint .`, mas este projeto
   e JavaScript puro, sem TypeScript e sem configuracao de ESLint (nao ha
   `eslint.config.js` nem `tsconfig.json` na raiz). Os 13 testes com `node --test` e
   `node:assert/strict` sao a verificacao disponivel hoje.