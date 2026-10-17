# Tarefa 20 — Dashboard A4 e link de compartilhamento

## Data

16/10/2026

## Objetivo

Entregar o produto de verdade: uma página para o usuário enviar a ideia, ver a nota e o
veredito, e gerar um relatório que possa ler, imprimir e compartilhar por link.

Decisões do PO, aplicadas integralmente:

- **Dashboard HTML com CSS A4 e link de compartilhamento**, em vez de PDF gerado no servidor.
- **Sem Puppeteer e sem dependência de PDF.** O PDF sai do navegador, por "Salvar como".

O resultado é que o projeto continua com **uma única dependência**, `express`, como está
registrado no `ESTADO.md` desde o início. Nenhum `package.json` foi alterado.

## O que foi feito

### 1. `relatorio.js` (arquivo novo)

Módulo de geração das duas páginas. Sem I/O, sem rede, sem dependência.

- `CSS` — constante de estilo, embutida nas duas páginas.
- `escapar(texto)` — escapa `&`, `<`, `>`, `"` e `'`. Os dados vêm do usuário e não podem
  virar marcação.
- `formatarData(iso)` — data em português, com `timeZone: 'UTC'`, para não deslocar o dia por
  causa do fuso de quem abre.
- `gerarRodape(base)` — data de geração e link para o dashboard.
- `gerarHtmlRelatorio(validacao, nota, evidencias, base)` — o relatório.
- `gerarHtmlDashboard()` — o dashboard.

O relatório tem cabeçalho, a ideia com tipo/data/identificador, a nota grande com "de N
pontos", o veredito com faixa e explicação em uma faixa lateral colorida por decisão, a
tabela dos cinco critérios, as evidências relacionadas (ou o aviso de que não há nenhuma) e
o rodapé.

### 2. ID em `POST /validar-ideia`

`gerarId()` foi adicionada em `server.js`, com o mesmo formato que a que já existia no
`evidencias.js`: `timestamp em ms + sufixo aleatório`. O `id` entra no registro gravado e
na resposta, e `recebido: true` foi mantido.

Isso é o que torna o link de compartilhamento possível, e é também o primeiro passo para a
pendência da nota geral,discussida adiante.

### 3. Três funções novas em `server.js`

- `buscarValidacao(id, arquivo)` — varre o `validacoes.jsonl` e devolve o registro com o id
  pedido, ou `null`. **Linha com JSON inválido é pulada**, não interrompe a leitura: um
  registro corrompido não pode derrubar o relatório das demais validações.
- `evidenciasRelacionadas(ideia, arquivo)` — filtra por substring do texto da ideia. É o
  mecanismo frágil que já conhecíamos; está registrado como limite.
- `paginaNaoEncontrada(id)` — HTML simples de 404, sem o CSS pesado, com o id já filtrado
  contra `<` e `>`.

### 4. Duas rotas novas

`GET /dashboard` e `GET /relatorio/:id`, ambas com `res.type('html')`. A rota do relatório
declara `base` a partir de `req.protocol` e `req.get('host')`, para que o link do rodapé
funcione em qualquer origem.

### 5. `server.test.js`: de 32 para 37 testes

Cinco testes novos, os cinco pedidos:

- `POST /validar-ideia: a resposta inclui o id que dá acesso ao relatório` — confere o
  formato do id, que dois ids seguidos são diferentes e que os dois estão no arquivo.
- `GET /relatorio/:id com id válido: 200 com HTML do relatório` — valida uma ideia, registra
  evidência relacionada e confere cabeçalho, ideia, tipo, id, nota, veredito, os cinco
  nomes de critério, a evidência e o link do rodapé.
- `GET /relatorio/:id com id inválido: 404 com HTML`.
- `GET /dashboard: 200 com HTML, formulário e botão de copiar`.
- `o HTML do relatório traz @page A4 e @media print escondendo os controles` — confere
  `@page`, `size: A4`, `margin: 2cm`, `@media print`, ausência de `<link>` e ausência de
  `<script>`.

Dois testes novos além do pedido, dentro dos que já existentes:

- No teste do dashboard, **ausência de URL absoluta**. Isso garante que a página não depende
  de nada externo e que o JavaScript conversa só com rotas relativas.
- No teste do relatório, **`assert.ok(!/<script/i.test(corpo))`**. O relatório é de leitura,
  sem JavaScript, e essa asserção trava essa decisão.

### Um teste existente precisou ser ajustado

`ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario` fazia
`assert.deepEqual` sobre o registro inteiro, com exatamente três campos. Com o `id` novo, a
forma mudou e o teste falhou:

```
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    actual: { id: '1792233527713-obrjge', ideia: 'App para controlar gastos', tipo: 'mobile', timestamp: '2026-10-17T10:38:47.713Z' },
    expected: { ideia: 'App para controlar gastos', tipo: 'mobile', timestamp: '2026-10-17T10:38:47.713Z' },
```

O teste foi ajustado para conferir o `id` separadamente (formato e igualdade com o id da
resposta) e manter o `deepEqual` dos outros três campos. Não afrouxei nada: a forma do
registro continua travada.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (14.7819ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (2.3526ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (1.4803ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (1.6337ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (3.2716ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (17.4692ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (11.4136ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (19.9928ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.9783ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (6.5844ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.5098ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (6.8486ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7137ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7369ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6862ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.6732ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.4884ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.4761ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.4948ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.1085ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (2.6838ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4259ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.3901ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4498ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4631ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.5176ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3448ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.3512ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.4821ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.455ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.7895ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.6108ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.4413ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.6526ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (156.8704ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (40.0278ms)
Ô£ö campo ausente: 400 e nada gravado (18.2985ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (23.8149ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (15.842ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (14.8315ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (19.171ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (19.4466ms)
Ô£ö GET /saude: 200 com ok e servico (19.3383ms)
Ô£ö rota desconhecida: 404 em JSON (10.309ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (12.0533ms)
Ô£ö POST /saude: 405 com header Allow: GET (11.3978ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (11.899ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (13.0046ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (13.6808ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (9.848ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (11.0304ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (25.2901ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (19.4683ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (10.735ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (18.1854ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (22.9176ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (24.4431ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (31.6411ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (25.8404ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (20.6533ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (30.8354ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (25.2183ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (59.5617ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (18.8384ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (62.5133ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (10.871ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (7.8279ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (21.6583ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (22.4958ms)
Ô£ö POST /nota: 405 com header Allow: GET (12.3521ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (11.9384ms)
Ôä╣ tests 71
Ôä╣ suites 0
Ôä╣ pass 71
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 1521.7771
```

Detalhamento por arquivo, conferido por contagem de blocos `test()`:

| Arquivo              | Antes | Agora | Testes |
| -------------------- | ----- | ----- | ------ |
| `server.test.js`     | 32    | 37    | 37     |
| `evidencias.test.js` | 11    | 11    | 11     |
| `nota.test.js`       | 23    | 23    | 23     |
| **Total**            | 66    | 71    | **71** |

## Contagem de linhas dos `.jsonl`, antes e depois

```
---- LINHAS ANTES ----
validacoes.jsonl: 5
evidencias.jsonl: 3

---- LINHAS DEPOIS ----
validacoes.jsonl: 5
evidencias.jsonl: 3
```

Nenhum dos dois cresceu, apesar de `POST /validar-ideia` agora gravar um campo a mais por
validação. Os testes usam arquivos temporários.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
8031b7f Tarefa 19: veredito a partir da nota
1989fc1 Tarefa 18: quinto criterio da regua (alcance)
50ada7d Tarefa 17: quarto criterio da regua (alguem paga?)
```

## Arquivos alterados

```
ESTADO.md
README.md
relatorio.js          (novo)
server.js
server.test.js
relatorios/tarefa-20-dashboard-a4.md
```

`package.json` não foi alterado: o projeto segue com uma única dependência.

## O que não funcionou ou ficou pendente

Nada falhou. Um teste existente precisou ser ajustado, como descrito acima, e isso é
esperado de uma mudança de contrato.

Ficaram pendentes:

1. **A nota e as evidências do relatório ainda são globais.** Este é o ponto mais
   importante. O relatório tem o id da validação no cabeçalho, mas a **nota exibida é a nota
   geral**, calculada sobre todas as evidências guardadas. E as evidências listadas como
   "relacionadas" são filtradas por **substring do texto da ideia**, não pelo id. Isso
   significa que um relatório pode mostrar nota 3 com evidências de outra ideia, se os textos
   se parecerem.

   A validação tem id agora, que é o caminho para resolver — mas exigiria que a evidência
   passasse a guardar o id da validação, e isso é uma mudança no `evidencias.js`.

2. **Nenhuma verificação visual foi feita.** Não rodei navegador, e as regras do projeto
   proíbem servidor em background e testes com `curl.exe`. O que está verificado é
   automatizado: status, tipo de conteúdo, presença de `@page`, `size: A4`, `margin: 2cm`,
   `@media print`, ausência de recurso externo e ausência de JavaScript no relatório. **A
   aparência em A4 real, e a impressão, não foram vistas por ninguém.**

3. **O link de compartilhamento não tem controle de acesso.** Registrado em "Pendências
   conhecidas". Qualquer pessoa com o link abre o relatório.

4. **Não há teste unitário do `relatorio.js`.** O módulo é exercitado apenas por HTTP. Vale
   um `relatorio.test.js` quando houver o quê testar diretamente — por exemplo, o
   `escapar`.

5. **Pendências de ambiente e infraestrutura**, mantidas em "Pendências conhecidas": comando
   `memory` inexistente, ausência de backup dos `.jsonl`, ausência de `.env`, nota geral e
   link sem controle de acesso.

## Observações técnicas para a próxima tarefa

1. **A próxima tarefa é de produto externo, não de código interno.** Coleta de dados traz
   decisões que nenhuma tarefa anterior teve: origem dos dados, frequência, respeito aos
   termos dos sites consultados, e como um texto coletado vira evidência validada. Vale
   levar essas perguntas ao PO antes de escrever código.

2. **O `escapar` merece um teste próprio.** Ele é a única barreira entre texto do usuário e
   marcação no HTML. Um erro ali é injeção de HTML. Está testado indiretamente, pelo caminho
   HTTP, mas não por um caso que prove que `<script>` no texto da ideia não vira `<script>`
   no relatório.

3. **Se a nota passar a ser por ideia, o caminho é claro.** O id já existe em
   `POST /validar-ideia` e no relatório. Falta `evidencias.js` aceitar e guardar o id da
   validação, e `calcularNota` receber as evidências já filtradas. Nenhuma dessas mudanças
   quebra o contrato de `GET /nota`, que continua devolvendo os cinco critérios e o
   veredito.

4. **A fragilidade do filtro por substring deve sumir junto com ele.** Enquanto a comparação
   for por texto, `evidenciasRelacionadas` pode associar a evidência errada. Vale eliminar a
   função em vez de melhorar a heurística.

5. **Números da documentação para a próxima tarefa:** total geral no README (71), e as linhas
   de `server.test.js` (37), `evidencias.test.js` (11) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 71 e o detalhamento por arquivo.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-20-dashboard-a4.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-20-dashboard-a4.md").Length
15837
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-20-dashboard-a4.md`,
com 15.837 bytes.
