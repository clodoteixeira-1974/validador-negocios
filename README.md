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

A nota é um número de 0 a 5 pontos, dividido em cinco critérios. **Três deles já estão
implementados**:

- **"Tem gente?"** — concede 1 ponto quando há 2 ou mais concorrentes registrados.
- **"Tem gente insatisfeita?"** — concede 1 ponto quando há pelo menos uma reclamação
  registrada.
- **"Cabe mais um?"** — concede 1 ponto quando há entre 2 e 4 concorrentes registrados. Poucos
  concorrentes mostram que o mercado ainda está aberto; muitos demais mostram que já está
  saturado.

Os outros dois ainda não existem. Por enquanto a nota é geral, ou seja, considera todas as
evidências guardadas, sem distinguir uma ideia da outra.

O projeto foi construído em etapas pequenas, cada uma com testes automatizados e um
relatório em `relatorios/` explicando o que foi feito e por quê.

## Como rodar

Requer Node.js instalado. Não é preciso Docker nem banco de dados.

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000`. Para usar outra porta:

```bash
PORT=8080 npm start          # Linux/macOS
$env:PORT=8080; npm start    # PowerShell (Windows)
```

Para rodar os testes:

```bash
npm test
```

São 47 testes automatizados, todos passando.

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

E um exemplo de nota:

```bash
curl http://localhost:3000/nota
```

## Endpoints

| Método | Rota               | Resposta                                                                                             |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| GET    | `/saude`           | `200` com `{"ok": true, "servico": "validador-negocios"}` — verificação de que o serviço está no ar   |
| POST   | `/validar-ideia`   | `200` com `recebido`, `ideia`, `tipo` e `timestamp` quando a ideia é válida                         |
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
    }
  },
  "total": 3,
  "maximo_possivel": 3
}
```

Cada critério traz três coisas: os pontos que concedeu, o máximo que poderia conceder e um
texto explicando como chegou ao resultado. O `total` é a soma dos pontos e o
`maximo_possivel` é a soma dos máximos, então os dois crescem sozinhos a cada critério que
entra. Hoje valem 3 e 3, porque existem três critérios.

## Estrutura do projeto

| Arquivo                             | Função                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `server.js`                         | O serviço. Recebe requisições, valida, classifica, grava e devolve as respostas.                         |
| `server.test.js`                    | 27 testes do serviço HTTP, usando o módulo de testes nativo do Node.js.                                 |
| `evidencias.js`                     | Módulo de evidências: valida e grava registros de concorrentes, reclamações e dados de mercado.            |
| `evidencias.test.js`                | 7 testes do módulo de evidências, também com arquivos temporários.                                       |
| `nota.js`                           | Módulo da nota de viabilidade. Aplica os critérios da régua às evidências registradas.                    |
| `nota.test.js`                      | 13 testes do cálculo da nota, sem HTTP e sem disco.                                                       |
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

Fase intermediária: o serviço de validação e classificação está funcionando, as rotas de
evidências estão integradas ao servidor, e três dos cinco critérios da régua de
viabilidade já calculam a nota a partir das evidências registradas. São 47 testes
automatizados, todos passando.

O que ainda falta: completar os dois critérios restantes, coletar concorrentes e
reclamações de verdade, e só então gerar o relatório final.

## Próximos passos

- Implementar o quarto critério da régua ("alguém paga?")
- Completar os dois critérios restantes da nota de viabilidade
- Coletar concorrentes reais e extrair reclamações de usuários
- Integrar um modelo de linguagem e busca semântica (RAG)
- Gerar relatório final em PDF
- Interface web e publicação do serviço

O detalhamento do que falta, das decisões já tomadas e do próximo passo imediato está em
`ESTADO.md`.