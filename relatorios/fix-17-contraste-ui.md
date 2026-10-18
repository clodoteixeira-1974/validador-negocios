# fix-17 — Contraste e limpeza do dashboard

**Data:** 18/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `be51e12` — fix-16: paleta clara Claude

## Objetivo

Reforçar a legibilidade no tema claro, dar ao formulário uma superfície branca com sombra
discreta, substituir o controle nativo de arquivo por um botão próprio e listar as competências
no rodapé do dashboard.

## Alterações

- Fundo da página ajustado para `#F9F8F6`, texto principal `#141413` e texto secundário `#6B6B66`.
- O botão primário conserva `#D97757` e usa texto `#FFFFFF`.
- O cartão do formulário usa branco (`#FFFFFF`), borda clara e sombra sutil `0 2px 8px` com
  baixa opacidade. A folha do relatório também permanece branca; a impressão preserva o fundo
  `#F9F8F6` e texto `#141413`.
- O input nativo de arquivo fica visualmente oculto, sem remover o controle acessível do DOM. Um
  `<label>` estilizado como botão “Escolher arquivo” mantém a seleção de imagem e o foco de teclado;
  a pré-visualização continua indicando a seleção.
- O rodapé do dashboard agora lista Node.js, Express, OpenRouter, OpenAI Luna, CSS puro, RAG e
  determinismo.
- README, ESTADO e testes foram atualizados. Nenhuma dependência foi adicionada.

## Testes e verificações

Saída real de `npm test`:

```text
ℹ tests 123
ℹ suites 0
ℹ pass 123
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11322.382
```

`git diff --check` terminou sem saída e sem erro. Os testes verificam os tokens, o cartão branco,
o botão, o estilo de ocultação/foco do input de arquivo, a lista de skills e as cores de impressão.
Não houve inspeção visual manual em navegador.

Verificações adicionais do ambiente:

- `npx tsc --noEmit` não encontrou TypeScript instalado e exibiu “This is not the tsc command you
  are looking for”.
- `npx eslint .` não completou porque ESLint 10.13.0 não encontrou `eslint.config.*`.
- `memory --action read --target daily` não está instalado; consultei o registro disponível de
  17/10/2026 e `ESTADO.md`.
- `opencode.json` já estava não rastreado antes da tarefa e foi preservado fora do commit.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** Gravações em JSONL são síncronas
   e bloqueiam o event loop; o limite de taxa é por IP/processo; assets e rotas não têm cache ou
   rate limit compartilhado entre instâncias.
2. **Onde há alucinação lógica neste fluxo?** O tema e o texto do rodapé são apresentação: não
   validam o score, as fontes nem a existência de suporte real a cada tecnologia/skill listada.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas com
   aviso e linhas válidas continuam disponíveis; a linha inválida permanece sem reparo.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** Express atende chamadas
   simultaneamente; gravações continuam síncronas dentro do processo, sem coordenação entre
   instâncias.
5. **O que um atacante faria com este sistema?** A API segue pública e sem autenticação; ainda
   é possível enviar evidências manipuladas para alterar a nota de uma validação conhecida.
6. **Qual é a mentira mais confortável que este relatório conta?** Trocar o texto nativo por um
   botão próprio remove o rótulo residual visualmente, mas não comprova compatibilidade com todo
   leitor de tela e navegador. O foco é mantido no input e estilizado no rótulo associado.

## Pipeline de evolução

### Onde estamos

O dashboard usa fundo unificado `#F9F8F6`, painel branco com sombra leve, texto secundário
`#6B6B66` e botão primário `#D97757` com texto branco. O upload e o rodapé de competências foram
limpos; o relatório mantém sua impressão clara.

### O que foi feito até aqui

- `fix-14`: design system compartilhado em CSS puro.
- `fix-15`: acabamento clean/flat.
- `fix-16`: paleta clara Claude.
- `fix-17`: contraste, superfície do formulário, upload de arquivo customizado e lista de skills.

### O que falta

- [Média] Conferir o dashboard em navegador e com leitores de tela, incluindo foco e acionamento
  do seletor de arquivo.
- [Média] Medir contraste do texto branco no botão `#D97757` e rever se os resultados não forem
  suficientes para o nível de acessibilidade esperado.
- [Média] Fazer inspeção visual e impressão física do relatório A4.
- [Alta] Permanecem os riscos de segurança da API pública e as pendências de dados de mercado em
  `ESTADO.md`.

### Decisões tomadas

- O input de arquivo é visualmente recortado, mas continua no DOM e associado a labels para
  preservar interação por teclado e tecnologia assistiva.
- O painel principal usa branco com borda fina e sombra de baixa opacidade, sem sombra pesada.
- O rodapé lista as competências fornecidas para o portfólio sem adicionar scripts ou fontes
  externas.

### Pendências conhecidas

- A aparência visual, o contraste medido e a experiência com leitores de tela não foram
  verificados manualmente nesta tarefa.
- “RAG” aparece como competência do portfólio conforme solicitado; a funcionalidade RAG não faz
  parte do fluxo atual do Validador.

### Próximo passo

Revisar o dashboard e o seletor de arquivo em navegador com teclado/leitor de tela, e conferir
contraste e impressão do relatório A4.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-17-contraste-ui.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-17-contraste-ui.md").Length
```

Saída real:

```text
True
5720
```
