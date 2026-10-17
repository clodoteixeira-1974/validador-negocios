# CONTRATO

Formato dos dados que atravessam o Validador de Negócios. Serve para saber o que cada campo
significa, quem o produz e quem o consome, sem precisar abrir o código.

**Regra do projeto:** toda tarefa que **adicionar, remover ou alterar** um campo described
neste documento atualiza o `CONTRATO.md` no mesmo commit. Campo novo sem contrato é dívida.

Todos os campos abaixo foram conferidos no código em 17/10/2026.

## Resumo das entidades

| Entidade | Onde vive | Criada por |
| --- | --- | --- |
| Validação | `validacoes.jsonl`, um objeto por linha | `POST /validar-ideia` |
| Evidência | `evidencias.jsonl`, um objeto por linha | `POST /evidencias` |
| Nota | resposta HTTP, não persistida | `GET /nota`, por `calcularNota` |
| Veredito | campo dentro da Nota | `derivarVeredito` |
| Relatório | HTML em memória, não persistido | `GET /relatorio/:id` |

## Validação

Gravada em `validacoes.jsonl`. É a unidade que o relatório consegue reabrir pelo link.

| Campo | Tipo | Obrigatório | Onde é gerado | Onde é consumido |
| --- | --- | --- | --- | --- |
| `id` | string | sim | servidor, `gerarId()` | resposta de `POST /validar-ideia`; chave de `GET /relatorio/:id`; valor de `id_validacao` numa evidência; filtro `?id=` |
| `ideia` | string | sim | cliente | relatório (bloco "A ideia") |
| `tipo` | string | sim | servidor, `classificarTipo()` | resposta; relatório |
| `timestamp` | string ISO 8601 | sim | servidor, `new Date().toISOString()` | relatório, formatado em pt-BR |

Formato do `id`: `<timestamp em ms>-<6 caracteres base36>`, por exemplo
`1792236286947-kv0fp9`.

## Evidência

Gravada em `evidencias.jsonl`. É o dado que a régua consome.

| Campo | Tipo | Obrigatório | Onde é gerado | Onde é consumido |
| --- | --- | --- | --- | --- |
| `id` | string | sim | servidor, `gerarId()` do módulo | listagem; relatório |
| `tipo` | string | sim | cliente | **todos os cinco critérios** da nota, por contagem |
| `fonte` | string | sim | cliente | relatório; auditoria do coletor |
| `url` | string | não | cliente | relatório (não exibido hoje) |
| `trecho_bruto` | string | sim | cliente | relatório, tabela de evidências |
| `ideia_relacionada` | string | sim | cliente | relatório (não usado para vínculo) |
| `timestamp` | string ISO 8601 | sim | servidor | auditoria do coletor |
| `relevancia` | string | sim | cliente | **não usado por nenhum critério** |
| `id_validacao` | string | não | cliente | filtro de `GET /nota`, `GET /evidencias` e `GET /relatorio/:id` |

Valores aceitos em `tipo`: `concorrente`, `reclamacao`, `dado_mercado`, `monetizacao`,
`alcance`.

Valores aceitos em `relevancia`: `alta`, `media`, `baixa`. O campo é validado e gravado, e
**não influencia a nota** — decisão do PO na Tarefa 13, mantida.

Regras de `id_validacao`:

- ausente: a evidência é geral e conta na nota de `GET /nota` sem `?id=`;
- string preenchida: a evidência conta só para aquela validação;
- string vazia ou só com espaços: **recusada com 400**, porque pareceria vinculada a uma
  validação inexistente;
- tipo diferente de string: **recusado com 400**.

## Nota

Devolvida por `GET /nota`. Não é persistida: é recalculada a cada chamada.

| Campo | Tipo | Obrigatório | Onde é gerado | Onde é consumido |
| --- | --- | --- | --- | --- |
| `criterios` | objeto | sim | `calcularNota` | relatório (tabela de critérios) |
| `criterios.<nome>.pontos` | number | sim | avaliador do critério | relatório; total |
| `criterios.<nome>.maximo` | number | sim | avaliador do critério | relatório; `maximo_possivel` |
| `criterios.<nome>.detalhe` | string | sim | gerador de detalhe do critério | relatório |
| `total` | number | sim | soma dos `pontos` | relatório (nota grande); dashboard |
| `maximo_possivel` | number | sim | soma dos `maximo` | relatório; dashboard |

Nomes dos cinco critérios, em ordem na resposta: `tem_gente`, `tem_gente_insatisfeita`,
`cabe_mais_um`, `alguem_paga`, `alcance`.

Cada um vale no máximo 1 ponto. A escala é fixa em 0 a 5.

## Veredito

Campo dentro da Nota. Derivado do `total` e do `maximo_possivel`.

| Campo | Tipo | Obrigatório | Onde é gerado | Onde é consumido |
| --- | --- | --- | --- | --- |
| `decisao` | string | sim | `derivarVeredito` | relatório (bloco colorido); dashboard |
| `faixa` | string | sim | `derivarVeredito` | relatório |
| `explicacao` | string | sim | `derivarVeredito` | relatório; dashboard |

Valores de `decisao`: `PARAR`, `MUDAR_O_RECORTE`, `SEGUIR`.

As faixas são **calculadas por proporção da escala**, não fixas: `limiteParar` é 20% do
máximo e `limiteSeguir` é 60%. Com `maximo_possivel` igual a 5, isso dá `0 a 1`, `2 a 3` e
`4 a 5`. Se a régua crescer, as faixas acompanham sozinhas.

## Relatório

HTML em memória, gerado por `gerarHtmlRelatorio`. Não é gravado em disco.

| Campo | Tipo | Onde é gerado | Onde é consumido |
| --- | --- | --- | --- |
| cabeçalho | fixo | `relatorio.js` | leitor |
| ideia, tipo, data, identificador | da Validação | `relatorio.js` | leitor |
| nota e máximo | da Nota | `relatorio.js` | leitor |
| veredito, faixa, explicação | do Veredito | `relatorio.js` | leitor |
| tabela dos critérios | da Nota | `relatorio.js` | leitor |
| evidências relacionadas | da Evidência, filtrada por `id_validacao` | `relatorio.js` | leitor |
| rodapé com data de geração e link do dashboard | fixo + URL da requisição | `relatorio.js` | leitor |

Todo dado vindo da Validação, da Evidência ou da Nota passa por `escapar()` antes de entrar
no HTML.

## Pendências do contrato

- **`relevancia` é coletada e não usada.** É o único campo do contrato que não alimenta
  nada. Decisão consciente do PO, e ainda assim uma pergunta em aberto: ou o campo sai do
  contrato, ou algum critério passa a usá-lo.
- **`url` é gravada e não exibida.** O relatório mostra tipo, fonte e trecho, e não mostra o
  link. Para uma pessoa que vai conferir a evidência, o link é o campo mais útil.
- **`ideia_relacionada` é texto livre e não é validado contra a Validação.** Uma evidência
  vinculada a um `id_validacao` pode trazer um texto de ideia completamente diferente, e o
  sistema aceita.
