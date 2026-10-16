# Relatório: Tarefa 05 - Estrutura de Evidências de Mercado

**Data:** 15/10/2026

**Objetivo:** Definir e implementar a estrutura de uma "evidência de mercado" em um módulo próprio (`evidencias.js`), com persistência em `evidencias.jsonl`, e criar um script de teste (`testar-evidencias.js`) que valide o comportamento.

**O que foi feito:**
- Criado o módulo `evidencias.js` usando apenas módulos nativos do Node.js (`fs` e `path`).
- Definida a estrutura de uma evidência com 8 campos, validação de campos obrigatórios, validação de valores enumerados (`tipo` e `relevancia`) e persistência em JSON Lines.
- Criado o script `testar-evidencias.js` que registra 3 evidências fictícias, lista todas, confere a boa formação, tenta registrar uma evidência inválida sem `fonte` e verifica a rejeição.
- Executado o script uma única vez, com o arquivo inexistente antes do teste, para que a saída refletisse a criação automática do arquivo.
- `server.js`, `validacoes.jsonl` e `package.json` não foram alterados.

**Estrutura de evidência definida (campos e tipos):**

| Campo | Tipo | Obrigatório | Valores aceitos | Observação |
|---|---|---|---|---|
| `id` | string | sim | qualquer string | Se ausente, gerado automaticamente como `<timestamp_ms>-<sufixo aleatório>` |
| `tipo` | string | sim | `concorrente`, `reclamacao`, `dado_mercado` | Validado contra a lista `TIPOS` |
| `fonte` | string | sim | qualquer string não vazia | Ex.: "Google Play", "Google Maps", "Wikipedia" |
| `url` | string | não | string, **pode ser vazia** | Se ausente, é preenchida com `""` |
| `trecho_bruto` | string | sim | qualquer string não vazia | Texto original coletado, sem interpretação |
| `ideia_relacionada` | string | sim | qualquer string não vazia | Ideia à qual a evidência se refere |
| `timestamp` | string | sim | ISO 8601 | Se ausente, gerado como `new Date().toISOString()` |
| `relevancia` | string | sim | `alta`, `media`, `baixa` | Validado contra a lista `RELEVANCIAS` |

**Ambiguidades encontradas e como foram resolvidas (não foram inventadas, foram decididas e registradas):**
1. **`url` fora de `CAMPOS_OBRIGATORIOS`.** A especificação diz que `url` "pode ser vazio se não houver". Se fosse obrigatório, uma evidência legítima sem link seria rejeitada. Por isso `url` não está na lista de obrigatórios, mas ainda é validada quanto ao tipo (tem de ser string, pode ser vazia). Exportada a lista `CAMPOS_OBRIGATORIOS` com os 7 campos realmente obrigatórios.
2. **Preenchimento automático de `id` e `timestamp`.** A especificação sugere "use timestamp + contador, ou string aleatória simples", sem fixar o formato. Foi gerado id no formato `<timestamp_ms>-<aleatório>` apenas quando o campo não é informado, para que o chamador possa fornecer o próprio id (como fez o script de teste).
3. **Acúmulo entre execuções.** O script de teste sempre faz append. Executá-lo duas vezes duplica as evidências. O script não apaga o arquivo por conta própria, para respeitar a instrução de não alterar arquivos existentes; a limpeza é responsabilidade de quem executa.

**Conteúdo final do `evidencias.js`:**
```javascript
const fs = require('fs');
const path = require('path');

// Arquivo de evidências (JSON Lines), na mesma pasta do server.js
const ARQUIVO_EVIDENCIAS = path.join(__dirname, 'evidencias.jsonl');

// Tipos aceitos
const TIPOS = ['concorrente', 'reclamacao', 'dado_mercado'];

// Níveis de relevância aceitos
const RELEVANCIAS = ['alta', 'media', 'baixa'];

// Campos que não podem faltar. "url" fica de fora de propósito,
// porque a especificação permite que o link esteja vazio.
const CAMPOS_OBRIGATORIOS = [
  'id',
  'tipo',
  'fonte',
  'trecho_bruto',
  'ideia_relacionada',
  'timestamp',
  'relevancia'
];

// Gera um id único: timestamp em ms + sufixo aleatório
function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Valida a evidência. Retorna array de problemas; vazio = válido.
function validarEvidencia(evidencia) {
  const erros = [];

  if (!evidencia || typeof evidencia !== 'object' || Array.isArray(evidencia)) {
    return ['evidencia deve ser um objeto'];
  }

  for (const campo of CAMPOS_OBRIGATORIOS) {
    const valor = evidencia[campo];

    if (valor === undefined || valor === null) {
      erros.push(`campo obrigatório ausente: "${campo}"`);
      continue;
    }

    if (typeof valor !== 'string') {
      erros.push(`campo "${campo}" deve ser string, recebido ${typeof valor}`);
      continue;
    }

    if (valor.trim() === '') {
      erros.push(`campo obrigatório vazio: "${campo}"`);
    }
  }

  if (typeof evidencia.tipo === 'string' && !TIPOS.includes(evidencia.tipo)) {
    erros.push(`"tipo" inválido: "${evidencia.tipo}" (aceitos: ${TIPOS.join(', ')})`);
  }

  if (typeof evidencia.relevancia === 'string' && !RELEVANCIAS.includes(evidencia.relevancia)) {
    erros.push(`"relevancia" inválida: "${evidencia.relevancia}" (aceitos: ${RELEVANCIAS.join(', ')})`);
  }

  if (evidencia.url !== undefined && typeof evidencia.url !== 'string') {
    erros.push(`campo "url" deve ser string (pode ser vazia), recebido ${typeof evidencia.url}`);
  }

  return erros;
}

// Grava uma evidência em evidencias.jsonl (append). Retorna a evidência gravada.
function registrarEvidencia(evidencia) {
  const registro = Object.assign({}, evidencia);

  if (registro.id === undefined || registro.id === null || registro.id === '') {
    registro.id = gerarId();
  }

  if (registro.timestamp === undefined || registro.timestamp === null || registro.timestamp === '') {
    registro.timestamp = new Date().toISOString();
  }

  if (registro.url === undefined || registro.url === null) {
    registro.url = '';
  }

  const erros = validarEvidencia(registro);

  if (erros.length > 0) {
    const erro = new Error('Evidência inválida: ' + erros.join('; '));
    erro.erros = erros;
    throw erro;
  }

  const ordem = {
    id: registro.id,
    tipo: registro.tipo,
    fonte: registro.fonte,
    url: registro.url,
    trecho_bruto: registro.trecho_bruto,
    ideia_relacionada: registro.ideia_relacionada,
    timestamp: registro.timestamp,
    relevancia: registro.relevancia
  };

  fs.appendFileSync(ARQUIVO_EVIDENCIAS, JSON.stringify(ordem) + '\n', 'utf8');

  return ordem;
}

// Lê o arquivo e devolve um array de objetos. Arquivo inexistente = array vazio.
function listarEvidencias() {
  if (!fs.existsSync(ARQUIVO_EVIDENCIAS)) {
    return [];
  }

  const conteudo = fs.readFileSync(ARQUIVO_EVIDENCIAS, 'utf8');
  const linhas = conteudo.split('\n').filter((linha) => linha.trim() !== '');

  return linhas.map((linha, indice) => {
    try {
      return JSON.parse(linha);
    } catch (erro) {
      throw new Error(`Linha ${indice + 1} de evidencias.jsonl não é um JSON válido: ${erro.message}`);
    }
  });
}

module.exports = {
  registrarEvidencia,
  listarEvidencias,
  validarEvidencia,
  gerarId,
  ARQUIVO_EVIDENCIAS,
  CAMPOS_OBRIGATORIOS,
  TIPOS,
  RELEVANCIAS
};
```

**Conteúdo final do `testar-evidencias.js`:**
```javascript
const {
  registrarEvidencia,
  listarEvidencias,
  validarEvidencia,
  CAMPOS_OBRIGATORIOS,
  TIPOS,
  RELEVANCIAS,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

const fs = require('fs');

function titulo(texto) {
  console.log('');
  console.log('=== ' + texto + ' ===');
}

titulo('Configuração');
console.log('Arquivo: ' + ARQUIVO_EVIDENCIAS);
console.log('Existe antes do teste: ' + fs.existsSync(ARQUIVO_EVIDENCIAS));
console.log('Campos obrigatórios: ' + CAMPOS_OBRIGATORIOS.join(', '));
console.log('Tipos aceitos: ' + TIPOS.join(', '));
console.log('Relevâncias aceitas: ' + RELEVANCIAS.join(', '));

const IDEIA = 'App para controlar gastos';

const DEFINIDAS = [
  {
    tipo: 'concorrente',
    fonte: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=exemplo.financas',
    trecho_bruto: 'Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas, 1 mi de downloads.',
    ideia_relacionada: IDEIA,
    relevancia: 'alta'
  },
  {
    tipo: 'reclamacao',
    fonte: 'Google Maps',
    url: 'https://www.google.com/maps/place/exemplo',
    trecho_bruto: 'O aplicativo travou na hora de categorizar minhas despesas e perdi o lançamento.',
    ideia_relacionada: IDEIA,
    relevancia: 'alta'
  },
  {
    tipo: 'dado_mercado',
    fonte: 'Wikipedia',
    url: 'https://pt.wikipedia.org/wiki/Aplicativo_de_financas',
    trecho_bruto: 'O mercado global de aplicativos de finanças pessoais foi estimado em US$ 12,4 bilhões em 2024.',
    ideia_relacionada: IDEIA,
    relevancia: 'media'
  }
];

let contador = 0;

titulo('Passo 1: registrar 3 evidências fictícias');
for (const definicao of DEFINIDAS) {
  contador++;
  const evidencia = Object.assign({ id: `evid-${contador}-${Date.now()}` }, definicao);

  try {
    const gravada = registrarEvidencia(evidencia);
    console.log('OK  ' + gravada.tipo.padEnd(12) + ' | id=' + gravada.id + ' | fonte=' + gravada.fonte);
  } catch (erro) {
    console.log('ERRO ao registrar "' + definicao.tipo + '": ' + erro.message);
  }
}

titulo('Passo 2: listar evidências registradas');
const evidencias = listarEvidencias();
console.log('Total encontrada(s): ' + evidencias.length);

evidencias.forEach((evidencia, indice) => {
  console.log('');
  console.log('  [' + (indice + 1) + '] ' + evidencia.tipo);
  console.log('      id: ' + evidencia.id);
  console.log('      fonte: ' + evidencia.fonte);
  console.log('      url: ' + (evidencia.url === '' ? '(vazio)' : evidencia.url));
  console.log('      ideia_relacionada: ' + evidencia.ideia_relacionada);
  console.log('      timestamp: ' + evidencia.timestamp);
  console.log('      relevancia: ' + evidencia.relevancia);
  console.log('      trecho_bruto: ' + evidencia.trecho_bruto);
});

titulo('Passo 3: conferir se as 3 estão bem-formadas');
const CAMPOS_ESPERADOS = ['id', 'tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'timestamp', 'relevancia'];

let bemFormadas = 0;

for (const evidencia of evidencias) {
  const faltando = CAMPOS_ESPERADOS.filter((campo) => !(campo in evidencia));
  const erros = validarEvidencia(evidencia);

  if (faltando.length === 0 && erros.length === 0) {
    bemFormadas++;
    console.log('OK  ' + evidencia.tipo.padEnd(12) + ' | todos os campos presentes e válidos');
  } else {
    console.log('ERRO ' + evidencia.tipo + ' | faltando: ' + faltando.join(', ') + ' | erros: ' + erros.join('; '));
  }
}

console.log('');
console.log('Bem-formadas: ' + bemFormadas + '/' + evidencias.length);

titulo('Passo 4: tentar registrar evidência inválida (sem "fonte")');
const invalida = {
  id: 'evid-invalida-sem-fonte',
  tipo: 'concorrente',
  url: 'https://exemplo.com',
  trecho_bruto: 'Texto qualquer sem informar a fonte.',
  ideia_relacionada: IDEIA,
  timestamp: new Date().toISOString(),
  relevancia: 'baixa'
};

const totalAntes = listarEvidencias().length;
console.log('Total no arquivo ANTES da tentativa: ' + totalAntes);

let rejeitada = false;

try {
  registrarEvidencia(invalida);
  console.log('FALHA: a evidência sem "fonte" foi aceita (não deveria).');
} catch (erro) {
  rejeitada = true;
  console.log('REJEITADA conforme esperado.');
  console.log('Motivo: ' + erro.message);
}

const totalDepois = listarEvidencias().length;
console.log('Total no arquivo DEPOIS da tentativa: ' + totalDepois);

console.log('');
console.log('Evidência rejeitada: ' + (rejeitada ? 'sim' : 'NAO'));
console.log('Arquivo não cresceu: ' + (totalAntes === totalDepois ? 'sim' : 'NAO'));

const contemInvalida = listarEvidencias().some((evidencia) => evidencia.id === 'evid-invalida-sem-fonte');
console.log('Evidência inválida presente no arquivo: ' + (contemInvalida ? 'sim (FALHA)' : 'nao (correto)'));

titulo('Resumo');
const final = listarEvidencias();
const porTipo = TIPOS.map((tipo) => tipo + '=' + final.filter((e) => e.tipo === tipo).length).join(' | ');
console.log('Evidências no arquivo: ' + final.length + ' (' + porTipo + ')');
console.log('Todas bem formadas: ' + (final.every((e) => validarEvidencia(e).length === 0) ? 'sim' : 'nao'));
console.log('Teste de rejeição: ' + (rejeitada && !contemInvalida ? 'PASSOU' : 'FALHOU'));
```

**Arquivos criados ou modificados:**
- `evidencias.js` (criado)
- `testar-evidencias.js` (criado)
- `evidencias.jsonl` (criado automaticamente pelo módulo na primeira gravação)
- `relatorios/tarefa-05-estrutura-evidencias.md` (criado)
- `server.js`, `validacoes.jsonl` e `package.json` **não foram alterados**, conforme solicitado.

**Dependências instaladas:**
Nenhuma. O módulo usa apenas `fs` e `path`, nativos do Node.js. O projeto continua com a única dependência `express`, que nem é usada por `evidencias.js` nem por `testar-evidencias.js`.

**Comandos exatos para testar:**

Executar o script de teste (a partir da pasta do projeto):
```powershell
node testar-evidencias.js
```

Para uma execução limpa (apaga as evidências do teste anterior):
```powershell
Remove-Item "evidencias.jsonl" -ErrorAction SilentlyContinue
node testar-evidencias.js
```

Conferir o conteúdo do arquivo gerado:
```powershell
Get-Content "evidencias.jsonl"
```

**Resultado observado (saída real do terminal):**

```
=== Configuração ===
Arquivo: C:\Users\clodo\Downloads\iavalidadora\evidencias.jsonl
Existe antes do teste: false
Campos obrigatórios: id, tipo, fonte, trecho_bruto, ideia_relacionada, timestamp, relevancia
Tipos aceitos: concorrente, reclamacao, dado_mercado
Relevâncias aceitas: alta, media, baixa

=== Passo 1: registrar 3 evidências fictícias ===
OK  concorrente  | id=evid-1-1792107210392 | fonte=Google Play
OK  reclamacao   | id=evid-2-1792107210397 | fonte=Google Maps
OK  dado_mercado | id=evid-3-1792107210399 | fonte=Wikipedia

=== Passo 2: listar evidências registradas ===
Total encontrada(s): 3

  [1] concorrente
      id: evid-1-1792107210392
      fonte: Google Play
      url: https://play.google.com/store/apps/details?id=exemplo.financas
      ideia_relacionada: App para controlar gastos
      timestamp: 2026-10-15T23:33:30.392Z
      relevancia: alta
      trecho_bruto: Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas, 1 mi de downloads.

  [2] reclamacao
      id: evid-2-1792107210397
      fonte: Google Maps
      url: https://www.google.com/maps/place/exemplo
      ideia_relacionada: App para controlar gastos
      timestamp: 2026-10-15T23:33:30.397Z
      relevancia: alta
      trecho_bruto: O aplicativo travou na hora de categorizar minhas despesas e perdi o lançamento.

  [3] dado_mercado
      id: evid-3-1792107210399
      fonte: Wikipedia
      url: https://pt.wikipedia.org/wiki/Aplicativo_de_financas
      ideia_relacionada: App para controlar gastos
      timestamp: 2026-10-15T23:33:30.399Z
      relevancia: media
      trecho_bruto: O mercado global de aplicativos de finanças pessoais foi estimado em US$ 12,4 bilhões em 2024.

=== Passo 3: conferir se as 3 estão bem-formadas ===
OK  concorrente  | todos os campos presentes e válidos
OK  reclamacao   | todos os campos presentes e válidos
OK  dado_mercado | todos os campos presentes e válidos

Bem-formadas: 3/3

=== Passo 4: tentar registrar evidência inválida (sem "fonte") ===
Total no arquivo ANTES da tentativa: 3
REJEITADA conforme esperado.
Motivo: Evidência inválida: campo obrigatório ausente: "fonte"
Total no arquivo DEPOIS da tentativa: 3

Evidência rejeitada: sim
Arquivo não cresceu: sim
Evidência inválida presente no arquivo: nao (correto)

=== Resumo ===
Evidências no arquivo: 3 (concorrente=1 | reclamacao=1 | dado_mercado=1)
Todas bem formadas: sim
Teste de rejeição: PASSOU
```

**Conteúdo real do `evidencias.jsonl` depois do teste:**
```
{"id":"evid-1-1792107210392","tipo":"concorrente","fonte":"Google Play","url":"https://play.google.com/store/apps/details?id=exemplo.financas","trecho_bruto":"Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas, 1 mi de downloads.","ideia_relacionada":"App para controlar gastos","timestamp":"2026-10-15T23:33:30.392Z","relevancia":"alta"}
{"id":"evid-2-1792107210397","tipo":"reclamacao","fonte":"Google Maps","url":"https://www.google.com/maps/place/exemplo","trecho_bruto":"O aplicativo travou na hora de categorizar minhas despesas e perdi o lançamento.","ideia_relacionada":"App para controlar gastos","timestamp":"2026-10-15T23:33:30.397Z","relevancia":"alta"}
{"id":"evid-3-1792107210399","tipo":"dado_mercado","fonte":"Wikipedia","url":"https://pt.wikipedia.org/wiki/Aplicativo_de_financas","trecho_bruto":"O mercado global de aplicativos de finanças pessoais foi estimado em US$ 12,4 bilhões em 2024.","ideia_relacionada":"App para controlar gastos","timestamp":"2026-10-15T23:33:30.399Z","relevancia":"media"}
```
Exatamente 3 linhas. A evidência inválida não aparece.

**Evidência:**
- A evidência sem `fonte` foi rejeitada com a mensagem `Evidência inválida: campo obrigatório ausente: "fonte"`.
- O total no arquivo permaneceu 3 antes e depois da tentativa (`Total no arquivo ANTES da tentativa: 3` / `Total no arquivo DEPOIS da tentativa: 3`), comprovando que a validação ocorre antes de qualquer escrita.
- A busca pelo id `evid-invalida-sem-fonte` retornou `nao (correto)`.
- `Existe antes do teste: false` confirma que o arquivo foi criado automaticamente pelo módulo na primeira gravação.
- As 3 evidências passaram na conferência de boa formação (`Bem-formadas: 3/3`), cobrindo os 8 campos, incluindo `url` presente e não vazio.
- `validacoes.jsonl` continua com as mesmas 3 linhas da Tarefa 04, sem alteração:
  ```
  {"ideia":"App para controlar gastos","tipo":"mobile","timestamp":"2026-10-15T23:29:34.606Z"}
  {"ideia":"Consultoria de marketing","tipo":"outro","timestamp":"2026-10-15T23:29:38.037Z"}
  {"ideia":"App de receitas","tipo":"mobile","timestamp":"2026-10-15T23:29:40.272Z"}
  ```

**O que não funcionou ou ficou pendente:**
- **O script não é idempotente.** Ele faz append sempre. Executar `node testar-evidencias.js` mais de uma vez duplica as evidências fictícias no arquivo, e a contagem do Resumo passa a mostrar mais de 3. A limpeza é manual (`Remove-Item "evidencias.jsonl"`). Não foi implementado reset automático para não alterar arquivo existente sem autorização.
- **Não há teste automatizado de verdade.** O script é um script de verificação manual executado no terminal; ele não está integrado a um runner (mocha, jest, node:test) e não sai com código de saída diferente de zero em caso de falha.
- **Não foi validada a gravação com `url` vazia**, embora o código trate esse caso (preenchimento automático com `""`). O teste exercita apenas evidências com `url` preenchida. Fica como pendência para a próxima tarefa.
- **Não foi validado o preenchimento automático de `id` e `timestamp`.** No script o `id` é sempre fornecido explicitamente, então `gerarId()` não foi exercitada pelo caminho do `registrarEvidencia`.
- **Não há validação de `url` como link.** O campo só é validado quanto ao tipo (string). Uma URL malformada seria aceita.
- **Não há verificação de duplicidade.** Duas evidências com o mesmo `id` podem ser gravadas; `listarEvidencias()` não detecta nem elimina duplicatas.
- **`listarEvidencias()` lança exceção** se encontrar uma linha corrompida, em vez de pular a linha e avisar. Para um histórico acumulativo, isso pode interromper a leitura inteira por causa de uma linha ruim.
- **O módulo não está exposto por endpoint HTTP.** As evidências são gravadas apenas via chamada direta do módulo, já que `server.js` não foi alterado por determinação desta tarefa. Não há caminho HTTP para registrar ou listar evidências.
- **Não existe `.gitignore`**, então `evidencias.jsonl` e `validacoes.jsonl` seriam versionados junto caso o projeto vire um repositório git.
- Os dados das evidências são fictícios, criados à mão. Nenhuma fonte externa foi consultada, conforme a restrição da tarefa.

**Observações técnicas para a próxima tarefa:**
- `evidencias.js` é um módulo CommonJS com `require`/`module.exports`, no mesmo padrão do resto do projeto. Para consumir de outro arquivo: `const { registrarEvidencia, listarEvidencias } = require('./evidencias');`
- O módulo exporta mais que o mínimo pedido (`registrarEvidencia`, `listarEvidencias`, `CAMPOS_OBRIGATORIOS`). As exportações extras (`validarEvidencia`, `gerarId`, `ARQUIVO_EVIDENCIAS`, `TIPOS`, `RELEVANCIAS`) existem para que o script de teste possa verificar a boa formação sem duplicar regras.
- A validação é feita com `validarEvidencia()` antes de qualquer escrita, e a evidência é gravada numa ordem fixa de campos (`id`, `tipo`, `fonte`, `url`, `trecho_bruto`, `ideia_relacionada`, `timestamp`, `relevancia`), o que torna o JSON Lines legível e estável.
- `registrarEvidencia()` cria uma cópia rasa com `Object.assign({}, evidencia)`, então não altera o objeto recebido pelo chamador.
- Para limpar entre execuções de teste, apagar `evidencias.jsonl` antes de rodar o script.
- Se a próxima tarefa for expor evidências por HTTP, o padrão a seguir é o mesmo do `server.js`: `require('./evidencias')` e chamar `registrarEvidencia` / `listarEvidencias` no handler, sem necessidade de biblioteca nova.
- Os dados de `ideia_relacionada`gravados no teste (`App para controlar gastos`) correspondem à ideia usada nas validações da Tarefa 04, o que já permite relacionar validação e evidência pelo texto, mas ainda não por um identificador estável. Uma chave comum seria o próximo passo natural.