# Tarefa 12 — Atualização da documentação

## Data

16/10/2026

## Objetivo

Atualizar o `README.md` e o `ESTADO.md` para refletirem o estado real do projeto depois da
Tarefa 11, que integrou o módulo de evidências ao servidor. Os dois documentos ainda
afirmavam "13 testes" e não mencionavam as rotas de evidências.

Esta tarefa é exclusivamente de documentação. Nenhuma linha de código foi alterada.

## O que foi feito

### README.md

1. **"O que faz" reescrito.** A seção passou de duas para três capacidades: valida a
   ideia, classifica o tipo e agora também guarda evidências de mercado. O texto deixou de
   dizer que o módulo de evidências "ainda não está conectado ao servidor" e passou a
   descrever o comportamento observável das duas rotas.

   Também foi acrescentado um parágrafo explicando que `id` e `timestamp` são gerados pelo
   servidor, e não escolhidos pelo cliente — que é a diferença de comportamento mais
   importante para quem vai consumir a API.

2. **Abertura do documento ajustada.** O primeiro parágrafo agora menciona que o serviço
   também recebe e lista evidências de mercado.

3. **"Como rodar" corrigido.** Acrescentada a frase "São 26 testes automatizados, todos
   passando", logo abaixo do bloco `npm test`. Antes não havia contagem nenhuma nessa seção
   do README.

4. **Dois exemplos de chamada adicionados** para as rotas de evidências: um `POST
   /evidencias` com corpo completo e um `GET /evidencias`.

5. **Tabela de endpoints com quatro linhas novas**, antes da linha de 404:

   | Método | Rota            | Comportamento documentado                                                   |
   | ------ | --------------- | ---------------------------------------------------------------------------- |
   | POST   | `/evidencias`   | `201` com a evidência gravada, com `id` e `timestamp` gerados pelo servidor |
   | POST   | `/evidencias`   | `400` quando falta campo obrigatório, ou `tipo`/`relevancia` não valem       |
   | GET    | `/evidencias`   | `200` com `{"total": N, "evidencias": [...]}`                                |
   | outro  | `/evidencias`   | `405` com o cabeçalho `Allow: GET, POST`                                      |

6. **Tabela de estrutura corrigida.** `server.test.js` passou de "13 testes" para "19
   testes". As entradas de `evidencias.js` e `evidencias.test.js` já estavam presentes e
   com descrição correta desde a Tarefa 10, então não precisaram de ajuste.

7. **"Estado do projeto" atualizado.** De "Fase inicial" para "Fase intermediária", com as
   26 menções de testes corrigidas e um parágrafo explicitando o que ainda falta (a parte
   inteligente).

8. **"Próximos passos" reescrito.** O item "Expor as evidências através de rotas HTTP" foi
   removido, por estar concluído. No lugar, entrou a nota determinística como primeiro
   item.

### ESTADO.md

1. **"O que é o produto" corrigido.** O texto ainda dizia "Hoje ele valida e classifica". Agora
   diz que ele valida, classifica e guarda as evidências, e que a inteligência de mercado
   ainda não existe.

2. **"O que existe hoje" atualizado.** Entraram os endpoints `POST /evidencias` e
   `GET /evidencias`, a integração ao `server.js`, a segunda persistência
   (`evidencias.jsonl`), a nota de que `id` e `timestamp` são gerados pelo servidor, e a
   contagem correta de 26 testes (19 + 7). A linha que dizia que o módulo estava "não
   integrado ao servidor ainda" foi removida.

3. **"O que não existe ainda" teve uma linha removida.** "Exposição de evidências via HTTP"
   saiu da lista, por estar concluída na Tarefa 11. Os sete itens restantes estão intactos.

4. **"Estado atual" corrigido** de 20 para 26 testes.

5. **"Como rodar" corrigido** de 20 para 26 testes, e foram acrescentados dois exemplos de
   chamada para as rotas de evidências.

6. **"Próximo passo" substituído** pelo texto da Tarefa 12 — a primeira nota determinística,
   o critério "tem gente?" do fluxograma, 1 ponto se houver 2 ou mais concorrentes
   registrados como evidência.

### Verificações

- `git diff --name-only` retornou apenas `ESTADO.md` e `README.md`, confirmando que nenhum
  arquivo de código foi tocado.
- Busca por "13 testes", "20 testes", "não conectado" e "não integrado" nos dois documentos
  não retornou nenhuma ocorrência.

## Diff do README.md, seção a seção

### Abertura e "O que faz"

Antes:

```
Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela e registra
a validação. É o primeiro passo de um projeto maior: cruzar a ideia com evidências de
mercado para dar uma nota de viabilidade.
...
Hoje, o serviço faz duas coisas:
...
Cada validação aceita é gravada em um arquivo de registro com a ideia, o tipo e a data e
hora. O módulo de evidências, que vai alimentado essa base com concorrentes, reclamações
de usuários e dados de mercado, já está escrito e testado, mas ainda não está conectado
ao servidor.
```

Depois:

```
Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela e registra
a validação, e que também recebe e lista evidências de mercado. É o primeiro passo de um
projeto maior: cruzar a ideia com essas evidências para dar uma nota de viabilidade.
...
Hoje, o serviço faz três coisas:
...
3. **Guarda evidências de mercado.** É possível registrar concorrentes, reclamações de
   usuários e dados de setor, e depois listar tudo o que foi registrado.

Cada validação aceita é gravada em um arquivo de registro com a ideia, o tipo e a data e
hora. Cada evidência registrada é gravada em outro arquivo, com a fonte, o trecho
original, a ideia à qual se refere e o nível de relevância.

As evidências são identificadas e datadas pelo próprio servidor: o cliente não escolhe o
identificador nem a data, apenas o conteúdo da evidência. Um registro sem os campos
obrigatórios é recusado com erro, e nada é gravado.
```

### "Como rodar"

Depois do bloco `npm test`:

```
São 26 testes automatizados, todos passando.
```

E os exemplos acrescentados:

```bash
# Registrar uma evidência de mercado
curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"concorrente\",\"fonte\":\"Google Play\",\"url\":\"https://play.google.com/store/apps/details?id=exemplo.financas\",\"trecho_bruto\":\"Organize suas contas e metas em um só lugar.\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"

# Listar todas as evidências registradas
curl http://localhost:3000/evidencias
```

### Tabela de endpoints

As quatro linhas acrescentadas, no lugar exato onde foram inseridas:

```
| POST   | `/evidencias`      | `201` com a evidência gravada, já com `id` e `timestamp` gerados pelo servidor                          |
| POST   | `/evidencias`      | `400` com `{"error": "..."}` quando falta um campo obrigatório, ou o `tipo` ou a `relevancia` não valem   |
| GET    | `/evidencias`      | `200` com `{"total": N, "evidencias": [...]}`; com nada registrado, `{"total": 0, "evidencias": []}`     |
| outro  | `/evidencias`      | `405` com o cabeçalho `Allow: GET, POST` — a rota não aceita esse método                                  |
```

### Tabela de estrutura

```
| `server.test.js`      | 19 testes do serviço HTTP, usando o módulo de testes nativo do Node.js. |
```

### "Estado do projeto" e "Próximos passos"

Depois:

```
Fase intermediária: o serviço de validação e classificação está funcionando, e as rotas
de evidências já estão integradas ao servidor, permitindo registrar e listar evidências de
mercado. São 26 testes automatizados, todos passando.

O que ainda falta é a parte inteligente: coletar concorrentes e reclamações de verdade,
cruzar isso com a ideia e calcular a nota de viabilidade.

## Próximos passos

- Calcular a primeira nota determinística ("tem gente?") a partir das evidências
- Coletar concorrentes reais e extrair reclamações de usuários
- Completar os outros quatro critérios da nota de viabilidade
- Integrar um modelo de linguagem e busca semântica (RAG)
- Gerar relatório final em PDF
- Interface web e publicação do serviço
```

## Diff do ESTADO.md, seção a seção

### "O que existe hoje"

Depois:

```
- Endpoint `POST /validar-ideia`
- Endpoints `POST /evidencias` e `GET /evidencias` (integrados ao `server.js`)
- Classificação mobile/outro (palavras-chave `app`, `aplicativo`)
- Persistência em `validacoes.jsonl` e `evidencias.jsonl`
- Módulo `evidencias.js`, com caminho de arquivo injetável para que os testes não toquem
  os dados de produção
- `id` e `timestamp` das evidências gerados pelo servidor, nunca aceitos do cliente
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 26 testes automatizados (19 em `server.test.js` + 7 em `evidencias.test.js`)
```

### "O que não existe ainda"

A linha removida foi a primeira da lista. A seção ficou assim:

```
Alinhado ao fluxograma do projeto:

- Coleta real de concorrentes
- Extração de reclamações
- Cálculo de nota (régua)
- Integração com LLM
- RAG
- Relatório em PDF
- Frontend
- Deploy
```

### "Como rodar"

```
npm test        # roda os 26 testes automatizados
```

Com os dois exemplos de evidências acrescentados ao bloco existente.

### "Próximo passo"

Depois:

```
## Próximo passo

**Tarefa 12 — primeira nota determinística**: implementar o critério "tem gente?" do
fluxograma. Se houver 2 ou mais concorrentes registrados como evidência, atribuir 1 ponto.
É o primeiro dos cinco critérios da régua.
```

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (12.3407ms)
✔ evidência sem "fonte": lança erro e não grava (2.6302ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.8666ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.4541ms)
✔ listar evidências de arquivo vazio: devolve [] (5.0311ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (8.3339ms)
✔ nenhum teste grava no evidencias.jsonl de produção (6.4197ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (177.6466ms)
✔ ideia nao mobile: 200 com tipo "outro" (68.4618ms)
✔ campo ausente: 400 e nada gravado (23.0239ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (44.7882ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (15.8097ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.6441ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (16.0533ms)
✔ corpo acima de 100kb: 413 e nada gravado (29.7216ms)
✔ GET /saude: 200 com ok e servico (19.4402ms)
✔ rota desconhecida: 404 em JSON (42.6902ms)
✔ GET /validar-ideia: 405 com header Allow: POST (17.6417ms)
✔ POST /saude: 405 com header Allow: GET (17.5235ms)
✔ nenhum teste grava no validacoes.jsonl de producao (21.8892ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (29.3444ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (18.1236ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (14.3156ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (13.5382ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (33.7577ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (75.7768ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1393.6307
```

26 testes, 26 passando, 0 falhando. Nada quebrou com a alteração de documentação, como
esperado.

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

## Saída real do `git log --oneline -3` (antes do commit desta tarefa)

```
39a1676 Tarefa 11: expoe evidencias via HTTP
d5f36e5 Adiciona briefing-abertura.md e conversas/ ao gitignore
3ab5430 Relatorio da tarefa 10 - atualizacao do ESTADO.md
```

## O que não funcionou ou ficou pendente

Nada falhou. Ficaram pendentes, porém:

1. **Colisão de numeração, novamente.** Este relatório é o `tarefa-12-atualizacao-documentacao.md`, e o "Próximo passo" gravado no `ESTADO.md` também é a **Tarefa 12** — agora a primeira nota determinística. Existem duas "Tarefa 12" na linha do tempo. Isso repete a colisão que já ocorreu na Tarefa 10 e que foi registrada no relatório daquela tarefa. Segui a especificação ao pé da letra e não renomeei nada, porque a renomeação é decisão de numeração do projeto. Sugestão: renumerar a nota determinística como Tarefa 13.

2. **A contagem "19 testes do serviço HTTP" no README é um número derivado.** O arquivo
   `server.test.js` tem 19 blocos `test()`, dos quais 13 são anteriores e 6 foram criados
   na Tarefa 11. O número está correto, mas nenhum artefato do projeto declara esse total
   explicitamente fora desta documentação — ele foi contado. Se no futuro mais testes forem
   adicionados a esse arquivo, os três lugares que citam 19 (tabela de estrutura do README,
   seção "O que existe hoje" do ESTADO e aqui) precisam ser atualizados juntos.

3. **Continua sem teste automatizado o tratamento de 405 em `/evidencias`.** Já registrado
   na Tarefa 11 e mantido aqui. A tabela de endpoints do README documenta o comportamento
   (`405` com `Allow: GET, POST`), mas esse comportamento não é verificado por teste.

4. **A documentação de `GET /evidencias` é mais amigável do que o comportamento.** A
   tabela do README diz `200` com `{"total": N, "evidencias": [...]}`, o que vale para o
   caminho feliz. Não há paginação, e uma linha corrompida no arquivo faz a leitura lançar
   exceção, o que resultaria em resposta 500 sem tratamento. A documentação pública não
   menciona esse caso.

5. **Pendências anteriores, sem relação com esta tarefa:** o comando `memory` do
   `AGENTS.md` não existe; não há script de backup dos `.jsonl` via `cron` na VPS; o
   `.env` ainda não foi criado; e continua valendo o alerta registrado no relatório da
   Tarefa 09 sobre o `.gitignore` ter passado de `.env.*` para `.env.*.local`, o que faz
   `.env.production` e `.env.staging` passarem a ser versionados.

## Observações técnicas para a próxima tarefa

1. **O próximo passo é a primeira nota determinística, e o critério está especificado:**
   2 ou mais concorrentes registrados como evidência valem 1 ponto. Como o campo `tipo` já
   aceita exatamente `'concorrente'`, o critério é implementável hoje com uma contagem
   simples sobre o resultado de `listarEvidencias()` — não depende de LLM nem de coleta de
   dados. Isso faz dela uma boa primeira nota: determinística, testável e verificável.

2. **Duas decisões de escopo precisam ser tomadas antes.** Primeira: a nota é calculada
   para uma ideia específica ou para todas as evidências registradas? Como
   `ideia_relacionada` é uma string livre e não um identificador, "concorrentes da minha
   ideia" hoje exigiria comparar por substring de texto, que é frágil. Segunda: onde a
   nota é exposta, `GET /nota`, campo novo em `POST /validar-ideia`, ou um recurso novo como
   `GET /nota?ideia=...`?

3. **Se a nota for por ideia, o id estável deixa de ser opcional.** Isto já foi observado
   nas Tarefas 09 e 11 e continua valendo: sem um identificador de validação, qualquer
   recorte por ideia é por texto. Introduzir o `id` em `POST /validar-ideia` agora é mais
   barato do que depois que existirem notas, evidências e relatórios que dependam disso.

4. **Contagem de concorrentes por tipo é determinística, mas o filtro `relevancia` não
   está especificado.** Um concorrente com relevância `baixa` conta? Vale fixar isso no
   critério antes de escrever o teste, porque o teste é o que vai congelar a decisão.

5. **A suíte tem 26 testes em dois arquivos, com padrão idêntico.** O arquivo novo deve
   seguir o mesmo esqueleto: `comServidor` para rotas HTTP, arquivo temporário em
   `os.tmpdir()`, limpeza no `finally`. Se a nota for implementada no módulo, ela também
   deve aceitar caminho por parâmetro, como `evidencias.js` faz desde a Tarefa 09, e
   ganhar testes próprios.

6. **Manter `README.md` e `ESTADO.md` em dia é mais barato de fazer junto.** Esta tarefa
   existiu só porque a Tarefa 11 entregou código sem atualizar a documentação, e o atraso
   custou uma tarefa inteira. Incluir a atualização dos dois documentos na definição de
   qualquer tarefa seguinte evita a repetição.

7. **Sobre o `.gitignore`, a correção sugerida ainda está pendente.** Antes que exista um
   `.env` de verdade, trocar a linha `.env.*.local` por `.env.*` e manter o `!.env.example`.
   Sem isso, o dia em que existir um `.env.production`, a chave de API vai para o
   repositório público.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-12-atualizacao-documentacao.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-12-atualizacao-documentacao.md").Length
17585
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-12-atualizacao-documentacao.md`,
com 17.585 bytes.