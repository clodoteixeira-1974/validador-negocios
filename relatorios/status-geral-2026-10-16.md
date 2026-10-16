# Relatório de status geral — Validador de Novos Negócios

**Data do relatório:** 16/10/2026
**Executor:** Space Bunny
**Pasta do projeto:** `C:\Users\clodo\Downloads\iavalidadora`
**Tarefas concluídas informadas:** 1 (inspeção), 2 (endpoint), 3 (classificação mobile/outro), 4 (persistência), 5 (estrutura de evidências)
**Base deste relatório:** apenas leitura de arquivos e consulta ao estado do sistema. Nenhum arquivo de código foi alterado e nenhum teste do projeto foi executado.

---

## 1. Arquivos da pasta do projeto

| Arquivo | Tamanho | Modificado | Função |
|---|---|---|---|
| `server.js` | 1,4 KB | 15/10/2026 20:29:04 | API principal (Express): `POST /validar-ideia`, classificação mobile/outro e persistência em JSON Lines. |
| `evidencias.js` | 3,8 KB | 15/10/2026 20:33:20 | Módulo de estrutura de evidências de mercado (validar, gravar, listar). |
| `testar-evidencias.js` | 5,0 KB | 15/10/2026 20:33:26 | Script de verificação manual do módulo de evidências (grava dados ao ser executado). |
| `package.json` | 0,2 KB | 15/10/2026 19:18:02 | Manifesto do projeto raiz: dependência `express`, script `start`. |
| `package-lock.json` | 28,8 KB | 15/10/2026 19:18:14 | Lockfile das dependências da raiz. |
| `validacoes.jsonl` | 0,3 KB | 15/10/2026 20:29:40 | Persistência das validações (3 linhas). |
| `evidencias.jsonl` | 1,0 KB | 15/10/2026 20:33:30 | Persistência das evidências (3 linhas). |
| `app/server.js` | 2,9 KB | 15/10/2026 18:54:39 | Segunda implementação da API, sem dependências (`node:http`), com `GET /saude`. |
| `app/server.test.js` | 1,8 KB | 15/10/2026 18:54:07 | Testes automatizados (`node:test`) da implementação em `app/`. |
| `app/package.json` | 0,3 KB | 15/10/2026 18:53:13 | Manifesto do subprojeto `app/` (ESM, sem dependências, `start` e `test`). |
| `app/README.md` | 2,5 KB | 15/10/2026 18:55:47 | Documentação de uso da API em `app/`. |
| `Fluxograma de IA.svg` | 188,7 KB | 14/10/2026 20:04:16 | Fluxograma original do processo (fonte do PDF de referência). |
| `Agente Validador.pdf` | 362,8 KB | 15/10/2026 17:49:49 | PDF original do fluxograma (quadrado, 2892×2892 pt). |
| `iavaliadora-sequencia.pdf` | 571,7 KB | 15/10/2026 17:42:16 | PDF de referência da sequência didática. |
| `Agente Validador - A4 paisagem.pdf` | 38 KB | 16/10/2026 06:46:31 | Versão do fluxograma em A4 paisagem, vetorial, gerada nesta sessão. |
| `clickup-tarefas.csv` | 13,3 KB | 15/10/2026 18:03:31 | Exportação do backlog de tarefas (17 tarefas). |
| `clickup-tarefas1.csv` | 13,8 KB | 15/10/2026 18:21:27 | Exportação do backlog reorganizado por fases (25 linhas: 8 fases + 17 subtarefas). |
| `.megaignore` | < 1 KB | não foi possível determinar | Filtro de arquivos temporários do ambiente (só `Thumbs.db`, `*.tmp`, `*.crdownload` etc.). |
| `node_modules/` | 2,27 MB | — | Dependências instaladas da raiz; contém apenas a árvore do `express` (57 pacotes). |

Observações de leitura:
- Não há repositório git na pasta (sem `.git`).
- A pasta `node_modules` não tem subpastas de escopo (`@...`) nem binários; é a árvore completa do `express`.

---

## 2. Arquivos da pasta `relatorios`

| Arquivo | Data | Tarefa correspondente |
|---|---|---|
| `tarefa-02-endpoint-validar-ideia.md` | 15/10/2026 19:52:22 | Tarefa 02 — endpoint `POST /validar-ideia`. |
| `tarefa-03-analise-mobile.md` | 15/10/2026 20:17:44 | Tarefa 03 — classificação determinística mobile/outro. |
| `tarefa-03-classificacao-tipo.md` | 15/10/2026 20:17:44 | Tarefa 03 — **duplicata exata** do anterior. |
| `tarefa-04-persistencia.md` | 15/10/2026 20:29:59 | Tarefa 04 — persistência em JSON Lines. |
| `tarefa-05-estrutura-evidencias.md` | 15/10/2026 20:33:52 | Tarefa 05 — estrutura de evidências de mercado. |

Evidência da duplicidade: os dois arquivos da tarefa 03 têm o mesmo MD5 (`CDD24510C6DC80953B6D19812A84B867`) e as mesmas 149 linhas. Ambos citam como arquivo criado `tarefa-03-analise-mobile.md` — ou seja, `tarefa-03-classificacao-tipo.md` é uma cópia, não um segundo relatório.

Não existe relatório da Tarefa 01 (inspeção) na pasta, embora a tarefa seja informada como concluída.

---

## 3. Conteúdo dos arquivos de código

### 3.1 `server.js` (raiz, 56 linhas)

O que faz hoje:
- API Express mínima, porta fixa `3000` (linha 6: `const port = 3000;`), sem graceful shutdown e sem leitura de `process.env.PORT`.
- Middleware único: `express.json()` (linha 28).
- Classificação determinística por substring (linhas 12–19): `PALAVRAS_MOBILE = ['app', 'aplicativo']`, `classificarTipo()` normaliza com `toLowerCase()` e devolve `'mobile'` ou `'outro'`.
- Persistência: `registrarValidacao()` (linhas 22–25) faz `fs.appendFileSync` em `validacoes.jsonl` (linha 9, resolvido com `path.join(__dirname, ...)`).

Endpoints que existem:

| Método | Rota | Resposta |
|---|---|---|
| POST | `/validar-ideia` | 200 com `{recebido, ideia, tipo, timestamp}` |
| POST | `/validar-ideia` (campo ausente/vazio) | 400 com `{"error":"Campo 'ideia' ausente ou vazio"}` |

Formato de resposta (linhas 46–51):
```json
{"recebido":true,"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
```
O objeto `registro` é montado uma única vez (linhas 38–42) e reutilizado na gravação e na resposta, então o timestamp gravado e o retornado são idênticos.

Não existe: rota de listagem, rota de evidências, healthcheck, tratamento de erro global, validação de tipo do campo `ideia` (um número como `123` passaria no teste `!ideia`).

### 3.2 `app/server.js` (106 linhas) — segunda implementação, paralela

- Independe de `express`; usa `node:http` e `node:url` (linhas 1–2). Porta via `process.env.PORT ?? 3000` (linha 4).
- Limite de corpo de 100 KB, com erro 413 (linha 6, linhas 22–25).
- Rotas: `GET /saude` → `{"ok":true,"servico":"validador-negocios"}` (linhas 59–61); `POST /validar-ideia` → 200 `{"recebido","ideia","timestamp"}` (linhas 92–96); 405 com header `Allow: POST`; 404 `{erro, caminho}`.
- Validação mais completa que a da raiz: corpo não-objeto, campo ausente, tipo diferente de string e string vazia (linhas 32–52).
- Não tem `tipo`, não tem persistência, não tem módulo de evidências.
- Só sobe servidor se for executado diretamente (linhas 100–105), o que permite uso em testes.

### 3.3 `evidencias.js` (138 linhas, CommonJS)

Exporta (linhas 129–138): `registrarEvidencia`, `listarEvidencias`, `validarEvidencia`, `gerarId`, `ARQUIVO_EVIDENCIAS`, `CAMPOS_OBRIGATORIOS`, `TIPOS`, `RELEVANCIAS`.

Campos de uma evidência (ordem fixa de gravação, linhas 95–104):

| Campo | Obrigatório | Observação |
|---|---|---|
| `id` | sim | Se vazio/ausente, gerado por `gerarId()` = `<timestamp_ms>-<aleatório>` (linhas 26–28) |
| `tipo` | sim | Lista `TIPOS` = `concorrente`, `reclamacao`, `dado_mercado` (linha 8) |
| `fonte` | sim | String não vazia |
| `url` | **não** | Validada como string, pode ser vazia; preenchida com `""` se ausente (linhas 83–85, 64–66) |
| `trecho_bruto` | sim | String não vazia |
| `ideia_relacionada` | sim | String não vazia |
| `timestamp` | sim | ISO 8601; gerado se ausente (linhas 79–81) |
| `relevancia` | sim | Lista `RELEVANCIAS` = `alta`, `media`, `baixa` (linha 11) |

Como valida (`validarEvidencia`, linhas 31–69): devolve um array de problemas, vazio = válido.
- Entrada não-objeto ou array → `['evidencia deve ser um objeto']` (linhas 34–36).
- Para cada um dos 7 campos de `CAMPOS_OBRIGATORIOS` (linhas 15–23): ausente/nulo → `campo obrigatório ausente`; tipo diferente de string → `deve ser string`; string só com espaços → `campo obrigatório vazio`.
- `tipo` fora da lista → erro com a lista de aceitos (linhas 56–58).
- `relevancia` fora da lista → idem (linhas 60–62).
- `url` presente e não-string → erro (linhas 64–66).

Gravação (`registrarEvidencia`, linhas 72–109): cópia rasa com `Object.assign`, defaults de `id`/`timestamp`/`url`, validação **antes** de escrever, e `throw` de `Error` com a propriedade `erros` anexada (linhas 89–93). Numa evidência inválida o arquivo não é tocado.

Leitura (`listarEvidencias`, linhas 112–127): arquivo inexistente devolve `[]`; separa por `\n`, descarta linhas vazias e faz `JSON.parse`; uma linha corrompida **lança exceção** interrompendo a leitura inteira (linha 124).

### 3.4 `testar-evidencias.js` (145 linhas)

O que testa (saída no terminal, sem runner, sem código de saída diferente de zero):
- Passo 0 / "Configuração" (linhas 18–23): imprime caminho do arquivo, se existe antes do teste, campos obrigatórios, tipos e relevância aceitos.
- Passo 1 (linhas 56–67): registra 3 evidências fictícias (concorrente/Google Play, reclamação/Google Maps, dado_mercado/Wikipedia) com `ideia_relacionada = "App para controlar gastos"`. Cada registro recebe `id` explícito `evid-{n}-{Date.now()}` (linha 59).
- Passo 2 (linhas 69–83): lista e imprime todos os campos de cada evidência.
- Passo 3 (linhas 85–103): confere se os 8 campos esperados existem e se `validarEvidencia` não retorna erros; imprime `Bem-formadas: n/total`.
- Passo 4 (linhas 105–138): tenta registrar uma evidência **sem `fonte`** e verifica três coisas: se foi rejeitada, se o total no arquivo não cresceu, e se o id `evid-invalida-sem-fonte` não está presente.
- Resumo (linhas 140–145): total por tipo, se todas estão bem formadas e se o teste de rejeição passou.

Como testa: por chamada direta ao módulo (`require('./evidencias')`, linhas 1–9), imprimindo no console. **Não é somente leitura**: executá-lo faz append de 3 linhas em `evidencias.jsonl` (linha 62). Não apaga o arquivo, então execuções sucessivas duplicam as evidências fictícias.

### 3.5 `package.json` (raiz, 12 linhas)

- Dependência: `express: ^4.18.2` (única). `package-lock.json` confirma a árvore instalada em `node_modules`.
- Scripts: apenas `start: node server.js` (linha 7). **Não há script `test`.**
- `name: validador-de-ideias`, `version: 1.0.0`, `main: server.js`. Não declara `engines` nem `type`.

### 3.6 `app/package.json` (15 linhas) — subprojeto separado

- Sem dependências. `type: module`, `private: true`, `main: server.js`.
- Scripts: `start: node server.js` e `test: node --test` (linhas 9–10).
- `engines: node >= 20` (linhas 12–14).

### 3.7 `app/server.test.js` (58 linhas)

4 testes automatizados com `node:test` + `node:assert/strict`, subindo o servidor em porta efêmera (`listen(0)`, linha 8): ideia válida → 200 com `recebido/ideia/timestamp`; campo ausente → 400; string só com espaços → 400; `ideia: 123` → 400. Cobre apenas `app/server.js`; nada disso cobre o `server.js` da raiz.

---

## 4. Arquivos de dados

### `validacoes.jsonl` — 3 linhas

Cada linha é um objeto gravado por `registrarValidacao`, com 3 campos: `ideia`, `tipo`, `timestamp`.

```
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
{"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
```
Conteúdo idêntico ao registrado no relatório da Tarefa 04. Não há requisição inválida persistida (a gravação ocorre depois do `return` 400).

### `evidencias.jsonl` — 3 linhas

Cada linha é uma evidência com os 8 campos, na ordem `id, tipo, fonte, url, trecho_bruto, ideia_relacionada, timestamp, relevancia`.

| # | id | tipo | fonte | relevancia |
|---|---|---|---|---|
| 1 | `evid-1-1792107210392` | concorrente | Google Play | alta |
| 2 | `evid-2-1792107210397` | reclamacao | Google Maps | alta |
| 3 | `evid-3-1792107210399` | dado_mercado | Wikipedia | media |

As três referenciam `ideia_relacionada = "App para controlar gastos"` e são dados fictícios criados à mão (nenhuma fonte externa foi consultada). Não existe linha inválida no arquivo.

Observação: as evidências não têm chave de ligação com `validacoes.jsonl` (só coincide o texto da ideia).

---

## 5. O que ainda não existe no projeto

### 5.1 Endpoints não criados
- Qualquer rota HTTP para evidências: não há `POST /evidencias` nem `GET /evidencias`. `server.js` não importa `evidencias.js` (não há `require('./evidencias')` em nenhum arquivo do projeto).
- Leitura do histórico de validações (`validacoes.jsonl` só é escrito, nunca lido por código — o relatório da Tarefa 04 só mostra o `Get-Content` manual).
- Healthcheck na raiz: `GET /saude` existe apenas em `app/server.js`, não no `server.js` que está rodando.
- Endpoint de cálculo de nota, de geração de relatório e de análise por LLM: inexistentes.
- Nenhuma interface web (nem `GET /`).

### 5.2 Módulos não criados
- Calculadora de nota / régua determinística (nenhum arquivo com critérios de "tem gente?", "insatisfação", "alcance", "cabe mais um", "alguém paga").
- Coletor de dados (lojas de aplicativos, mapa, enciclopédia) — nenhuma automação de busca ou scraping.
- Extração de palavras-chave a partir de avaliações.
- Integração com LLM, embeddings e busca vetorial (RAG).
- Gerador de relatório em PDF.
- Frontend.
- Módulo de leitura/estatística sobre `validacoes.jsonl` e `evidencias.jsonl`.
- Runner de testes na raiz (o `server.js` da raiz não tem teste automatizado; só existe `app/server.test.js` para a outra implementação).

### 5.3 Funcionalidades do fluxograma sem código
| Passo do fluxograma | Situação |
|---|---|
| Você chega com uma ideia | Implementado (recebe e devolve o texto). |
| 1. Descrever com precisão | Não implementado (nenhuma extração de cliente/alvo). |
| A ideia é um aplicativo? → 2a/2b (lojas, mapa, enciclopédia) | Há apenas a classificação textual mobile/outro. Nenhuma coleta de lojas/mercado. |
| Achou concorrentes? → PARAR AQUI / 3. Ler reclamações | Não implementado. Só existe o modelo de dado da evidência. |
| 4. Procurar quem já tentou | Não implementado. |
| 5. Listar as apostas escondidas | Não implementado. |
| 6. A calculadora da nota (5 notas) | Nenhum dos 5 critérios implementado. |
| Qual é o veredito? → PARAR / MUDAR O RECORTE / SEGUIR | Não implementado. |
| 7. Sai um relatório em PDF | Não implementado (existem PDFs do fluxograma, não gerados pelo sistema). |
| Notas: régua escrita antes / painel de clientes simulados | Não implementado. |

### 5.4 Arquivos de configuração ausentes
- `.gitignore` (registrado como pendência nas Tarefas 04 e 05; hoje só existe `.megaignore`, que não cobre `node_modules`, `*.jsonl` nem `.env`).
- `.env` e `.env.example` (nenhuma variável de ambiente usada na raiz; `app/server.js` usa `PORT`).
- `README.md` na raiz (existe apenas em `app/`).
- Nenhum repositório git (sem `.git`).
- Sem Docker/Dockerfile, sem unidade systemd, sem CI.
- Sem linter/formatter (`.editorconfig`, `.eslintrc`) e sem config de teste na raiz.
- Sem license.

---

## 6. Pendências registradas nos relatórios anteriores

### Tarefa 02 — `tarefa-02-endpoint-validar-ideia.md`
- "O que não funcionou ou ficou pendente: Tudo funcionou conforme esperado." (linha 63)
- Observação registrada: "Certificar-se de que o servidor está rodando corretamente antes de executar os testes." (linha 66)

### Tarefa 03 — `tarefa-03-analise-mobile.md` (idêntico em `tarefa-03-classificacao-tipo.md`)
- **Limitação do ambiente:** a primeira tentativa do Teste D via `curl.exe` com aspas duplas escapadas enviou JSON malformado e o Express devolveu página HTML de `SyntaxError` do parser JSON. "Isso foi um problema de escaping do PowerShell no comando de teste, não do servidor." (linhas 123–138)
- `Invoke-WebRequest` no PowerShell 5.1 aborta o script ao receber 400 e imprime `Status: 0`; foi substituído por `curl.exe`. (linha 139)
- **Não há teste automatizado; a verificação é manual via terminal.** (linha 140)
- O `package.json` não foi alterado. (linha 141)
- Limitação de lógica registrada: a classificação é por substring (`includes`), então "aplicativo" dentro de uma palavra maior também dispara; se for indesejado, trocar por regex com limites de palavra. (linha 145)
- O servidor precisou ser iniciado com `Start-Process` em segundo plano porque `npm start` ocupa o terminal. (linha 149)

### Tarefa 04 — `tarefa-04-persistencia.md`
- **Limitação do ambiente:** os comandos `curl.exe` da especificação com aspas duplas escapadas não funcionam no PowerShell deste ambiente. Solução adotada: gravar o corpo em `body-tmp.json` e usar `--data-binary "@body-tmp.json"`. "Isso é uma restrição do shell de teste, não do endpoint." (linhas 162–177)
- `Status: 000` observado "indica que o curl nem chegou a receber resposta do servidor", não um status HTTP real. (linha 178)
- **Sem tratamento de erro de escrita em disco:** se `fs.appendFileSync` lançar, a requisição termina em erro 500 em vez de 200; não implementado por estar fora do escopo. (linha 179)
- **Não existe `.gitignore`**, então `validacoes.jsonl` e `node_modules` versionariam junto se o projeto virar repositório. (linha 180)
- A gravação é **síncrona e bloqueia o event loop**; irrelevante no volume atual, limite a considerar se crescer. (linha 181)
- **Não há testes automatizados; a verificação continua manual.** (linha 182)
- Arquivo temporário `body-tmp.json` foi usado e removido ao final (linha 91) — não está presente na pasta hoje.

### Tarefa 05 — `tarefa-05-estrutura-evidencias.md`
- **O script de teste não é idempotente:** sempre faz append; executar `node testar-evidencias.js` mais de uma vez duplica as evidências fictícias. A limpeza é manual (`Remove-Item "evidencias.jsonl"`). Reset automático não foi implementado para não alterar arquivo existente sem autorização. (linha 441)
- **Não há teste automatizado de verdade:** script manual, sem runner (mocha, jest, node:test) e sem código de saída diferente de zero em caso de falha. (linha 442)
- **Não foi validada a gravação com `url` vazia**, embora o código trate esse caso. (linha 443)
- **Não foi validado o preenchimento automático de `id` e `timestamp`:** no script o `id` é sempre fornecido, então `gerarId()` não é exercitada pelo caminho de `registrarEvidencia`. (linha 444)
- **Não há validação de `url` como link** — só o tipo é validado; URL malformada seria aceita. (linha 445)
- **Não há verificação de duplicidade** de `id`. (linha 446)
- **`listarEvidencias()` lança exceção** em linha corrompida em vez de pular e avisar, o que pode interromper a leitura inteira do histórico. (linha 447)
- **O módulo não está exposto por endpoint HTTP** — evidências só são gravadas por chamada direta do módulo. (linha 448)
- **Não existe `.gitignore`.** (linha 449)
- Dados das evidências são fictícios; nenhuma fonte externa consultada. (linha 450)
- Ambiguidades decididas e registradas: `url` fora de `CAMPOS_OBRIGATORIOS` (linha 28); formato de `id` gerado apenas quando não informado (linha 29); acúmulo entre execuções do script (linha 30).
- Observação final: a relação entre validação e evidência existe só pelo texto da ideia, "mas ainda não por um identificador estável" (linha 459).

### Pendências não cobertas por relatório
- Tarefa 01 (inspeção): sem relatório na pasta, portanto sem pendências/não-funcionou registrados.

---

## 7. Estado atual do servidor

| Item | Estado |
|---|---|
| Servidor Node rodando | Sim |
| PID | 5200 |
| Comando | `node server.js` (linha de comando completa, via CIM) |
| Iniciado em | 15/10/2026 20:29:08 |
| Porta em escuta | 3000 (endereço `::`, todas as interfaces) |
| Implementação servida | `server.js` da raiz (Express, com `tipo` e persistência) |

Evidências de que é o `server.js` da raiz:
1. O `server.js` da raiz foi modificado às 20:29:04 e o processo iniciou às 20:29:08 (4 segundos depois); `app/server.js` é de 15/10 18:54:39.
2. `validacoes.jsonl` foi modificado às 20:29:40, e os timestamps gravados (`23:29:34Z`–`23:29:40Z`) correspondem a 20:29:34–20:29:40 no horário local (UTC-3), ou seja, as gravações foram feitas por esse processo.
3. Somente o `server.js` da raiz usa a porta fixa 3000 e tem `registrarValidacao`; `app/server.js` não grava nada.

Observação: não foi possível determinar por leitura o diretório de trabalho do processo 5200; a atribuição acima é inferida das evidências de horário. Não foi feita nenhuma requisição HTTP ao servidor (por instrução de não executar testes).

Outros processos na máquina:
- PID 16100, `python.exe start.py --host 127.0.0.1 --port 8080`, escutando em `127.0.0.1:8080`. Não pertence a esta pasta do projeto (`start.py` não existe aqui); relação com o projeto não foi possível determinar.

Como iniciar (não executado):
- Servidor da raiz: `npm start` na pasta `C:\Users\clodo\Downloads\iavalidadora` (equivale a `node server.js`, porta fixa 3000).
- Implementação em `app/`: `cd app; node server.js` ou `npm start` (porta via `$env:PORT`, padrão 3000); testes com `npm test` (`node --test`).
- Verificação manual do script de evidências: `node testar-evidencias.js` na raiz — atenção: ele grava 3 linhas em `evidencias.jsonl` a cada execução.