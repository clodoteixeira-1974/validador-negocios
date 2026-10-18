# fix-14 — Design system Schwartz Unleashed

**Data:** 18/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `7de33a3` — Tarefa 22: cobaia de comunicação política

## Objetivo

Criar uma base visual CSS pura, reutilizável nos apps do portfólio, e aplicá-la ao dashboard e
ao relatório A4 do Validador com tema escuro e regras próprias de impressão.

## Implementação

- Criado `public/styles.css`, servido pela rota estática local `GET /styles.css`.
- Declaradas as cores Schwartz Unleashed e as famílias tipográficas Plus Jakarta Sans, Inter e
  JetBrains Mono, com fallbacks de sistema. Nenhuma fonte ou stylesheet de terceiros é baixada.
- Criada hierarquia de títulos e parágrafos e as utilidades `.btn-primario`,
  `.btn-secundario`, `.btn-perigo`, `.card`, `.badge` e `.code-block`.
- Estilizados formulário, resultado, avisos, links, relatório e componentes de evidência com o
  tema escuro. O dashboard e o relatório carregam a mesma folha de estilos.
- Mantido o layout A4 e configurada impressão com margem de 2 cm, fundo branco, texto preto e
  ocultação de `.no-print`; o link de navegação do rodapé não é impresso.
- Removido o CSS embutido de `relatorio.js`; o endpoint estático expõe a folha com tipo MIME CSS.
- Atualizados `README.md` e `ESTADO.md` para documentar a paleta, as fontes, as classes, o uso
  compartilhado e a contagem da suíte.
- Adicionado teste para `GET /styles.css` (HTTP 200 e `text/css`) e verificações de stylesheet
  nos HTMLs de dashboard e relatório. A regra A4 e a classe de impressão também são conferidas
  na folha carregada.

## Verificação

`npm test` terminou com o resumo real:

```text
ℹ tests 123
ℹ suites 0
ℹ pass 123
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5851.6651
```

`git diff --check` terminou sem saída e sem erro. Os testes verificam a resposta CSS, os links
locais nas páginas e as regras A4 no arquivo CSS. Não foi feita inspeção visual manual em
navegador nem impressão física.

Verificações adicionais definidas para o projeto:

- `npx tsc --noEmit` não encontrou um compilador TypeScript instalado; o `npx` apresentou a
  mensagem “This is not the tsc command you are looking for”.
- `npx eslint .` não completou: ESLint 10.13.0 não encontrou arquivo `eslint.config.*`.

O comando `memory --action read --target daily` não está instalado. Não havia log datado de
18/10/2026 na pasta de relatórios; foram consultados o relatório da Tarefa 22, de 17/10/2026, e
`ESTADO.md`. O arquivo `opencode.json`, já não rastreado antes desta tarefa, foi preservado e
ficou fora do commit.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** As gravações em JSONL continuam
   síncronas e bloqueiam o event loop; limites de taxa são por IP e processo; e assets estáticos
   dependem do mesmo processo/instância da aplicação, sem CDN ou cache compartilhado.
2. **Onde há alucinação lógica neste fluxo?** O design system é uma camada de apresentação e
   não valida a nota nem as fontes. O layout e as regras CSS podem sugerir uma consistência
   visual que ainda não foi verificada em diferentes navegadores e impressoras.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas com
   aviso e as válidas continuam disponíveis; a linha ruim permanece e não é reparada.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** O Express pode servir CSS e
   páginas em paralelo; operações de gravação continuam síncronas dentro do processo, sem
   coordenação entre instâncias.
5. **O que um atacante faria com este sistema?** O CSS estático não muda a exposição da API:
   qualquer pessoa ainda pode enviar evidências sem autenticação e alterar notas. O dashboard
   visual não é uma barreira de acesso.
6. **Qual é a mentira mais confortável que este relatório conta?** Chamar a folha de “reutilizável”
   não prova que ela já funciona bem em outro app; só está integrada ao Validador. Também não
   foram conferidos contraste em todos os estados, fontes disponíveis no dispositivo ou impressão
   real.

## Pipeline de evolução

### Onde estamos

O Validador tem um design system local em CSS puro aplicado ao dashboard e ao relatório A4. A
folha define tema escuro, paleta, tipografia com fallbacks, utilidades e modo de impressão; a
reutilização em outros apps ainda precisa ser exercitada.

### O que foi feito até aqui

- Tarefas e correções anteriores conforme `ESTADO.md`, incluindo a Tarefa 22 e `fix-01` a
  `fix-13`.
- `fix-14`: stylesheet local compartilhado, tema dark, utilitários visuais, integração das
  páginas, estilo de impressão e testes da entrega CSS.

### O que falta

- [Média] Conferir o dashboard e o relatório visualmente em navegador e em impressão A4.
- [Média] Revisar contraste e estados de foco, principalmente nos botões vinho sobre fundo
  escuro.
- [Média] Reutilizar `public/styles.css` em outro app do portfólio e avaliar se precisa de
  extração/versionamento independente.
- [Alta] Permanecem as pendências de validação de fontes de mercado e de segurança operacional
  registradas em `ESTADO.md`.

### Decisões tomadas

- A folha fica em `public/styles.css` e é servida no mesmo origin, sem bundler, CDN ou dependência
  visual.
- O tema padrão é escuro; impressão A4 muda para fundo branco e texto preto para legibilidade e
  economia de tinta.
- As fontes são apenas declaradas com fallbacks; não se adicionam downloads externos de fontes.

### Pendências conhecidas

- A aparência final em navegador e impressora não foi revisada visualmente nesta tarefa.
- Plus Jakarta Sans, Inter e JetBrains Mono não são distribuídas com o projeto; se não estiverem
  no dispositivo, serão usadas as fontes alternativas definidas em CSS.
- A folha foi reutilizada por duas páginas do mesmo app; integração em outro app ainda não foi
  testada.

### Próximo passo

Revisar dashboard e impressão A4 em navegador real, ajustar contraste e validar o uso da folha
no próximo app do portfólio.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-14-design-system.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-14-design-system.md").Length
```

Saída real:

```text
True
6507
```
