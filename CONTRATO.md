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
| `expires_at` | string ISO 8601 | sim | servidor, `gerarExpiracao()` | verificação de `GET /relatorio/:id`; resposta; rodapé do relatório |

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

### `expires_at`: expiração do link

`expires_at` é o instante em que o link de relatório deixa de funcionar. Vale
`timestamp + 30 dias`, em ISO 8601, calculado por `gerarExpiracao()` no momento da
validação. O prazo de 30 dias é decisão do PO, não um padrão do protocolo.

Ele aparece em três lugares: gravado no registro, devolvido na resposta de
`POST /validar-ideia`, e mostrado no rodapé do relatório e no dashboard.

`GET /relatorio/:id` compara `expires_at` com o instante atual e devolve:

| Situação | Resposta |
| --- | --- |
| `expires_at` no futuro | `200`, relatório normal |
| `expires_at` no passado, ou igual ao agora | `410 Gone`, página HTML de link expirado |
| `expires_at` ausente (validação antiga) | `200`, relatório normal |
| `expires_at` ilegível | `200`, relatório normal |

O `410` é deliberado, e não `404`. A diferença importa para quem consome a API: `404`
diz que a validação não existe, `410` diz que ela **existe** e que o acesso deixou de
valer. Um relatório expirado continua no arquivo, e a nota dele continua existindo em
`GET /nota`.

### Onde a expiração é verificada

A expiração vale para **todas as rotas que aceitam um id de validação**, e vale para o
**dado**, não só para a página:

| Rota | Validação inexistente | Validação expirada |
| --- | --- | --- |
| `GET /relatorio/:id` | `404`, HTML de não encontrado | `410`, HTML de link expirado |
| `GET /nota?id=<id>` | segue `200`, com nota zero | `410`, com `{"error": "Este link expirou"}` |
| `GET /evidencias?id=<id>` | `404`, com `{"error": "Validacao nao encontrada"}` | `410`, com `{"error": "Este link expirou"}` |

As duas rotas sem filtro não têm prazo, e a razão é a mesma nas duas: elas não pertencem a
uma validação, então não têm `expires_at` de onde tirar um prazo.

| Rota | Comportamento |
| --- | --- |
| `GET /nota` (sem `?id=`) | segue `200`: a nota geral não pertence a uma validação |
| `GET /evidencias` (sem `?id=`) | segue `200`: a listagem global não pertence a uma validação |

**A regra que vale é uma só: onde o dado é servido, o prazo é conferido.** Fechar apenas a
página do relatório deixava o mesmo dado acessível por outra rota, e a expiração virava
medida de **aparência** — a tela some, a informação fica. Por isso `/nota?id=` foi fechada
no fix-08 e `/evidencias?id=` no fix-09, e não por acaso: cada uma delas era um caminho
restante para o mesmo dado depois do prazo.

### `GET /evidencias?id=` mudou de contrato

Essa rota agora **exige que a validação exista**. Antes, qualquer string servia de filtro:
um `id` inexistente devolvia `200` com lista vazia. A partir do fix-09:

- `?id=` de uma validação que não existe devolve `404` com `{"error": "Validacao nao
  encontrada"}`;
- `?id=` de uma validação expirada devolve `410` com `{"error": "Este link expirou"}`;
- `?id=` de uma validação válida segue `200` com as evidências vinculadas.

A mudança é de contrato, e vale registrar por quê vale a pena: `200` com lista vazia era
**ambíguo**. Não dava para distinguir "não há evidência para esta ideia" de "este id não
existe", e o segundo caso é justamente o que a expiração precisa distinguir de "expirou".

Consequência para quem integra: um `id_validacao` guardado sem a validação correspondente
agora devolve `404`. Evidência sem vínculo continua existindo e continua contando na nota
geral — só o filtro por `id` mudou.
### Compatibilidade com validações antigas

Validações gravadas antes da Tarefa 25 **não têm `expires_at`**. Elas são tratadas como
**não expiradas**, e o relatório abre normalmente.

A escolha é deliberada, e vale registrar o porquê:

- **Não migrar dado.** Reescrever as linhas antigas exigiria varrer o arquivo e acrescentar
  um campo com base no `timestamp` de cada registro. Isso inventaria uma expiração que
  nunca foi comunicada a ninguém, e o arquivo é o dado do usuário.
- **O custo real é assimétrico.** Se uma validação antiga fosse tratada como expirada, um
  relatório que funcionavaeria de funcionar, sem caminho de volta. Tratá-la como válida
  só deixa um relatório aberto por mais tempo — o mesmo estado em que ele já estava.
- **O campo ausente é raro e datável.** Só as validações anteriores a esta tarefa o têm.

**A consequência é uma dívida, e ela precisa ser dita:** as validações antigas **não
expiram nunca**. O rodapé do relatório delas diz exatamente isso —
"Validação anterior à expiração: este link não tem data de expiração" — em vez de ficar
calado, porque um rodapé sem menção pode ser lido como "não expira" quando o oposto
também é verdade. O `id` em UUID v4 continua sendo o que impede a enumeração desses
relatórios antigos, e é por isso que a dívida é aceitável.

`expires_at` ilegível também é tratado como não expirado, pelo mesmo motivo: um campo
corrompido não deve fechar o acesso a um relatório que a pessoa já tinha.

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

A nota **por ideia** (`?id=<id de validação>`) respeita o `expires_at` da validação e devolve
`410` com `{"error": "Este link expirou"}` quando o prazo venceu. A nota **geral**, sem
`?id=`, não tem prazo. Detalhes em "Onde a expiração é verificada", na seção Validação.

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
| rodapé com data de geração e data de expiração do link | fixo + `expires_at` da Validação | `relatorio.js` | leitor |
| aviso de que a evidência não é verificada | fixo | `relatorio.js` | leitor |

O rodapé traz duas informações sobre o tempo de vida do link: quando o relatório foi
gerado, e quando o link expira. São coisas diferentes, e confundi-las faria o leitor
acreditar que um relatório impresso também tem prazo. **O prazo é do link, não do
documento**: o PDF impresso continua válido depois de expirar.

O aviso "Não há verificação de fonte automática" é fixo e **não depende de haver ou não
evidência** no relatório. Ele aparece mesmo sem nenhuma evidência registrada, porque a
afirmação que ele faz é sobre como a nota é construída, e não sobre o que foi coletado.

Todo dado vindo da Validação, da Evidência ou da Nota passa por `escapar()` antes de entrar
no HTML.

## Limite de taxa

O serviço é público, e sem limite um laço de escrita enche o disco e um laço de
`GET /evidencias` sem filtro segura o event loop, porque o I/O do projeto é síncrono. Cada
rota tem um limite por IP, em janela de 1 minuto.

| Rota | Limite por IP | Por que |
| --- | --- | --- |
| `POST /validar-ideia` | 10 | escreve em `validacoes.jsonl`, e a mais cara de abusive |
| `POST /evidencias` | 30 | escreve em `evidencias.jsonl`, e uma evidência move nota alheia |
| `GET /evidencias` sem filtro | 30 | devolve o arquivo inteiro de uma vez |
| `GET /relatorio/:id` | 60 | renderiza HTML e calcula nota |
| `GET /nota` | 60 | recalcula a nota a cada chamada |
| `GET /dashboard` | 60 | entrega a página inteira |

Sem limite, de propósito:

| Rota | Por que |
| --- | --- |
| `GET /saude` | é o que o balanceador consulta para saber se a instância está viva |
| `GET /evidencias?id=` | filtra por `id_validacao`, que já é um UUID v4 caro de adivinhar |
| `GET /nota?id=` | idem, e a resposta é pequena |
| `404` e `405` | são cheap e devem continuar cheap para o cliente se orientar |

**`GET /evidencias` tem dois limites, e isso não é descuido.** A rota se divide antes do
limitador: sem `?id=` ela passa pelo limite de 30, e com `?id=` não passa por nenhum. O filtro
por `id` exige um UUID v4, que é caro de adivinhar, e a resposta é pequena; a listagem global
lê o arquivo inteiro e é a rota mais cara de servir.

### Resposta 429

```json
{ "error": "Muitas requisicoes. Tente novamente em 1 minuto." }
```

A requisição **nunca chega ao handler**: o limitador é middleware e responde antes de ler o
corpo, gravar arquivo ou calcular nota. Um `POST` barrado não cria registro.

Toda resposta, bem-sucedida ou barrada, traz:

| Header | Conteúdo |
| --- | --- |
| `X-RateLimit-Limit` | o limite da rota, como string |
| `X-RateLimit-Remaining` | quantas ainda restam, `0` quando acabou |
| `Retry-After` | só no `429`: segundos até a janela abrir |

O `Retry-After` é calculado de verdade, com o fim da janela do IP. **O texto da mensagem diz
"em 1 minuto" e está amarrado à janela padrão de 60 s**: mudar a janela sem mudar o texto
faria a resposta mentir. Quem integra deve usar o `Retry-After`, que não mente.

O `429` não devolve `Allow`, porque não é problema de método, e sim de volume.

### O limite é em memória, por IP, e por instância

Isto é o que o mecanismo **não** é, e precisa estar escrito:

- **Em memória, num `Map` por processo.** Reiniciar o serviço zera todos os contadores.
  Não há persistência de contagem.
- **Por processo.** Com duas instâncias atrás de balanceador, cada uma tem seu balde. O
  limite efetivo dobra, e ninguém está contando isso.
- **Por IP, usando `req.ip`.** Atrás de proxy ou balanceador, `req.ip` é o endereço do
  proxy: **todo mundo compartilha um único balde**, e o limite passa a valer para o serviço
  inteiro em vez de para a pessoa. Para a VPS, é preciso ligar `app.set('trust proxy', ...)`,
  e aí o `X-Forwarded-For` passa a valer.
- **`X-Forwarded-For` é ignorado de propósito.** Ler o header sem `trust proxy` deixaria
  qualquer cliente burlar o limite num serviço sem proxy nenhum, só enviando o header.
  Preferi o limite conservador, que é o de errar por excesso de restrição.
- **Não é autenticação e não é defesa contra abuso distribuído.** Um atacante com muitos
  IPs continua passando, e um atrás de NAT compartilha o limite com o resto do prédio.

A limpeza das entradas vencidas é preguiçosa e acontece **só quando alguém é barrado**,
nesse momento. Sem isso o `Map` só cresceria. O efeito é que, em serviço silencioso, o `Map`
guarda o que acumulou até o primeiro `429`.
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
- **A expiração vale nas três rotas que aceitam `id` de validação**: `GET /relatorio/:id`,
  `GET /nota?id=` e `GET /evidencias?id=`. Ela **não** apaga nada: uma validação expirada
  continua no arquivo, continua contando como evidência válida por `id_validacao` para as
  notas de outras ideias, e continua sendo aceito como vínculo em `POST /evidencias`.
- **Expirar não impede mais de registrar evidência.** `POST /evidencias` aceita
  `id_validacao` de uma validação expirada, e essa evidência continua contando na nota de
  outras ideias. Fechar a leitura do prazo e manter a escrita aberta é assimétrico por
  escolha: escrita aberta é decisão do PO, e nenhuma tarefa desta série mexeu nela.
- **Validação antiga continua válida e continua sem prazo.** Documentado acima, e aceito
  como dívida: o campo não existe nelas e nada foi inventado para preenchê-lo.
- **O rodapé do dashboard e o do relatório não têm o mesmo conteúdo.** O do dashboard é
  vitrine de portfólio (autor e código-fonte); o do relatório é aviso sobre evidência e
  prazo. Nenhum dos dois declara controle de acesso, porque não existe.
