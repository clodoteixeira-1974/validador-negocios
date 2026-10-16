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