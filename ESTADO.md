# ESTADO

Documento de memória de trabalho. Qualquer pessoa (ou IA) que abrir este repositório
começa por aqui para saber onde o projeto está.

## Pipeline de evolução

Resumo do projeto para quem chega agora. O padrão destas seções está em
`relatorios/TEMPLATE-PIPELINE.md`, e elas aparecem também, ao final, em todo relatório novo.
**Elas são atualizadas a cada tarefa concluída.** A lista do que foi feito é cumulativa: item
concluído sai da lista do que falta.

Quem valida o quê está em **Passagem de bastão**, mais abaixo. O formato dos dados está em
`CONTRATO.md`.

### Onde estamos

Fase em que a ideia vira um documento legível por outra pessoa: régua completa, veredito,
nota por ideia e link de compartilhamento. Falta o dado real.

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
- Tarefa 10: atualização deste arquivo e migração para o GitHub
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
- [Média] Detecção de perda e reparo de linha corrompida. A leitura já é resiliente e a
  linha ruim é ignorada com aviso, mas ela **continua no arquivo** e não existe caminho para
  removê-la. Junto com a ausência de backup, um arquivo pela metade continua sem reparo
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`
- [Baixa] Classificação de tipo ainda é por palavra-chave. O limite de palavra corrigiu o falso
  positivo de "pineapple" e "AppStore", mas a regra só reconhece `app` e `aplicativo`. Uma
  ideia de "aplicação" ou "aplicativo mobile" escrita de outra forma continua classificada
  como `outro`. A classificação não é algo que a IA vá refinar no `nota.js`

### Decisões tomadas

- **Nota por ideia**, vinculada ao `id` da validação, em vez da nota global
- **Veredito conservador**: 0-1 `PARAR`, 2-3 `MUDAR_O_RECORTE`, 4-5 `SEGUIR`, com as faixas
  calculadas por proporção da escala
- **Relatório em HTML A4, sem PDF no servidor e sem Puppeteer**; o PDF sai do navegador
- **Uma única dependência**, `express`
- **Cada critério devolve `pontos`, `maximo` e `detalhe`**, e `total` e `maximo_possivel` são
  somas
- **Documentação no mesmo commit** de toda tarefa de código, e **pendência relatada entra
  neste arquivo** na mesma tarefa
- **Convenção de nomes**: `tarefa-NN` para código, `doc-NN` para documentação, `fix-NN` para
  correções

O motivo de cada decisão está na seção "Decisões tomadas e por quê".

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler este arquivo
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia
  falha

O detalhe de cada uma está no fim deste arquivo, em "Pendências conhecidas".

### Próximo passo

**Tarefa 22 — coletar concorrentes e reclamações de verdade**, com o `id` da validação como
entrada obrigatória, para que toda evidência coletada já nasça vinculada a uma ideia.

## Regras do projeto

Estas regras valem para todas as tarefas, a partir da Tarefa 14.

- **Toda tarefa de código inclui a atualização de `README.md` e `ESTADO.md` no mesmo
  commit.** Não vale abrir tarefa separada para isso: a documentação ficou para trás duas
  vezes seguidas (Tarefas 11 e 13) e custou trabalho de correção.
- **Cada tarefa gera um relatório** em `relatorios/`, com a convenção de nomes abaixo.
- **Convenção de nomes dos relatórios**: `tarefa-NN-descricao.md` para tarefa de código,
  `doc-NN-descricao.md` para tarefa de documentação, `fix-NN-descricao.md` para tarefa de
  correção. O prefixo diz o tipo da tarefa, para resolver as colisões de numeração que
  aconteceram três vezes seguidas.
- **Todo relatório termina com a confirmação de existência e tamanho**, com a saída real
  de `Test-Path` e de `(Get-Item ...).Length`.
- **Testes manuais com `curl.exe` não são usados neste ambiente.** O PowerShell 5.1 quebra
  o escaping das aspas duplas e os processos iniciados em segundo plano morrem ao fim da
  sessão. A verificação é feita por testes automatizados, que sobem o servidor em porta
  efêmera e fazem requisições HTTP reais.
- **Cole a saída real dos comandos. Não invente números.**
- **Todo relatório responde às seis perguntas da Auditoria Red Team**, antes do pipeline de
  evolução. Resposta honesta vale mais que frase otimista; pergunta sem resposta recebe
  "Nao identificado nesta tarefa", nunca invenção.
- **Toda tarefa que adicionar, remover ou alterar um campo de dado atualiza o
  `CONTRATO.md` no mesmo commit.** O formato dos dados está descrito em `CONTRATO.md`, na
  raiz. Campo novo sem contrato é dívida.

## Passagem de bastão

Como a governança deste projeto se sustenta na passagem entre execuções, fica escrito quem
valida o quê.

| Etapa | Quem faz | O que é conferido | Onde o resultado fica |
| --- | --- | --- | --- |
| Especificação | Product Owner | A regra do critério, as faixas e a decisão de produto | Prompt da tarefa, e depois `ESTADO.md` |
| Execução | Agente executor | Código, testes automatizados e documentação no mesmo commit | Diff do commit |
| Número reportado | Agente executor | Que a saída colada no relatório é a real, sem número inventado | Seção de saída do relatório |
| Auditoria Red Team | Agente executor | As seis perguntas, respondidas com honestidade | Seção Red Team do relatório |
| Contrato de dados | Agente executor | Que todo campo novo ou alterado está em `CONTRATO.md` | `CONTRATO.md` no mesmo commit |
| Revisão humana | Product Owner | A decisão de produto e a prioridade do que falta | Resposta no início da próxima tarefa |

**Regra de ouro:** quando o Product Owner corrige um número, uma premissa ou um escopo, o
agente executor não deve apenas corrigir e seguir. Deve registrar a correção no relatório da
tarefa, porque ela costuma indicar que o número ou a premissa anterior entrou em um
arquivo que será lido de novo.

O que **não** é validado por agente e precisa de olho humano: a aparência do relatório
impresso em A4, o comportamento do dashboard no navegador e a verossimilhança das evidências
de mercado, porque todas as evidências gravadas até hoje são fictícias.

## O que é o produto

O Validador de Novos Negócios é um serviço HTTP que recebe a descrição de uma ideia de
negócio, classifica o tipo dela e registra a validação com data e hora. Ele também recebe
e lista evidências de mercado (concorrentes, reclamações de usuários e dados de setor) e
calcula uma nota de viabilidade a partir delas. Hoje ele valida, classifica, guarda as
evidências e aplica a régua inteira, com cinco critérios, e deriva o veredito; a coleta de
dados de verdade e o relatório final ainda não existem.

## O que existe hoje

- Endpoint `POST /validar-ideia`
- Endpoints `POST /evidencias` e `GET /evidencias` (integrados ao `server.js`)
- Cada evidência pode ser **vinculada a uma validação** pelo campo opcional
  `id_validacao`. Com o vínculo, a nota passa a ser por ideia; sem ele, a evidência segue
  valendo para a nota geral
- `GET /nota?id=<id>` e `GET /evidencias?id=<id>` filtram por validação. Sem o parâmetro,
  ambos continuam devolvendo tudo, e a nota é a geral
- `GET /relatorio/:id` calcula a nota **só com as evidências vinculadas àquele id**. A
  heurística anterior, que associava evidências por comparação do texto da ideia, foi
  removida por ser frágil
- Endpoint `GET /dashboard`: página HTML com formulário de ideia, resultado e botão de
  copiar o link do relatório. O painel consulta a nota da ideia, com `?id=`
- Endpoint `GET /relatorio/:id`: relatório HTML em folha A4, com a ideia, a data, a nota, o
  veredito, os cinco critérios e as evidências relacionadas. Sem JavaScript
- Cada validação recebe um `id` (timestamp + aleatório), devolvido na resposta de
  `POST /validar-ideia` e que dá acesso ao relatório
- Módulo `relatorio.js` gera as duas páginas, com o CSS embutido e sem recurso externo.
  Sem dependência de PDF e sem Puppeteer: o PDF sai do navegador, por "Salvar como"
- Endpoint `GET /nota` (a régua inteira: cinco critérios — "tem gente?", "tem gente
  insatisfeita?", "cabe mais um?", "alguém paga?" e "você alcança essas pessoas?")
- Veredito derivado da nota, com campo novo na resposta: `decisao` (`PARAR`,
  `MUDAR_O_RECORTE` ou `SEGUIR`), `faixa` e `explicacao`. Faixas conservadoras:
  0-1 para, 2-3 muda o recorte, 4-5 segue
- Módulo `nota.js` com as funções `calcularNota(evidencias)` e `derivarVeredito(total,
  maximoPossivel)`, sem I/O e sem dependências. Cada critério devolve `pontos`, `maximo` e
  `detalhe`; `total` e `maximo_possivel` são somas. A escala está fechada em 0 a 5
- Cinco tipos de evidência aceitos: `concorrente`, `reclamacao`, `dado_mercado`,
  `monetizacao` e `alcance`. Os dois últimos foram criados para o quarto e o quinto critério
- Classificação mobile/outro por limite de palavra: `app` e `aplicativo` só valem como
  palavra isolada. "Pineapple shop", "happy" e "AppStore" são `outro`
- Persistência em `validacoes.jsonl` e `evidencias.jsonl`
- Módulo `evidencias.js`, com caminho de arquivo injetável para que os testes não toquem
  os dados de produção
- `id` e `timestamp` das evidências gerados pelo servidor, nunca aceitos do cliente
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 88 testes automatizados (46 em `server.test.js` + 19 em `evidencias.test.js` + 23 em
  `nota.test.js`)
- **Leitura de `.jsonl` resiliente e unificada**: `validacoes.jsonl` e `evidencias.jsonl` são
  lidos pela mesma função, em `jsonl.js`. Linha corrompida é ignorada com aviso em
  `console.warn`, e as demais linhas continuam sendo servidas. Uma linha ruim não devolve
  500 em nenhuma rota. O formato está em `CONTRATO.md`

## O que não existe ainda

Alinhado ao fluxograma do projeto:

- Coleta real de concorrentes
- Extração de reclamações
- Vínculo automático entre uma ideia e suas evidências na hora de coletar
- Integração com LLM
- RAG
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
- Testes: `npm test` (88 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 88 testes automatizados
```

Exemplos de chamada:

```bash
curl http://localhost:3000/saude

curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"

curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"concorrente\",\"fonte\":\"Google Play\",\"url\":\"https://exemplo\",\"trecho_bruto\":\"Trecho original\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"

curl http://localhost:3000/evidencias

curl http://localhost:3000/nota
```

Para usar outra porta: `PORT=8080 npm start` (Linux/macOS) ou
`$env:PORT=8080; npm start` (PowerShell).

## Próximo passo

**Tarefa 22 — coletar concorrentes e reclamações de verdade**. A nota agora é por ideia, e
isso muda o que a próxima tarefa precisa decidir. A coleta não pode mais ser solta: cada
evidência coletada precisa saber a qual validação pertence, senão ela cai na nota geral e
não aparece em relatório nenhum. Ou seja, o coletor precisa do `id` da ideia como entrada.

As perguntas para o PO são de produto e de conduta, não de código: de onde vêm os dados, com
que frequência se busca, se o coletor está proibido de fazer requisições aos sites
consultados, e se a pessoa valida a evidência coletada antes de entrar no relatório. O
destino já existe: `POST /evidencias` aceita `id_validacao`, e `validarEvidencia` já
recusa registro malformado.

## Pendências conhecidas

Permanecem em aberto, todas de ambiente ou de infraestrutura, nenhuma de código:

- **Comando `memory` inexistente**: o `AGENTS.md` pede
  `memory --action read --target daily`, que não existe neste ambiente. Alternativa
  disponível: ler o `ESTADO.md`, que é o que este arquivo é.
- **Sem backup dos `.jsonl`**: os dados de execução são ignorados pelo Git e existem só na
  máquina local. Falta o script para rodar via `cron` na VPS.
- **Sem `.env`**: quando a integração com LLM acontecer, faltará o arquivo de variáveis de
  ambiente e o `.env.example`. O `.gitignore` já está preparado para versionar o exemplo.
- **Nota por ideia depende de o cliente enviar `id_validacao`**: o vínculo existe e é o
  que corrige o relatório, mas nada o preenche sozinho. Quem integra o serviço precisa
  validar a ideia, guardar o id devolvido e repassá-lo em cada evidência. Evidências sem
  vínculo continuam existindo e contando na nota geral, o que é útil para material que não
  pertence a uma ideia específica, mas significa que **um relatório só mostra o que foi
  vinculado a ele**.
- **Evidências já gravadas não têm vínculo.** Os registros anteriores a esta tarefa
  continuam sem `id_validacao` e, por isso, não aparecem em relatório nenhum. Como os
  arquivos `.jsonl` são ignorados pelo Git, isso não afeta quem clonar o repositório: a
  correção só vale para os dados gravados a partir daqui.
- **Link de compartilhamento sem controle de acesso**: qualquer pessoa com o link abre o
  relatório. Não há autenticação nem segredo na URL. Se o relatório passar a conter dado
  sensível, isso precisa ser resolvido antes.