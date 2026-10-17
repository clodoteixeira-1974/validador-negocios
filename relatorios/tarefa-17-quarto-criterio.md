# Tarefa 17 — Quarto critério da régua ("alguém paga?")

## Data

16/10/2026

## Objetivo

Implementar o quarto critério da régua, "alguém paga?", e criar o tipo de evidência que ele
necessita. É a **primeira vez que um critério exige mudar o modelo de dado**: os três
primeiros contavam tipos de evidência que já existiam, e este precisou de um quarto tipo,
`monetizacao`, que não existia.

Regra definida pelo PO: **1 ou mais evidências de monetização = 1 ponto**.

## Um erro meu, e a correção

Durante a atualização do `README.md`, usei o cmdlet `Get-Content` combinado com
`-replace` para trocar números em massa. No padrão de substituição, o caractere `|` é o
operador de alternância de regex. O padrão era:

```
'| `evidencias.test.js`                | 7 testes'
```

Como os `|` não estavam escapados, o PowerShell leu cada um como separador de alternativas,
e o resultado foi um arquivo de **542.165 bytes**, contra 10.356 caracteres no `HEAD`. O
README ficou com milhares de cópias de uma mesma linha de tabela.

**Como foi detectado e corrigido.** A saída do comando `Select-String` seguinte mostrou a
corrupção de forma óbvia, na forma de uma única linha gigante e repetida. Conferi os
tamanhos — 542 KB contra 10 KB — e concluí que não era recuperável por edição, e sim por
restauração. Executei `git checkout -- README.md`, que devolveu o arquivo ao estado do
`HEAD` (commit `018162d`), e refiz **todas** as edições do README com a ferramenta de
edição, que faz substituição literal e não interpreta regex.

Verificações depois da correção:

```
tamanho: 10552
L160: | `evidencias.test.js`                | 7 testes do módulo de evidências, também com arquivos temporários.
```

O arquivo voltou a ser o documento íntegro do `HEAD`, com a tabela de estrutura inteira, e as
edições foram reaplicadas uma a uma. O tamanho final ficou em 11.311 bytes, o que é
coerente com o documento acrescido das quatro linhas do novo critério, do exemplo de
monetização e dos números atualizados.

**Nenhum commit foi feito com o arquivo corrompido.** O `git status` foi conferido logo após
a restauração, e só então as edições foram refeitas.

**A lição fica registrada**: substituição em massa de texto com `|` exige escaping, e em
arquivo de documentação o risco de corrupção silenciosa é alto demais. A alternativa usada
foi a ferramenta de edição literal, mais lenta mas previsível. Não há script no projeto que
faça esse tipo de substituição em lote, e isso não mudou.

## O que foi feito

### 1. `evidencias.js`: novo tipo de evidência

Uma linha alterada:

```javascript
const TIPOS = ['concorrente', 'reclamacao', 'dado_mercado', 'monetizacao'];
```

Nada mais foi tocado no módulo. Como a validação de tipo já consultava essa constante, o
novo tipo passou a ser aceito automaticamente por `registrarEvidencia`, por
`validarEvidencia` e pelas rotas HTTP. `TIPOS` já era exportado, então nenhuma alteração de
interface foi necessária.

### 2. `nota.js`: quarto critério

**Constantes:**

```javascript
const MINIMO_MONETIZACOES = 1;
const PONTOS_ALGUEM_PAGA = 1;
```

**Detalhe, com os três casos:**

```javascript
function detalharAlguemPaga(total) {
  if (total === 0) {
    return 'Nenhuma evidencia de monetizacao registrada.';
  }

  if (total === 1) {
    return '1 evidencia de monetizacao registrada.';
  }

  return `${total} evidencias de monetizacao registradas.`;
}
```

**Avaliador, reaproveitando a função genérica** — este critério é uma contagem com mínimo e
sem máximo, então `avaliarContagem` cobre o caso:

```javascript
function avaliarAlguemPaga(evidencias) {
  return avaliarContagem(
    evidencias,
    'monetizacao',
    MINIMO_MONETIZACOES,
    PONTOS_ALGUEM_PAGA,
    detalharAlguemPaga
  );
}
```

**Declaração na lista e no export:**

```javascript
const CRITERIOS = [
  { nome: 'tem_gente', avaliar: avaliarTemGente },
  { nome: 'tem_gente_insatisfeita', avaliar: avaliarTemGenteInsatisfeita },
  { nome: 'cabe_mais_um', avaliar: avaliarCabeMaisUm },
  { nome: 'alguem_paga', avaliar: avaliarAlguemPaga }
];
```

```javascript
  MINIMO_MONETIZACOES,
  PONTOS_ALGUEM_PAGA
```

### 3. `evidencias.test.js`: dois testes novos

O arquivo passou de 7 para 9 testes. O `require` ganhou `validarEvidencia` e `TIPOS`, que
não eram importados antes.

- `tipo "monetizacao" é aceito, gravado e listado` — confere que o tipo está em `TIPOS`, que
  a gravação não foi recusada, que a linha está no arquivo, que volta na listagem e que a
  evidência continua válida para `validarEvidencia`.
- `o tipo "monetizacao" convive com os outros tres na mesma gravacao` — grava um de cada tipo
  e confere a ordem na listagem. Este teste protege contra um erro de substituição: se
  alguém trocar `TIPOS` por um array com um único elemento, os outros testes ainda passam.

### 4. `nota.test.js`: 13 para 17 testes

- `maximo_possivel` foi de 3 para 4 em todos os pontos onde aparecia.
- O teste da forma da resposta passou a afirmar as quatro chaves de critério e as quatro
  verificações de chaves internas.
- Três testes novos de `alguem_paga`: 0, 1 e 3 evidências de monetização.
- Um quarto teste novo, que **não** foi pedido: `alguem_paga: so o tipo monetizacao pontua
  neste criterio`. Ele confere que um concorrente cujo texto fala de preço continua sendo
  concorrente, e não monetização. Sem ele, bastaria alguém procurar por "R$" no
  `trecho_bruto` para que o critério passasse a valer, o que seria um erro de leitura da
  regra.
- O teste de soma ganhou os dois casos pedidos e mais dois.

Casos do teste de soma, com o total final:

| Caso                                                        | Total |
| ------------------------------------------------------------ | ----- |
| 2 concorrentes + 1 reclamação + 1 monetização                | 4     |
| 5 concorrentes + 1 reclamação + 0 monetização                | 2     |
| 5 concorrentes + 4 reclamações (+ dado_mercado)              | 2     |
| 4 concorrentes + 1 reclamação                                | 3     |
| 2 concorrentes + 1 reclamação                                | 3     |
| 2 concorrentes + 0 reclamações                               | 2     |
| 3 concorrentes + 0 reclamações                               | 2     |
| 0 concorrentes + 1 reclamação                                | 1     |
| 0 concorrentes + 0 reclamações                                | 0     |

O primeiro caso é o único em que **os quatro critérios pontuam ao mesmo tempo**, e é a prova
de que a régua fecha em 4 de 4.

### 5. `server.test.js`: de 26 para 28 testes

O teste do arquivo vazio passou a afirmar a resposta com quatro critérios. Os demais foram
de `maximo_possivel` 3 para 4. O nome de um teste ficou desatualizado —
"total 3 e maximo_possivel 3" — e foi renomeado para "total 3 de maximo_possivel 4".

Teste novo, que percorre a cadeia inteira:

```javascript
test('POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({
      tipo: 'monetizacao',
      fonte: 'Pagina de precos de concorrente',
      url: 'https://exemplo.com/precos',
      trecho_bruto: 'Planos a partir de R$ 19,90 por mes.',
      ideia_relacionada: 'App para controlar gastos',
      relevancia: 'alta'
    }));

    // O tipo novo é aceito pela API, que antes responderia 400.
    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'monetizacao');
    assert.equal(r.corpo.fonte, 'Pagina de precos de concorrente');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    // A evidência foi realmente gravada.
    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'monetizacao');

    // E aparece na listagem.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 1);
    assert.equal(evidencias.corpo.evidencias[0].tipo, 'monetizacao');

    // E faz o quarto critério pontuar.
    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.criterios.alguem_paga.pontos, 1);
    assert.equal(nota.corpo.criterios.alguem_paga.detalhe, '1 evidencia de monetizacao registrada.');
    assert.equal(nota.corpo.total, 1);
    assert.equal(nota.corpo.maximo_possivel, 4);
  });
});
```

Este teste é o que prova que a mudança de modelo chegou até a nota. Antes desta tarefa, o
mesmo `POST` devolveria **400**, porque `monetizacao` não estava em `TIPOS`.

### 6. Documentação atualizada no mesmo commit

- `README.md`: quatro critérios descritos, exemplo de resposta com quatro critérios e
  `maximo_possivel` 4, exemplo de `POST /evidencias` com `monetizacao`, contagem de 47 para
  54 testes, `server.test.js` 27 para 28, `nota.test.js` 13 para 17, `evidencias.test.js` 7
  para 9, descrição de `evidencias.js` com o novo tipo, "Estado do projeto" e "Próximos
  passos".
- `ESTADO.md`: contagem de testes, "O que existe hoje" com o quarto critério e os quatro
  tipos, "1 dos 5 critérios ainda não implementado", "Próximo passo" para a Tarefa 18, e a
  nova pendência registrada na seção "Pendências conhecidas".

### 7. `package.json`

Nenhuma alteração necessária.

## A pendência que esta tarefa registrou

Pela regra do fix-01, a pendência relatada foi para o `ESTADO.md` na mesma tarefa.

A pendência é a **nota geral sem vínculo com uma ideia**. Os quatro critérios contam
evidências de todas as ideias misturadas no mesmo arquivo, porque `ideia_relacionada` é
texto livre e `POST /validar-ideia` não gera identificador. Com quatro de cinco critérios em
função, isso deixou de ser detalhe e passou a ser o principal limite de design: a nota não
consegue dizer de quem é.

Ela foi acrescentada à seção "Pendências conhecidas" do `ESTADO.md`, junto das três
pendências de ambiente e infraestrutura que já estavam lá. Importante registrar que é uma
**decisão já tomada** (o PO escolheu nota geral na Tarefa 13), não um defeito. O que está
registrado é o limite da decisão e o caminho para revertê-la.

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (22.4502ms)
✔ evidência sem "fonte": lança erro e não grava (2.6442ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.4389ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (3.3585ms)
✔ listar evidências de arquivo vazio: devolve [] (4.6796ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (15.1014ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.5818ms)
✔ tipo "monetizacao" é aceito, gravado e listado (6.1971ms)
✔ o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.8948ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (6.6306ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (1.8973ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (3.3987ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.7786ms)
✔ reclamacao e dado_mercado não contam como concorrente (1.7121ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.4861ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.4898ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.4762ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.3748ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.4488ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (2.3564ms)
✔ alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.6286ms)
✔ alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4446ms)
✔ alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (1.3451ms)
✔ alguem_paga: so o tipo monetizacao pontua neste criterio (0.3771ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.3118ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (3.9644ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (172.9989ms)
✔ ideia nao mobile: 200 com tipo "outro" (58.2935ms)
✔ campo ausente: 400 e nada gravado (15.5735ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (38.2805ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (24.4689ms)
✔ body que nao e objeto JSON: 400 e nada gravado (24.9665ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (18.0282ms)
✔ corpo acima de 100kb: 413 e nada gravado (26.6075ms)
✔ GET /saude: 200 com ok e servico (20.8208ms)
✔ rota desconhecida: 404 em JSON (14.0836ms)
✔ GET /validar-ideia: 405 com header Allow: POST (18.6636ms)
✔ POST /saude: 405 com header Allow: GET (16.7776ms)
✔ nenhum teste grava no validacoes.jsonl de producao (17.5772ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (21.9008ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (18.8696ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (12.4779ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (11.6907ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (36.4592ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (24.1749ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (12.5554ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (29.0127ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (34.6931ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 4 (35.7928ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (40.1394ms)
✔ POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério (34.8218ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (29.7219ms)
✔ POST /nota: 405 com header Allow: GET (13.4367ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (15.2077ms)
ℹ tests 54
ℹ suites 0
ℹ pass 54
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1558.5183
```

Rodada de confirmação, com a documentação já atualizada:

```
ℹ tests 54
ℹ pass 54
ℹ fail 0
ℹ duration_ms 1454.3986
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 27    | 28    | 28     |
| `evidencias.test.js` | 7     | 9     | 9      |
| `nota.test.js`       | 13    | 17    | 17     |
| **Total**            | 47    | 54    | **54** |

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu. Vale notar que o arquivo de produção de evidências **não tem
nenhuma evidência de monetização**, e mesmo assim o quarto critério passou a existir. Isso
não é problema: os testes usam arquivos temporários, e a nota de produção é calculada a
partir das 3 evidências fictícias já existentes.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
018162d Tarefa 16: terceiro criterio da regua (cabe mais um?)
8c57b1f fix-01: 405 em /nota e teste de 405 em /evidencias
6482058 Tarefa 15: segundo criterio da regua (tem gente insatisfeita?)
```

## Arquivos alterados

```
ESTADO.md
README.md
evidencias.js
evidencias.test.js
nota.js
nota.test.js
server.test.js
relatorios/tarefa-17-quarto-criterio.md
```

## O que não funcionou ou ficou pendente

1. **O README.md foi corrompido e restaurado.** Detalhado na primeira seção deste relatório.
   Não houve commit com o arquivo quebrado, e todas as edições foram refeitas.

2. **A pendência da nota geral foi registrada no `ESTADO.md`**, cumprindo a regra do fix-01.

3. **O quinto critério continua sem definição.** "Você alcança essas pessoas?" é o mais
   difícil de tornar determinístico entre os cinco, e a regra não está especificada.

4. **Nenhuma outra pendência de código foi gerada.** As de 405 continuam resolvidas desde o
   fix-01.

5. **Pendências de ambiente e infraestrutura**, mantidas em "Pendências conhecidas":
   comando `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`.

## Observações técnicas para a próxima tarefa

1. **O quinto critério provavelmente vai precisar de um dado novo, e isso já aconteceu
   uma vez.** O quarto critério exigiu criar o tipo `monetizacao`. "Você alcança essas
   pessoas?" depende de saber quem é o público-alvo e por onde ele chega — nada disso existe
   no modelo de evidência atual. Vale decidir, antes de codar, entre: criar um quinto tipo de
   evidência, reaproveitar `dado_mercado`, ou começar a aceitar um campo novo no corpo de
   `POST /evidencias`. Cada caminho tem custo diferente de teste e de documentação.

2. **Criar um tipo novo é barato, e é o precedente a seguir.** Uma linha em `TIPOS`, mais os
   testes. O teste "convive com os outros" é o que garante que os tipos anteriores continuam
   funcionando depois da adição.

3. **A forma da resposta vai quebrar uma última vez.** As asserções de
   `Object.keys(nota.criterios)` e de `maximo_possivel` vão falhar. É o comportamento
   esperado e é o mecanismo que protege o contrato.

4. **Depois do quinto critério, a régua fecha em 5.** Vale planejar o que vem depois: um
   veredito derivado da nota ("PARAR", "MUDAR O RECORTE", "SEGUIR") é o passo natural do
   fluxograma, e `maximo_possivel` deixa de mudar, o que torna a escala estável.

5. **A nota continua geral e o custo de retrofitar cresce.** Quatro de cinco critérios já
   contam evidências de todas as ideias juntas. A pendência está registrada; o momento
   barato para resolvê-la está passando.

6. **Números da documentação a atualizar na próxima tarefa:** total geral no README (54), e
   as linhas de `server.test.js` (28), `evidencias.test.js` (9) e `nota.test.js` (17) na
   tabela de estrutura. No `ESTADO.md`, a linha de 54 e o detalhamento por arquivo.

7. **Sobre a corrupção do README.** Vale uma regra simples para o resto do projeto: em
   arquivo de documentação, usar substituição literal e nunca regex com `|` sem escaping.
   Se no futuro surgir um necessidade real de substituição em massa, o certo é um script
   com teste, não um comando de shell.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-17-quarto-criterio.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-17-quarto-criterio.md").Length
19488
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-17-quarto-criterio.md`,
com 19.488 bytes.