# Validador de Novos Negócios

Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela, registra a
validação, recebe e lista evidências de mercado, e calcula uma nota de viabilidade a
partir dessas evidências. É o primeiro passo de um projeto maior: cruzar a ideia com o
mercado e dar um veredito.

Repositório: https://github.com/clodoteixeira-1974/validador-negocios

## O que faz

Hoje, o serviço faz cinco coisas:

1. **Valida a ideia.** Você envia uma ideia em texto. O servidor confere se o pedido está
   bem formado e devolve uma resposta clara, seja aceito ou recusado.
2. **Recebe uma imagem opcional.** No dashboard, é possível enviar uma imagem de até 10 MB
   em vez de digitar a descrição. O OpenRouter extrai o texto da imagem; esse texto segue
   para a classificação e as demais etapas. A imagem é preservada no registro e exibida no
   relatório A4.
3. **Classifica o tipo.** Se a ideia menciona "app" ou "aplicativo" como palavra isolada,
   ela é classificada como `mobile`. Caso contrário, como `outro`. A comparação usa limite de
   palavra, então "pineapple", "happy" e "AppStore" continuam sendo `outro`, porque nelas
   "app" não é uma palavra separada.
4. **Guarda evidências de mercado.** É possível registrar concorrentes, reclamações de
   usuários e dados de setor, e depois listar tudo o que foi registrado.
5. **Dá uma nota de viabilidade.** A nota é calculada a partir das evidências registradas,
   aplicando um critério de cada vez e explicando como cada um chegou ao resultado.

Cada validação aceita é gravada em um arquivo de registro com a ideia, o tipo e a data e
hora. Cada evidência registrada é gravada em outro arquivo, com a fonte, o trecho
original, a ideia à qual se refere e o nível de relevância.

Uma evidência pode ser **vinculada a uma validação** pelo campo opcional `id_validacao`,
que recebe o id devolvido por `POST /validar-ideia`. Com ele, a evidência conta apenas na
nota daquela ideia; sem ele, ela vale para a nota geral.

As evidências são identificadas e datadas pelo próprio servidor: o cliente não escolhe o
identificador nem a data, apenas o conteúdo da evidência. Um registro sem os campos
obrigatórios é recusado com erro, e nada é gravado.

A nota é um número de 0 a 5 pontos, dividido em cinco critérios. **Todos os cinco já estão
implementados**:

- **"Tem gente?"** — concede 1 ponto quando há 2 ou mais concorrentes registrados.
- **"Tem gente insatisfeita?"** — concede 1 ponto quando há pelo menos uma reclamação
  registrada.
- **"Cabe mais um?"** — concede 1 ponto quando há entre 2 e 4 concorrentes registrados. Poucos
  concorrentes mostram que o mercado ainda está aberto; muitos demais mostram que já está
  saturado.
- **"Alguém paga?"** — concede 1 ponto quando há pelo menos uma evidência de monetização, ou
  seja, alguém já pagando por um serviço parecido.
- **"Você alcança essas pessoas?"** — concede 1 ponto quando há pelo menos uma evidência de
  alcance, ou seja, um caminho conhecido para chegar ao público-alvo.

A régua está completa, e cada nota vem acompanhada de um veredito. Por enquanto a nota é
geral, ou seja, considera todas as evidências guardadas, sem distinguir uma ideia da outra.

## Os três vereditos

A nota vai de 0 a 5 e é traduzida em uma decisão, com faixas conservadoras:

| Nota   | Veredito          | O que significa                                                       |
| ------ | ----------------- | --------------------------------------------------------------------- |
| 0 a 1  | `PARAR`           | Sem informação suficiente. Não vale seguir.                            |
| 2 a 3  | `MUDAR_O_RECORTE` | Existe sinal, mas o público ou a oferta precisa ser ajustada.          |
| 4 a 5  | `SEGUIR`          | Vale gastar as próximas 24h testando com gente de verdade.             |

As faixas são deliberadamente conservadoras: com 5 pontos de máximo, só "SEGUIR" exige
quase tudo certo, e um único sinal isolado ainda leva a `PARAR`.

## O dashboard e o link de compartilhamento

O relatório é uma página HTML feita para A4. Não há PDF gerado no servidor: o usuário abre
o link, lê na tela e, se quiser o arquivo, usa "Salvar como PDF" do próprio navegador. Essa
escolha mantém o projeto com uma única dependência.

- **`/dashboard`** — formulário para enviar a ideia, resultado na tela e botão para copiar o
  link do relatório. Abre com um aviso de que é um projeto de portfólio, e o rodapé aponta o
  perfil do autor e o código-fonte.
- **`/relatorio/:id`** — relatório daquela validação, com a ideia, a data, a nota, o
  veredito, o detalhamento dos cinco critérios e as evidências relacionadas. O `id` na URL é
  um UUID v4, gerado com entropia criptográfica: ele é adivinhável só por força bruta.

Quem tem o link abre o relatório. **Não há controle de acesso, e o link é a única proteção.**

## Expiração do link, em 30 dias

Cada validação recebe, na hora em que é criada, um `expires_at`: o instante 30 dias à
frente, em ISO 8601. Ele volta na resposta de `POST /validar-ideia`, é gravado junto do
registro e aparece no rodapé do relatório e no dashboard.

A comparação dessa data com o agora acontece em **todas as rotas que aceitam um id de
validação**. Não só onde o relatório é mostrado, mas onde o dado é servido:

| Rota | Dentro do prazo | Prazo vencido | `id` inexistente |
| --- | --- | --- | --- |
| `GET /relatorio/:id` | `200`, relatório em HTML | `410`, página de expirado | `404`, HTML |
| `GET /nota?id=` | `200`, com a nota | `410`, `{"error": "Este link expirou"}` | segue `200`, com nota zero |
| `GET /evidencias?id=` | `200`, com as evidências | `410`, `{"error": "Este link expirou"}` | `404`, `{"error": "Validacao nao encontrada"}` |

As duas rotas **sem** filtro não têm prazo: `GET /nota` e `GET /evidencias` sem `?id=` não
pertencem a uma validação, então não têm `expires_at` de onde tirar um.

O `410` e não `404` porque a validação continua existindo: o que deixou de valer foi o
acesso, e não a ideia. A diferença importa para quem consome a API.

O `404` em `/evidencias?id=` é uma mudança de contrato: antes, qualquer string servia de
filtro e um id inexistente devolvia `200` com lista vazia. Isso era ambíguo, porque não
dava para distinguir "não há evidência para esta ideia" de "este id não existe" — e é
justamente essa distinção que a expiração precisa fazer.

**O prazo é do link, não do documento.** Um relatório impresso ou salvo em PDF continua
válido depois que o link expira.

**Validação antiga não expira.** Quem foi validado antes de o campo existir não tem
`expires_at`, e o relatório dele abre normalmente. Nada foi inventado para preencher a
data, e o rodapé desses relatórios avisa que não há prazo.

Isso encurta a janela de exposição de um link vazado, mas **não é controle de acesso**:
quem tem o link tem o acesso enquanto ele valer, e não há como revogar antes do prazo.

O CSS é embutido nas duas páginas e não carrega fonte, biblioteca ou imagem externa. A imagem
enviada é incorporada como data URI no relatório. A folha está dimensionada para A4 com
margem de 2 cm, e as regras de impressão escondem botões e painéis, de modo que "Imprimir"
sai limpo.

O projeto foi construído em etapas pequenas, cada uma com testes automatizados e um
relatório em `relatorios/` explicando o que foi feito e por quê.

## Segurança e avisos

O serviço é público, de portfólio, e é honesto sobre isso. O que está implementado:

| Medida | Onde | O que faz |
| --- | --- | --- |
| Aviso de portfólio | topo do dashboard | Diz que os dados são fictícios ou de demonstração |
| Aviso de qualidade | topo do dashboard | Diz que a nota depende da qualidade das evidências |
| Aviso de verificação | rodapé do relatório | Diz que não há verificação de fonte automática |
| Expiração de link | as 3 rotas que aceitam `id` | Relatório, nota e evidências param em 30 dias |
| `id` como UUID v4 | URL do relatório | Torna a enumeração de relatórios inviável |
| Limite de taxa | 6 rotas | De 10 a 60 requisições por IP, por minuto |

### Limite de taxa

O serviço é público, então cada rota tem um teto por IP, na janela de 1 minuto. A requisição
barrada **nunca chega ao handler**: ela não grava arquivo e não calcula nota.

| Rota | Limite por IP |
| --- | --- |
| `POST /validar-ideia` | 10 |
| `POST /evidencias` | 30 |
| `GET /evidencias` sem filtro | 30 |
| `GET /relatorio/:id` | 60 |
| `GET /nota` | 60 |
| `GET /dashboard` | 60 |

`GET /saude` não tem limite, de propósito: é o que o balanceador consulta para saber se a
instância está viva. `GET /evidencias?id=` e `GET /nota?id=` também não têm, porque exigem um
`id` em UUID v4, que é caro de adivinhar.

Quando o limite estoura, a resposta é `429` com
`{"error": "Muitas requisicoes. Tente novamente em 1 minuto."}`, o header `Retry-After` em
segundos, e os headers `X-RateLimit-Limit` e `X-RateLimit-Remaining` em toda resposta.

**Três coisas que o limite não é**, e que valem mais que a lista acima:

- **é em memória e por processo.** Reiniciar zera os contadores, e com duas instâncias
  atrás de balanceador cada uma tem o seu balde, então o limite efetivo dobra;
- **atrás de proxy, `req.ip` é o IP do proxy**, e todo mundo cai no mesmo balde. Para a VPS é
  preciso ligar `app.set('trust proxy', ...)`;
- **não é autenticação nem defesa contra abuso distribuído.** Quem tem muitos IPs passa, e
  quem está atrás de NAT divide o limite com o resto da rede.

`X-Forwarded-For` é ignorado de propósito: sem `trust proxy`, qualquer cliente burlaria o
limite só enviando o header.

O que **não** está implementado, e é preciso dizer com todas as letras:

- **Não há autenticação.** Qualquer pessoa que chegue ao serviço valida uma ideia.
- **`POST /evidencias` é aberto.** Qualquer pessoa pode registrar evidência para qualquer
  `id_validacao`, inclusive evidência de concorrente, que faz a nota subir. O limite de taxa
  limita **quanto**, não **quem**: 30 por minuto ainda é 30 por minuto de envenenamento. O
  aviso de qualidade existe, mas **aviso não é controle**.
- **Um link vazado vale até expirar.** Não há revogação, e o prazo de 30 dias é o único
  limite.
- **A expiração vale para a leitura, mas `POST /evidencias` segue aberto.** Quem souber o
  `id` de uma validação expirada ainda consegue registrar evidência contra ela.
O relatório de cada tarefa tem uma auditoria Red Team que registra isso com o estado real
do projeto, inclusive o que continua aberto.

## Como rodar

Requer Node.js instalado. Não é preciso Docker nem banco de dados.

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000`. **Para usar o produto, abra
`http://localhost:3000/dashboard`**: tem um formulário para enviar a ideia, mostra a nota e
o veredito, e dá o link do relatório para compartilhar.

Para usar outra porta:

```bash
PORT=8080 npm start          # Linux/macOS
$env:PORT=8080; npm start    # PowerShell (Windows)
```

Para rodar os testes:

```bash
npm test
```

São 123 testes automatizados, todos passando.

### Design system do portfólio

`public/styles.css` contém um design system CSS puro, servido localmente em `/styles.css` e
reutilizável pelos próximos apps do portfólio. O tema padrão é escuro e usa a paleta Schwartz
Unleashed: preto `#000000`, azul petróleo `#015875`, vermelho `#FF0000`, vinho `#99164E` e
laranja `#F47C19`, com texto suavizado `#F4F4F5` e cartões `#0D1117`.

A tipografia segue o equilíbrio neo-grotesco: Plus Jakarta Sans ou Inter nos títulos, Inter no
corpo e JetBrains Mono ou Fira Code para código. As fontes têm fallbacks de sistema e não são
baixadas de serviços externos.

As classes utilitárias `.btn-primario`, `.btn-secundario`, `.btn-perigo`, `.card`, `.badge` e
`.code-block` estabelecem estilos compartilháveis. O arquivo também contém os componentes do
dashboard e do relatório, responsividade e regras de impressão A4: fundo branco, texto preto,
margens de 2 cm e ocultação de `.no-print`.

### Envio de imagem e OpenRouter

O dashboard aceita um arquivo `image/*` ou uma descrição digitada. A pré-visualização é
mostrada antes do envio. Imagens devem ter no máximo 10 MB após decodificação; o servidor
converte a imagem em descrição com a API OpenRouter, sem usar o modelo para classificar a
ideia ou calcular a nota.

Configure `OPENROUTER_API_KEY` no ambiente antes de iniciar o servidor. O arquivo
`.env.example` documenta as variáveis, mas o projeto não carrega `.env` automaticamente.
`OPENROUTER_MODEL` é opcional e, se ausente, usa
`openai/gpt-5.6-luna`, o modelo de visão padrão.

O fix-13 validou uma imagem PNG com texto por chamada real ao OpenRouter: o Luna retornou a
transcrição esperada, e o fluxo HTTP gravou a ideia extraída e preservou a imagem exibida no
relatório A4. A chamada usou o formato multimodal `image_url` já adotado pelo servidor; o erro
genérico `Provider returned error` agora revela a mensagem interna enviada pelo provedor quando
ela está disponível. Essa validação confirma o fluxo para a imagem testada, não uma garantia de
disponibilidade contínua do provedor.

PowerShell:

```powershell
$env:OPENROUTER_API_KEY="sua_chave"
$env:OPENROUTER_MODEL="openai/gpt-5.6-luna"
npm start
```

Dois exemplos de chamada:

```bash
# Verificar se o serviço está no ar
curl http://localhost:3000/saude

# Enviar uma ideia
curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"
```

E dois exemplos de evidências:

```bash
# Registrar uma evidência de mercado
curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"concorrente\",\"fonte\":\"Google Play\",\"url\":\"https://play.google.com/store/apps/details?id=exemplo.financas\",\"trecho_bruto\":\"Organize suas contas e metas em um só lugar.\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"

# Listar todas as evidências registradas
curl http://localhost:3000/evidencias
```

Um exemplo de evidência vinculada a uma validação, que é o que faz a nota ser da ideia:

```bash
# Primeiro, validar a ideia e copiar o id devolvido
curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"

# Depois, registrar a evidência com o id da validação
curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"concorrente\",\"fonte\":\"Google Play\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\",\"id_validacao\":\"1792233527713-obrjge\"}"

# E consultar a nota só daquela ideia
curl "http://localhost:3000/nota?id=1792233527713-obrjge"
```

Um exemplo de evidência de monetização, o tipo que alimenta o critério "alguém paga?":

```bash
curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"monetizacao\",\"fonte\":\"Página de preços de concorrente\",\"url\":\"https://exemplo.com/precos\",\"trecho_bruto\":\"Planos a partir de R$ 19,90 por mês.\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"
```

Um exemplo de evidência de alcance, o tipo que alimenta o critério "você alcança essas
pessoas?":

```bash
curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"alcance\",\"fonte\":\"Relatório de audiência de um canal\",\"url\":\"https://exemplo.com/audiencia\",\"trecho_bruto\":\"O público-alvo está concentrado em um grupo específico, com canal de acesso conhecido.\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"
```

E um exemplo de nota:

```bash
curl http://localhost:3000/nota
```

## Endpoints

| Método | Rota               | Resposta                                                                                             |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| GET    | `/saude`           | `200` com `{"ok": true, "servico": "validador-negocios"}` — verificação de que o serviço está no ar   |
| POST   | `/validar-ideia`   | `200` com `recebido`, `id`, `ideia`, `tipo`, `timestamp` e `expires_at` quando a ideia é válida. O `id` é um UUID v4 e dá acesso ao relatório, e o `expires_at` marca 30 dias à frente |
| POST   | `/validar-ideia`   | `400` com `{"error": "..."}` quando o campo `ideia` falta, está vazio ou não é texto                 |
| POST   | `/validar-ideia`   | `413` quando o corpo do pedido passa de 100 KB                                                       |
| POST   | `/validar-ideia`   | `400` com `{"error": "JSON invalido"}` quando o corpo enviado não é um JSON bem formado              |
| GET    | `/validar-ideia`   | `405` com o cabeçalho `Allow: POST` — a rota existe, mas não aceita esse método                      |
| POST   | `/saude`           | `405` com o cabeçalho `Allow: GET`                                                                    |
| POST   | `/evidencias`      | `201` com a evidência gravada, já com `id` e `timestamp` gerados pelo servidor. Aceita `id_validacao` opcional, que vincula a evidência a uma ideia |
| POST   | `/evidencias`      | `400` com `{"error": "..."}` quando falta um campo obrigatório, ou o `tipo` ou a `relevancia` não valem   |
| GET    | `/evidencias`      | `200` com `{"total": N, "evidencias": [...]}`. Sem filtro, devolve todas as evidências                  |
| GET    | `/evidencias`      | `200` com só as evidências vinculadas, quando `?id=<id de validação>` existe e não está expirado          |
| GET    | `/evidencias`      | `410` com `{"error": "Este link expirou"}` quando `?id=` aponta para uma validação com o prazo vencido    |
| GET    | `/evidencias`      | `404` com `{"error": "Validacao nao encontrada"}` quando `?id=` não corresponde a nenhuma validação      |
| outro  | `/evidencias`      | `405` com o cabeçalho `Allow: GET, POST` — a rota não aceita esse método                                  |
| GET    | `/nota`            | `200` com `{"criterios", "total", "maximo_possivel", "veredito"}`. Com `?id=<id>`, a nota é só da ideia; sem ele, é a nota geral |
| outro  | `/nota`            | `405` com o cabeçalho `Allow: GET` — a rota não aceita esse método                                     |
| GET    | `/dashboard`       | `200` com a página HTML do dashboard: formulário, resultado e botão de copiar link                    |
| GET    | `/relatorio/:id`   | `200` com o relatório em HTML da validação de id, em folha A4                                          |
| GET    | `/relatorio/:id`   | `410` em HTML quando o link venceu o `expires_at`. A validação continua existindo                       |
| GET    | `/relatorio/:id`   | `200` mesmo com o prazo vencido, quando a validação é antiga e não tem `expires_at`                     |
| GET    | `/relatorio/:id`   | `404` em HTML quando não existe validação com esse id                                                   |
| GET    | qualquer outra     | `404` com `{"error": "Rota nao encontrada", "caminho": "..."}`                                         |

O corpo da resposta é sempre JSON, inclusive nos casos de erro.

Os dados ficam em dois arquivos de texto, um registro JSON por linha: `validacoes.jsonl` e
`evidencias.jsonl`. A leitura é **resiliente**: se uma linha ficar corrompida, ela é
ignorada com um aviso no log, e as demais linhas continuam sendo servidas normalmente. Uma
linha ruim nunca derruba o serviço com erro 500.

Um exemplo de resposta de `/nota`, com três concorrentes e duas reclamações registradas:

```json
{
  "criterios": {
    "tem_gente": {
      "pontos": 1,
      "maximo": 1,
      "detalhe": "3 concorrentes registrados"
    },
    "tem_gente_insatisfeita": {
      "pontos": 1,
      "maximo": 1,
      "detalhe": "2 reclamacoes registradas"
    },
    "cabe_mais_um": {
      "pontos": 1,
      "maximo": 1,
      "detalhe": "3 concorrentes registrados. Ha espaco para mais um."
    },
    "alguem_paga": {
      "pontos": 1,
      "maximo": 1,
      "detalhe": "1 evidencia de monetizacao registrada."
    },
    "alcance": {
      "pontos": 1,
      "maximo": 1,
      "detalhe": "1 evidencia de alcance registrada."
    }
  },
  "total": 5,
  "maximo_possivel": 5,
  "veredito": {
    "decisao": "SEGUIR",
    "faixa": "4 a 5",
    "explicacao": "Vale gastar as proximas 24h testando com gente de verdade."
  }
}
```

Cada critério traz três coisas: os pontos que concedeu, o máximo que poderia conceder e um
texto explicando como chegou ao resultado. O `total` é a soma dos pontos e o
`maximo_possivel` é a soma dos máximos. Com os cinco critérios implementados, a escala vai de
0 a 5 e está fechada: `maximo_possivel` não muda mais. O `veredito` traduz essa nota em uma
decisão, e é descrito na seção seguinte.

## Estrutura do projeto

| Arquivo                             | Função                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `server.js`                         | O serviço. Recebe requisições, valida, classifica, grava e devolve as respostas.                         |
| `server.test.js`                    | 78 testes do serviço HTTP, usando o módulo de testes nativo do Node.js.                                 |
| `evidencias.js`                     | Módulo de evidências: valida e grava registros de concorrentes, reclamações, dados de mercado, monetização e alcance. |
| `evidencias.test.js`                | 19 testes do módulo de evidências, também com arquivos temporários.                                      |
| `nota.js`                           | Módulo da nota de viabilidade. Aplica os critérios da régua e deriva o veredito.                           |
| `nota.test.js`                      | 23 testes do cálculo da nota e do veredito, sem HTTP e sem disco.                                          |
| `jsonl.js`                          | Leitura e escrita dos arquivos JSON Lines, compartilhadas pelos dois módulos.                              |
| `relatorio.js`                      | Gera o HTML do relatório A4 e do dashboard, usando `public/styles.css`.                                   |
| `testar-evidencias.js`              | Script de verificação manual do módulo de evidências.                                                     |
| `package.json`                      | Nome do projeto e os comandos `start` e `test`.                                                          |
| `validacoes.jsonl`                  | Registro das validações recebidas (gerado em execução, não versionado).                                  |
| `evidencias.jsonl`                  | Registro das evidências (gerado em execução, não versionado).                                            |
| `ESTADO.md`                         | Memória de trabalho do projeto: o que existe, o que falta e as decisões tomadas.                         |
| `relatorios/`                       | Um relatório por tarefa, com o que foi feito e as justificativas.                                         |
| `.gitignore`                        | Define o que não entra no repositório.                                                                   |
| `.gitattributes`                    | Normaliza finais de linha para LF, para o repositório ficar igual em qualquer sistema.                  |
| `Fluxograma de IA.svg`              | O fluxograma do projeto, que define as etapas planejadas.                                                 |
| `Agente Validador*.pdf`             | Documentos de apoio do projeto.                                                                          |

O projeto tem uma única dependência: `express`. O módulo de testes usado nos testes é
nativo do Node.js.

## Estado do projeto

Fase avançada: o serviço de validação e classificação está funcionando, a régua está
completa com os cinco critérios, cada nota vem com um veredito, e a nota é **por ideia**:
as evidências se vinculam ao identificador da validação, e o relatório mostra a nota
correta daquela ideia. Há um dashboard em HTML que gera um relatório A4 com link para
compartilhar. São 123 testes automatizados, todos passando.

O serviço é **público e de portfólio**, com isso avisado na própria interface: banner no
dashboard, aviso de que os dados são de demonstração, aviso de que a qualidade da nota
depende da qualidade das evidências, link para o código-fonte e para o perfil do autor no
rodapé. O relatório repete o aviso de que a evidência não tem verificação de fonte, e
**todo link expira em 30 dias**.

O que ainda falta: coletar concorrentes e reclamações de verdade, e publicar o serviço.

## Próximos passos

- Coletar concorrentes reais e extrair reclamações de usuários
- Publicar o serviço e o dashboard
- Ligar a coleta de evidências ao id da validação automaticamente

O registro da pendência **"Integrar imagem com LLM para extrair descrição da ideia
automaticamente"** fica aqui como histórico; ela foi resolvida no fix-11.

O detalhamento do que falta, das decisões já tomadas e do próximo passo imediato está em
`ESTADO.md`.
