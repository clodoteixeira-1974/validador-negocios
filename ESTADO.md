# ESTADO

Documento de memória de trabalho. Qualquer pessoa (ou IA) que abrir este repositório
começa por aqui para saber onde o projeto está.

## Pipeline de evolução

Resumo do projeto para quem chega agora. O padrão destas seções está em
`relatorios/TEMPLATE-PIPELINE.md`, e elas aparecem também, ao final, em todo relatório novo.
**Elas são atualizadas a cada tarefa concluída.** A lista do que foi feito é cumulativa: item
concluído sai da lista do que falta.

Quem valida o quê está em **Passagem de bastão**, mais abaixo. O formato dos dados está em
`CONTRATO.md`.

### Onde estamos

Fase de exposição do produto: o serviço está funcional de ponta a ponta, com nota por ideia,
relatório A4 e link de compartilhamento. O PO decidiu que ele é **público e de portfólio**,
então o produto se declara na própria interface e o link passa a ter prazo. Falta o dado
real, e as rotas de escrita continuam sem autenticação, apesar do limite de taxa.

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
- Tarefa 10: atualização deste arquivo e migração para o GitHub
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
- fix-09: expiracao em `GET /evidencias?id=`
- Tarefa 26: limite de taxa por IP nas rotas caras, em `rate-limit.js`
- fix-11: upload de imagem e extração da descrição com OpenRouter, sem alterar a régua de nota

### Decisões do PO sobre acesso e apresentação

Definidas na Tarefa 25 e implementadas no fix-08:

1. **O serviço é público, de portfólio**, com disclaimer visível na interface
2. **`POST /evidencias` continua aberto**, com disclaimer sobre qualidade de evidência
3. **Links de relatório expiram em 30 dias**
4. **O dashboard mostra o perfil do autor e o link do código-fonte**

O item 4 foi completado com o **nome do autor, `Clodoaldo Teixeira`**, confirmado pelo PO.
`relatorio.js` concentra `AUTOR_PROJETO` numa única constante, então a troca foi uma edição
só, e nenhum placeholder chegou ao HTML.

### O que falta

- [Média] Limite de taxa **compartilhado entre instâncias**. O limite existe por
  processo, em memória, então com duas instâncias atrás de balanceador o teto efetivo
  dobra. E atrás de proxy, sem `trust proxy`, todo mundo cai no mesmo balde do proxy
- [Alta] Coleta real de concorrentes e reclamações
- [Alta] Vínculo automático entre ideia e evidência na hora de coletar
- [Média] Autenticação ou revogação de link. A expiração de 30 dias fecha o relatório, a nota por
  ideia e as evidências vinculadas, mas não dá revogação antes do prazo
- [Média] Extração de reclamações
- [Média] Detecção de perda e reparo de linha corrompida. A leitura já é resiliente e a
  linha ruim é ignorada com aviso, mas ela **continua no arquivo** e não existe caminho para
  removê-la. Junto com a ausência de backup, um arquivo pela metade continua sem reparo
- [Baixa] Link do perfil do autor no rodapé: hoje aponta para o perfil no GitHub, e não para
  um site pessoal
- [Baixa] Migração das validações antigas para `expires_at`. Hoje elas não expiram
- [Baixa] RAG e outras análises de mercado com LLM; o uso atual do OpenRouter limita-se à extração de texto de imagem
- [Baixa] Relatório que compare mais de uma validação
- [Baixa] Backup dos dados de execução e `.env`
- [Baixa] Classificação de tipo ainda é por palavra-chave. O limite de palavra corrigiu o falso
  positivo de "pineapple" e "AppStore", mas a regra só reconhece `app` e `aplicativo`. Uma
  ideia de "aplicação" ou "aplicativo mobile" escrita de outra forma continua classificada
  como `outro`. A classificação não é algo que a IA vá refinar no `nota.js`

### Decisões tomadas

- **Nota por ideia**, vinculada ao `id` da validação, em vez da nota global
- **Veredito conservador**: 0-1 `PARAR`, 2-3 `MUDAR_O_RECORTE`, 4-5 `SEGUIR`, com as faixas
  calculadas por proporção da escala
- **Relatório em HTML A4, sem PDF no servidor e sem Puppeteer**; o PDF sai do navegador
- **Uma única dependência**, `express`
- **Cada critério devolve `pontos`, `maximo` e `detalhe`**, e `total` e `maximo_possivel` são
  somas
- **Documentação no mesmo commit** de toda tarefa de código, e **pendência relatada entra
  neste arquivo** na mesma tarefa
- **Convenção de nomes**: `tarefa-NN` para código, `doc-NN` para documentação, `fix-NN` para
  correções
- **Serviço público avisado, não bloqueado**: a decisão do PO trocou autenticação por
  transparência. É válido para portfólio e **não é válido como garantia**
- **Expiração de 30 dias no link do relatório**, com `expires_at` gravado e `410` na leitura
- **Validação antiga sem `expires_at` nunca expira**, por compatibilidade deliberada

O motivo de cada decisão está na seção "Decisões tomadas e por quê".

### Pendências conhecidas

- **Pendência resolvida no fix-11:** "Integrar imagem com LLM para extrair descrição da ideia automaticamente".

- **Comando `memory` inexistente**, pedido pelo `AGENTS.md`. Alternativa: ler este arquivo
- **Sem backup dos `.jsonl`**, que são ignorados pelo Git e vivem só na máquina local
- **Configuração local da chave OpenRouter**: defina `OPENROUTER_API_KEY` no ambiente para
  usar imagens. O `.env.example` documenta as variáveis, mas `.env` não é carregado
  automaticamente.
- **Limite de taxa é por processo e em memória**: com duas instâncias atrás de balanceador, o
  teto efetivo dobra. Atrás de proxy sem `trust proxy`, todo mundo divide o balde do proxy.
  `GET /saude` precisa ficar ilimitada para o balanceador continuar funcionando
- **`X-Forwarded-For` é ignorado de propósito**: ler o header sem `trust proxy` deixaria
  qualquer cliente burlar o limite só enviando o header- **Link de compartilhamento sem controle de acesso**, agora com expiração de 30 dias
- **`navigator.clipboard` exige contexto seguro**: por HTTP fora de `localhost` a cópia
  falha

O detalhe de cada uma está no fim deste arquivo, em "Pendências conhecidas".

### Próximo passo

**Tarefa 22 — coletar concorrentes e reclamações de verdade**, com o `id` da validação como
entrada obrigatória, para que toda evidência coletada já nasça vinculada a uma ideia.

## Regras do projeto

Estas regras valem para todas as tarefas, a partir da Tarefa 14.

- **Toda tarefa de código inclui a atualização de `README.md` e `ESTADO.md` no mesmo
  commit.** Não vale abrir tarefa separada para isso: a documentação ficou para trás duas
  vezes seguidas (Tarefas 11 e 13) e custou trabalho de correção.
- **Cada tarefa gera um relatório** em `relatorios/`, com a convenção de nomes abaixo.
- **Convenção de nomes dos relatórios**: `tarefa-NN-descricao.md` para tarefa de código,
  `doc-NN-descricao.md` para tarefa de documentação, `fix-NN-descricao.md` para tarefa de
  correção. O prefixo diz o tipo da tarefa, para resolver as colisões de numeração que
  aconteceram três vezes seguidas.
- **Todo relatório termina com a confirmação de existência e tamanho**, com a saída real
  de `Test-Path` e de `(Get-Item ...).Length`.
- **Testes manuais com `curl.exe` não são usados neste ambiente.** O PowerShell 5.1 quebra
  o escaping das aspas duplas e os processos iniciados em segundo plano morrem ao fim da
  sessão. A verificação é feita por testes automatizados, que sobem o servidor em porta
  efêmera e fazem requisições HTTP reais.
- **Cole a saída real dos comandos. Não invente números.**
- **Todo relatório responde às seis perguntas da Auditoria Red Team**, antes do pipeline de
  evolução. Resposta honesta vale mais que frase otimista; pergunta sem resposta recebe
  "Nao identificado nesta tarefa", nunca invenção.
- **Toda tarefa que adicionar, remover ou alterar um campo de dado atualiza o
  `CONTRATO.md` no mesmo commit.** O formato dos dados está descrito em `CONTRATO.md`, na
  raiz. Campo novo sem contrato é dívida.

## Passagem de bastão

Como a governança deste projeto se sustenta na passagem entre execuções, fica escrito quem
valida o quê.

| Etapa | Quem faz | O que é conferido | Onde o resultado fica |
| --- | --- | --- | --- |
| Especificação | Product Owner | A regra do critério, as faixas e a decisão de produto | Prompt da tarefa, e depois `ESTADO.md` |
| Execução | Agente executor | Código, testes automatizados e documentação no mesmo commit | Diff do commit |
| Número reportado | Agente executor | Que a saída colada no relatório é a real, sem número inventado | Seção de saída do relatório |
| Auditoria Red Team | Agente executor | As seis perguntas, respondidas com honestidade | Seção Red Team do relatório |
| Contrato de dados | Agente executor | Que todo campo novo ou alterado está em `CONTRATO.md` | `CONTRATO.md` no mesmo commit |
| Revisão humana | Product Owner | A decisão de produto e a prioridade do que falta | Resposta no início da próxima tarefa |

**Regra de ouro:** quando o Product Owner corrige um número, uma premissa ou um escopo, o
agente executor não deve apenas corrigir e seguir. Deve registrar a correção no relatório da
tarefa, porque ela costuma indicar que o número ou a premissa anterior entrou em um
arquivo que será lido de novo.

O que **não** é validado por agente e precisa de olho humano: a aparência do relatório
impresso em A4, o comportamento do dashboard no navegador e a verossimilhança das evidências
de mercado, porque todas as evidências gravadas até hoje são fictícias.

## O que é o produto

O Validador de Novos Negócios é um serviço HTTP que recebe a descrição de uma ideia de
negócio, classifica o tipo dela e registra a validação com data e hora. Ele também recebe
e lista evidências de mercado (concorrentes, reclamações de usuários e dados de setor) e
calcula uma nota de viabilidade a partir delas. Hoje ele valida, classifica, guarda as
evidências, aplica a régua inteira com cinco critérios, deriva o veredito e gera um relatório
HTML A4. A descrição pode ser digitada ou extraída de uma imagem via OpenRouter.

## O que existe hoje

- Endpoint `POST /validar-ideia`
- Endpoints `POST /evidencias` e `GET /evidencias` (integrados ao `server.js`)
- Cada evidência pode ser **vinculada a uma validação** pelo campo opcional
  `id_validacao`. Com o vínculo, a nota passa a ser por ideia; sem ele, a evidência segue
  valendo para a nota geral
- `GET /nota?id=<id>` e `GET /evidencias?id=<id>` filtram por validação. Sem o parâmetro,
  ambos continuam devolvendo tudo, e a nota é a geral
- `GET /relatorio/:id` calcula a nota **só com as evidências vinculadas àquele id**. A
  heurística anterior, que associava evidências por comparação do texto da ideia, foi
  removida por ser frágil
- Endpoint `GET /dashboard`: página HTML com formulário de ideia, resultado e botão de
  copiar o link do relatório. Aceita imagem com pré-visualização e consulta a nota da ideia,
  com `?id=`
- Endpoint `GET /relatorio/:id`: relatório HTML em folha A4, com a ideia, a data, a nota, o
  veredito, os cinco critérios, a imagem opcional e as evidências relacionadas. Sem JavaScript
- Cada validação recebe um `id` que é um **UUID v4**, com 122 bits de entropia
  criptográfica, devolvido na resposta de `POST /validar-ideia`. Ele dá acesso ao relatório
  e não é mais adivinhável por timestamp: o formato antigo, `<ms>-<6 caracteres>`, permitia
  forçar o link com muito menos tentativas
- Módulo `relatorio.js` gera as duas páginas, com o CSS embutido e sem recurso externo.
  Sem dependência de PDF e sem Puppeteer: o PDF sai do navegador, por "Salvar como"
- Endpoint `GET /nota` (a régua inteira: cinco critérios — "tem gente?", "tem gente
  insatisfeita?", "cabe mais um?", "alguém paga?" e "você alcança essas pessoas?")
- Veredito derivado da nota, com campo novo na resposta: `decisao` (`PARAR`,
  `MUDAR_O_RECORTE` ou `SEGUIR`), `faixa` e `explicacao`. Faixas conservadoras:
  0-1 para, 2-3 muda o recorte, 4-5 segue
- Módulo `nota.js` com as funções `calcularNota(evidencias)` e `derivarVeredito(total,
  maximoPossivel)`, sem I/O e sem dependências. Cada critério devolve `pontos`, `maximo` e
  `detalhe`; `total` e `maximo_possivel` são somas. A escala está fechada em 0 a 5
- Cinco tipos de evidência aceitos: `concorrente`, `reclamacao`, `dado_mercado`,
  `monetizacao` e `alcance`. Os dois últimos foram criados para o quarto e o quinto critério
- Classificação mobile/outro por limite de palavra: `app` e `aplicativo` só valem como
  palavra isolada. "Pineapple shop", "happy" e "AppStore" são `outro`
- Persistência em `validacoes.jsonl` e `evidencias.jsonl`
- Módulo `evidencias.js`, com caminho de arquivo injetável para que os testes não toquem
  os dados de produção
- `id` e `timestamp` das evidências gerados pelo servidor, nunca aceitos do cliente
- Healthcheck `GET /saude`
- Tratamento 400, 404, 405, 413
- 120 testes automatizados (78 em `server.test.js` + 19 em `evidencias.test.js` + 23 em
  `nota.test.js`)
- **Leitura de `.jsonl` resiliente e unificada**: `validacoes.jsonl` e `evidencias.jsonl` são
  lidos pela mesma função, em `jsonl.js`. Linha corrompida é ignorada com aviso em
  `console.warn`, e as demais linhas continuam sendo servidas. Uma linha ruim não devolve
  500 em nenhuma rota. O formato está em `CONTRATO.md`
- **`id` de validação em UUID v4**, por `crypto.randomUUID()`, com 122 bits de entropia
  criptográfica. O formato antigo, `<timestamp>-<6 caracteres>`, era adivinhável por força
  bruta. O `id` não é segredo: quem tem o link abre o relatório
- **Expiração de link em 30 dias**: `expires_at` gravado com a validação, devolvido na
  resposta, mostrado no rodapé do relatório e no dashboard. Vale para **todas as rotas que
  aceitam um id de validação**: `GET /relatorio/:id` devolve `410` em HTML, `GET /nota?id=` e
  `GET /evidencias?id=` devolvem `410` em JSON com `{"error": "Este link expirou"}`, e
  `GET /evidencias?id=` ainda devolve `404` com `{"error": "Validacao nao encontrada"}` quando o
  id não corresponde a nenhuma validação. As duas rotas sem filtro não têm prazo, porque não
  pertencem a uma validação
- **Compatibilidade com validação antiga**: as 6 validações anteriores à expiração não têm
  `expires_at` e **não expiram nunca**. Nada foi migrado, e o rodapé delas avisa que não há
  prazo. A escolha está justificada em `CONTRATO.md`
- **Avisos de portfólio na interface**: banner no topo do dashboard dizendo que os dados são
  fictícios ou de demonstração, aviso de que a nota depende da qualidade das evidências, e
  rodapé com o perfil do autor e botão "Ver código-fonte" para o repositório
- **Limite de taxa por IP nas rotas caras**, em `rate-limit.js`, sem dependência externa.
  `POST /validar-ideia` 10 por minuto, `POST /evidencias` 30, `GET /evidencias` sem filtro
  30, e 60 para relatório, nota e dashboard. A requisição barrada recebe `429` com
  `Retry-After` e **nunca chega ao handler**, então não grava arquivo nem calcula nota.
  `GET /saude` ficou sem limite de propósito, porque é o que o balanceador consulta
- **Limite em memória e por processo**, e as consequências estão anotadas: reiniciar zera,
  duas instâncias dobram o teto efetivo, e atrás de proxy sem `trust proxy` todo mundo cai
  no mesmo balde. `X-Forwarded-For` é ignorado de propósito, para não ser burlado- **Aviso no relatório** de que as evidências vêm de usuários e não há verificação de fonte
  automática, seguido da data de expiração do link
- **Página de link expirado** em HTML simples, sem o CSS pesado do relatório
- **Upload de imagem opcional** no dashboard: data URI limitada a 10 MB após decodificação,
  pré-visualizada no navegador e armazenada com a validação. `OPENROUTER_API_KEY` é lida do
  ambiente; `OPENROUTER_MODEL` usa `nvidia/nemotron-nano-12b-v2-vl:free` como fallback.

## O que não existe ainda

Alinhado ao fluxograma do projeto:

- Coleta real de concorrentes
- Extração de reclamações
- Vínculo automático entre uma ideia e suas evidências na hora de coletar
- RAG e análises de mercado com LLM (o OpenRouter atual é usado somente para extração de texto de imagem)
- Frontend além do dashboard HTML atual
- Deploy
- **Autenticação ou revogação de link**, que a decisão do PO adiou para depois da validade

## Decisões tomadas e por quê

- **Node.js em vez de Python**: já instalado, leve, compatível com VPS.
- **Sem Docker**: economia de 4 GB em SSD com 11 GB livres.
- **Express em vez de `node:http`**: padrão de mercado, legível para portfólio.
- **JSON Lines em vez de SQLite**: volume baixo, zero dependência, auditável.
- **Remoção do `app/`**: duas implementações com contrato diferente confundem.
- **Space Bunny como executor**: mais honesto e estruturado que DeepSeek Flash.
- **Migração do `.git/` local para o GitHub**: backup duplo, evita risco de corrupção no
  MEGA e dá presença em portfólio.
- **MEGA mantido como backup de arquivos**: a pasta `iavalidadora` continua sincronizada
  lá; é a cópia do conteúdo de trabalho.
- **GitHub mantido como backup de histórico git**: guarda o histórico de commits, que o
  MEGA não garante da mesma forma.
- **Serviço público, avisado como portfólio** (decisão do PO, Tarefa 25). Em vez de
  autenticar o acesso, o produto se declara: banner no dashboard, aviso de dados de
  demonstração, aviso de qualidade das evidências, link para o código-fonte e para o autor.
  É uma escolha legítima para portfólio, e ela **substitui aviso por garantia**: nada no
  código impede o uso indevido.
- **`POST /evidencias` continua aberto, com aviso de qualidade** (decisão do PO). Registrar
  uma evidência e a nota sobe. O aviso diz isso ao leitor do relatório, mas quem escreve
  não passa por ele.
- **Link de relatório expira em 30 dias** (decisão do PO). É o limite de exposição de um
  link vazado, e não controle de acesso: não há revogação antes do prazo.
- **Validação antiga não expira** (decisão técnica). Tratar o campo ausente como expirado
  quebraria relatórios que já funcionavam, sem caminho de volta. O custo é dívida
  declarada, não acidente.

Os dois backups têm papéis diferentes e complementares: o MEGA guarda os arquivos, o
GitHub guarda o histórico. Nenhum dos dois deve ser abandonado.

## Pendências para a fase de deploy

- **Script de backup automático dos arquivos `.jsonl`**, para rodar via `cron` na VPS.
  Hoje os dados de execução existem apenas na máquina local e são ignorados pelo Git.
- **Ajuste do `AGENTS.md`**: remover a dependência do comando `memory`, que não existe
  neste ambiente, e passar a usar a leitura deste arquivo como memória de trabalho.
- **Configuração de `OPENROUTER_API_KEY` no ambiente de deploy** para habilitar o envio de
  imagem em produção.

## Estado atual

- Servidor: não está rodando. Para iniciar: `npm start`
- Porta padrão: 3000 (configurável via `PORT`)
- Testes: `npm test` (120 passando)
- Repositório GitHub: https://github.com/clodoteixeira-1974/validador-negocios
- Branch principal: `main`

## Como rodar

```bash
npm install     # instala dependências (apenas express)
npm start       # sobe o servidor em http://localhost:3000
npm test        # roda os 120 testes automatizados
```

Exemplos de chamada:

```bash
curl http://localhost:3000/saude

curl -X POST http://localhost:3000/validar-ideia \
  -H "Content-Type: application/json" \
  -d "{\"ideia\":\"App para controlar gastos\"}"

curl -X POST http://localhost:3000/evidencias \
  -H "Content-Type: application/json" \
  -d "{\"tipo\":\"concorrente\",\"fonte\":\"Google Play\",\"url\":\"https://exemplo\",\"trecho_bruto\":\"Trecho original\",\"ideia_relacionada\":\"App para controlar gastos\",\"relevancia\":\"alta\"}"

curl http://localhost:3000/evidencias

curl http://localhost:3000/nota
```

Para usar outra porta: `PORT=8080 npm start` (Linux/macOS) ou
`$env:PORT=8080; npm start` (PowerShell).

## Próximo passo

**Tarefa 22 — coletar concorrentes e reclamações de verdade**, com o `id` da validação como
entrada obrigatória, para que toda evidência coletada já nasça vinculada a uma ideia. Definir
fontes, frequência de coleta e validação humana antes de incorporar evidências ao relatório.

## Pendências conhecidas

Permanecem em aberto, todas de ambiente ou de infraestrutura, nenhuma de código:

- **Comando `memory` inexistente**: o `AGENTS.md` pede
  `memory --action read --target daily`, que não existe neste ambiente. Alternativa
  disponível: ler o `ESTADO.md`, que é o que este arquivo é.
- **Sem backup dos `.jsonl`**: os dados de execução são ignorados pelo Git e existem só na
  máquina local. Falta o script para rodar via `cron` na VPS.
- **A chave `OPENROUTER_API_KEY` precisa ser configurada no ambiente** para usar imagem. O
  `.env.example` documenta as variáveis, mas o servidor não carrega `.env` automaticamente.
- **A chamada ao OpenRouter não tem timeout configurado**: se a API demorar, a requisição
  aguarda até receber uma resposta ou erro de rede.
- **A imagem é armazenada em Base64 no JSONL**: cada validação com imagem ocupa espaço
  proporcional ao arquivo enviado, sem compressão nem política de retenção separada.
- **Nota por ideia depende de o cliente enviar `id_validacao`**: o vínculo existe e é o
  que corrige o relatório, mas nada o preenche sozinho. Quem integra o serviço precisa
  validar a ideia, guardar o id devolvido e repassá-lo em cada evidência. Evidências sem
  vínculo continuam existindo e contando na nota geral, o que é útil para material que não
  pertence a uma ideia específica, mas significa que **um relatório só mostra o que foi
  vinculado a ele**.
- **Evidências já gravadas não têm vínculo.** Os registros anteriores a esta tarefa
  continuam sem `id_validacao` e, por isso, não aparecem em relatório nenhum. Como os
  arquivos `.jsonl` são ignorados pelo Git, isso não afeta quem clonar o repositório: a
  correção só vale para os dados gravados a partir daqui.
- **Link de compartilhamento sem controle de acesso**: qualquer pessoa com o link abre o
  relatório, e não há autenticação nem segredo na URL. O `id` agora é um UUID v4, o que
  **fez o ataque por força bruta caro de tentar**, e o link agora expira em 30 dias, o que
  **limita a exposição de um link vazado**. Ainda assim **não é controle de acesso**: não há
  revogação, e quem tem o link tem o relatório enquanto ele valer.
- **A expiração cobre as três rotas que aceitam id de validação**, desde o fix-09. A
  brecha de `GET /evidencias?id=` está fechada, e a pendência saiu daqui. O que
  continua assimétrico é o contrário: `POST /evidencias` continua aceitando
  `id_validacao` de validação expirada, por decisão do PO.
- **Validação antiga não expira nunca**, por decisão técnica documentada em `CONTRATO.md`.
  São 6 registros neste ambiente. O `id` em UUID v4 é o que impede a enumeração desses
  relatórios, e é por isso que a dívida foi aceita.
- **`POST /evidencias` sem autenticação nem limite de taxa**: com o serviço público, qualquer
  pessoa pode registrar evidência para qualquer `id_validacao` e mover a nota. O aviso no
  relatório é honesto, mas **aviso não é controle**. É o vetor de maior impacto que resta.
- **Envenenamento de nota é decisão consciente do PO**, não um descuido: `POST /evidencias`
  fica aberto, e o risco é documentado no relatório do fix-08 e no rodapé de todo relatório.
  Quem decide rever essa decisão é o PO.
