# Tarefa 01 — Inspeção do ambiente (relatório reconstruído)

> **Aviso: este documento foi reconstruído em 16/10/2026, durante a Tarefa 09
> (limpeza estrutural).** A Tarefa 01 foi executada em 15/10/2026 e informada como
> concluída, mas nunca produziu relatório na pasta `relatorios/`. O status geral de
> 16/10/2026 registra a ausência: *"Não existe relatório da Tarefa 01 (inspeção) na
> pasta, embora a tarefa seja informada como concluída."*
>
> Portanto, **não há registro primário desta tarefa**. O conteúdo abaixo foi montado a
> partir de fontes secundárias e verificáveis do próprio projeto:
>
> - `relatorios/status-geral-2026-10-16.md` (inspeção de arquivos, decisões e pendências)
> - `ESTADO.md` (decisões registradas)
> - O estado atual dos arquivos na pasta
>
> Tudo que aqui aparece é reconstituição, não memória do que foi feito na hora. Onde a
> fonte é uma inferência em vez de um registro, isso está marcado.

## Data original

15/10/2026 (inferida: os demais relatórios da mesma sessão datam de 15/10/2026, entre
19:52 e 20:33, e o `package.json` da raiz foi modificado às 19:18:02 desse dia)

## Objetivo

Inspecionar o ambiente antes de começar a implementar: saber o que já existia na pasta,
qual stack usar, e identificar arquivos de referência do projeto.

## O que foi feito (reconstituído)

### 1. Inspeção da pasta

A pasta `C:\Users\clodo\Downloads\iavalidadora` já continha, antes de qualquer
implementação:

| Arquivo | Função |
|---|---|
| `Fluxograma de IA.svg` (188,7 KB) | Fluxograma original do processo, fonte do PDF de referência. |
| `Agente Validador.pdf` (362,8 KB) | PDF original do fluxograma (quadrado, 2892x2892 pt). |
| `iavaliadora-sequencia.pdf` (571,7 KB) | PDF de referência da sequência didática. |
| `clickup-tarefas.csv` (13,3 KB) | Exportação do backlog: 17 tarefas. |
| `clickup-tarefas1.csv` (13,8 KB) | Backlog reorganizado por fases: 8 fases + 17 subtarefas. |

Tabela reconstituída a partir de `status-geral-2026-10-16.md`, seção 1.

### 2. Stack decidida

**Node.js**, com Express como único framework web.

Justificativa registrada em `ESTADO.md`:

- **Node.js em vez de Python**: já instalado, leve, compatível com VPS.
- **Sem Docker**: economia de 4 GB em SSD com 11 GB livres.
- **Express em vez de `node:http`**: padrão de mercado, legível para portfólio.

A pasta já tinha **duas implementações** quando a inspeção foi feita: `server.js` na
raiz (Express) e `app/server.js` (sem dependências, com `node:http`, formato ESM). A
remoção de `app/` só aconteceu depois, na Tarefa 07, com a justificativa de que duas
implementações com contrato diferente confundem quem lê o repositório.

### 3. Dockerfile removido

O status geral de 16/10/2026 registra, na seção 5.4, que na raiz não havia
`Dockerfile`, nem unidade systemd, nem CI: *"Sem Docker/Dockerfile, sem unidade
systemd, sem CI."*

Leitura correta deste registro: **a decisão de não usar Docker já estava valida quando a
inspeção foi feita.** A remoção do Dockerfile ocorreu antes ou durante a Tarefa 01, e o
efeito é que a pasta nunca chegou a ter Docker. Este relatório não tem como confirmar a
data exata da remoção — é inferência a partir do estado final registrado.

### 4. Arquivos de configuração ausentes

Estado registrado na inspeção, e que motivou boa parte das tarefas seguintes:

- `.gitignore` inexistente (registrado como pendência nas Tarefas 04 e 05). Só existia
  `.megaignore`, um filtro de arquivos temporários do ambiente que não cobre
  `node_modules`, `*.jsonl` nem `.env`.
- `.env` e `.env.example` inexistentes: nenhuma variável de ambiente usada na raiz
  naquele momento.
- `README.md` na raiz inexistente (existia apenas em `app/`).
- Nenhum repositório git (sem `.git`).
- Sem linter, sem formatter (`.editorconfig`, `.eslintrc`), sem config de teste na raiz.
- Sem licença.

### 5. Ambiente de execução

Node.js **v24.14.1** (registrado na Tarefa 06). O servidor subia na porta fixa `3000`, e
não lia `process.env.PORT` — isso só foi corrigido depois.

## O que não funcionou ou ficou pendente

**Esta seção não pode ser reconstituída.** O status geral é explícito: *"Tarefa 01
(inspeção): sem relatório na pasta, portanto sem pendências/não-funcionou registrados."*

As pendências abaixo não vêm da Tarefa 01; são consequência direta do estado que a
inspeção registrou, e foram resolvidas depois:

| Pendência | Resolvida em |
|---|---|
| Sem `.gitignore` | Tarefa 08 (16/10/2026) |
| Sem repositório git | Tarefa 08 (16/10/2026) |
| Sem `README.md` na raiz | Tarefa 08 (16/10/2026) |
| Sem `.gitattributes` | Tarefa 09 (16/10/2026) |
| Sem testes automatizados de `evidencias.js` | Tarefa 09 (16/10/2026) |
| Duas implementações (`app/` e raiz) | Tarefa 07 |
| Porta fixa, sem `process.env.PORT` | resolvido antes da Tarefa 08 |

## Observações técnicas

1. **Este documento não substitui um registro original.** Se a construção do projeto
   depende de rastrear decisões da inspeção, a fonte continua sendo o `status-geral` de
   16/10/2026.

2. **A inspeção de hoje seria diferente.** A lista de ausências mudou: `.gitignore`,
   `.git`, `README.md` e `ESTADO.md` existem agora; `.env.example` continua sem existir
   (o `.gitignore` já está preparado para versioná-lo quando aparecer).

3. **Uma falha de processo ficou registrada.** A Tarefa 03 gerou dois relatórios de nome
   diferente com conteúdo byte a byte idêntico (mesmo hash SHA-256). Isso chegou até o
   portfólio e só foi corrigido na Tarefa 09. Vale um cuidado: a verificação de nomes
   duplicados na pasta `relatorios/` é barata e deveria entrar no checklist de
   organização.

4. **O `AGENTS.md` da raiz pede a leitura de um log diário** com
   `memory --action read --target daily`. Esse comando não existe no ambiente atual, e a
   pendência segue aberta. Detalhado em `tarefa-08-organizacao-portfolio.md`.