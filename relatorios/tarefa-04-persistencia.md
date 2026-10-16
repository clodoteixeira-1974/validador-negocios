# Relatório: Tarefa 04 - Persistência em JSON Lines

**Data:** 15/10/2026

**Objetivo:** Gravar cada validação bem-sucedida em um arquivo local `validacoes.jsonl` (JSON Lines), na mesma pasta do `server.js`, sem usar banco de dados nem instalar bibliotecas novas.

**O que foi feito:**
- Importados os módulos nativos `fs` e `path` no `server.js`.
- Definida a constante `ARQUIVO_VALIDACOES` com `path.join(__dirname, 'validacoes.jsonl')`, garantindo que o arquivo fique na mesma pasta do `server.js` independentemente do diretório de trabalho.
- Criada a função `registrarValidacao(registro)`, que faz `JSON.stringify` do registro e usa `fs.appendFileSync` com modo append e encoding `utf8`. O arquivo é criado automaticamente na primeira gravação, se ainda não existir.
- Montado um objeto `registro` único com `ideia`, `tipo` e `timestamp`, gerado uma única vez por requisição. Esse mesmo objeto é reutilizado tanto na gravação quanto na resposta HTTP, garantindo que o `timestamp` do arquivo e o da resposta sejam idênticos.
- A gravação acontece somente depois da validação de entrada: o `return` do status 400 ocorre antes, portanto requisições inválidas nunca chegam em `registrarValidacao`.
- Mantidos sem alteração: a função `classificarTipo()`, a constante `PALAVRAS_MOBILE`, o tratamento de erro 400 e o formato da resposta (`recebido`, `ideia`, `tipo`, `timestamp`).
- `package.json` não foi alterado.

**Onde a gravação acontece no fluxo do endpoint:**
```
app.post('/validar-ideia', ...)
  1. Lê req.body.ideia
  2. Valida: se ausente ou vazio -> return res.status(400)   <- encerra aqui, nada é gravado
  3. Monta o objeto registro { ideia, tipo, timestamp }
  4. registrarValidacao(registro)  -> fs.appendFileSync anexa a linha em validacoes.jsonl
  5. res.json({ recebido, ...registro })
```
A gravação é síncrona e acontece antes do envio da resposta. Se a escrita falhar (permissão, disco cheio), a exceção sobe e a requisição termina com erro 500 em vez de responder 200 — o registro não é perdido silenciosamente.

**Conteúdo final do `server.js`:**
```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Arquivo de persistência (JSON Lines), na mesma pasta do server.js
const ARQUIVO_VALIDACOES = path.join(__dirname, 'validacoes.jsonl');

// Palavras que classificam a ideia como mobile
const PALAVRAS_MOBILE = ['app', 'aplicativo'];

// Regra única de classificação
function classificarTipo(ideia) {
  const texto = ideia.toLowerCase();
  const ehMobile = PALAVRAS_MOBILE.some((palavra) => texto.includes(palavra));
  return ehMobile ? 'mobile' : 'outro';
}

// Grava uma validação bem-sucedida em JSON Lines (append)
function registrarValidacao(registro) {
  const linha = JSON.stringify(registro);
  fs.appendFileSync(ARQUIVO_VALIDACOES, linha + '\n', 'utf8');
}

// Middleware para parsear JSON
app.use(express.json());

// Endpoint POST /validar-ideia
app.post('/validar-ideia', (req, res) => {
  const { ideia } = req.body;

  if (!ideia || ideia.trim() === '') {
    return res.status(400).json({ error: "Campo 'ideia' ausente ou vazio" });
  }

  const registro = {
    ideia: ideia,
    tipo: classificarTipo(ideia),
    timestamp: new Date().toISOString()
  };

  registrarValidacao(registro);

  res.json({
    recebido: true,
    ideia: registro.ideia,
    tipo: registro.tipo,
    timestamp: registro.timestamp
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
```

**Arquivos criados ou modificados:**
- `server.js` (modificado)
- `validacoes.jsonl` (criado automaticamente pelo servidor na primeira requisição válida)
- `relatorios/tarefa-04-persistencia.md` (criado)
- Arquivo temporário `body-tmp.json` foi usado para contornar o escaping do PowerShell e foi removido ao final.

**Dependências instaladas:**
Nenhuma. Continua apenas `express`. A persistência usa exclusivamente `fs` e `path`, que são módulos nativos do Node.js. Nenhuma biblioteca foi adicionada.

**Comandos exatos para testar:**

Preparar o ambiente (garantir servidor no ar e arquivo limpo):
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Remove-Item "validacoes.jsonl" -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "C:\Users\clodo\Downloads\iavalidadora" -WindowStyle Hidden
Start-Sleep -Seconds 2
```

Para cada teste, gravar o corpo em arquivo e enviar com `--data-binary "@body-tmp.json"`:
```powershell
'{"ideia":"App para controlar gastos"}' | Out-File -FilePath "body-tmp.json" -Encoding ascii -NoNewline
curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" --data-binary "@body-tmp.json" http://localhost:3000/validar-ideia

'{"ideia":"Consultoria de marketing"}' | Out-File -FilePath "body-tmp.json" -Encoding ascii -NoNewline
curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" --data-binary "@body-tmp.json" http://localhost:3000/validar-ideia

'{"ideia":"App de receitas"}' | Out-File -FilePath "body-tmp.json" -Encoding ascii -NoNewline
curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" --data-binary "@body-tmp.json" http://localhost:3000/validar-ideia

'{}' | Out-File -FilePath "body-tmp.json" -Encoding ascii -NoNewline
curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" --data-binary "@body-tmp.json" http://localhost:3000/validar-ideia
```

**Resultado observado (saída real do terminal):**

Teste A — válido, mobile:
```
{"recebido":true,"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
Status: 200
```

Teste B — válido, outro:
```
{"recebido":true,"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
Status: 200
```

Teste C — válido, mobile:
```
{"recebido":true,"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
Status: 200
```

Teste D — inválido, sem campo:
```
{"error":"Campo 'ideia' ausente ou vazio"}
Status: 400
```

**Conteúdo real do `validacoes.jsonl` após os testes:**
```
{"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
{"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
{"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
```
Exatamente 3 linhas. O Teste D não aparece, como esperado.

**Evidência:**
- Os três timestamps do arquivo (`23:29:34.606Z`, `23:29:38.037Z`, `23:29:40.272Z`) são idênticos, respectivamente, aos das respostas dos Testes A, B e C. Isso confirma que o timestamp é gerado uma única vez e reutilizado na gravação e na resposta.
- O arquivo continha exatamente 3 linhas após as 4 requisições, provando que a requisição com status 400 não foi persistida.
- O arquivo foi apagado antes da bateria de testes e recriado automaticamente pela primeira requisição válida, confirmando a criação automática.

**O que não funcionou ou ficou pendente:**
- **Limitação do ambiente (não do código):** os comandos `curl.exe` fornecidos na especificação, com aspas duplas escapadas (`-d "{\"ideia\":\"...\"}"`), não funcionam no PowerShell deste ambiente. O PowerShell remove as aspas do argumento antes de entregá-lo ao `curl.exe`, enviando JSON malformado. Saída real dessa tentativa no Teste A:
  ```
  Status: 000
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <title>Error</title>
  </head>
  <body>
  <pre>SyntaxError: Expected property name or &#39;}&#39; in JSON at position 1 (line 1 column 2)<br> &nbsp; &nbsp;at JSON.parse (&lt;anonymous&gt;)<br> ...
  </pre>
  </body>
  </html>
  ```
  Mesmo usando variável PowerShell (`$body = '{"ideia":"..."}'` + `-d $body`) o problema persiste, pelo mesmo motivo. A solução adotada foi gravar o corpo em `body-tmp.json` e usar `--data-binary "@body-tmp.json"`, que preserva as aspas. Isso é uma restrição do shell de teste, não do endpoint.
- **`Status: 000`** observado em algumas execuções indica que o curl nem chegou a receber resposta do servidor (conexão ou argumento malformado), não um status HTTP real.
- Não existe tratamento de erro para falha de escrita em disco. Se `fs.appendFileSync` lançar (permissão negada, disco cheio), a requisição resultará em erro 500 e o cliente não receberá a resposta 200. Não foi implementado tratamento porque não estava no escopo desta tarefa.
- Não há arquivo `.gitignore` no projeto, então `validacoes.jsonl` e `node_modules` versionariam junto caso o projeto venha a ser um repositório git.
- A gravação é síncrona e bloqueia o event loop. Para o volume atual é irrelevante, mas é um limite a considerar caso venha a crescer.
- Não há testes automatizados; a verificação continua manual via terminal.

**Observações técnicas para a próxima tarefa:**
- `path.join(__dirname, 'validacoes.jsonl')` resolve o caminho de forma independente do diretório de trabalho, então o arquivo sempre cai ao lado do `server.js`.
- Cada requisição bem-sucedida cria exatamente uma linha com `JSON.stringify` + `\n`. Para ler o arquivo: `fs.readFileSync(...).split('\n').filter(Boolean).map(JSON.parse)`.
- O arquivo nunca é truncado nem reescrito; só há append. Reiniciar o servidor não apaga o histórico.
- A função `classificarTipo()` e a constante `PALAVRAS_MOBILE` permanecem intactas, então a Tarefa 03 continua válida.
- Para testar com `curl.exe` neste ambiente, gravar sempre o corpo em arquivo e usar `--data-binary "@arquivo"`. Em Linux/bash os comandos originais funcionariam sem alteração.
- Se a próxima tarefa precisar de leitura ou análise do histórico, `validacoes.jsonl` já é a fonte: basta ler e fazer `JSON.parse` linha a linha.
- O servidor foi iniciado com `Start-Process` em segundo plano porque `npm start` ocupa o terminal até o timeout da ferramenta.