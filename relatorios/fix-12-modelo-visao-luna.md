# fix-12 — Modelo de visão padrão GPT-5.6 Luna

**Data:** 17/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `b9c37af` — fix-11: upload de imagem com OpenRouter

## Objetivo

Substituir o modelo de visão padrão que retornava `No endpoints found` no OpenRouter por
`openai/gpt-5.6-luna`, mantendo `OPENROUTER_MODEL` configurável pelo ambiente.

## Alterações

- `.env.example` agora configura `OPENROUTER_MODEL=openai/gpt-5.6-luna`.
- `server.js` define o Luna como padrão e continua usando
  `process.env.OPENROUTER_MODEL` quando essa variável está definida. Não havia fallback de
  modelo no código, então não foi introduzido um segundo modelo.
- `server.test.js` ganhou um teste unitário para o identificador do modelo padrão. O teste não
  chama o OpenRouter.
- `CONTRATO.md` registra o modelo padrão, o propósito exclusivo de extração visual e a leitura
  das variáveis de ambiente.
- `README.md` atualiza a explicação e o exemplo PowerShell.
- `ESTADO.md` registra o fix-12 no Pipeline de evolução, documenta o Luna e atualiza a contagem
  da suíte de 120 para 121 testes.

## Verificação

### `npm test`

Saída real do resumo do Node.js:

```text
ℹ tests 121
ℹ suites 0
ℹ pass 121
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4541.9963
```

O teste novo `modelo de visao padrao do OpenRouter e GPT-5.6 Luna` passou. Os testes da
integração de imagem simulam a resposta do OpenRouter; não foi feita chamada à API real e,
portanto, a disponibilidade do endpoint Luna não foi validada ao vivo.

### Outras verificações

- `git diff --check`: terminou sem saída e sem erro.
- `npx tsc --noEmit`: não executável neste projeto porque o compilador TypeScript não está
  instalado. A saída do `npx` informou que o pacote disponível não é o comando `tsc` esperado e
  orientou instalar `typescript`.
- `npx eslint .`: não completou; ESLint 10.13.0 não encontrou `eslint.config.*` no projeto.
- Não foi usado `curl.exe` nem iniciado servidor em segundo plano.
- O comando `memory --action read --target daily` não está disponível no ambiente. Não havia
  arquivo diário de hoje na pasta de relatórios; consultei o registro disponível de 16/10/2026
  e o `ESTADO.md` como referência.
- `opencode.json` já estava não rastreado antes da tarefa e foi preservado, sem inclusão nas
  alterações deste fix.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** A persistência JSONL síncrona
   bloqueia o event loop; a chamada ao provedor externo não tem timeout; e o limite de taxa é
   por IP e por processo, não compartilhado entre instâncias. Esta mudança de modelo não altera
   esses pontos.
2. **Onde há alucinação lógica neste fluxo?** O modelo visual pode descrever ou inferir
   incorretamente o conteúdo da imagem. A extração entra como ideia sem revisão humana; a nota
   continua sendo calculada pelas evidências e regras determinísticas.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas
   com aviso e as linhas válidas continuam disponíveis; a linha ruim permanece no arquivo e
   não é reparada automaticamente.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** As chamadas externas podem
   terminar em ordem diferente; cada gravação síncrona serializa dentro do processo, mas não há
   coordenação transacional entre instâncias.
5. **O que um atacante faria com este sistema?** Poderia enviar imagens repetidamente de vários
   IPs para consumir capacidade externa e armazenamento. O limite por IP/processo e o limite de
   tamanho reduzem alguns abusos, mas não fornecem autenticação nem proteção distribuída.
6. **Qual é a mentira mais confortável que este relatório conta?** A suíte aprovada confirma
   o identificador padrão no código e os fluxos com OpenRouter simulado; não prova que o
   endpoint `openai/gpt-5.6-luna` esteja atualmente disponível ou que a extração real tenha
   qualidade adequada. Isso não foi testado contra a API.

## Pipeline de evolução

### Onde estamos

O fluxo de entrada por texto ou imagem, classificação, evidências, nota determinística,
veredito e relatório A4 está implementado. O modelo de visão padrão para extração de texto é
`openai/gpt-5.6-luna`, configurável por `OPENROUTER_MODEL`.

### O que foi feito até aqui

- Tarefas 01–26 e correções `fix-01` a `fix-09`, conforme `ESTADO.md`.
- `fix-11`: upload e extração de descrição de imagem via OpenRouter.
- `fix-12`: modelo de visão padrão alterado de Nemotron para `openai/gpt-5.6-luna`; contrato,
  README, estado e teste atualizados.

### O que falta

- [Alta] Coletar concorrentes e reclamações reais e vincular as evidências à validação correta.
- [Alta] Configurar `OPENROUTER_API_KEY` no ambiente de deploy.
- [Média] Definir timeout e política de retentativa para a chamada OpenRouter.
- [Média] Validar credenciais, disponibilidade e qualidade do Luna com uma chamada real em
  ambiente controlado.
- [Média] Avaliar armazenamento/retention de imagens, autenticação e limite de taxa
  compartilhado entre instâncias.

### Decisões tomadas

- `openai/gpt-5.6-luna` é o padrão de visão; `OPENROUTER_MODEL` continua permitindo substituição.
- O modelo é usado somente para extrair texto de imagem; classificação e nota não são delegadas
  ao modelo.
- Não foi configurado fallback secundário: o código não tinha fallback anterior e a validação
  de disponibilidade real não foi feita nesta tarefa.

### Pendências conhecidas

- A chave `OPENROUTER_API_KEY` precisa existir no ambiente; o projeto não carrega `.env`
  automaticamente.
- A disponibilidade do endpoint Luna e a extração visual real permanecem sem verificação ao
  vivo nesta tarefa.
- Permanecem os riscos da Auditoria Red Team e as pendências de infraestrutura registradas em
  `ESTADO.md`.

### Próximo passo

Tarefa 22: coletar concorrentes e reclamações reais usando `id_validacao` como vínculo
obrigatório, definindo fontes e revisão humana das evidências.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-12-modelo-visao-luna.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-12-modelo-visao-luna.md").Length
```

Saída real:

```text
True
6498
```
