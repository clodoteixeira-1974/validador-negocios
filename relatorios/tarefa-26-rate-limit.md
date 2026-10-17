# Tarefa 26 — Limite de taxa nas rotas

## Data

17/10/2026

## Objetivo

O serviço é público, por decisão do PO, e estava sem limite nenhum. Um laço de
`POST /validar-ideia` enche o `validacoes.jsonl`, e um laço de `GET /evidencias` sem filtro
segura o event loop, porque o I/O do projeto é síncrono. Esta tarefa fecha o vetor de
disponibilidade que a auditoria Red Team do fix-04 apontou como o primeiro da lista.

Implementação em Node.js puro, sem dependência nova: o projeto continua com `express` como
única dependência.

## O que foi feito

### 1. `rate-limit.js`

Módulo novo na raiz, com uma função exportada:

```javascript
function criarLimitador(opcoes = {}) {
  const janelaMs = opcoes.janelaMs || JANELA_PADRAO_MS;   // 60000
  const maximo = opcoes.maximo || MAXIMO_PADRAO;         // 60
  const mensagem = opcoes.mensagem || MENSAGEM_LIMITE;
  const registros = new Map();                            // IP -> { contagem, resetEm }
  // ...
  return function limitar(requisicao, resposta, proximo) { /* ... */ };
}
```

A janela é **fixa**, não deslizante: quando o IP estoura o teto, a contagem continua
subindo até `resetEm`, e a janela só abre quando esse instante passa. Isso é mais simples e
mais previsível que uma janela deslizante, e o efeito prático é que um cliente que insistiu
não recupera uma cota antes do fim do minuto.

### 2. Onde os limitadores nascem, e por que isso resolveu um problema

O detalhe de desenho que mais valeu foi **criar os limitadores dentro de `createApp`**:

```javascript
function createApp(opcoes = {}) {
  // ...
  const limiteValidarIdeia = criarLimitador({ maximo: 10 });
  const limiteEscreverEvidencia = criarLimitador({ maximo: 30 });
  // ...
}
```

Se o `Map` estivesse no escopo do módulo, seria **um único balde para o processo inteiro**, e
os testes se atropelariam: o teste de `POST /validar-ideia` consumiria as 10 cotas e os testes
seguintes nasceriam barrados, sem que nada estivesse errado.

O enunciado pedia que os testes usassem IP diferente por header ou reiniciassem o
limitador. **Nenhuma das duas foi necessária.** Com o mapa por instância, cada `createApp`
começa zerado, e o isolamento vem de criar a instância, não de contornar o limite.

Isso é melhor do que a alternativa pedida em um aspecto concreto: `X-Forwarded-For` seria um
header **falso** nos testes, e um header falso que o código honra em teste mas não em produção
é exatamente o tipo de teste que passa e não prova nada.

### 3. `GET /evidencias` é a única rota com limite condicional

A rota se divide antes do limitador:

```javascript
app.get('/evidencias', (req, res) => {
  if (typeof req.query.id !== 'string') {
    return limiteListarEvidencias(req, res, () => responderEvidencias(req, res, undefined));
  }

  return responderEvidencias(req, res, req.query.id);
});
```

A listagem global lê o arquivo inteiro e devolve tudo de uma vez. O filtro por `id` exige um
UUID v4 e devolve uma lista pequena. Cobrar os dois igual seria taxa uniforme sem olhar custo
de verdade.

Extraí `responderEvidencias(req, res, filtro)` para não repetir o corpo da rota dentro do
callback do middleware.

### 4. Resposta 429 e headers

```json
{ "error": "Muitas requisicoes. Tente novamente em 1 minuto." }
```

`Retry-After` traz os segundos **calculados de verdade**, com o fim da janela daquele IP. E
toda resposta, bem-sucedida ou não, traz `X-RateLimit-Limit` e `X-RateLimit-Remaining`, o que
permite ao cliente se regular sem gastar uma requisição para descobrir que está no fim.

### 5. Oito testes novos, de 105 para 113

| Teste | O que fixa |
| --- | --- |
| `POST /validar-ideia` barra a 11ª | 10 passam, a 11ª é `429` com o corpo exato |
| `POST /evidencias` barra a 31ª | 30 passam, a 31ª é `429` |
| `GET /evidencias` sem filtro barra a 31ª | e o filtro por `id` continua `200` depois disso |
| `GET /relatorio/:id` barra a 61ª | 60 passam, a 61ª é `429` |
| `GET /nota` barra a 61ª | idem |
| `GET /dashboard` barra a 61ª | idem |
| `GET /saude` sem limite | 100 requisições seguidas, todas `200` |
| `429` traz `Retry-After` e headers | inteiro entre 1 e 60, `Limit` 10 e `Remaining` 0 |

O teste do `Retry-After` usa `fetch` cru, e não o helper `post()`, porque o helper devolve só
o corpo e este teste precisa dos headers. Tive de trocar depois de escrevê-lo com o helper: a
primeira versão lia `resposta.headers` de um objeto que não tem headers.

## O que eu não fiz, e por quê

**`X-Forwarded-For` é ignorado de propósito.** Ler o header sem `trust proxy` deixaria
qualquer cliente burlar o limite só enviando o header, num serviço que hoje não tem proxy
nenhum. Preferi o limite conservador: errar por excesso de restrição é o erro reversível, e
burlar o limite não é.

A consequência está escrita no `CONTRATO.md`: **atrás de proxy ou balanceador, `req.ip` é o
endereço do proxy, e todo mundo cai no mesmo balde.** O limite passa a valer para o serviço
inteiro em vez de para a pessoa. Para a VPS, é preciso ligar `app.set('trust proxy', ...)`.

## O que continua aberto

**O limite é em memória e por processo.** Três consequências, nenhuma resolvida aqui:

- **reiniciar o serviço zera todos os contadores**;
- **com duas instâncias atrás de balanceador, o teto efetivo dobra**, porque cada processo
  tem o seu balde, e ninguém está contando isso;
- **a limpeza das entradas vencidas é preguiçosa e só roda quando alguém é barrado.** Em
  serviço silencioso, o `Map` guarda o que acumulou até o primeiro `429`. Foi escolha
  deliberada: a varredura é O(n) e o `Map` tem no máximo o tamanho da janela no momento em
  que ela roda, mas o efeito é que o mapa cresce entre um `429` e o próximo.

**O limite não é autenticação e não é defesa contra abuso distribuído.** Quem tem muitos IPs
passa, e quem está atrás de NAT divide o limite com o resto do prédio. **30 por minuto ainda
é 30 por minuto de envenenamento**: o limite restringe **quanto**, não **quem**.

**Nenhuma dependência nova.** `package.json` continua com `express` como única dependência.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14924-1792242201250-v3xdy9.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14924-1792242201269-vflja3.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-14924-1792242201283-h79hyd.jsonl por JSON invalido: 1, 2
✔ evidência válida: grava e devolve id e timestamp preenchidos (24.706ms)
✔ evidência sem "fonte": lança erro e não grava (2.661ms)
✔ evidência com "tipo" inválido: lança erro e não grava (1.5985ms)
✔ evidência com "relevancia" inválida: lança erro e não grava (1.6018ms)
✔ listar evidências de arquivo vazio: devolve [] (3.7397ms)
✔ listar evidências após registrar 3: devolve 3 na ordem de gravação (11.025ms)
✔ linha corrompida é ignorada e não derruba a listagem (18.4423ms)
✔ corrupção no meio não impede o filtro por id_validacao (13.7329ms)
✔ arquivo com todas as linhas corrompidas devolve lista vazia, sem lançar (4.6189ms)
✔ linha corrompida não impede gravar registros novos (5.9711ms)
✔ nenhum teste grava no evidencias.jsonl de produção (5.3706ms)
✔ tipo "monetizacao" é aceito, gravado e listado (6.1286ms)
✔ o tipo "monetizacao" convive com os outros tres na mesma gravacao (6.5461ms)
✔ tipo "alcance" é aceito, gravado e listado (7.6375ms)
✔ os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.0508ms)
✔ evidência com id_validacao é gravada e recuperada (6.2194ms)
✔ id_validacao ausente não é gravado, e id_validacao vazio é recusado (6.6095ms)
✔ listarEvidencias com filtro devolve só as evidencias daquele id_validacao (15.947ms)
✔ listarEvidencias sem filtro devolve todas, na ordem de gravação (7.5856ms)
✔ array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (8.2405ms)
✔ 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.7768ms)
✔ 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.754ms)
✔ 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.7279ms)
✔ reclamacao e dado_mercado não contam como concorrente (1.13ms)
✔ 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que não há nenhuma (0.5271ms)
✔ 1 reclamacao: tem_gente_insatisfeita vale 1, que é o mínimo exigido (0.5178ms)
✔ 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.4703ms)
✔ cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.0035ms)
✔ cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.1605ms)
✔ cabe_mais_um e os limites declarados: 2 a 4 concorrentes (0.4702ms)
✔ alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.3993ms)
✔ alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.5612ms)
✔ alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5114ms)
✔ alguem_paga: so o tipo monetizacao pontua neste criterio (0.4947ms)
✔ alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.4047ms)
✔ alcance: 1 evidencia vale 1, que e o minimo exigido (0.381ms)
✔ alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.3244ms)
✔ alcance: so o tipo alcance pontua neste criterio (4.2985ms)
✔ derivarVeredito: cada total da escala cai na faixa correta (3.1577ms)
✔ o veredito acompanha o total em cenarios reais de evidencias (0.6723ms)
✔ o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.2982ms)
✔ o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.5179ms)
✔ ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (202.3883ms)
✔ ideia nao mobile: 200 com tipo "outro" (32.5002ms)
✔ campo ausente: 400 e nada gravado (18.7267ms)
✔ campo vazio ou so com espacos: 400 e nada gravado (27.5016ms)
✔ ideia com tipo errado (numero): 400 e nada gravado (28.1209ms)
✔ body que nao e objeto JSON: 400 e nada gravado (17.5636ms)
✔ JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (22.187ms)
✔ corpo acima de 100kb: 413 e nada gravado (20.6999ms)
✔ GET /saude: 200 com ok e servico (16.9488ms)
✔ rota desconhecida: 404 em JSON (14.8486ms)
✔ GET /validar-ideia: 405 com header Allow: POST (14.327ms)
✔ POST /saude: 405 com header Allow: GET (13.6546ms)
✔ classificarTipo usa limite de palavra e não casa dentro de outras palavras (0.4492ms)
✔ classificação corrigida é o que o POST /validar-ideia devolve e grava (22.7524ms)
✔ nenhum teste grava no validacoes.jsonl de producao (15.4291ms)
✔ POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (19.0253ms)
✔ POST /evidencias sem "fonte": 400 e nada gravado (14.6277ms)
✔ POST /evidencias com "tipo" invalido: 400 e nada gravado (12.7967ms)
✔ GET /evidencias vazio: 200 com total 0 e lista vazia (12.6094ms)
✔ GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (34.2067ms)
✔ nenhum teste de /evidencias grava no evidencias.jsonl de producao (20.7648ms)
✔ GET /nota com arquivo de evidencias vazio: 200 com total 0 (14.2409ms)
✔ GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (27.4745ms)
✔ GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (29.2392ms)
✔ GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (26.3255ms)
✔ GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (39.9266ms)
✔ POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério (25.1039ms)
✔ POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério (34.3908ms)
✔ GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (28.7838ms)
✔ GET /nota com nota 3: veredito manda mudar o recorte (32.6162ms)
✔ GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (16.8124ms)
✔ POST /validar-ideia: a resposta inclui o id que dá acesso ao relatório (21.8319ms)
✔ GET /relatorio/:id com id válido: 200 com HTML do relatório (71.0244ms)
✔ GET /relatorio/:id com id inválido: 404 com HTML (10.477ms)
✔ GET /dashboard: 200 com HTML, formulário e botão de copiar (10.4233ms)
✔ o HTML do relatório traz @page A4 e @media print escondendo os controles (18.8363ms)
✔ POST /evidencias com id_validacao é aceito e vincula a evidência (23.842ms)
✔ GET /nota?id= calcula a nota so com as evidencias daquele id (54.8625ms)
✔ GET /nota sem ?id= mantém a nota global, sobre todas as evidencias (47.98ms)
✔ GET /relatorio/:id mostra a nota daquela validacao, e nao a global (66.628ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-17724-1792242202931-2umosq.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-17724-1792242202931-2umosq.jsonl por JSON invalido: 2
✔ arquivo de validacoes corrompido não impede o relatório das validações boas (41.2754ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-17724-1792242202973-lqasbo.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-17724-1792242202973-lqasbo.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-17724-1792242202973-lqasbo.jsonl por JSON invalido: 1
✔ arquivo de evidencias corrompido não derruba /nota nem /evidencias (59.9329ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-17724-1792242203033-7e6qmh.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-17724-1792242203033-vrb8bb.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-17724-1792242203033-vrb8bb.jsonl por JSON invalido: 1
✔ relatório e nota abrem mesmo com os dois arquivos corrompidos (35.7551ms)
✔ gerarId devolve um UUID v4, no formato documentado no contrato (1.62ms)
✔ dois ids gerados em sequência são diferentes (3.3498ms)
✔ o id não carrega timestamp: não começa com 13 dígitos nem com data (2.3424ms)
✔ o link do relatório funciona com o id em formato UUID (28.4838ms)
✔ nenhum teste de /nota grava no evidencias.jsonl de producao (30.7131ms)
✔ POST /nota: 405 com header Allow: GET (16.3176ms)
✔ PUT /evidencias: 405 com header Allow: GET, POST (11.5042ms)
✔ POST /validar-ideia devolve expires_at 30 dias no futuro (15.0709ms)
✔ GET /relatorio com link no prazo devolve 200 e a data de expiração (18.0495ms)
✔ GET /relatorio com link expirado devolve 410 e a página de expirado (29.7982ms)
✔ validação antiga sem expires_at continua abrindo: 200 (compatibilidade) (27.9757ms)
✔ o dashboard avisa que é projeto de portfólio e aponta o código-fonte (13.0409ms)
✔ o relatório avisa que a evidência não é verificada (26.2084ms)
✔ GET /nota?id= com id expirado devolve 410 em JSON (26.318ms)
✔ GET /nota?id= com id valido devolve 200 e a nota da ideia (31.2812ms)
✔ GET /nota sem ?id= continua devolvendo a nota geral, sem expiracao (30.843ms)
✔ GET /evidencias?id= com id valido e nao expirado devolve 200 com as evidencias (39.8792ms)
✔ GET /evidencias?id= com id expirado devolve 410 e nao vaza as evidencias (24.7882ms)
✔ GET /evidencias?id= com id inexistente devolve 404, e nao lista vazia (39.6593ms)
✔ GET /evidencias sem ?id= continua listando todas, mesmo com validacoes expiradas (78.686ms)
✔ POST /validar-ideia barra a 11a requisicao do mesmo IP (87.7653ms)
✔ POST /evidencias barra a 31a requisicao do mesmo IP (115.5501ms)
✔ GET /evidencias sem filtro barra a 31a requisicao, mas o filtro por id nao conta (105.4082ms)
✔ GET /relatorio/:id barra a 61a requisicao do mesmo IP (344.5919ms)
✔ GET /nota barra a 61a requisicao do mesmo IP (117.4023ms)
✔ GET /dashboard barra a 61a requisicao do mesmo IP (101.63ms)
✔ GET /saude nao tem limite: 100 requisicoes seguidas respondem 200 (132.7368ms)
✔ a resposta 429 traz Retry-After em segundos e os headers de contagem (52.9564ms)
ℹ tests 113
ℹ suites 0
ℹ pass 113
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3682.4612
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

Vale notar que os testes de limite **fazem** muitos `POST` de verdade, e mesmo assim os
`.jsonl` de produção não mudam: os 71 testes de `server.test.js` usam arquivo temporário.

## Saída real do `git log --oneline` (antes do commit desta tarefa)

```
cd2e5fe fix-09: expiracao em GET /evidencias?id=
1a0c973 fix-08: disclaimers, expiracao de links e vitrine de portfolio
5e4da81 fix-07: UUID v4 no ID da validacao
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
rate-limit.js     (novo)
server.js
server.test.js
relatorios/tarefa-26-rate-limit.md   (novo)
```

`package.json` não foi alterado. Nenhuma dependência acrescentada.

## O que não funcionou ou ficou pendente

1. **Um teste que escrevi usando o helper errado.** O teste do `Retry-After` usava `post()`,
   que devolve `{ status, corpo }` e não tem headers. Reescrito com `fetch` cru.
2. **Um `});` órfão no fim de `server.test.js`** apareceu quando inseri o bloco de testes, e
   quebrou o arquivo. Removido, e `node --check` passou.
3. **A pendência de "sem limite de taxa" saiu do `ESTADO.md`, mas não foi substituída por
   outra.** O limite resolvido aqui é o de instância única. O cenário de várias instâncias,
   de proxy e de abuso distribuído entrou como pendência nova, e é mais específica.

## Observações técnicas para a próxima tarefa

1. **A janela é fixa, não deslizante.** Um cliente que insistiu não recupera cota antes do
   fim do minuto. Se o comportamento desejado for "10 a cada 60 segundos rolantes", a mudança
   é em `rate-limit.js` e não afeta rota nenhuma.
2. **O texto do `429` diz "em 1 minuto" e está amarrado à janela padrão de 60 s.** Mudar
   `janelaMs` sem mudar o texto faria a resposta mentir. Quem integra deve usar o
   `Retry-After`, que não mente. Se a janela mudar, os dois precisam mudar juntos.
3. **Colocar o limitador como `app.use` global é tentador e seria errado.** Ele barraria o
   `GET /saude`, que é o que o balanceador consulta para saber se a instância está viva, e a
   instância morreria sozinha com um healthcheck barrado. Por isso o limite é por rota.
4. **Se o serviço for para a VPS, `trust proxy` é obrigatório**, senão todo tráfego herda o
   IP do proxy e o limite de 10 por minuto vale para o mundo inteiro. Está anotado em
   `CONTRATO.md`.
5. **A limpeza preguiçosa merece um teste quando houver tempo.** Hoje ela roda só no caminho
   do `429`, e um erro ali — por exemplo, um filtro que apaga a entrada errada — só apareceria
   sob carga.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

**O primeiro caiu. Os outros dois continuam, e o primeiro que cai não é o pior de todos.**

- ~~**I/O síncrono bloqueando o event loop**~~. Um laço de escrita agora esbarra em 10 ou 30
  por minuto por IP, e `GET /evidencias` sem filtro em 30. **Ataque simples de uma origem
  deixa de ser viável.** Um laço com escritas curtas de outra origem continua.
- **Abuso distribuído continua inteiro.** O limite é por IP, e um atacante com muitos IPs
  multiplica o teto pelo número de IPs. Em IPv6 isso é direto: um host costuma ter uma
  faixa inteira, e o `Map` trataria cada endereço como uma pessoa distinta. **Este é agora o
  vetor de disponibilidade número um, e é exatamente o que esta tarefa não resolve.**
- **O disco continua crescendo sem rotação, sem limite de tamanho e sem backup.** O limite de
  taxa desacelera o enchimento, não o impede: com um IP dá para gravar 10 validações por
  minuto, o que é 14.400 por dia, e cada uma é uma linha permanente.

### 2. Onde há alucinação lógica neste fluxo

A alucinação central do `nota.js` segue intacta e intocada. O limite de taxa não muda o
cálculo da nota, e **não muda o significado da nota**: 30 por minuto ainda é 30 por minuto de
envenenamento.

E esta tarefa introduz uma alucinação nova, do tipo mais difícil de perceber: **os headers
`X-RateLimit-Limit` e `X-RateLimit-Remaining` parecem uma garantia que não é.** Uma integração
que leia `Remaining: 0` e conclua que "não posso mais escrever" está certa. Mas uma integração
que leia esses headers e conclua que **o sistema protegeu a nota** está errada: o header diz
quanto falta, não o que foi protegido.

A alucinação mais concreta está no **`429` do `GET /evidencias` sem filtro**. O cliente que
recebe `429` pode tratar como "erro temporário" e repetir, e a repetição é exatamente o que
gera a carga. Um `429` sem `Retry-After` seria pior; com ele, ainda assim, é um protocolo que
depende do cliente colaborar, e nenhum teste prova que ele colabora.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Sem mudança no tratamento de corrupção, e há uma observação específica do limite: **as seis
primeiras requisições de um laço de teste podem ter gravado e as seguintes nem, já não
passam pelo handler.** Um `POST` barrado não escreve, o que na prática reduz o dano de um
laço de escrita pela ordem de grandeza do limite, mas não elimina: quem respeita o `429`
ainda grava um volume limitado.

A corrupção em si segue o comportamento do fix-05, sem nada novo.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

**Este é o ponto que o limite de taxa torna mais relevante, e ele é interno do Node.**

A contagem em `Map` em memória **não é atômica** em relação a handlers concorrentes. O
fluxo é síncrono — ler, incrementar, decidir — e, dentro de um processo com I/O síncrono,
**duas requisições não se interleavam nesse trecho**, porque não há `await` entre eles. Então
o contador não perde incremento dentro de um processo.

Mas o comportamento **com dois processos** continua **Nao identificado nesta tarefa**, e
agora ele importa mais do que antes: com duas instâncias, cada uma conta separadamente, e o
teto efetivo dobra silenciosamente. Um teste de concorrência entre processos exigiria
subir dois servidores, e não foi feito.

### 5. O que um atacante faria com este sistema

**Um vetor caiu, dois continuam, e um deles piorou de forma mensurável.**

**Caiu, para o atacante de uma origem só:** o laço simples de `POST` ou de
`GET /evidencias`. Antes, um script de poucas linhas derrubava o serviço. Agora ele gasta
30 requisições por minuto por IP e leva `429`.

**Continua, e é o pior agora:** **abuso distribuído.** Um atacante com faixa IPv6, ou com
500 proxies, multiplica o teto. O `Map` trata cada endereço como uma pessoa distinta, e não
tem como saber que são a mesma pessoa. Esta tarefa **não reduz esse vetor em nada**.

**Continua:** **envenenamento de nota.** `POST /evidencias` continua público e sem
autenticação. A mudança aqui é de volume: 30 por minuto em vez de ilimitado. Um atacante
discreto, que registra uma evidência de vez em quando, **não percebe a diferença**.

**Continua:** **encher o disco.** 10 validações por minuto são 14.400 linhas por dia, e cada
linha é um JSON com a ideia inteira. Não há rotação, nem limite de tamanho, nem backup.

**O que a tarefa fez, em uma frase:** trocou um ataque **barato** por um ataque **caro**. Isso
é uma melhoria real e é o que se consegue sem Redis e sem dependência. Não é o mesmo que
fechar o vetor.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que "o serviço está protegido" sai daqui.** O título da tarefa é limite de taxa, e o
relatório diz que o vetor de disponibilidade caiu. O que ele **não** diz, e deveria dizer com
a mesma força, é que a proteção vale **por processo, por IP, e só para uma origem**.

A frase que seria a honesta é: *"um laço de uma origem só não derruba mais este serviço"*.
Ela é bem mais fraca que "o serviço está protegido", e é a verdadeira.

E a segunda, que é a que mais importa depois de cinco tarefas de correção: **esta é a sexta
correção de baixo custo da série** (fix-05, fix-06, fix-07, fix-08, fix-09, Tarefa 26). Todas
reais, todas com teste, todas com documentação no mesmo commit. E o vetor de **escrita** —
registrar evidência para mover a nota de outra pessoa — **segue intacto desde o primeiro
relatório Red Team**.

A Tarefa 26 foi registrada como o passo que tornaria a publicação segura sem autenticação.
Ela tornou a publicação **resistente a abuso ingênuo**. As duas coisas são diferentes, e a
distinção é o que este relatório precisa não apagar.

O mais honesto seria: *"fechei o sexto item mais fácil de uma lista, e o item mais importante
continua aberto porque a decisão do PO foi mantê-lo aberto. O que eu entregue é resistência,
não proteção"*.

## Pipeline de evolução

### Onde estamos

Fase de exposição: o produto está funcional, público, declarado e com teto por instância. A
expiração de 30 dias cobre todas as rotas que servem dado de validação, e o limite de taxa
fecha o abuso de uma origem só. A janela de exposição e o vetor de disponibilidade simples
estão fechados nos dois lados. O que continua aberto é escrita sem autenticação e abuso
distribuído.

### O que foi feito até aqui

- Tarefa 01: inspeção do ambiente (relatório reconstruído na Tarefa 09)
- Tarefa 02: endpoint `POST /validar-ideia`
- Tarefa 03: classificação determinística mobile/outro
- Tarefa 04: persistência em JSON Lines
- Tarefa 05: módulo `evidencias.js`
- Tarefa 06: unificação em uma única implementação
- Tarefa 07: remoção da duplicata `app/`
- Tarefa 08: organização para portfólio
- Tarefa 09: limpeza estrutural, injeção de caminho e `.gitattributes`
- Tarefa 10: atualização do `ESTADO.md` e migração para o GitHub
- Tarefa 11: `POST /evidencias` e `GET /evidencias`
- Tarefa 12: documentação das rotas de evidências
- Tarefa 13: primeiro critério da régua ("tem gente?")
- Tarefa 14: regras do projeto e convenção de nomes de relatório
- Tarefa 15: segundo critério ("tem gente insatisfeita?") e soma dos pontos
- fix-01: `405` em `/nota` e teste de `405` em `/evidencias`
- Tarefa 16: terceiro critério ("cabe mais um?")
- Tarefa 17: quarto critério ("alguém paga?") e tipo `monetizacao`
- Tarefa 18: quinto critério ("você alcança essas pessoas?") e tipo `alcance`
- Tarefa 19: veredito derivado da nota
- Tarefa 20: dashboard A4 e link de compartilhamento
- Tarefa 21: nota por ideia, vinculada ao ID da validação
- fix-02: aviso visual ao copiar link
- fix-03: pipeline de evolução em todos os relatórios
- fix-04: governança com Red Team e Contrato de Dados
- fix-05: leitura resiliente de `.jsonl`
- fix-06: classificação com limite de palavra
- fix-07: UUID v4 no ID da validação
- fix-08: disclaimers, expiração de links e vitrine de portfólio
- fix-09: expiração em `GET /evidencias?id=`
- Tarefa 26: limite de taxa por IP nas rotas caras, em `rate-limit.js`

### O que falta

- [Alta] Decisão do PO sobre escrita: `POST /evidencias` continua aberto, sem autenticação.
  É o vetor de maior impacto que resta, e é escolha, não esquecimento
- [Alta] Proteção contra abuso distribuído. O limite é por IP, então faixa IPv6 ou muitos
  proxies multiplicam o teto. Exige estado compartilhado, que é Redis ou similar
- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] `trust proxy` antes de ir para a VPS. Sem ele, todo tráfego herda o IP do proxy e
  o limite de 10 por minuto vale para o mundo inteiro
- [Média] Limite compartilhado entre instâncias. Hoje o teto dobra silenciosamente com duas
- [Média] Limite de tamanho ou rotação dos `.jsonl`. 10 validações por minuto são 14.400
  linhas por dia, e não há backup
- [Média] Autenticação ou revogação de link
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida
- [Baixa] Limpeza preguiçosa do `Map` só roda quando alguém é barrado. Vale um teste do
  caminho de limpeza
- [Baixa] Extrair a checagem "existe, depois está válido" para um helper, hoje repetida em
  três rotas
- [Baixa] Link do perfil do autor: hoje aponta para o perfil no GitHub
- [Baixa] Migração das validações antigas para `expires_at`. Hoje elas não expiram
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **Limite por IP, em memória, num `Map` por processo**, sem dependência nova
- **Os limitadores nascem dentro de `createApp`**, e é isso que dá isolamento entre testes
  sem IP falso por header
- **Janela fixa**, não deslizante: a contagem só zera quando a janela fecha
- **`GET /evidencias` tem limite só na listagem global**; o filtro por `id` exige UUID v4 e
  não é limitado
- **`GET /saude` sem limite**, porque healthcheck barrado derruba a instância
- **`X-Forwarded-For` é ignorado**, para não ser burlável sem `trust proxy`
- **`Retry-After` calculado de verdade**, e o texto do `429` amarrado à janela de 60 s
- **Headers `X-RateLimit-Limit` e `X-RateLimit-Remaining` em toda resposta**, para o cliente
  se regular sem gastar requisição
- **Nenhuma dependência nova**: o projeto continua com `express` só

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler este arquivo
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Limite de taxa em memória e por processo**: reiniciar zera, e com duas instâncias o teto
  dobra
- **Atrás de proxy sem `trust proxy`, todo mundo divide o balde do proxy**
- **Link de compartilhamento sem revogação**: a expiração fechou a leitura, mas um link
  vazado vale até o prazo
- **Escrita continua aberta**, por decisão consciente do PO, com o risco documentado
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia
  falha

### Próximo passo

**Tarefa 27 — decidir sobre autenticação na escrita.** Esta é a pendência que a sequência de
correções baratas foi empurrando, e ela é de produto, não de código.

A pergunta para o PO é uma só, e ela não tem resposta técnica: **o serviço aceita evidência de
qualquer pessoa, para sempre?** Se sim, a nota é um número que qualquer um pode mexer, e o
disclaimer é a única defesa, e isso é uma escolha legítima de portfólio. Se não, a próxima
tarefa é autenticação, e ela é grande.

Independentemente da resposta, **`trust proxy` precisa entrar antes da VPS**, senão o limite
de 10 por minuto vale para o mundo inteiro e o serviço fica inutilizável para o público.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-26-rate-limit.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-26-rate-limit.md").Length
32000
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-26-rate-limit.md`.
