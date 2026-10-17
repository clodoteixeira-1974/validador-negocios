# fix-13 — Modelo de visão validado e extração de imagem

**Data:** 17/10/2026
**Projeto:** Validador de Novos Negócios
**Base:** commit `4b256bf` — fix-12: modelo de visão padrão trocado para GPT-5.6 Luna

## Objetivo

Investigar `Provider returned error`, validar o formato de imagem e a extração com uma chamada
real ao OpenRouter, e confirmar que a imagem e o texto extraído chegam ao relatório A4.

## Diagnóstico direto ao OpenRouter

Foi feita uma chamada com `openai/gpt-5.6-luna`, formato `image_url` já usado por `server.js`,
e um PNG Base64 1×1 de teste. O status e o objeto de erro retornado foram:

```json
{
  "status": 400,
  "error": {
    "message": "Provider returned error",
    "code": 400,
    "metadata": {
      "raw": "{\n  \"error\": {\n    \"message\": \"The image data you provided does not represent a valid image. Please check your input and try again.\",\n    \"type\": \"invalid_request_error\",\n    \"param\": \"input\",\n    \"code\": \"invalid_value\"\n  }\n}",
      "provider_name": "Azure",
      "is_byok": false,
      "provider_error_code": "invalid_value",
      "previous_errors": [
        {
          "code": 400,
          "message": "Provider returned error",
          "provider_name": "OpenAI",
          "raw": "{\n  \"error\": {\n    \"message\": \"The image data you provided does not represent a valid image. Please check your input and try again.\",\n    \"type\": \"invalid_request_error\",\n    \"param\": \"input\",\n    \"code\": \"invalid_value\"\n  }\n}"
        }
      ]
    }
  }
}
```

O erro detalhado desta chamada é de conteúdo da imagem (`invalid_value`), não de suporte a
`image_url`. O pequeno PNG usado para reproduzir a falha não era uma imagem válida. Portanto,
esse resultado não prova a causa do upload anterior do usuário, cujo arquivo não estava
disponível para inspeção.

Em uma chamada direta seguinte, com um PNG válido contendo `APP PARA CUIDAR PLANTAS`, o
OpenRouter respondeu HTTP `200`; o corpo continha `model: openai/gpt-5.6-luna`, `provider:
OpenAI` e `choices[0].message.content: APP PARA CUIDAR PLANTAS`. O conteúdo veio do modelo,
sem mudança de formato da requisição. Mantive o Luna como padrão, sem trocar para Gemini.

## Validação ponta a ponta

Gerei fora do repositório um PNG de teste de 640×140 pixels, com o texto `APP PARA CUIDAR
PLANTAS` (arquivo temporário de 3271 bytes). O servidor foi iniciado em porta efêmera dentro
do mesmo processo Node, recebeu a imagem em `POST /validar-ideia`, chamou o OpenRouter real e
foi encerrado ao final. A resposta real da rota foi:

```text
POST imagem invalida: HTTP 400
{
  "error": "Falha ao processar imagem: The image data you provided does not represent a valid image. Please check your input and try again."
}
POST imagem PNG de texto: HTTP 200
{
  "recebido": true,
  "id": "37eaa172-894c-4c52-a8df-0202a7109dee",
  "ideia": "APP PARA CUIDAR PLANTAS",
  "tipo": "mobile",
  "timestamp": "2026-10-17T16:53:37.463Z",
  "expires_at": "2026-11-16T16:53:37.463Z"
}
GET /relatorio/37eaa172-894c-4c52-a8df-0202a7109dee HTTP 200
{
  "status": 200,
  "containsExtractedIdea": true,
  "containsEmbeddedImage": true
}
```

O HTML foi conferido programaticamente: contém a ideia extraída e a data URI da imagem. Isso
valida o fluxo até o HTML do relatório; não é uma inspeção visual impressa em navegador. O
teste usou um cartão PNG gerado para OCR, não o arquivo específico que falhou anteriormente.

## Implementação e documentação

- `.env.example` mantém `OPENROUTER_MODEL=openai/gpt-5.6-luna` e indica que foi validado para
  extração de texto.
- `server.js` mantém o formato multimodal `text` + `image_url` e o padrão Luna. Quando a resposta
  genérica `Provider returned error` contém `error.metadata.raw` com um erro JSON, o servidor
  agora repassa a mensagem interna legível ao dashboard.
- `server.test.js` cobre a extração da causa encapsulada pelo OpenRouter.
- `CONTRATO.md`, `README.md` e `ESTADO.md` documentam o formato validado, o modelo mantido e o
  resultado ponta a ponta.
- O modelo Luna funcionou com a imagem PNG de teste. Uma única chamada bem-sucedida não garante
  disponibilidade contínua do provedor nem identifica a causa precisa do upload anterior.

## Testes e verificações

`npm test` terminou com o seguinte resumo real:

```text
ℹ tests 122
ℹ suites 0
ℹ pass 122
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6238.1108
```

- `git diff --check`: terminou sem saída e sem erro.
- `npx tsc --noEmit`: não executável porque o compilador TypeScript não está instalado; o `npx`
  mostrou a mensagem “This is not the tsc command you are looking for”.
- `npx eslint .`: não completou; ESLint 10.13.0 não encontrou arquivo `eslint.config.*`.
- A chamada real usou Node `fetch`; nenhum `curl.exe` foi usado e nenhum servidor ficou em
  segundo plano.
- `OPENROUTER_API_KEY` foi confirmada no ambiente sem imprimir seu conteúdo.
- O comando obrigatório `memory --action read --target daily` não existe neste ambiente. Não
  foi encontrado arquivo diário de hoje; foram consultados o status de 16/10/2026 e `ESTADO.md`.
- `opencode.json` já estava não rastreado antes da tarefa e foi preservado fora das alterações.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** Escrita JSONL síncrona bloqueia
   o event loop; chamadas ao provedor não têm timeout; rate limits são por IP e processo, sem
   coordenação entre instâncias.
2. **Onde há alucinação lógica neste fluxo?** O modelo pode transcrever incorretamente ou
   inferir texto ausente. A ideia extraída entra no fluxo sem revisão humana; a classificação é
   determinística, mas usa essa transcrição como entrada.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas JSON inválidas são
   ignoradas com aviso e as válidas continuam acessíveis; a linha danificada não é reparada.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** Chamadas ao OpenRouter podem
   terminar em ordem diferente; gravações síncronas serializam dentro do processo, mas não há
   transação compartilhada entre processos.
5. **O que um atacante faria com este sistema?** Enviaria imagens repetidamente para aumentar
   custo de API e consumo de disco. A rota é pública; limites por tamanho/IP reduzem, mas não
   eliminam, abuso distribuído.
6. **Qual é a mentira mais confortável que este relatório conta?** A transcrição exata em uma
   imagem controlada parece provar que a extração será confiável. Ela só prova uma chamada
   bem-sucedida com aquele PNG e não garante qualidade ou disponibilidade em outras imagens.

## Pipeline de evolução

### Onde estamos

O fluxo de imagem foi validado com uma chamada real de OCR no Luna, desde `POST /validar-ideia`
até a inclusão do texto e da imagem no HTML do relatório. `openai/gpt-5.6-luna` permanece como
modelo padrão.

### O que foi feito até aqui

- Tarefas 01–26 e correções `fix-01` a `fix-09`, conforme `ESTADO.md`.
- `fix-11`: upload de imagem e extração via OpenRouter.
- `fix-12`: definição do Luna como modelo visual padrão.
- `fix-13`: erro upstream diagnosticado com `metadata.raw`; detalhe agora é mostrado ao cliente;
  extração e relatório A4 verificados com chamada real.

### O que falta

- [Alta] Coletar concorrentes e reclamações reais, vinculando as evidências à validação correta.
- [Alta] Configurar `OPENROUTER_API_KEY` no ambiente de deploy.
- [Média] Definir timeout e política de retentativa para chamadas ao OpenRouter.
- [Média] Validar mais formatos e imagens reais, inclusive o arquivo específico que originou o
  erro relatado, se ele estiver disponível.
- [Média] Avaliar armazenamento/retention de imagens, autenticação e rate limit compartilhado.

### Decisões tomadas

- Manter `openai/gpt-5.6-luna`: a chamada válida demonstrou suporte a `image_url` e transcrição
  do texto testado. Não foi configurado fallback porque não foi necessário para o caso validado.
- Preservar o formato multimodal usado pelo servidor. A evidência não apontou incompatibilidade
  de formato; o PNG que gerou o 400 não era válido.
- Expor a mensagem JSON interna do provedor quando o OpenRouter encapsula o erro sob uma
  mensagem genérica.

### Pendências conhecidas

- A causa do erro do arquivo que o usuário enviou originalmente permanece indeterminada, pois
  esse arquivo não estava disponível nesta tarefa.
- Uma chamada bem-sucedida não é garantia de disponibilidade futura; permanecem sem timeout e
  sem retentativa configurados.
- Permanecem as pendências de infraestrutura e os riscos registrados em `ESTADO.md`.

### Próximo passo

Tarefa 22: coletar concorrentes e reclamações reais usando `id_validacao` como vínculo
obrigatório, definindo fontes e revisão humana das evidências.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-13-modelo-visao-validado.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\fix-13-modelo-visao-validado.md").Length
```

Saída real:

```text
True
9288
```
