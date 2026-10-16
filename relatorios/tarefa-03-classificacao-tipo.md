# Relatório: Tarefa 03 - Análise Mobile

**Data:** 15/10/2026

**Objetivo:** Adicionar análise determinística ao endpoint `POST /validar-ideia` classificando a ideia como `"tipo": "mobile"` ou `"tipo": "outro"`.

**O que foi feito:**
- Leitura do `server.js` existente e confirmação de que a lógica de `tipo` **não estava presente** no arquivo. A versão em disco era a da Tarefa 02 (apenas `recebido`, `ideia`, `timestamp`).
- Adicionada ao `server.js` a regra de classificação determinística:
  - constante `PALAVRAS_MOBILE = ['app', 'aplicativo']`
  - função `classificarTipo(ideia)` que normaliza o texto para minúsculas, verifica se contém alguma das palavras e devolve `'mobile'` ou `'outro'`
  - novo campo `tipo` na resposta, mantendo `recebido`, `ideia`, `timestamp` e o tratamento de erro 400 inalterado
- Servidor iniciado em segundo plano com `node server.js` e os quatro testes executados.

**Conteúdo final do `server.js`:**
```javascript
const express = require('express');

const app = express();
const port = 3000;

// Palavras que classificam a ideia como mobile
const PALAVRAS_MOBILE = ['app', 'aplicativo'];

// Regra única de classificação
function classificarTipo(ideia) {
  const texto = ideia.toLowerCase();
  const ehMobile = PALAVRAS_MOBILE.some((palavra) => texto.includes(palavra));
  return ehMobile ? 'mobile' : 'outro';
}

// Middleware para parsear JSON
app.use(express.json());

// Endpoint POST /validar-ideia
app.post('/validar-ideia', (req, res) => {
  const { ideia } = req.body;

  if (!ideia || ideia.trim() === '') {
    return res.status(400).json({ error: "Campo 'ideia' ausente ou vazio" });
  }

  res.json({
    recebido: true,
    ideia: ideia,
    tipo: classificarTipo(ideia),
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
```

**Arquivos criados ou modificados:**
- `server.js` (modificado)
- `relatorios/tarefa-03-analise-mobile.md` (criado)

**Dependências instaladas:**
Nenhuma. Continua apenas `express` (já instalada na Tarefa 02). Nenhuma biblioteca nova foi adicionada; a classificação usa `String.prototype.toLowerCase`, `Array.prototype.some` e `String.prototype.includes`, todos nativos do JavaScript.

**Comandos exatos para testar:**

Iniciar o servidor:
```powershell
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "C:\Users\clodo\Downloads\iavalidadora" -WindowStyle Hidden
```

Teste A — válido, mobile:
```powershell
$r = Invoke-WebRequest -Uri http://localhost:3000/validar-ideia -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ideia":"App para controlar gastos"}'
Write-Host "Status:" $r.StatusCode
Write-Host "Corpo:" $r.Content
```

Teste B — válido, outro:
```powershell
$r = Invoke-WebRequest -Uri http://localhost:3000/validar-ideia -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ideia":"Consultoria de marketing"}'
Write-Host "Status:" $r.StatusCode
Write-Host "Corpo:" $r.Content
```

Testes C e D — respostas 400 (o `Invoke-WebRequest` do PowerShell 5.1 interrompe o script ao receber 400 e não imprime `$r`; por isso foram executados com `curl.exe`):
```powershell
curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" -d "{}" http://localhost:3000/validar-ideia

curl.exe -s -o - -w "`nStatus: %{http_code}`n" -X POST -H "Content-Type: application/json" -d '{\"ideia\":\"\"}' http://localhost:3000/validar-ideia
```

**Resultado observado (saída real do terminal):**

Teste A:
```
Status: 200
Corpo: {"recebido":true,"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:17:15.027Z"}
```

Teste B:
```
Status: 200
Corpo: {"recebido":true,"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:17:17.340Z"}
```

Teste C:
```
{"error":"Campo 'ideia' ausente ou vazio"}
Status: 400
```

Teste D:
```
{"error":"Campo 'ideia' ausente ou vazio"}
Status: 400
```

**Evidência:**
- Teste A retornou status 200 com `"tipo":"mobile"` e timestamp `2026-10-15T23:17:15.027Z`.
- Teste B retornou status 200 com `"tipo":"outro"` e timestamp `2026-10-15T23:17:17.340Z` (timestamp distinto do Teste A, como esperado).
- Testes C e D retornaram status 400 com `{"error":"Campo 'ideia' ausente ou vazio"}`.

**O que não funcionou ou ficou pendente:**
- Durante a execução, a primeira tentativa do Teste D via `curl.exe` com aspas duplas escapadas (`-d "{\"ideia\":\"\"}"`) enviou JSON malformado e o Express respondeu com uma página de erro HTML de `SyntaxError` do parser JSON (status 400). Saída real dessa tentativa:
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
  Isso foi um problema de escaping do PowerShell no comando de teste, não do servidor. Repetido com aspas simples, retornou 400 com o JSON esperado.
- O Teste C executado com `Invoke-WebRequest` no PowerShell 5.1 abortou o script no erro 400 e imprimiu `Status: 0` / `Corpo:` vazios, portanto não serve como evidência de status. Foi substituído por `curl.exe`.
- Não há teste automatizado; a verificação é manual via terminal.
- O `package.json` não foi alterado.

**Observações técnicas para a próxima tarefa:**
- A regra de classificação está isolada em `PALAVRAS_MOBILE` e `classificarTipo()` no topo do `server.js`, o que facilita alterações futuras sem tocar no handler.
- A classificação atual é por substring (`includes`), então "aplicativo" dentro de uma palavra maior também dispara. Se isso for indesejado, trocar por regex com limites de palavra.
- A classificação não diferencia maiúsculas/minúsculas porque o texto é normalizado com `toLowerCase()`, cobrindo "App", "app", "Aplicativo" e "aplicativo".
- `new Date().toISOString()` gera timestamps distintos por requisição, o que foi confirmado pela diferença entre os Testes A e B.
- Para próximos testes, `curl.exe` é mais confiável que `Invoke-WebRequest` no PowerShell 5.1 quando se espera resposta 400.
- O servidor foi iniciado com `Start-Process` em segundo plano porque `npm start` ocupa o terminal até o timeout da ferramenta.