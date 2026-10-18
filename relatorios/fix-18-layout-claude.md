# fix-18 — Layout Claude para o dashboard

**Data:** 18/10/2026
**Projeto:** Validador de Novos Negócios

## Objetivo

Reorganizar o dashboard para se aproximar da composição da imagem de referência: tela clara,
saudação centralizada e compositor de ideia com controles integrados, mantendo as rotas e os
fluxos funcionais do Validador.

## Implementação

- O dashboard agora tem cabeçalho compacto “Validador de Novos Negócios · Portfólio”, saudação
  centralizada “Boa tarde, Clodoaldo” e caixa de composição central.
- O compositor agrupa textarea, anexo por ícone `+`, indicação da régua de cinco critérios e
  botão de envio com seta laranja. O textarea continua enviando pelo mesmo endpoint e mantém o
  fluxo de nota, resultado e relatório.
- O upload usa input visualmente oculto, ainda associado a um rótulo acessível e selecionável
  por teclado; não renderiza o texto de arquivo escolhido pelo controle nativo.
- Mantidos aviso de dados de portfólio, aviso de qualidade das evidências, resultado, botão de
  cópia, competências e links no rodapé. Não foi adicionado um botão “Upgrade” que sugerisse um
  plano comercial inexistente.
- O corpo usa Plus Jakarta Sans com fallback Inter; o título usa serifa elegante, como na
  referência. CSS segue local e sem dependências externas.
- Atualizados testes de estrutura do compositor, upload, competências, botões e CSS. README e
  ESTADO registram o layout.

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
ℹ duration_ms 4109.9593
```

`git diff --check` terminou sem saída e sem erro. Os testes confirmam a presença da estrutura,
classes, acessibilidade do upload, estilos do compositor e rodapé. Não foi feita inspeção visual
manual em navegador.

Verificações adicionais do ambiente:

- `npx tsc --noEmit` não encontrou TypeScript instalado e exibiu “This is not the tsc command you
  are looking for”.
- `npx eslint .` não completou porque ESLint 10.13.0 não encontrou `eslint.config.*`.
- `memory --action read --target daily` não está instalado; consultei o relatório disponível de
  17/10/2026 e `ESTADO.md`.
- Os arquivos locais não rastreados `opencode.json`, `iavalidadora1.PNG`, `iavalidadora2.PNG` e
  `iavalidadora3.PNG` foram mantidos fora do commit.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** Escritas JSONL síncronas bloqueiam
   o event loop; limites por IP/processo não se compartilham entre instâncias; e a aplicação não
   tem cache compartilhado para CSS e páginas.
2. **Onde há alucinação lógica neste fluxo?** A interface é um compositor visual, não uma IA de
   conversa. “Régua determinística · 5 critérios” descreve o cálculo, mas não valida a qualidade
   das evidências submetidas.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas com
   aviso, as válidas continuam sendo lidas e as linhas ruins não são reparadas.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** O Express pode atender requests
   de forma concorrente; gravações JSONL continuam síncronas no processo, sem transação entre
   instâncias.
5. **O que um atacante faria com este sistema?** A API pública aceita envios sem autenticação;
   alguém poderia registrar evidências manipuladas e afetar a nota. O novo layout não altera o
   controle de acesso.
6. **Qual é a mentira mais confortável que este relatório conta?** A semelhança estrutural com a
   imagem não garante equivalência visual em todos os tamanhos de tela; o layout ainda não foi
   conferido visualmente em navegador real.

## Pipeline de evolução

### Onde estamos

O dashboard usa uma composição central no estilo de um chat, com identidade própria de portfólio,
entrada de ideia e anexo de imagem. A API, a régua de cinco critérios e o relatório permanecem
integrados.

### O que foi feito até aqui

- `fix-14` a `fix-17`: design system reutilizável, paleta clara, contraste e controle de upload.
- `fix-18`: layout de compositor, título centralizado, ação de envio por seta e rodapé de skills.

### O que falta

- [Média] Conferir o alinhamento e a adaptação a diferentes dimensões em navegador real.
- [Média] Validar visualmente o foco de teclado e a seleção de imagem em diferentes navegadores.
- [Média] Conferir a impressão do relatório A4 depois das mudanças globais de CSS.
- [Alta] Permanecem os riscos da API pública e as pendências de verificação de fontes em `ESTADO.md`.

### Decisões tomadas

- O dashboard não apresenta plano pago nem ação “Upgrade”; a cápsula superior identifica o
  Validador e seu contexto de portfólio.
- O upload é representado por `+` ligado ao input de arquivo; o input nativo continua acessível,
  mas não exibe seu texto residual.
- O botão de envio é um ícone de seta com nome acessível “Validar ideia”.
- A lista de tecnologias é apresentada como competências do portfólio, não como funcionalidades
  que todas já estejam implementadas no Validador.

### Pendências conhecidas

- A aparência da composição não foi comparada visualmente em browser contra a imagem enviada.
- O item RAG é uma competência listada no rodapé; RAG ainda não integra o fluxo do produto.
- A usabilidade do anexo precisa de conferência manual com teclado e leitor de tela.

### Próximo passo

Revisar visualmente o dashboard em navegador em desktop e mobile, e validar a impressão A4 do
relatório.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-18-layout-claude.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-18-layout-claude.md").Length
```

Saída real:

```text
True
5974
```
