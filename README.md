# Validador de Novos Negócios

Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela, registra a
validação, recebe e lista evidências de mercado, e calcula uma nota de viabilidade a
partir dessas evidências. É o primeiro passo de um projeto maior: cruzar a ideia com o
mercado e dar um veredito.

Repositório: https://github.com/clodoteixeira-1974/validador-negocios

## O que faz

Hoje, o serviço faz quatro coisas:

1. **Valida a ideia.** Você envia uma ideia em texto. O servidor confere se o pedido está
   bem formado e devolve uma resposta clara, seja aceito ou recusado.
2. **Classifica o tipo.** Se a ideia menciona "app" ou "aplicativo", ela é classificada
   como `mobile`. Caso contrário, como `outro`.
3. **Guarda evidências de mercado.** É possível registrar concorrentes, reclamações de
   usuários e dados de setor, e depois listar tudo o que foi registrado.
4. **Dá uma nota de viabilidade.** A nota é calculada a partir das evidências registradas,
   aplicando um critério de cada vez e explicando como cada um chegou ao resultado.

Cada validação aceita é gravada em um arquivo de registro com a ideia, o tipo e a data e
hora. Cada evidência registrada é gravada em outro arquivo, com a fonte, o trecho
original, a ideia à qual se refere e o nível de relevância.

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
  link do relatório.
- **`/relatorio/:id`** — relatório daquela validação, com a ideia, a data, a nota, o
  veredito, o detalhamento dos cinco critérios e as evidências relacionadas.

O CSS é embutido nas duas páginas e não carrega fonte, imagem ou biblioteca externa. A
folha está dimensionada para A4 com margem de 2 cm, e as regras de impressão escondem botões
e painéis, de modo que "Imprimir" sai limpo.

O projeto foi construído em etapas pequenas, cada uma com testes automatizados e um
relatório em `relatorios/` explicando o que foi feito e por quê.

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

São 71 testes automatizados, todos passando.

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
| POST   | `/validar-ideia`   | `200` com `recebido`, `id`, `ideia`, `tipo` e `timestamp` quando a ideia é válida. O `id` dá acesso ao relatório |
| POST   | `/validar-ideia`   | `400` com `{"error": "..."}` quando o campo `ideia` falta, está vazio ou não é texto                 |
| POST   | `/validar-ideia`   | `413` quando o corpo do pedido passa de 100 KB                                                       |
| POST   | `/validar-ideia`   | `400` com `{"error": "JSON invalido"}` quando o corpo enviado não é um JSON bem formado              |
| GET    | `/validar-ideia`   | `405` com o cabeçalho `Allow: POST` — a rota existe, mas não aceita esse método                      |
| POST   | `/saude`           | `405` com o cabeçalho `Allow: GET`                                                                    |
| POST   | `/evidencias`      | `201` com a evidência gravada, já com `id` e `timestamp` gerados pelo servidor                          |
| POST   | `/evidencias`      | `400` com `{"error": "..."}` quando falta um campo obrigatório, ou o `tipo` ou a `relevancia` não valem   |
| GET    | `/evidencias`      | `200` com `{"total": N, "evidencias": [...]}`; com nada registrado, `{"total": 0, "evidencias": []}`     |
| outro  | `/evidencias`      | `405` com o cabeçalho `Allow: GET, POST` — a rota não aceita esse método                                  |
| GET    | `/nota`            | `200` com `{"criterios": {...}, "total": N, "maximo_possivel": N}` — a nota a partir das evidências     |
| outro  | `/nota`            | `405` com o cabeçalho `Allow: GET` — a rota não aceita esse método                                     |
| GET    | `/dashboard`       | `200` com a página HTML do dashboard: formulário, resultado e botão de copiar link                    |
| GET    | `/relatorio/:id`   | `200` com o relatório em HTML da validação de id, em folha A4                                          |
| GET    | `/relatorio/:id`   | `404` em HTML quando não existe validação com esse id                                                   |
| GET    | qualquer outra     | `404` com `{"error": "Rota nao encontrada", "caminho": "..."}`                                         |

O corpo da resposta é sempre JSON, inclusive nos casos de erro.

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
| `server.test.js`                    | 37 testes do serviço HTTP, usando o módulo de testes nativo do Node.js.                                 |
| `evidencias.js`                     | Módulo de evidências: valida e grava registros de concorrentes, reclamações, dados de mercado, monetização e alcance. |
| `evidencias.test.js`                | 11 testes do módulo de evidências, também com arquivos temporários.                                      |
| `nota.js`                           | Módulo da nota de viabilidade. Aplica os critérios da régua e deriva o veredito.                           |
| `nota.test.js`                      | 23 testes do cálculo da nota e do veredito, sem HTTP e sem disco.                                          |
| `relatorio.js`                      | Gera o HTML do relatório A4 e do dashboard, com o CSS embutido.                                            |
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
completa com os cinco critérios, cada nota vem com um veredito, e há um dashboard em HTML
que gera um relatório A4 com link para compartilhar. São 71 testes automatizados, todos
passando.

O que ainda falta: coletar concorrentes e reclamações de verdade, publicar o serviço, e
ligar a nota a uma ideia específica.

## Próximos passos

- Coletar concorrentes reais e extrair reclamações de usuários
- Publicar o serviço e o dashboard
- Dar um identificador de validação e fazer a nota ser por ideia
- Relatório com mais de uma validação

O detalhamento do que falta, das decisões já tomadas e do próximo passo imediato está em
`ESTADO.md`.