# ESTADO

Documento de memória de trabalho. Qualquer pessoa (ou IA) que abrir este repositório
começa por aqui para saber onde o projeto está.

## O que é o produto

O Validador de Novos Negócios é um serviço HTTP que recebe a descrição de uma ideia de
negócio, classifica o tipo dela e registra a validação com data e hora. Ele também recebe
e lista evidências de mercado (concorrentes, reclamações de usuários e dados de setor).
Em etapas futuras, deve cruzar a ideia com essas evidências para produzir uma nota de
viabilidade. Hoje ele valida, classifica e guarda as evidências; a parte de inteligência
de mercado ainda não existe.

## O que existe hoje

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

## O que não existe ainda

Alinhado ao fluxograma do projeto:

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
- Testes: `npm test` (26 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 26 testes automatizados
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
```

Para usar outra porta: `PORT=8080 npm start` (Linux/macOS) ou
`$env:PORT=8080; npm start` (PowerShell).

## Próximo passo

**Tarefa 12 — primeira nota determinística**: implementar o critério "tem gente?" do
fluxograma. Se houver 2 ou mais concorrentes registrados como evidência, atribuir 1 ponto.
É o primeiro dos cinco critérios da régua.