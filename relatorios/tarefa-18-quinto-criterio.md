# Tarefa 18 — Quinto e último critério da régua ("você alcança essas pessoas?")

## Data

16/10/2026

## Objetivo

Implementar o quinto e último critério da régua, "você alcança essas pessoas?", e criar o
tipo de evidência que ele precisa. Com esta tarefa, **a régua de viabilidade fecha em cinco
critérios**, e a escala de 0 a 5 fica definitiva.

Regra definida pelo PO: **1 ou mais evidências de alcance = 1 ponto**.

## O que foi feito

### 1. `evidencias.js`: quinto tipo de evidência

Uma linha alterada:

```javascript
const TIPOS = ['concorrente', 'reclamacao', 'dado_mercado', 'monetizacao', 'alcance'];
```

Como nos dois tipos anteriores, nenhuma outra parte do módulo precisou mudar: a validação já
consultava `TIPOS`, que já era exportado. O tipo novo passou a ser aceito por
`registrarEvidencia`, por `validarEvidencia` e pelas rotas HTTP.

### 2. `nota.js`: quinto critério

**Constantes:**

```javascript
const MINIMO_ALCANCE = 1;
const PONTOS_ALCANCE = 1;
```

**Detalhe, com os três casos:**

```javascript
function detalharAlcance(total) {
  if (total === 0) {
    return 'Nenhuma evidencia de alcance registrada.';
  }

  if (total === 1) {
    return '1 evidencia de alcance registrada.';
  }

  return `${total} evidencias de alcance registradas.`;
}
```

**Avaliador, reaproveitando `avaliarContagem`** — é contagem com mínimo e sem máximo, como
o quarto critério:

```javascript
function avaliarAlcance(evidencias) {
  return avaliarContagem(
    evidencias,
    'alcance',
    MINIMO_ALCANCE,
    PONTOS_ALCANCE,
    detalharAlcance
  );
}
```

**Lista de critérios e export:**

```javascript
const CRITERIOS = [
  { nome: 'tem_gente', avaliar: avaliarTemGente },
  { nome: 'tem_gente_insatisfeita', avaliar: avaliarTemGenteInsatisfeita },
  { nome: 'cabe_mais_um', avaliar: avaliarCabeMaisUm },
  { nome: 'alguem_paga', avaliar: avaliarAlguemPaga },
  { nome: 'alcance', avaliar: avaliarAlcance }
];
```

```javascript
  MINIMO_ALCANCE,
  PONTOS_ALCANCE
```

### 3. `evidencias.test.js`: de 9 para 11 testes

- `tipo "alcance" é aceito, gravado e listado` — confere que o tipo está em `TIPOS`, que a
  gravação não foi recusada, que a linha foi gravada, que volta na listagem e que continua
  válida para `validarEvidencia`.
- `os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados` — grava um
  registro de cada tipo e confere a ordem. Além disso, confere que `TIPOS` tem exatamente 5
  elementos e que o conjunto de tipos gravados é igual ao conjunto declarado. Isso fecha a
  régua dos tipos: se alguém acrescentar um sexto tipo ao módulo sem atualizar este teste, a
  suíte avisa.

O teste anterior, `o tipo "monetizacao" convive com os outros tres`, foi mantido como está.
Cobrir 4 e 5 tipos em testes separados é proposital: se o de 5 tipos quebrar por causa do
`alcance`, o de 4 continua dizendo que os três primeiros seguem intactos.

### 4. `nota.test.js`: de 17 para 21 testes

- `maximo_possivel` foi de 4 para 5 em 11 pontos do arquivo.
- O teste da forma da resposta passou a afirmar as cinco chaves de critério e as cinco
  verificações de chaves internas.
- Três testes novos de `alcance`: 0, 1 e 3 evidências.
- Um quarto teste novo, não pedido: `alcance: so o tipo alcance pontua neste criterio`. Ele
  confirma que nenhum dos outros quatro tipos vale como prova de alcance e que uma
  reclamação cujo texto fala de público não vira alcance por causa do texto. Sem ele, o
  critério poderia ser burlado procurando "público" no `trecho_bruto`.
- O teste de soma ganhou o caso da régua completa.

Casos do teste de soma:

| Caso                                                                 | Total |
| --------------------------------------------------------------------- | ----- |
| 2 concorrentes + 1 reclamação + 1 monetização + 1 alcance            | 5     |
| 5 concorrentes + 1 reclamação + 0 monetização + 0 alcance            | 2     |
| 4 concorrentes + 1 reclamação                                        | 3     |
| 2 concorrentes + 1 reclamação + 1 monetização                        | 3     |
| 5 concorrentes + 4 reclamações (+ dado_mercado)                      | 2     |
| 3 concorrentes + 0 reclamações                                       | 2     |
| 0 concorrentes + 1 reclamação                                        | 1     |
| 0 concorrentes + 0 reclamações                                        | 0     |

O primeiro caso é a **régua fechada**: 5 de 5.

### 5. `server.test.js`: de 28 para 30 testes

O teste do arquivo vazio passou a afirmar a resposta com cinco critérios. Os demais foram de
`maximo_possivel` 4 para 5, inclusive no nome de um teste que dizia "maximo_possivel 4".

Dois testes novos:

```javascript
test('POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({
      tipo: 'alcance',
      fonte: 'Relatorio de audiencia de um canal',
      url: 'https://exemplo.com/audiencia',
      trecho_bruto: 'O publico-alvo esta concentrado em um grupo especifico, com canal conhecido.',
      ideia_relacionada: 'App para controlar gastos',
      relevancia: 'alta'
    }));

    // O tipo novo é aceito pela API, que antes responderia 400.
    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'alcance');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'alcance');

    // Aparece na listagem.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 1);

    // E faz o quinto critério pontuar.
    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.criterios.alcance.pontos, 1);
    assert.equal(nota.corpo.criterios.alcance.detalhe, '1 evidencia de alcance registrada.');
    assert.equal(nota.corpo.total, 1);
    assert.equal(nota.corpo.maximo_possivel, 5);
  });
});

test('GET /nota com um registro de cada tipo: a regua completa vale 5 de 5', async () => {
  await comServidor(async ({ base }) => {
    // 2 concorrentes: satisfazem "tem gente?" e "cabe mais um?".
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));

    // Um registro de cada um dos outros três tipos.
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'monetizacao', fonte: 'Pagina de precos' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'alcance', fonte: 'Relatorio de audiencia' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 5);
    assert.equal(r.corpo.maximo_possivel, 5);

    // Todos os cinco critérios pontuam.
    for (const [nome, criterio] of Object.entries(r.corpo.criterios)) {
      assert.equal(criterio.pontos, 1, nome);
      assert.equal(criterio.maximo, 1, nome);
    }

    assert.equal(Object.keys(r.corpo.criterios).length, 5);
  });
});
```

O segundo teste não foi pedido, e é o mais importante desta tarefa: ele prova, ponta a
ponta pela API, que a régua inteira é atingível. Ele percorre `POST /evidencias` cinco vezes
com tipos diferentes e depois lê `GET /nota`. Não é uma soma aritmética: é o caminho real
que um usuário fará.

### 6. Documentação atualizada no mesmo commit

- `README.md`: cinco critérios descritos, exemplo de resposta com cinco critérios e
  `maximo_possivel` 5, exemplo de `POST /evidencias` com `alcance`, contagem de 54 para 62
  testes, `server.test.js` 28 para 30, `evidencias.test.js` 9 para 11, `nota.test.js` 17
  para 21, descrição de `evidencias.js` com os cinco tipos, "Estado do projeto" de fase
  intermediária para avançada, e "Próximos passos" com o item do veredito.
- `ESTADO.md`: contagem de testes, "O que existe hoje" com a régua inteira e os cinco tipos,
  remoção de "1 dos 5 critérios ainda não implementado" e inclusão de
  "Derivação do veredito a partir da nota" na lista do que falta, "Próximo passo" para a
  Tarefa 19, e a pendência da nota geral atualizada de quatro para cinco critérios.

### 7. `package.json`

Nenhuma alteração necessária.

## Um erro meu, e a correção

Ao inserir os dois testes novos em `server.test.js`, usei a ferramenta de edição com um
`oldString` que era apenas a linha de abertura de outro teste:

```
test('POST /nota: 405 com header Allow: GET', async () => {
```

substituindo por:

```
test('nenhum teste de /nota grava no evidencias.jsonl de producao', async () => {
```

O efeito foi(rename acidental): o teste de 405 de `/nota` perdeu o nome e passou a ter o
mesmo nome do teste de isolamento, criando dois blocos com o mesmo `test(...)` e o corpo do
teste de 405.

**Como foi detectado.** A conferência da lista de testes mostrou dois blocos consecutivos com
o mesmo nome nas linhas 525 e 539, e nenhum `POST /nota: 405` na lista.

**Correção.** Abri o bloco na linha 539, confirmei que o corpo era o do teste de 405 (fetch
com `method: 'POST'` para `/nota`) e restaurei o nome correto, `POST /nota: 405 com header
Allow: GET`. Depois disso, a suíte completa passou com 62 testes.

Verificação posterior, extraindo todos os nomes de teste em ordem:

```
L525: test('nenhum teste de /nota grava no evidencias.jsonl de producao', ...)
L539: test('POST /nota: 405 com header Allow: GET', ...)
L562: test('PUT /evidencias: 405 com header Allow: GET, POST', ...)
```

Sem duplicatas e com os três no lugar.

**A lição é a mesma da Tarefa 17, por outro caminho**: um `oldString` curto demais casa com o
primeiro trecho parecido do arquivo, e o resultado é silencioso. Um nome de teste é
identificador, e identificador repetido não dá erro de sintaxe — só some um teste da lista.

Também introduzi, mais cedo nesta tarefa, o trecho inválido
`archivo_placeholder := arquivo` em um argumento de `registrarEvidencia`. Foi percebido na
checagem de sintaxe seguinte (`node --check`) e corrigido antes de rodar qualquer teste.

## A pendência registrada nesta tarefa

Pela regra do fix-01, a pendência foi para o `ESTADO.md` na mesma tarefa.

A pendência é a mesma da Tarefa 17, atualizada: **a nota é geral e não tem vínculo com uma
ideia**. O texto no `ESTADO.md` foi ajustado de "os quatro critérios" para "os cinco
critérios" e de "principal limite de design do projeto hoje" para "com a régua completa virou
o principal limite de design do projeto".

O que mudou de substantivo é a gravidade: com a régua inteira funcionando, a nota é um
número completo e confiável, e o que falta é saber **de quem** ele é. Um `id` em
`POST /validar-ideia` resolveria, e é mais caro agora do que era há cinco tarefas.

Nenhuma outra pendência nova foi gerada.

## Saída real do `npm test`

Comando: `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js

✔ evidência válida: grava e devolve id e timestamp preenchidos (16.9082ms)
✔ evidência sem "fonte": lança erro e não grava (2.9782ms)
✔ evidência com "tipo" inválido: lança erro e não grava (7.3387ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.5741ms)
✔ listar evidências de arquivo vazio: devolve [] (3.3778ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (22.1311ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.3342ms)
✔ tipo "monetizacao" é aceito, gravado e listado (27.6681ms)
✔ o tipo "monetizacao" convive com os outros tres na mesma gravacao (8.657ms)
✔ tipo "alcance" é aceito, gravado e listado (6.9678ms)
✔ os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.7109ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (5.6329ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7085ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.6516ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.587ms)
✔ reclamacao e dado_mercado não contam como concorrente (0.7248ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.513ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.4261ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5601ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.0855ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.072ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4842ms)
✔ alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4367ms)
✔ alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.515ms)
✔ alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.6207ms)
✔ alguem_paga: so o tipo monetizacao pontua neste criterio (0.4272ms)
✔ alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.6035ms)
✔ alcance: 1 evidencia vale 1, que e o minimo exigido (0.456ms)
✔ alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.535ms)
✔ alcance: so o tipo alcance pontua neste criterio (0.6699ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.2403ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (3.3876ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (172.0426ms)
✔ ideia nao mobile: 200 com tipo "outro" (40.0166ms)
✔ campo ausente: 400 e nada gravado (20.919ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (26.6646ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (17.5723ms)
✔ body que nao e objeto JSON: 400 e nada gravado (18.8844ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (18.6419ms)
✔ corpo acima de 100kb: 413 e nada gravado (24.8439ms)
✔ GET /saude: 200 com ok e servico (19.9144ms)
✔ rota desconhecida: 404 em JSON (14.8242ms)
✔ GET /validar-ideia: 405 com header Allow: POST (14.2669ms)
✔ POST /saude: 405 com header Allow: GET (14.8857ms)
✔ nenhum teste grava no validacoes.jsonl de producao (15.6875ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (19.9012ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (17.2274ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (12.3364ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (11.8115ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (37.2041ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (24.6025ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (16.293ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (27.1885ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (33.4865ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (28.6295ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (45.9052ms)
✔ POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério (38.749ms)
✔ POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério (29.0582ms)
✔ GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (37.8599ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (26.0374ms)
✔ POST /nota: 405 com header Allow: GET (15.6556ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (15.3767ms)
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1625.2121
```

Rodada de confirmação, com a documentação já atualizada:

```
ℹ tests 62
ℹ pass 62
ℹ fail 0
ℹ duration_ms 1523.7776
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 28    | 30    | 30     |
| `evidencias.test.js` | 9     | 11    | 11     |
| `nota.test.js`       | 17    | 21    | 21     |
| **Total**            | 54    | 62    | **62** |

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu. Vale notar que o arquivo de produção continua com as mesmas 3
evidências fictícias da Tarefa 05, todas de antes da existência dos tipos `monetizacao` e
`alcance`. A nota de produção, portanto, dá 1 de 5: só `tem_gente_insatisfeita` pontua,
porque há uma reclamação e zero concorrentes. Isso é o comportamento correto do sistema, e
não um defeito — o arquivo de produção nunca recebeu dados reais.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
50ada7d Tarefa 17: quarto criterio da regua (alguem paga?)
018162d Tarefa 16: terceiro criterio da regua (cabe mais um?)
8c57b1f fix-01: 405 em /nota e teste de 405 em /evidencias
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
relatorios/tarefa-18-quinto-criterio.md
```

## O que não funcionou ou ficou pendente

1. **Dois erros meus durante a tarefa**, ambos corrigidos antes de rodar a suíte ou antes do
   commit: um token inválido em argumento de função, percebido por `node --check`, e um nome
   de teste duplicado, percebido pela listagem de testes. Detalhados na seção de erro acima.

2. **A régua está completa.** Não falta nenhum critério.

3. **A nota continua geral e sem vínculo com uma ideia.** Pendência registrada no
   `ESTADO.md`, conforme a regra do fix-01.

4. **A derivação do veredito não existe.** É a próxima etapa do fluxograma e virou o
   "Próximo passo".

5. **Pendências de ambiente e infraestrutura**, mantidas em "Pendências conhecidas": comando
   `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`, e a nota geral.

## Observações técnicas para a próxima tarefa

1. **A escala não muda mais.** Com `maximo_possivel` fixo em 5, a Tarefa 19 não vai precisar
   mexer na soma. Só resta decidir a tradução de nota para veredito, e decidir é decisão de
   produto, não de código.

2. **As três faixas do fluxograma precisam ser definidas.** O fluxograma prevê "PARAR AQUI",
   "MUDAR O RECORTE" e "SEGUIR". Com uma escala de 0 a 5, as faixas têm cutpoints naturais
   (por exemplo 0-1, 2-3, 4-5), mas isso é decisão do PO e o teste é o que vai fixar. Vale
   perguntar antes de implementar, e não escolher por conta própria.

3. **O veredito muda ou não o contrato de `GET /nota`.** Se entrar como campo novo no corpo
   da nota, o teste da forma da resposta de `nota.test.js` vai falhar, porque ele afirma
   exatamente `['criterios', 'total', 'maximo_possivel']`. Se vier em rota separada, nada
   quebra. A escolha do PO define o tamanho da mudança.

4. **O limite da nota geral chegou ao ponto de doer.** Os cinco critérios contam evidências de
   todas as ideias juntas. Com a régua completa, um relatório que responda "essa ideia vale 3
   de 5" está errado por construção, porque a nota não é da ideia. O `id` em
   `POST /validar-ideia` é a decisão que resolve, e ela é pequena: um campo no registro, um
   campo na resposta, e os testes de isolamento já existentes servam de base.

5. **Três testes novos foram escritos além do que foi pedido** (dois em `nota.test.js` e um em
   `server.test.js`). Os de "só este tipo pontua" existem porque, sem eles, qualquer critério
   poderia ser burlado procurando uma palavra-chave no `trecho_bruto`. Vale manter esse
   padrão nos próximos critérios, se houver.

6. **Números da documentação para a próxima tarefa:** total geral no README (62), e as linhas
   de `server.test.js` (30), `evidencias.test.js` (11) e `nota.test.js` (21) na tabela de
   estrutura. No `ESTADO.md`, a linha de 62 e o detalhamento por arquivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-18-quinto-criterio.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-18-quinto-criterio.md").Length
20850
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-18-quinto-criterio.md`,
com 20.850 bytes.