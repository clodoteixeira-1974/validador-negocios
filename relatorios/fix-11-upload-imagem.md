# fix-11 — Upload de imagem com extração via OpenRouter

**Data:** 17/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `10e9d2f` — Tarefa 26: limite de taxa nas rotas

## Objetivo

Permitir que uma ideia seja enviada como imagem, extrair sua descrição textual via OpenRouter
e encaminhar esse texto pelo fluxo já existente de classificação, evidências, nota e relatório.
O OpenRouter não participa da classificação nem altera a régua determinística em `nota.js`.

## Implementação

- Criado `.env.example` com `OPENROUTER_API_KEY` e o modelo padrão
  `nvidia/nemotron-nano-12b-v2-vl:free`.
- `server.js` lê as duas variáveis do ambiente. O campo opcional `imagem_base64` é validado
  como data URI `data:image/...;base64,`, com limite de 10 MB após decodificação.
- Quando há imagem, o servidor chama `https://openrouter.ai/api/v1/chat/completions`, usa o
  texto retornado como `ideia` e grava a imagem no registro da validação. Falhas de validação
  e de processamento retornam `400` com a mensagem correspondente.
- O parser de JSON de `/validar-ideia` passou a aceitar corpos de até 14 MB para acomodar
  Base64 de uma imagem de 10 MB; as demais rotas mantêm o limite anterior de 100 KB.
- O dashboard ganhou seleção de arquivo `image/*`, pré-visualização, leitura via `FileReader`
  e envio em Base64. É possível enviar somente a imagem ou continuar usando apenas texto.
- O relatório A4 apresenta a imagem armazenada com `max-width: 100%` e
  `page-break-inside: avoid`.
- Atualizados `CONTRATO.md`, `README.md` e `ESTADO.md`, incluindo a pendência solicitada como
  resolvida nesta tarefa.
- Foram acrescentados sete testes à suíte HTTP: extração com mock, formato inválido, tipo
  inválido, tamanho acima de 10 MB, compatibilidade sem imagem, falha simulada do OpenRouter
  e imagem no relatório. A chamada externa foi mockada em todos os testes; nenhuma chamada
  real ou crédito foi usado.
- `nota.js` permaneceu inalterado.

## Verificação

`npm test` terminou com **120 testes, 120 aprovados e 0 falhas**. A duração reportada pelo
Node.js foi `4470.8215 ms`.

`node --check server.js`, `node --check relatorio.js` e `node --check server.test.js` terminaram
sem mensagens de erro. `git diff --check` também terminou sem mensagens e
`git diff --exit-code -- nota.js` confirmou que a régua não mudou.

Verificações adicionais do `AGENTS.md`:

- `npx tsc --noEmit`: não executável neste projeto; não há TypeScript instalado. O `npx`
  encontrou o pacote `tsc@2.0.4`, que informou que não é o compilador TypeScript e orientou
  instalar `typescript` antes de usar o comando.
- `npx eslint .`: não completou; o ESLint `10.13.0` não encontrou arquivo de configuração
  `eslint.config.*` no projeto.

O repositório tinha um `opencode.json` não rastreado ao iniciar esta tarefa, em divergência
com o contexto recebido. Após confirmação, o arquivo foi preservado intacto e ficou fora da
lista de arquivos da tarefa.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?**
   - A persistência JSONL continua síncrona e bloqueia o event loop; imagens também aumentam
     substancialmente o tamanho de cada linha e o consumo de disco.
   - Cada envio de imagem aguarda uma API externa sem timeout configurado. Lentidão ou
     indisponibilidade do OpenRouter mantém requisições abertas.
   - O limite de taxa é por IP e por processo. Uma distribuição de clientes por vários IPs
     contorna o limite local, e instâncias adicionais não compartilham contadores.
2. **Onde há alucinação lógica neste fluxo?**
   - O modelo visual pode descrever incorretamente ou inventar partes da ideia. O texto
     extraído é usado sem revisão humana como entrada da classificação determinística. A
     nota continua baseada nas evidências e não é calculada pelo modelo.
3. **O que acontece se um arquivo `.jsonl` for corrompido?**
   - A leitura resiliente ignora linhas inválidas e escreve um aviso; linhas válidas restantes
     continuam acessíveis. A linha corrompida não é reparada automaticamente. Uma validação
     cujo registro foi corrompido deixa de aparecer nas consultas.
4. **O que acontece se dois requests chegarem ao mesmo tempo?**
   - Chamadas OpenRouter podem concluir em qualquer ordem; após cada conclusão, a gravação
     síncrona serializa a operação dentro do processo. Não há transação ou coordenação de
     escrita entre instâncias.
5. **O que um atacante faria com este sistema?**
   - Poderia distribuir envios de imagem por IPs para consumir capacidade da API, armazenar
     imagens grandes repetidamente e ocupar disco. O limite de 10 MB e o limite local por IP
     reduzem o abuso por requisição, mas não protegem contra abuso distribuído nem substituem
     autenticação. Imagens são conteúdo não confiável enviado a um provedor externo.
6. **Qual é a mentira mais confortável que este relatório conta?**
   - Que 120 testes passando provam que a integração funciona com o serviço real. Os testes
     mockam o OpenRouter; não validam credenciais, disponibilidade ou qualidade de extração
     do modelo. A apresentação impressa também não foi verificada visualmente em navegador.

## Pipeline de evolução

### Onde estamos

O fluxo texto/imagem → classificação → evidências → nota determinística → veredito → relatório
A4 está implementado. A extração de imagem usa OpenRouter somente como conversão para texto.

### O que foi feito até aqui

- Tarefas 01–26 e correções `fix-01` a `fix-09`, conforme histórico em `ESTADO.md`.
- `fix-11`: upload, validação, extração simulada nos testes, persistência e apresentação da
  imagem no relatório; atualização do contrato e das instruções de configuração.
- A pendência **"Integrar imagem com LLM para extrair descrição da ideia automaticamente"**
  foi resolvida nesta tarefa.

### O que falta

- [Alta] Coletar concorrentes e reclamações reais e vincular evidências à validação correta.
- [Alta] Publicar o serviço configurando `OPENROUTER_API_KEY` no ambiente de deploy.
- [Média] Definir timeout e política de retentativa para a chamada OpenRouter.
- [Média] Avaliar armazenamento/retention de imagens e limite de taxa compartilhado entre
  instâncias.
- [Média] Rever autenticação e revogação de links conforme as decisões de produto.

### Decisões tomadas

- OpenRouter é usado somente para extrair texto da imagem; nota e classificação seguem
  determinísticas.
- A descrição extraída substitui o texto digitado quando uma imagem é enviada.
- Limite do conteúdo de imagem: 10 MB decodificados; a rota aceita corpo JSON até 14 MB para
  acomodar a codificação Base64.
- A régua de `nota.js` não foi modificada.

### Pendências conhecidas

- A chave `OPENROUTER_API_KEY` precisa ser configurada no ambiente; `.env.example` é apenas
  documentação e o servidor não carrega `.env` automaticamente.
- A integração ainda precisa ser validada com credenciais e respostas reais em ambiente
  controlado.
- Permanecem os riscos descritos na Auditoria Red Team e as pendências listadas em
  `ESTADO.md`.

### Próximo passo

Tarefa 22: coletar concorrentes e reclamações reais com `id_validacao` como vínculo obrigatório,
definindo as fontes e a revisão das evidências antes de inseri-las no fluxo.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-11-upload-imagem.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-11-upload-imagem.md").Length
```

Saída real:

```text
True
7782
```
