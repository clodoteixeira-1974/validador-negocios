# fix-15 — Refinamento visual clean e flat

**Data:** 18/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `dd18e72` — fix-14: design system Schwartz Unleashed

## Objetivo

Refinar o design system existente para uma apresentação dark, clean e flat: superfície cinza
escura, texto suave, primários laranja e uso restrito do vermelho e vinho para estados
específicos.

## Alterações

- Em `public/styles.css`, o fundo principal passou de preto puro para `#1E1E1E`, o texto
  principal para `#D4D4D8` e os cartões para `#262626`; bordas e superfícies foram neutralizadas.
- O botão `.btn-primario`, já aplicado a “Validar ideia”, agora tem fundo `#F47C19`, texto
  preto de alto contraste e borda transparente de 1 px. O botão secundário usa contorno e texto
  neutros.
- O banner de portfólio usa fundo sutil `rgba(244, 124, 25, 0.1)` e borda discreta. O badge
  continua laranja; vinho fica disponível para badges de alerta, e vermelho fica restrito a
  perigo, erro e veredito PARAR.
- As regras `@media print` mantêm fundo branco, texto preto, margens A4 de 2 cm e a ocultação
  de `.no-print`.
- Atualizados os testes da folha CSS para conferir fundo, texto, botão laranja, banner sutil e
  cores de impressão; o teste do dashboard confere as classes dos botões já presentes no HTML.
- README e ESTADO registram a direção visual refinada.

## Verificação

Saída real de `npm test`:

```text
ℹ tests 123
ℹ suites 0
ℹ pass 123
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7246.9155
```

`git diff --check` terminou sem saída e sem erro. Os testes verificaram as declarações CSS e a
marcação do dashboard; não foi feita revisão visual em navegador nem impressão física.

Verificações adicionais do ambiente:

- `npx tsc --noEmit` não encontrou o compilador TypeScript instalado e exibiu “This is not the
  tsc command you are looking for”.
- `npx eslint .` não completou: ESLint 10.13.0 não encontrou `eslint.config.*`.
- O comando `memory --action read --target daily` não está instalado; o log diário de hoje não
  foi encontrado. Consultei o contexto mais recente da Tarefa 22 e `ESTADO.md`.
- `opencode.json` já estava não rastreado antes desta tarefa e foi preservado fora das alterações.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** As gravações JSONL são síncronas
   e bloqueiam o event loop; os limites de taxa são por IP e processo; e não há cache/CDN
   compartilhado para assets estáticos entre instâncias.
2. **Onde há alucinação lógica neste fluxo?** A mudança é visual: cores de sucesso, perigo e
   veredito não conferem se a nota ou as evidências estão corretas. O visual também pode fazer
   um resultado parecer mais confiável do que os dados permitem.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas com
   aviso, enquanto as válidas continuam disponíveis; a linha corrompida não é reparada.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** Express pode servir páginas e
   CSS em paralelo. Gravações de dados continuam síncronas localmente, sem coordenação entre
   processos.
5. **O que um atacante faria com este sistema?** O design não altera a API pública; um atacante
   ainda pode registrar evidências sem autenticação para manipular notas de validações
   conhecidas.
6. **Qual é a mentira mais confortável que este relatório conta?** O CSS declara uma paleta e
   estados mais contidos, mas os testes não substituem a revisão de contraste, foco e aparência
   em navegadores e impressoras reais.

## Pipeline de evolução

### Onde estamos

O design system tem acabamento dark cinza e flat, com texto `#D4D4D8`, ações primárias laranja
e cores de alerta reservadas. As regras de impressão continuam claras para A4.

### O que foi feito até aqui

- `fix-14`: design system CSS compartilhado entre dashboard e relatório.
- `fix-15`: refino da paleta em uso, superfície dos cartões, banner, botões e estados sem
  dependências externas.

### O que falta

- [Média] Inspecionar o dashboard e o relatório em navegadores reais e revisar o contraste em
  hover, foco e estados de veredito.
- [Média] Confirmar o resultado de impressão A4 visualmente.
- [Média] Reutilizar o design system no próximo app do portfólio.
- [Alta] Permanecem as pendências de segurança e verificação de evidências registradas em
  `ESTADO.md`.

### Decisões tomadas

- O tema principal usa cinza escuro e laranja para reduzir a competição entre cores da paleta.
- Vermelho e vinho ficam reservados a perigo, erro, PARAR e badges de alerta específicos.
- A folha de impressão mantém fundo branco e texto preto, independente do tema de tela.
- CSS continua puro, local e sem fontes carregadas de serviços externos.

### Pendências conhecidas

- Contraste e aparência final não foram conferidos visualmente em navegador, inclusive estados
  de hover/foco e impressão.
- A impressão depende do suporte CSS do navegador usado para gerar o PDF.

### Próximo passo

Fazer revisão visual do dashboard e do relatório A4 em navegador real e ajustar os estados de
foco/hover conforme essa revisão.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-15-refinamento-visual.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-15-refinamento-visual.md").Length
```

Saída real:

```text
True
5622
```
