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
evidências e aplica a régua inteira, com cinco critérios; a coleta de dados de verdade, o
veredito e o relatório final ainda não existem.

## O que existe hoje

- Endpoint `POST /validar-ideia`
- Endpoints `POST /evidencias` e `GET /evidencias` (integrados ao `server.js`)
- Endpoint `GET /nota` (a régua inteira: cinco critérios — "tem gente?", "tem gente
  insatisfeita?", "cabe mais um?", "alguém paga?" e "você alcança essas pessoas?")
- Módulo `nota.js` com a função `calcularNota(evidencias)`, sem I/O e sem dependências.
  Cada critério devolve `pontos`, `maximo` e `detalhe`; `total` e `maximo_possivel` são
  somas. A escala está fechada em 0 a 5
- Cinco tipos de evidência aceitos: `concorrente`, `reclamacao`, `dado_mercado`,
  `monetizacao` e `alcance`. Os dois últimos foram criados para o quarto e o quinto critério
- Classificação mobile/outro (palavras-chave `app`, `aplicativo`)
- Persistência em `validacoes.jsonl` e `evidencias.jsonl`
- Módulo `evidencias.js`, com caminho de arquivo injetável para que os testes não toquem
  os dados de produção
- `id` e `timestamp` das evidências gerados pelo servidor, nunca aceitos do cliente
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 62 testes automatizados (30 em `server.test.js` + 11 em `evidencias.test.js` + 21 em
  `nota.test.js`)

## O que não existe ainda

Alinhado ao fluxograma do projeto:

- Derivação do veredito a partir da nota (parar, mudar o recorte ou seguir)
- Coleta real de concorrentes
- Extração de reclamações
- Integração com LLM
- RAG
- Relatório em PDF
- Frontend
- Deploy
- Coleta real de concorrentes
- Extração de reclamações
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
- Testes: `npm test` (62 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 62 testes automatizados
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

**Tarefa 19 — derivação do veredito a partir da nota**. A régua está completa, então falta a
etapa seguinte do fluxograma: transformar a nota em uma decisão. O fluxograma prevê três
desfechos — parar, mudar o recorte ou seguir — e essa tradução hoje não existe em lugar
nenhum do código.

Vale decidir com o PO três coisas antes de implementar: quais faixas de nota levam a cada
desfecho, se o veredito é apenas informativo ou se passa a aparecer em outra rota, e se ele
entra em `GET /nota` como um campo novo ou vem em recurso separado. A segunda e a terceira
mudam o contrato da API, e o teste da forma da resposta vai quebrar quando qualquer uma
mudar.

## Pendências conhecidas

Nada foi adiado nesta tarefa. As pendências sobre o 405 de `/nota` e de `/evidencias` foram
resolvidas no fix-01.

Permanecem em aberto, todas de ambiente ou de infraestrutura, nenhuma de código:

- **Comando `memory` inexistente**: o `AGENTS.md` pede
  `memory --action read --target daily`, que não existe neste ambiente. Alternativa
  disponível: ler o `ESTADO.md`, que é o que este arquivo é.
- **Sem backup dos `.jsonl`**: os dados de execução são ignorados pelo Git e existem só na
  máquina local. Falta o script para rodar via `cron` na VPS.
- **Sem `.env`**: quando a integração com LLM acontecer, faltará o arquivo de variáveis de
  ambiente e o `.env.example`. O `.gitignore` já está preparado para versionar o exemplo.
- **Nota é geral, sem vínculo com uma ideia**: os cinco critérios contam evidências de
  todas as ideias juntas, porque `ideia_relacionada` é texto livre e não há identificador
  de validação. Isso é uma decisão já tomada (nota geral), não um defeito, mas com a régua
  completa virou o principal limite de design do projeto: a nota não consegue dizer de quem
  é. Resolver exige dar um `id` a `POST /validar-ideia`.