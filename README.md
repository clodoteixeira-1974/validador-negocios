# Validador de Novos Negócios

Um serviço HTTP que recebe a ideia de um novo negócio, classifica o tipo dela e registra
a validação. É o primeiro passo de um projeto maior: cruzar a ideia com evidências de
mercado para dar uma nota de viabilidade.

Repositório: https://github.com/clodoteixeira-1974/validador-negocios

## O que faz

Hoje, o serviço faz duas coisas:

1. **Valida a ideia.** Você envia uma ideia em texto. O servidor confere se o pedido está
   bem formado e devolve uma resposta clara, seja aceito ou recusado.
2. **Classifica o tipo.** Se a ideia menciona "app" ou "aplicativo", ela é classificada
   como `mobile`. Caso contrário, como `outro`.

Cada validação aceita é gravada em um arquivo de registro com a ideia, o tipo e a data e
hora. O módulo de evidências, que vai alimentado essa base com concorrentes, reclamações
de usuários e dados de mercado, já está escrito e testado, mas ainda não está conectado
ao servidor.

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

Dois exemplos de chamada:

```bash
# Verificar se o serviço está no ar
curl http://localhost:3000/saude

# Enviar uma ideia
curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"
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
| GET    | qualquer outra     | `404` com `{"error": "Rota nao encontrada", "caminho": "..."}`                                         |

O corpo da resposta é sempre JSON, inclusive nos casos de erro.

## Estrutura do projeto

| Arquivo                             | Função                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `server.js`                         | O serviço. Recebe requisições, valida, classifica, grava e devolve as respostas.                         |
| `server.test.js`                    | 13 testes do serviço HTTP, usando o módulo de testes nativo do Node.js.                                 |
| `evidencias.test.js`                | 7 testes do módulo de evidências, também com arquivos temporários.                                       |
| `evidencias.js`                     | Módulo de evidências: valida e grava registros de concorrentes, reclamações e dados de mercado.            |
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

Fase inicial: o serviço de validação e classificação está funcionando, e o módulo de
evidências está pronto mas ainda não conectado ao servidor. São 20 testes automatizados,
todos passando.

## Próximos passos

- Expor as evidências através de rotas HTTP (módulo já pronto, falta conectar)
- Coletar concorrentes reais e extrair reclamações de usuários
- Calcular a nota de viabilidade a partir das evidências
- Integrar um modelo de linguagem e busca semântica (RAG)
- Gerar relatório final em PDF
- Interface web e publicação do serviço

O detalhamento do que falta, das decisões já tomadas e do próximo passo imediato está em
`ESTADO.md`.