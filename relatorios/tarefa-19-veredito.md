# Tarefa 19 — Veredito a partir da nota

## Data

16/10/2026

## Objetivo

Implementar a etapa que faltava no fluxograma: transformar a nota em uma decisão. Com a
régua completa em cinco critérios, o serviço já calculava um número de 0 a 5, mas não dizia
o que fazer com ele.

Decisões do PO, aplicadas integralmente:

- Faixas conservadoras: 0-1 `PARAR`, 2-3 `MUDAR_O_RECORTE`, 4-5 `SEGUIR`.
- O veredito aparece como **campo novo dentro de `GET /nota`**, e não em rota separada.

## O que foi feito

### 1. `nota.js`: `derivarVeredito`

```javascript
function derivarVeredito(total, maximoPossivel) {
  const maximo = Number.isFinite(maximoPossivel) && maximoPossivel > 0 ? maximoPossivel : 5;

  const limiteParar = Math.round(maximo / 5);
  const limiteSeguir = Math.round((3 * maximo) / 5);

  if (total <= limiteParar) {
    return {
      decisao: 'PARAR',
      faixa: `0 a ${limiteParar}`,
      explicacao: 'Sem informacao suficiente. Nao vale seguir.'
    };
  }

  if (total > limiteSeguir) {
    return {
      decisao: 'SEGUIR',
      faixa: `${limiteSeguir + 1} a ${maximo}`,
      explicacao: 'Vale gastar as proximas 24h testando com gente de verdade.'
    };
  }

  return {
    decisao: 'MUDAR_O_RECORTE',
    faixa: `${limiteParar + 1} a ${limiteSeguir}`,
    explicacao: 'Existe sinal, mas o publico ou a oferta precisa ser ajustada.'
  };
}
```

### 2. `calcularNota` passou a incluir o veredito

```javascript
  return {
    criterios,
    total,
    maximo_possivel: maximoPossivel,
    veredito: derivarVeredito(total, maximoPossivel)
  };
```

E `derivarVeredito` foi adicionado aos exports, para poder ser testada sozinha.

### Uma decisão de implementação que vale registrar

A especificação pedia a assinatura `derivarVeredito(total, maximoPossivel)`, mas as regras
descritas usam apenas o `total`, com as faixas fixas em "0 a 1", "2 a 3" e "4 a 5". Ou
sea: o parâmetro `maximoPossivel` seria recebido e ignorado.

Em vez de receber e ignorar, eu **calculei as faixas a partir dele**: `limiteParar` é 20% da
escala e `limiteSeguir` é 60%. Com `maximoPossivel` igual a 5 — o valor atual — o resultado é
exatamente o especificado, e a verificação real confirma:

```
0 -> PARAR | faixa: 0 a 1 | Sem informacao suficiente. Nao vale seguir.
1 -> PARAR | faixa: 0 a 1 | Sem informacao suficiente. Nao vale seguir.
2 -> MUDAR_O_RECORTE | faixa: 2 a 3 | Existe sinal, mas o publico ou a oferta precisa ser ajustada.
3 -> MUDAR_O_RECORTE | faixa: 2 a 3 | Existe sinal, mas o publico ou a oferta precisa ser ajustada.
4 -> SEGUIR | faixa: 4 a 5 | Vale gastar as proximas 24h testando com gente de verdade.
5 -> SEGUIR | faixa: 4 a 5 | Vale gastar as proximas 24h testando com gente de verdade.
```

Os textos são literais da especificação, sem alteração. O ganho é que os textos das faixas
passam a ser derivados, e não duplicados: se um dia houver seis critérios, `limiteSeguir`
vira 4 e a faixa `SEGUIR` passa a dizer "5 a 6" sozinha.

### 3. `nota.test.js`: de 21 para 23 testes

O teste da forma da resposta foi atualizado para as quatro chaves do topo
(`criterios`, `total`, `maximo_possivel`, `veredito`) e ganhou as asserções das três chaves
internas do veredito, além da checagem de que a explicação nunca vem vazia.

Dois testes novos:

- `derivarVeredito: cada total da escala cai na faixa correta` — cobre os seis totais
  possíveis (0 a 5), verificando decisão, faixa e explicação exatas, e confirmando que as
  chaves são sempre `['decisao', 'faixa', 'explicacao']`.
- `o veredito acompanha o total em cenarios reais de evidencias` — três cenários montados
  com evidências de verdade: nenhuma evidência (0, PARAR), régua completa (5, SEGUIR) e
  3 concorrentes mais 1 reclamação (3, MUDAR_O_RECORTE).

O teste da soma **não precisou ser alterado**, porque nenhuma mudança em `criterios` afetou
`total` nem `maximo_possivel`.

### 4. `server.test.js`: de 30 para 32 testes

O teste do arquivo vazio usava `assert.deepEqual` sobre a resposta inteira, então recebeu o
bloco `veredito` completo com `PARAR`.

Dois testes novos:

- `GET /nota com nota 3: veredito manda mudar o recorte` — monta o cenário real (3
  concorrentes + 1 reclamação), confirma `total` 3, `maximo_possivel` 5 e o veredito
  `MUDAR_O_RECORTE` com a faixa e a explicação exatas.
- `GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR` — cenário do
  limite da faixa, com um único sinal. Não foi pedido; existe porque é a fronteira onde a
  decisão muda de faixa, e é justamente aí que erro de comparação (`<=` contra `<`) costuma
  aparecer.

O teste da régua completa, que já existia da Tarefa 18, ganhou as asserções do veredito
`SEGUIR`.

### 5. Documentação atualizada no mesmo commit

- `README.md`: nova seção "Os três vereditos" com tabela das faixas, exemplo de resposta
  com o campo `veredito`, contagem de 62 para 66 testes, `server.test.js` de 30 para 32,
  `nota.test.js` de 21 para 23, descrição de `nota.js` atualizada, "Estado do projeto" com o
  veredito, e "Próximos passos" com o PDF como primeiro item.
- `ESTADO.md`: contagem de testes, "O que existe hoje" com o veredito e as faixas,
  remoção de "Derivação do veredito a partir da nota" da lista do que falta, "Próximo passo"
  para a Tarefa 20, e descrição do produto atualizada.

### 6. `package.json`

Nenhuma alteração necessária.

## A pendência registrada nesta tarefa

Nenhuma pendência nova. A pendência da nota geral continua registrada na seção "Pendências
conhecidas" do `ESTADO.md`, sem alteração de texto.

Vale registrar que **esta tarefa não reduziu essa pendência, mas escureceu ela**. Antes, o
que faltava era um número. Agora existe um número e uma decisão derivada dele. Um relatório
que diz "essa ideia deve ser PARAR" está errado por construção, porque a decisão não é de
uma ideia: é de todas as evidências guardadas juntas. Com o veredito entregue, essa decisão
errada fica mais visível e mais fácil de tomar por alguém que use a API.

## Saída real do `npm test`

Comando: `npm test`, depois de todas as alterações de código

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (15.0723ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (2.4323ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.4763ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (1.3752ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (3.6374ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (8.1462ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (5.1271ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (7.4127ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (6.5244ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (6.353ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.1903ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (9.5966ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7406ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7275ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6693ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.7279ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.5235ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.4672ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.4776ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.139ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.2684ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4878ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4928ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.8416ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5298ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.5855ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.4019ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.3877ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (2.5956ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.475ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (6.5091ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.6512ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.9114ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (7.2229ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (175.4834ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (44.1627ms)
Ô£ö campo ausente: 400 e nada gravado (19.7655ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (24.8483ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (17.8055ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (16.5668ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (15.7105ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (32.743ms)
Ô£ö GET /saude: 200 com ok e servico (23.8411ms)
Ô£ö rota desconhecida: 404 em JSON (15.3044ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (10.7622ms)
Ô£ö POST /saude: 405 com header Allow: GET (11.7836ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (12.7554ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (15.76ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (11.3879ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (15.4636ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (10.8854ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (28.1581ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (20.7449ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (10.0351ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (23.2797ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (22.8462ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (33.2577ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (36.3848ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (30.4136ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (33.9214ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (31.0361ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (29.4776ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (16.1883ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (23.2035ms)
Ô£ö POST /nota: 405 com header Allow: GET (14.4031ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (14.6523ms)
Ôä╣ tests 66
Ôä╣ suites 0
Ôä╣ pass 66
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 1591.7291
```

Rodada final, com a documentação já atualizada:

```
ℹ tests 66
ℹ pass 66
ℹ fail 0
ℹ duration_ms 1468.9171
```

**Sobre esta saída:** é a execução final, colada com os tempos reais de cada teste. A
execução imediatamente anterior, feita logo após as alterações de código, também passou com
66 testes, e pode ser conferida no histórico do console da tarefa. As contagens `tests 66`,
`pass 66` e `fail 0` são reais nas duas execuções.

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 30    | 32    | 32     |
| `evidencias.test.js` | 11    | 11    | 11     |
| `nota.test.js`       | 21    | 23    | 23     |
| **Total**            | 62    | 66    | **66** |

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu.

Com as 3 evidências fictícias que já estavam no arquivo de produção, a nota é 1 de 5 e o
veredito é `PARAR`. Isso é o comportamento correto: o arquivo tem uma reclamação e nenhum
concorrente, nenhuma monetização e nenhum alcance.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
1989fc1 Tarefa 18: quinto criterio da regua (alcance)
50ada7d Tarefa 17: quarto criterio da regua (alguem paga?)
018162d Tarefa 16: terceiro criterio da regua (cabe mais um?)
```

## Arquivos alterados

```
ESTADO.md
README.md
nota.js
nota.test.js
server.test.js
relatorios/tarefa-19-veredito.md
```

## O que não funcionou ou ficou pendente

Nada falhou nesta tarefa. Nenhum erro de edição deste vez: todas as alterações foram feitas
com a ferramenta de edição literal, e cada arquivo teve o tamanho e a contagem de caracteres
conferidos depois.

Ficaram pendentes:

1. **A nota continua geral, sem vínculo com uma ideia.** Pendência mantida no `ESTADO.md`.
   Com o veredito entregue, ela passa a ter consequência visível, como descrito acima.

2. **O relatório em PDF não existe**, e é o próximo passo.

3. **As faixas são fixas em proporção, não em número absoluto.** Hoje 20% e 60% de 5 dão 1 e
   3, que coincidem com a decisão do PO. Se a régua crescer, as faixas acompanham
   automaticamente. Se um dia o PO quiser faixas absolutas em vez de proporcionais, é uma
   linha em `derivarVeredito`.

4. **Pendências de ambiente e infraestrutura**, mantidas em "Pendências conhecidas": comando
   `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`, e a nota geral.

## Observações técnicas para a próxima tarefa

1. **O relatório em PDF vai exigir uma dependência, e isso contraria uma decisão
   registrada.** O projeto tem hoje uma única dependência, `express`, e o `ESTADO.md`
   registra a escolha de manter as coisas enxutas e sem dependências desnecessárias.
   Gerar PDF em Node.js sem biblioteca praticamente não é viável. Essa contradição precisa
   ser resolvida conscientemente pelo PO, e vale notar que o fluxograma do projeto já
   prevê "relatório em PDF" como etapa.

2. **Vale considerar gerar HTML em vez de PDF.** Se o objetivo é legibilidade e não
   arquivamento, HTML imprimível ou Markdown resolve sem dependência nenhuma, e o usuário
   pode gerar o PDF pelo navegador. É uma troca de escopo que vale pôr na mesa antes de
   escolher biblioteca.

3. **`derivarVeredito` é uma função pura e já está testada isoladamente.** Ela pode ser
   reutilizada em outro contexto — um relatório em PDF, um e-mail — sem passar pela nota
   inteira. É o mesmo padrão do módulo.

4. **A pendência da nota geral deve ser resolvida antes do PDF.** Um PDF que diz "PARAR" sem
   dizer de qual ideia está falando tem o defeito mais visível no formato de entrega, que é
   justamente o formato feito para ser lido por uma pessoa. Esta é uma recomendação de
   ordem, não uma imposição.

5. **Números da documentação para a próxima tarefa:** total geral no README (66), e as linhas
   de `server.test.js` (32), `evidencias.test.js` (11) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 66 e o detalhamento por arquivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-19-veredito.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-19-veredito.md").Length
16467
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-19-veredito.md`,
com 16.467 bytes.
