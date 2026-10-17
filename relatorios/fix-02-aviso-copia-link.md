# fix-02 — Aviso visual ao copiar o link

## Data

17/10/2026

## Objetivo

Corrigir uma falha de uso no dashboard: o botão "Copiar link do relatório" não confirmava
nada. O usuário clicava e não sabia se tinha funcionado, se o navegador tinha copiado, ou
se o link sequer estava pronto.

Agora há um aviso visual logo abaixo do botão: verde quando a cópia deu certo, vermelho
quando falhou, e some sozinho depois de 2 segundos.

Nenhuma dependência foi adicionada. O projeto segue com **uma única**, `express`.

## O que foi feito

### 1. `relatorio.js` — elemento no HTML

```html
<button id="copiar" type="button">Copiar link do relatório</button>
<div id="aviso-copia" class="aviso oculto" role="status" aria-live="polite">Link copiado!</div>
```

`role="status"` com `aria-live="polite"` faz leitores de tela anunciarem a confirmação sem
interromper quem está usando a página. É uma linha e resolve um problema real de
acessibilidade.

### 2. `relatorio.js` — CSS

A classe `.aviso` já existia, mas servia a outra coisa: era o texto de erro do formulário,
em vermelho. Este é o detalhe que exigiu cuidado.

A classe virou a **base** do balão — com fundo verde claro, texto escuro, `padding`,
`border-radius`, `margin-top` e `transition` de opacidade, como pedido — e a cor de erro foi
separada em `.aviso-erro`:

```css
.aviso {
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 10pt;
  line-height: 1.4;
  color: #245c33;
  background: #eef6f0;
  border: 1px solid #cfe3d4;
  border-radius: 4px;
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}

.aviso.oculto {
  display: none;
}

.aviso-erro {
  color: #a33a3a;
  background: #fbf0f0;
  border-color: #eed6d6;
}
```

Se eu tivesse pintado `.aviso` de verde sem separar o caso de erro, a mensagem "Escreva a
ideia antes de validar" passaria a aparecer em verde, o que é pior do que o bug original.

O estado inicial usa a classe `oculto` e não o atributo `hidden`, para o botão poder
controlar a visibilidade por JavaScript e o aviso poder reaparecer quantas vezes for
preciso. O `hidden` do outro aviso continua funcionando normalmente.

### 3. `relatorio.js` — JavaScript

```javascript
var timerCopia = null;

function mostrarAvisoCopia(texto, erro) {
  if (timerCopia !== null) {
    clearTimeout(timerCopia);
  }

  avisoCopia.textContent = texto;
  avisoCopia.classList.toggle('aviso-erro', erro === true);
  avisoCopia.classList.remove('oculto');

  timerCopia = setTimeout(function () {
    avisoCopia.classList.add('oculto');
    timerCopia = null;
  }, 2000);
}
```

O `clearTimeout` antes de mostrar é o que implementa "se já estiver visível, reiniciar o
timer": clicar duas vezes seguidas não deixa o primeiro temporizador apagar o aviso no
meio do segundo.

A função de cópia ficou assim:

```javascript
try {
  await navigator.clipboard.writeText(linkRelatorio);
  mostrarAvisoCopia('Link copiado!', false);
} catch (erro) {
  mostrarAvisoCopia('Erro ao copiar. Copie manualmente.', true);
}
```

Antes, a cópia usava `mostrarAviso`, o mesmo balão de erro do formulário, e dizia "Link
copiado." num texto vermelho. Agora tem balão próprio, com a mensagem de erro trocada por
"Erro ao copiar. Copie manualmente.", que é o que o usuário precisa ler.

### 4. `server.test.js` — asserções novas

Dentro do teste do dashboard que já existia, foram acrescentadas:

- presença de `id="aviso-copia"`;
- presença de `class="aviso oculto"`, o que trava o estado inicial escondido;
- presença do texto `Link copiado!`;
- presença do texto `Erro ao copiar`;
- presença da regra `.aviso.oculto { display: none; }`;
- presença de `2000`, o prazo do temporizador.

A suite foi de 79 para **79**: nenhuma falha de contrato novo exigiu teste novo, porque a
correção é de HTML gerado e de JavaScript embutido, e o HTML já é conferido nesse teste.

Vale registrar o limite com honestidade: **esses testes verificam que o aviso está no
HTML, e não que ele aparece na tela**. O `setTimeout`, o `clearTimeout` e o
`navigator.clipboard` só podem ser verificados em navegador de verdade, e este projeto não
usa navegador nos testes.

## Dois achados na pasta, antes da correção

Ao começar, encontrei duas coisas que não estavam no enunciado. Nenhuma das duas é código
deste fix, e nenhuma foi descartada em silêncio.

### O `validacoes.jsonl` tem 6 linhas, não 5

A contagem vinha sendo 5 desde a Tarefa 08. A sexta linha é:

```json
{"id":"1792235256127-xk5qxt","ideia":"App para controle de gastos","tipo":"mobile","timestamp":"2026-10-17T11:07:36.127Z"}
```

As cinco primeiras **não têm campo `id`**: são de antes da Tarefa 20. A sexta tem `id`, ou
seja, foi gravada por um `POST /validar-ideia` real, num servidor real, em 17/10 às 11:07.
Alguém usou o produto. A frase também está escrita de um jeito levemente diferente ("de
controle" em vez de "do controle"), o que combina com digitação por teclado em formulário.

Não apaguei nada: é dado de uso real, e os arquivos `.jsonl` são ignorados pelo Git, então
essa linha não vai para o repositório. Registro aqui porque as contagens de linha deste e
dos próximos relatórios precisam refletir 6, e porque é a primeira evidência de que o
dashboard está sendo usado de verdade.

### Um PDF de 89 KB na raiz, sem rastreio e sem ignore

```
Relatório — Validador de Novos Negócios.pdf    89690 bytes    17/10/2026 08:08:53
```

Esse arquivo **não é do projeto**: é a saída de "Salvar como PDF" do relatório, gerada pelo
próprio dashboard, às 08:08 de 17/10. Ou seja, o caminho de PDF decidido na Tarefa 20 foi
usado e funcionou.

O problema é que ele não estava no `.gitignore`, e a tarefa pedia `git add .`. Do jeito que
estava, um relatório com dados da máquina ia parar no repositório público.

Adicionei ao `.gitignore`:

```
# Relatorios exportados do dashboard ("Salvar como PDF"). Sao saida local, com
# dados desta maquina, e nao devem ir para o repositorio.
*Validador de Novos*.pdf
```

Verificado: o arquivo saiu do `git status`, e os **3 PDFs de referência do projeto continuam
versionados**, porque `.gitignore` só afeta arquivo não rastreado.

O padrão é `*Validador de Novos*.pdf` e não o nome exato, de propósito: o nome gerado pelo
navegador varia conforme a versão e o título da aba, e um padrão dependente de acento e de
travessão quebraria sozinho. Vale saber que essa regra está lá: **se um dia quiser
versionar um PDF com "Validador de Novos" no nome, precisa de `git add -f`.**

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (14.4117ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (4.6884ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.5233ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (1.6484ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (3.5018ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (21.7814ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (14.5168ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (19.7024ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (9.0587ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (6.5228ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (8.5236ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (6.365ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (7.1452ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (17.2468ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (10.8758ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (8.7176ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.9819ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7644ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.5966ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.7375ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (1.3397ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.5808ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5649ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.1893ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.6729ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (1.0728ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4977ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.3942ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4895ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.9154ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3746ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.4106ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (2.8029ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.7558ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.8556ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.5963ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.2023ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.7135ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (173.6326ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (43.5297ms)
Ô£ö campo ausente: 400 e nada gravado (21.6006ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (25.2912ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (53.2979ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (51.9078ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (16.7368ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (94.7007ms)
Ô£ö GET /saude: 200 com ok e servico (43.0451ms)
Ô£ö rota desconhecida: 404 em JSON (13.3879ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (11.5751ms)
Ô£ö POST /saude: 405 com header Allow: GET (10.6181ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (15.9953ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (17.091ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (13.5297ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (11.6515ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (12.0865ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (33.091ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (21.1824ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (12.6685ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (22.4352ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (27.7499ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (28.8341ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (41.1234ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (27.2714ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (22.9602ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (32.4851ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (28.5749ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (19.4959ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (21.1447ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (68.0206ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (10.711ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (15.1201ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (33.8893ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (23.2352ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (46.1198ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (39.6155ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (50.0214ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (22.7441ms)
Ô£ö POST /nota: 405 com header Allow: GET (12.9933ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (17.1128ms)
Ôä╣ tests 79
Ôä╣ suites 0
Ôä╣ pass 79
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 2014.973
```

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 6
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 6
evidencias.jsonl: 3
```

Nenhum dos dois cresceu.

## Saída real do `git log --oneline` (antes do commit desta correção)

```
89d0b73 Tarefa 21: nota por ideia vinculada ao ID da validacao
6e82468 Tarefa 20: dashboard A4 e compartilhamento por link
8031b7f Tarefa 19: veredito a partir da nota
```

## Arquivos alterados

```
.gitignore
relatorio.js
server.test.js
relatorios/fix-02-aviso-copia-link.md
```

`package.json` não foi alterado: uma única dependência, `express`.

## Um erro meu, na verificação

Para conferir se o padrão do `.gitignore` funcionava, digitei à mão um nome de arquivo
errado — sem a palavra "Novos" — e o comando respondeu "IGNORADO". O nome real
contém "Novos", e o primeiro padrão, `*Validador de Negócios.pdf`, **não** teria
funcionado.

Puxei o nome exato da pasta e testei de novo. O padrão atual é
`*Validador de Novos*.pdf`, e a conferência com o nome real retorna ignorado. O erro não
chegou ao commit, mas é exatamente o tipo de verificação que dá falsa confiança se ninguém
olhar o nome que foi testado.

## O que não funcionou ou ficou pendente

1. **Nada foi verificado em navegador.** O aviso, o timer e a cópia não foram vistos
   funcionando. O que está testado é o HTML gerado, não o comportamento.

2. **`navigator.clipboard` só funciona em contexto seguro**: HTTPS ou `localhost`. Aberto
   por IP na rede, a cópia vai falhar — e agora o usuário vê o aviso vermelho explicando
   para copiar manualmente, o que é o comportamento desejado. Ainda assim, vale registrar
   que em produção por HTTP a cópia não vai funcionar.

3. **Nenhuma pendência nova** foi criada por esta correção. As de ambiente seguem abertas em
   "Pendências conhecidas" do `ESTADO.md`: comando `memory` inexistente, ausência de backup
   dos `.jsonl`, ausência de `.env`, e o link de compartilhamento sem controle de acesso.

## Observações técnicas para a próxima tarefa

1. **As regras de impressão escondem `.aviso`**, o que inclui o aviso de cópia. Está
   correto, porque o dashboard inteiro já é escondido na impressão.

2. **Se um dia o aviso precisar de confirmação permanente**, o caminho é trocar o
   `setTimeout` por um botão de fechar. Não é o caso agora.

3. **Vale a pena um teste de `relatorio.test.js`.** Esta correção mexeu em CSS e JavaScript
   embutidos, e a verificação é por substring no HTML. Um teste que extraia o bloco
   `<script>` e verificasse a existência de `mostrarAvisoCopia` e do `clearTimeout` seria
   mais direto do que procurar `2000` no meio do HTML. Continua sem existir.

4. **O padrão do `.gitignore` para o PDF** é o ponto que mais vai precisar de atenção em
   revisões futuras. Ele protege o repositório por padrão e atrapalha por padrão, em
   direções opostas.

5. **Números da documentação**: não mudaram. O total segue 79 (41 em `server.test.js`, 15 em
   `evidencias.test.js`, 23 em `nota.test.js`), porque nenhuma tarefa foi acrescentada.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-02-aviso-copia-link.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-02-aviso-copia-link.md").Length
16878
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-02-aviso-copia-link.md`,
com 16.878 bytes.
