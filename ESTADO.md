# ESTADO

Documento de memória de trabalho. Qualquer pessoa (ou IA) que abrir este repositório
começa por aqui para saber onde o projeto está.

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
- Classificação mobile/outro (palavras-chave `app`, `aplicativo`)
- Persistência em `validacoes.jsonl` e `evidencias.jsonl`
- Módulo `evidencias.js`, com caminho de arquivo injetável para que os testes não toquem
  os dados de produção
- `id` e `timestamp` das evidências gerados pelo servidor, nunca aceitos do cliente
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 79 testes automatizados (41 em `server.test.js` + 15 em `evidencias.test.js` + 23 em
  `nota.test.js`)

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
- Testes: `npm test` (79 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 79 testes automatizados
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