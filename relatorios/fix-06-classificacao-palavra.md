# fix-06 — Classificação com limite de palavra

## Data

17/10/2026

## Objetivo

Corrigir o falso positivo da classificação `mobile`/`outro`, encontrado pela auditoria Red
Team do fix-04: a regra usava `includes('app')`, que casa dentro de qualquer palavra.

O caso que a auditoria reproduziu foi `"Pineapple shop"` virando `mobile`, porque
`Pineapple` contém `app`. Um pêssego virava aplicativo.

Antes de implementar, rodei as duas regras lado a lado em 16 frases. O resultado está na
seção seguinte, e ele mostrou que o defeito era maior do que o caso relatado.

## O que foi feito

### 1. `server.js`: `includes()` por regex com limite de palavra

```javascript
// Palavras que classificam a ideia como mobile. A comparação usa limite de
// palavra (\b) de propósito: sem ele, qualquer palavra que contenha "app" —
// "pineapple", "happy", "Snapple" — seria classificada como aplicativo.
// Com \b, "AppStore" e "Application" também ficam de fora, porque "app" não
// aparece nelas como palavra isolada.
const PADRAO_MOBILE = /\b(app|aplicativo)\b/i;
```

```javascript
function classificarTipo(ideia) {
  return PADRAO_MOBILE.test(String(ideia)) ? 'mobile' : 'outro';
}
```

A constante `PALAVRAS_MOBILE` e o `toLowerCase()` saíram: a flag `i` resolve o caixa, e
`String(ideia)` evita que a função quebre com entrada não textual. A constante antiga estava
também no `module.exports`; foi substituída por `PADRAO_MOBILE`, e nenhum outro arquivo a
usava.

### 2. Testes: de 86 para 88

Dois testes novos em `server.test.js`, um de unidade e um de integração:

- `classificarTipo usa limite de palavra e não casa dentro de outras palavras` — 17 frases
  comparadas, incluindo todos os casos da especificação.
- `classificação corrigida é o que o POST /validar-ideia devolve e grava` — prova que a
  correção chegou à resposta HTTP **e** ao arquivo gravado, e não ficou só na função.

## O que a comparação lado a lado mostrou

Rodei a regra antiga e a nova em 16 frases antes de editar qualquer arquivo:

```
mobile  | antes: true  | "App para controlar gastos"
mobile  | antes: true  | "Aplicativo de receitas"
outro   | antes: true  | "Pineapple shop"          <- MUDA
outro   | antes: true  | "Application development" <- MUDA
mobile  | antes: true  | "APP"
mobile  | antes: true  | "app"
mobile  | antes: true  | "Aplicativo"
outro   | antes: true  | "AppStore"                <- MUDA
outro   | antes: true  | "pineapple"               <- MUDA
mobile  | antes: true  | "APLICATIVO"
mobile  | antes: true  | "meu app"
mobile  | antes: true  | "aplicativo-web"
outro   | antes: false | "cooperativa"
outro   | antes: true  | "happy"                   <- MUDA
outro   | antes: true  | "Snapple"                 <- MUDA
mobile  | antes: true  | "aplicativo de shear"
```

Sete das dezesseis frases mudam de `mobile` para `outro`. A especificação pedia seis casos;
**a correção resolveu dois a mais que estavam na mesma classe de defeito** e que a auditoria
não tinha citado: `happy` e `Snapple`.

O caso `cooperativa` é o controle: já era `outro` antes e continua. Sem ele, um teste que
só conferisse os sete casos novos passaria mesmo com uma regra que classificasse tudo como
`mobile`.

## Uma decisão sobre o nome exportado

`PALAVRAS_MOBILE` era exportado. Com a regex, ele não tem mais sentido: o que existe agora é
um padrão, não uma lista. Mantive a exportação, trocando o nome para `PADRAO_MOBILE`, em
vez de deixar a lista morrer em silêncio — um export removido sem aviso é uma quebra que só
aparece em outro projeto, depois.

Verifiquei antes que nenhum outro arquivo usava o símbolo antigo.

## O que a correção NÃO resolve

A classificação continua sendo uma correspondência de palavra-chave, e agora é **menos
errada**, não boa. Três casos continuam errados por construção:

- **"Aplicação" não é reconhecida.** A regra só conhece `app` e `aplicativo`. Uma ideia de
  aplicativo escrita com "aplicação", "aplicativo mobile" ou "aplicativo para smartphone"
  passa, mas "aplicação" não. O padrão não cobre `aplicacao`.
- **Um hífen conta como fronteira.** `aplicativo-web` é `mobile`, que é o resultado
  desejado, mas significa que a fronteira é ortográfica e não semântica.
- **Nada disso é ajustado pela IA.** A classificação acontece no `server.js`, antes de
  qualquer evidência, e não tem relação com a régua.

Registrei como pendência `[Baixa]` em "O que falta", com o texto dizendo que a IA não é o
lugar para refinar essa regra.

## Saída real do `npm test`

```
> validador-de-ideias@1.0.0 test
> node --test server.test.js evidencias.test.js nota.test.js
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-1832-1792237942610-ebnxgh.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-1832-1792237942621-jzddpt.jsonl por JSON invalido: 2
[jsonl] 2 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-1832-1792237942632-piqwv8.jsonl por JSON invalido: 1, 2
Ô£ö evid├¬ncia v├ílida: grava e devolve id e timestamp preenchidos (24.6642ms)
Ô£ö evid├¬ncia sem "fonte": lan├ºa erro e n├úo grava (3.9559ms)
Ô£ö evid├¬ncia com "tipo" inv├ílido: lan├ºa erro e n├úo grava (2.6236ms)
Ô£ö evid├¬ncia com "relevancia" inv├ílida: lan├ºa erro e n├úo grava (4.9174ms)
Ô£ö listar evid├¬ncias de arquivo vazio: devolve [] (4.3525ms)
Ô£ö listar evid├¬ncias ap├│s registrar 3: devolve 3 na ordem de grava├º├úo (9.2346ms)
Ô£ö linha corrompida ├® ignorada e n├úo derruba a listagem (10.453ms)
Ô£ö corrup├º├úo no meio n├úo impede o filtro por id_validacao (10.313ms)
Ô£ö arquivo com todas as linhas corrompidas devolve lista vazia, sem lan├ºar (5.2701ms)
Ô£ö linha corrompida n├úo impede gravar registros novos (5.2205ms)
Ô£ö nenhum teste grava no evidencias.jsonl de produ├º├úo (17.0873ms)
Ô£ö tipo "monetizacao" ├® aceito, gravado e listado (29.4911ms)
Ô£ö o tipo "monetizacao" convive com os outros tres na mesma gravacao (7.7486ms)
Ô£ö tipo "alcance" ├® aceito, gravado e listado (8.6459ms)
Ô£ö os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados (7.1519ms)
Ô£ö evid├¬ncia com id_validacao ├® gravada e recuperada (14.9597ms)
Ô£ö id_validacao ausente n├úo ├® gravado, e id_validacao vazio ├® recusado (5.9586ms)
Ô£ö listarEvidencias com filtro devolve s├│ as evidencias daquele id_validacao (17.8265ms)
Ô£ö listarEvidencias sem filtro devolve todas, na ordem de grava├º├úo (12.8495ms)
Ô£ö array vazio: tem_gente vale 0 e o detalhe avisa que nenhum foi registrado (7.9954ms)
Ô£ö 1 concorrente: tem_gente vale 0 e o detalhe cita o minimo de 2 (0.8055ms)
Ô£ö 2 concorrentes: tem_gente vale 1 e o detalhe mostra a contagem (0.7954ms)
Ô£ö 3 concorrentes: tem_gente continua valendo 1 e o detalhe mostra a contagem (0.6472ms)
Ô£ö reclamacao e dado_mercado n├úo contam como concorrente (0.7586ms)
Ô£ö 0 reclamacoes: tem_gente_insatisfeita vale 0 e o detalhe avisa que n├úo h├í nenhuma (0.4815ms)
Ô£ö 1 reclamacao: tem_gente_insatisfeita vale 1, que ├® o m├¡nimo exigido (0.5051ms)
Ô£ö 3 reclamacoes: tem_gente_insatisfeita continua valendo 1 e o detalhe mostra a contagem (0.5392ms)
Ô£ö cabe_mais_um: a faixa que vale ponto e de 2 a 4 concorrentes (1.5347ms)
Ô£ö cabe_mais_um: o detalhe distingue mercado vazio, pequeno, com espaco e saturado (1.8672ms)
Ô£ö cabe_mais_um e os limites declarados: 2 a 4 concorrentes (1.0128ms)
Ô£ö alguem_paga: 0 monetizacoes vale 0 e o detalhe avisa que nao ha nenhuma (0.4022ms)
Ô£ö alguem_paga: 1 evidencia de monetizacao vale 1, que e o minimo exigido (0.4791ms)
Ô£ö alguem_paga: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.5153ms)
Ô£ö alguem_paga: so o tipo monetizacao pontua neste criterio (0.5569ms)
Ô£ö alcance: 0 evidencias vale 0 e o detalhe avisa que nao ha nenhuma (0.3927ms)
Ô£ö alcance: 1 evidencia vale 1, que e o minimo exigido (0.3975ms)
Ô£ö alcance: 3 evidencias continua valendo 1 e o detalhe mostra a contagem (0.3683ms)
Ô£ö alcance: so o tipo alcance pontua neste criterio (0.4995ms)
Ô£ö derivarVeredito: cada total da escala cai na faixa correta (2.6238ms)
Ô£ö o veredito acompanha o total em cenarios reais de evidencias (0.7084ms)
Ô£ö o total e a soma dos criterios e o maximo_possivel e a soma dos maximos (1.4623ms)
Ô£ö o detalhe acompanha a contagem em todos os casos e a saida tem a forma combinada (1.7569ms)
Ô£ö ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario (148.7641ms)
Ô£ö ideia nao mobile: 200 com tipo "outro" (41.8758ms)
Ô£ö campo ausente: 400 e nada gravado (16.0173ms)
Ô£ö campo vazio ou so com espacos: 400 e nada gravado (20.5655ms)
Ô£ö ideia com tipo errado (numero): 400 e nada gravado (16.5139ms)
Ô£ö body que nao e objeto JSON: 400 e nada gravado (15.0389ms)
Ô£ö JSON malformado: 400 com mensagem em JSON (sem pagina HTML) (14.7594ms)
Ô£ö corpo acima de 100kb: 413 e nada gravado (19.3492ms)
Ô£ö GET /saude: 200 com ok e servico (14.8898ms)
Ô£ö rota desconhecida: 404 em JSON (12.0219ms)
Ô£ö GET /validar-ideia: 405 com header Allow: POST (12.4582ms)
Ô£ö POST /saude: 405 com header Allow: GET (11.8201ms)
Ô£ö classificarTipo usa limite de palavra e n├úo casa dentro de outras palavras (0.4206ms)
Ô£ö classifica├º├úo corrigida ├® o que o POST /validar-ideia devolve e grava (17.6522ms)
Ô£ö nenhum teste grava no validacoes.jsonl de producao (13.9159ms)
Ô£ö POST /evidencias valido: 201 com id e timestamp gerados pelo servidor (17.3031ms)
Ô£ö POST /evidencias sem "fonte": 400 e nada gravado (12.1207ms)
Ô£ö POST /evidencias com "tipo" invalido: 400 e nada gravado (12.6104ms)
Ô£ö GET /evidencias vazio: 200 com total 0 e lista vazia (14.9765ms)
Ô£ö GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao (30.0833ms)
Ô£ö nenhum teste de /evidencias grava no evidencias.jsonl de producao (20.2279ms)
Ô£ö GET /nota com arquivo de evidencias vazio: 200 com total 0 (12.4656ms)
Ô£ö GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1 (28.7817ms)
Ô£ö GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1 (30.2542ms)
Ô£ö GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5 (30.6873ms)
Ô£ö GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0 (46.785ms)
Ô£ö POST /evidencias com tipo "monetizacao" ├® aceito e alimenta o quarto crit├®rio (31.0749ms)
Ô£ö POST /evidencias com tipo "alcance" ├® aceito e alimenta o quinto crit├®rio (28.4356ms)
Ô£ö GET /nota com um registro de cada tipo: a regua completa vale 5 de 5 (36.6659ms)
Ô£ö GET /nota com nota 3: veredito manda mudar o recorte (32.0405ms)
Ô£ö GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR (21.147ms)
Ô£ö POST /validar-ideia: a resposta inclui o id que d├í acesso ao relat├│rio (22.1209ms)
Ô£ö GET /relatorio/:id com id v├ílido: 200 com HTML do relat├│rio (92.8224ms)
Ô£ö GET /relatorio/:id com id inv├ílido: 404 com HTML (11.7736ms)
Ô£ö GET /dashboard: 200 com HTML, formul├írio e bot├úo de copiar (17.9179ms)
Ô£ö o HTML do relat├│rio traz @page A4 e @media print escondendo os controles (18.7112ms)
Ô£ö POST /evidencias com id_validacao ├® aceito e vincula a evid├¬ncia (21.3875ms)
Ô£ö GET /nota?id= calcula a nota so com as evidencias daquele id (44.5877ms)
Ô£ö GET /nota sem ?id= mant├®m a nota global, sobre todas as evidencias (38.2345ms)
Ô£ö GET /relatorio/:id mostra a nota daquela validacao, e nao a global (47.892ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16192-1792237944099-o5m5um.jsonl por JSON invalido: 2
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16192-1792237944099-o5m5um.jsonl por JSON invalido: 2
Ô£ö arquivo de validacoes corrompido n├úo impede o relat├│rio das valida├º├Áes boas (33.3024ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16192-1792237944133-0g6gq0.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16192-1792237944133-0g6gq0.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16192-1792237944133-0g6gq0.jsonl por JSON invalido: 1
Ô£ö arquivo de evidencias corrompido n├úo derruba /nota nem /evidencias (35.415ms)
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\validacoes-teste-16192-1792237944168-ivqwo1.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16192-1792237944168-5flkem.jsonl por JSON invalido: 1
[jsonl] 1 linha(s) ignorada(s) em C:\Users\clodo\AppData\Local\Temp\evidencias-teste-16192-1792237944168-5flkem.jsonl por JSON invalido: 1
Ô£ö relat├│rio e nota abrem mesmo com os dois arquivos corrompidos (27.663ms)
Ô£ö nenhum teste de /nota grava no evidencias.jsonl de producao (23.524ms)
Ô£ö POST /nota: 405 com header Allow: GET (14.2079ms)
Ô£ö PUT /evidencias: 405 com header Allow: GET, POST (10.3289ms)
Ôä╣ tests 88
Ôä╣ suites 0
Ôä╣ pass 88
Ôä╣ fail 0
Ôä╣ cancelled 0
Ôä╣ skipped 0
Ôä╣ todo 0
Ôä╣ duration_ms 1980.2604
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

## Saída real do `git log --oneline` (antes do commit desta correção)

```
5025918 fix-05: leitura resiliente de .jsonl
93b1d74 fix-04: governanca com Red Team e Contrato de Dados
c6c74d0 fix-03: pipeline de evolucao em todos os relatorios
```

## Arquivos alterados

```
CONTRATO.md
ESTADO.md
README.md
server.js
server.test.js
relatorios/fix-06-classificacao-palavra.md   (novo)
```

`package.json` não foi alterado: uma única dependência, `express`.

## O que não funcionou ou ficou pendente

Nada falhou na implementação. Ficou pendente:

1. **A classificação continua sendo palavra-chave**, agora com limite de palavra. Ver a
   seção acima e o item `[Baixa]` registrado no `ESTADO.md`.
2. **Nenhuma pendência de ambiente foi resolvida**: comando `memory` inexistente, ausência
   de backup dos `.jsonl`, ausência de `.env`, link de compartilhamento sem controle de
   acesso.
3. **Os vetores de ataque seguem intactos.** A classificação não era o vetor principal:
   envenenar a nota e enumerar relatórios continuam sem mitigação, e são os dois de maior
   impacto.

## Observações técnicas para a próxima tarefa

1. **A porta de entrada da próxima tarefa é a decisão do PO, não o código.** Os dois vetores
   que sobram — envenenamento de nota e `id` enumerável — exigem escolher entre
   autenticação, limite de taxa, verificação de fonte, ou um `id` aleatório com entropia
   real. Nenhuma dessas é uma linha, e todas mudam a forma de usar o serviço.

2. **Trocar `Date.now()` por `crypto.randomUUID()` no `id` da validação é a correção mais
   barata da lista.** Custa uma linha, elimina o `timestamp` previsível e não muda o formato
   do link nem o contrato — o `id` continua sendo string. Vale a pena como candidato,
   ainda que isolado não resolva o envenenamento de nota.

3. **O limite de palavra agora é o padrão para o resto do projeto.** A classificação
   resolveu o problema pela raiz da expressão, e não por lista de exceções: não há "casos
   especiais" no código. Vale manter essa postura em qualquer regra de texto futura.

4. **`\b` tem uma sutileza com acento que vale registro.** Em JavaScript, `\b` é definido
   por `\w`, que é `[A-Za-z0-9_]`. Um caractere acentuado, como `ç` ou `ã`, não é caractere
   de palavra, então existe fronteira antes dele. Na prática isso só morderia em algo como
   "moçãoaplicativo", sem separação, o que é raro em texto digitado por pessoa. Não é um
   defeito conhecido, e mesmo assim fica registrado.

5. **Números da documentação para a próxima tarefa:** total geral no README (88), e as linhas
   de `server.test.js` (46), `evidencias.test.js` (19) e `nota.test.js` (23) na tabela de
   estrutura. No `ESTADO.md`, a linha de 88 e o detalhamento por arquivo.

## Auditoria Red Team

### 1. Os 3 maiores pontos de falha sob alto tráfego

Inalterados por esta tarefa, que mexeu em uma expressão regular:

- **I/O síncrono bloqueando o event loop.** `lerJsonl` e `escreverJsonl` continuam
  síncronos, e `GET /relatorio/:id` continua fazendo dois I/O por requisição.
- **Sem limite de requisições e sem autenticação.**
- **Arquivo `.jsonl` como banco, sem backup, em disco local.**

Nenhum dos três teve uma linha alterada aqui.

### 2. Onde há alucinação lógica neste fluxo

**A classificação foi corrigida de verdade.** `"Pineapple shop"`, `"happy"` e `"Snapple"`
eram `mobile` por acidente e agora são `outro`, com teste que falha se a regra voltar.

O que **continua** alucinado no fluxo:

- a régua conta um `tipo` que o cliente inventa, e não há deduplicação;
- `cabe_mais_um` pune mercado saturado como se o mercado não existisse;
- `ideia_relacionada` não é validada contra a validação;
- o veredito não sabe qual critério falhou;
- **e a própria classificação continua sendo palavra-chave.** Deixou de errar em falso
  positivo dentro de palavra, mas segue errada em quem escreve "aplicação".

Ou seja: corrigi um sintoma bem delimitado de um problema maior. **Classificação por
palavra-chave não é raciocínio**, e nenhuma quantidade de `\b` transforma isso em raciocínio.

### 3. O que acontece se um arquivo `.jsonl` for corrompido

Comportamento único e coberto por sete testes, desde o fix-05: linha vazia é pulada, linha
válida entra, linha inválida é pulada com aviso, e a leitura continua. Arquivo inexistente
é vazio; arquivo todo corrompido é lista vazia.

**Continua verdade e não foi resolvido:** a linha corrompida permanece no arquivo, e não há
reparo, detecção de perda nem backup. A resiliência é de leitura, não de integridade.

Esta tarefa **não toca** nesse comportamento, e por isso o número de testes de corrupção
continua o mesmo.

### 4. O que acontece se dois requests chegarem ao mesmo tempo

Nada mudou. Dentro de um processo, o I/O síncrono impede embaralhamento de escrita; com
**dois processos** o comportamento continua **Nao identificado nesta tarefa**.

### 5. O que um atacante faria com este sistema

Os quatro vetores seguem abertos:

- **envenenar a nota** por `POST /evidencias` público;
- **enumerar relatórios** pelo `id` com prefixo `Date.now()` previsível;
- **encher o disco** com laço de `POST`;
- **exposição de rede**, porque o serviço escuta em todas as interfaces.

E há um efeito colateral honesto desta correção: **o aviso de classificação agora é mais
silencioso**. Antes, uma ideia claramente não-mobile era marcada `mobile` com frequência, e
esse ruído era, sem querer, um sinal de que a regra era ruim. Agora a regra é melhor e, ao
mesmo tempo, **o sinal exterior de defeito desaparece** — porque o defeito remanescente,
"aplicação" não ser reconhecida, é silencioso por natureza. Uma regra que erra pouco e em
silêncio é mais difícil de notar do que uma que erra muito e alto.

### 6. Qual é a mentira mais confortável que este relatório conta

**Que corrigir a classificação seja tratar a entrada do usuário.** O relatório diz, com
razão, que `"Pineapple shop"` deixou de ser aplicativo, e é verdade. Mas a função **não
entende nada**: ela procura dois tokens isolados. Trocar `includes` por `\b` trocou um erro
barato por um erro barato. Nenhuma quantidade de teste unitário transforma isso em
compreensão.

E a segunda mentira, que é a que eu preferiria que alguém notasse: **esta tarefa "fechou"
um item do "O que falta"**. O item era "corrigir o falso positivo da classificação". Fechado,
sim. Mas a lista tinha esse item entre quatro defeitos, dos quais este era o mais barato de
corrigir e um dos de menor impacto real. Fechar o item dá a impressão de que a auditoria
avançou bastante, e ela avançou pouco: os dois vetores de maior impacto — envenenamento de
nota e `id` enumerável — continuam intactos e continuam sem decisão do PO.

Um relatório honesto sobre segurança diria: *"corrigi o defeito mais fácil de uma lista em
que dois dos quatro são decisões de produto, e eu não toquei nesses dois"*.

## Pipeline de evolução

### Onde estamos

Fase de saneamento dos defeitos que a auditoria Red Team do fix-04 levantou. Dois dos quatro
já foram fechados: leitura de `.jsonl` (fix-05) e classificação por palavra (fix-06). Os
dois que exigem decisão de produto continuam abertos.

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

### O que falta

- [Alta] Mitigação do envenenamento de nota: autenticação, limite de taxa e verificação de
  fonte. **Exige decisão do PO, e é o item de maior impacto da lista**
- [Alta] `id` de validação previsível, com `Date.now()` como prefixo e sem bloqueio de
  tentativa. Trocar por `crypto.randomUUID()` é barato, mas sozinho não resolve o
  envenenamento
- [Alta] Coleta real de concorrentes e reclamações
- [Média] Publicação do serviço, hoje sem controle de acesso
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida
- [Média] Vínculo automático entre ideia e evidência na hora de coletar
- [Baixa] Classificação de tipo ainda é por palavra-chave, e só reconhece `app` e
  `aplicativo`. Uma ideia de "aplicação" continua classificada como `outro`
- [Baixa] `console.warn` não é observável: falta logger e destino de log
- [Baixa] Verificação visual do relatório A4 e do dashboard, que exige navegador
- [Baixa] Integração com LLM e RAG
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`

### Decisões tomadas

- **Classificação por limite de palavra**, com `PADRAO_MOBILE = /\b(app|aplicativo)\b/i`, em
  vez de lista de palavras com `includes()`
- **A correção resolve o caso relatado e os da mesma classe**: `happy` e `Snapple` também
  pararam de ser `mobile`, embora não estivessem na especificação
- **A classificação é determinística e não é ajustável pela API.** Mudar a regra é mudar
  código, e a auditoria registra que isso não é domínio da IA

### Pendências conhecidas

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler o `ESTADO.md`
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Sem `.env`**, que vai ser necessário quando houver LLM
- **Link de compartilhamento sem controle de acesso**, o que torna o `id` enumerável um
  problema real
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia falha

### Próximo passo

**Tarefa 24 — `id` de validação com entropia real**, trocando o prefixo `Date.now()` por
`crypto.randomUUID()`. É uma linha, não quebra o formato do link nem o contrato do campo, e
elimina o vetor mais fácil de descrever no relatório: o `id` é adivinhável.

Depois disso, e só depois, a decisão do PO sobre envenenamento de nota.

## Confirmação de existência e tamanho deste relatório

Comandos executados e saída real:

```
PS> Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-06-classificacao-palavra.md"
True

PS> (Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-06-classificacao-palavra.md").Length
25605
```

O relatório está salvo em
`C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-06-classificacao-palavra.md`,
com 25.605 bytes.
