# Relatório: Tarefa 02 - Endpoint /validar-ideia

**Data:** 15/10/2026

**Objetivo:** Criar e testar o endpoint POST `/validar-ideia` para validar ideias de negócios.

**O que foi feito:**
- Criado o arquivo `server.js` com o endpoint `/validar-ideia`.
- Configurado o `package.json` para iniciar o servidor.
- Ajustado o endpoint para validar o campo `ideia` conforme especificado.

**Arquivos criados ou modificados:**
- `server.js`
- `package.json`

**Dependências instaladas:**
- `express`: ^4.18.2

**Comandos de teste:**
```powershell
# Teste válido
$r = Invoke-WebRequest -Uri http://localhost:3000/validar-ideia -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ideia":"App para controlar gastos"}'
Write-Host "Status:" $r.StatusCode
Write-Host "Corpo:" $r.Content

# Teste sem campo
$r = Invoke-WebRequest -Uri http://localhost:3000/validar-ideia -Method POST -Headers @{"Content-Type"="application/json"} -Body '{}'
Write-Host "Status:" $r.StatusCode
Write-Host "Corpo:" $r.Content

# Teste com campo vazio
$r = Invoke-WebRequest -Uri http://localhost:3000/validar-ideia -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ideia":""}'
Write-Host "Status:" $r.StatusCode
Write-Host "Corpo:" $r.Content
```

**Resultado observado:**
1. **Teste válido:**
   - Status: **200 OK**
   - Resposta:
     ```json
     {"recebido":true,"ideia":"App para controlar gastos","timestamp":"2026-10-15T22:42:48.219Z"}
     ```

2. **Teste sem campo:**
   - Status: **400 Bad Request**
   - Resposta:
     ```json
     {"error":"Campo 'ideia' ausente ou vazio"}
     ```

3. **Teste com campo vazio:**
   - Status: **400 Bad Request**
   - Resposta:
     ```json
     {"error":"Campo 'ideia' ausente ou vazio"}
     ```

**Evidência:**
Saída dos testes acima.

**O que não funcionou ou ficou pendente:**
Tudo funcionou conforme esperado.

**Observações técnicas para a próxima tarefa:**
- Certificar-se de que o servidor está rodando corretamente antes de executar os testes.
