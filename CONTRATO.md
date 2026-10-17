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

Formato do `id`: **UUID versão 4**, por exemplo
`550e8400-e29b-41d4-a716-446655440000`. São 36 caracteres, em formato hexadecimal
separado por hífen, com o terceiro bloco começando em `4` e o quarto em `8`, `9`, `a` ou `b`.

Gerado por `crypto.randomUUID()`, que usa 122 bits de entropia vinda de fonte
criptográfica. O formato anterior era `<timestamp em ms>-<6 caracteres base36>`, e o
timestamp monotônico permitia adivinhar o `id` por força bruta com muito menos tentativas.

O `id` **aparece na URL** do relatório, em `/relatorio/:id`. É por isso que ele precisa
ser adivinhável apenas por força bruta. Ele não é segredo: quem tem o link abre o
relatório, e **o relatório não tem controle de acesso**.

O `id` da **Evidência** segue outro formato, `<timestamp em ms>-<6 caracteres base36>`, e
continua vindo de `gerarId()` dentro de `evidencias.js`. Ele não aparece em URL e não é
usado como chave de acesso.

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

O `tipo` da **Validação** é outro campo, com dois valores: `mobile` e `outro`. Ele é
calculado por limite de palavra, e vale `mobile` quando a ideia contém `app` ou `aplicativo`
como **palavra isolada**. "Pineapple shop", "happy" e "AppStore" resultam em `outro`. A
regra é determinística e não é ajustável pela API.

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

## Comportamento de leitura de `.jsonl`

Os dois arquivos, `validacoes.jsonl` e `evidencias.jsonl`, são lidos pela **mesma função**,
`lerJsonl` do módulo `jsonl.js`. Antes desta unificação, cada arquivo tinha um
comportamento próprio diante de corrupção, e o comportamento perigoso era o do arquivo de
evidências: uma única linha inválida derrubava `GET /evidencias`, `GET /nota` e
`GET /relatorio/:id` com 500. A auditoria Red Team do fix-04 encontrou isso.

Comportamento único, aplicado aos dois:

| Situação da linha | O que acontece |
| --- | --- |
| vazia | ignorada, sem aviso |
| JSON válido | entra no resultado, na ordem do arquivo |
| JSON inválido | **ignorada, com aviso, e a leitura continua** |

A leitura **nunca lança** por conteúdo corrompido, e nenhuma rota devolve 500 por causa de
uma linha ruim. Arquivo inexistente é tratado como arquivo vazio. Arquivo inteiro corrompido
devolve lista vazia, não erro.

O aviso sai por `console.warn` no formato:

```
[jsonl] 1 linha(s) ignorada(s) em <arquivo> por JSON invalido: 2
```

**O aviso registra o número da linha, nunca o conteúdo.** Uma linha corrompida costuma
conter lixo ou um registro pela metade, e não é lugar para vazar em log. Quando há mais de
20 linhas ruins, só as primeiras 20 são listadas.

A gravação é sempre por acréscimo (`escreverJsonl`), e **não existe caminho no código para
remover ou corriger um registro**. Uma linha corrompida é ignorada na leitura, mas continua
gravada no arquivo.

### O que isso não resolve

Linha corrompida não é o mesmo que registro perdido. A resiliência aqui é de **leitura**: o
sistema continua utilizável com o histórico pela metade, e o aviso diz quantas linhas
sumiram. **Não existe** detecção de perda, reparo nem cópia de segurança — e os arquivos
`.jsonl` seguem ignorados pelo Git, ou seja, sem backup.

## Pendências do contrato

- **`relevancia` é coletada e não usada.** É o único campo do contrato que não alimenta
  nada. Decisão consciente do PO, e ainda assim uma pergunta em aberto: ou o campo sai do
  contrato, ou algum critério passa a usá-lo.
- **`url` é gravada e não exibida.** O relatório mostra tipo, fonte e trecho, e não mostra o
  link. Para uma pessoa que vai conferir a evidência, o link é o campo mais útil.
- **`ideia_relacionada` é texto livre e não é validado contra a Validação.** Uma evidência
  vinculada a um `id_validacao` pode trazer um texto de ideia completamente diferente, e o
  sistema aceita.
