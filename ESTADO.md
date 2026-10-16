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