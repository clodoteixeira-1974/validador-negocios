const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');

const {
  registrarEvidencia,
  listarEvidencias,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

const { calcularNota } = require('./nota');

const { criarLimitador } = require('./rate-limit');

const { gerarHtmlRelatorio, gerarHtmlDashboard, escapar, formatarData } = require('./relatorio');

const { lerJsonl, escreverJsonl, avisarLinhasIgnoradas } = require('./jsonl');

const PORTA_PADRAO = 3000;
const LIMITE_CORPO = '100kb';
const LIMITE_CORPO_VALIDAR = '14mb';
const LIMITE_IMAGEM_BYTES = 10 * 1024 * 1024;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL_PADRAO = 'openai/gpt-5.6-luna';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_PADRAO;
const SERVICO = 'validador-negocios';

// Arquivo de persistência (JSON Lines), na mesma pasta do server.js
const ARQUIVO_VALIDACOES = path.join(__dirname, 'validacoes.jsonl');

// Palavras que classificam a ideia como mobile. A comparação usa limite de
// palavra (\b) de propósito: sem ele, qualquer palavra que contenha "app" —
// "pineapple", "happy", "Snapple" — seria classificada como aplicativo.
// Com \b, "AppStore" e "Application" também ficam de fora, porque "app" não
// aparece neles como palavra isolada.
const PADRAO_MOBILE = /\b(app|aplicativo)\b/i;

// Campos que o cliente pode enviar em POST /evidencias.
// id e timestamp nao entram aqui: sao gerados pelo modulo evidencias.js.
// id_validacao entra: e o que amarra a evidencia a uma validacao especifica.
const CAMPOS_EVIDENCIA = ['tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'relevancia', 'id_validacao'];

// Regra única de classificação
function classificarTipo(ideia) {
  return PADRAO_MOBILE.test(String(ideia)) ? 'mobile' : 'outro';
}

// Días que um link de relatório permanece válido. Decisão do PO: 30 dias.
const DIAS_EXPIRACAO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Valida o corpo da requisição. Devolve { ok, status, erro } ou { ok, ideia }.
function validarIdeia(corpo) {
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { ok: false, status: 400, erro: 'Corpo da requisicao deve ser um objeto JSON' };
  }

  if (!('ideia' in corpo)) {
    return { ok: false, status: 400, erro: "Campo 'ideia' ausente ou vazio" };
  }

  const { ideia } = corpo;

  if (typeof ideia !== 'string') {
    return { ok: false, status: 400, erro: "Campo 'ideia' deve ser um texto (string)" };
  }

  if (ideia.trim() === '') {
    return { ok: false, status: 400, erro: "Campo 'ideia' ausente ou vazio" };
  }

  return { ok: true, ideia };
}

// Valida o data URI e mede os bytes da imagem decodificada, não o tamanho do
// texto Base64 que atravessa o JSON.
function validarImagemBase64(imagem) {
  if (typeof imagem !== 'string') {
    return { ok: false, erro: 'deve ser uma string' };
  }

  if (!imagem.startsWith('data:image/')) {
    return { ok: false, erro: 'deve comecar com data:image/' };
  }

  const correspondencia = /^data:image\/[a-z0-9.+-]+;base64,([a-z0-9+/]*={0,2})$/i.exec(imagem);

  if (!correspondencia || correspondencia[1] === '') {
    return { ok: false, erro: 'data URI deve conter imagem em Base64 valida' };
  }

  const conteudoBase64 = correspondencia[1];
  const bytes = Buffer.from(conteudoBase64, 'base64');
  const base64Canonico = bytes.toString('base64').replace(/=+$/, '');

  if (base64Canonico !== conteudoBase64.replace(/=+$/, '')) {
    return { ok: false, erro: 'data URI deve conter imagem em Base64 valida' };
  }

  if (bytes.length > LIMITE_IMAGEM_BYTES) {
    return { ok: false, erro: 'o tamanho maximo da imagem e 10 MB' };
  }

  return { ok: true };
}

async function extrairDescricaoImagem(imagem, fetchOpenRouter, apiKey, model) {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY nao configurada');
  }

  const resposta = await fetchOpenRouter('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extraia a descricao da ideia de negocio contida nesta imagem. Responda apenas com a descricao em texto, sem introducoes.'
          },
          {
            type: 'image_url',
            image_url: { url: imagem }
          }
        ]
      }]
    })
  });

  let corpo;

  try {
    corpo = await resposta.json();
  } catch {
    throw new Error(`resposta invalida do OpenRouter (HTTP ${resposta.status})`);
  }

  if (!resposta.ok) {
    const motivo = corpo && corpo.error && corpo.error.message;
    throw new Error(motivo || `OpenRouter respondeu HTTP ${resposta.status}`);
  }

  const descricao = corpo && corpo.choices && corpo.choices[0]
    && corpo.choices[0].message && corpo.choices[0].message.content;

  if (typeof descricao !== 'string' || descricao.trim() === '') {
    throw new Error('resposta do OpenRouter nao contem uma descricao em texto');
  }

  return descricao.trim();
}

// Gera o id de uma validação.
// É um UUID v4: 122 bits de entropia vinda de fonte criptográfica. Antes era
// "<timestamp em ms>-<6 caracteres>", e o timestamp monotônico permitia adivinhar
// o id por força bruta com muito menos tentativas — o id aparece na URL do
// relatório, que é o caminho que o atacante percorre.
function gerarId() {
  return randomUUID();
}

// Grava uma validação bem-sucedida em JSON Lines (append).
// O caminho é opcional: os testes automatizados passam um arquivo temporário.
function registrarValidacao(registro, arquivo = ARQUIVO_VALIDACOES) {
  escreverJsonl(arquivo, registro);
}

// Procura uma validação pelo id. Devolve null quando não achar ou quando o
// arquivo não existe. Linha corrompida é ignorada com aviso, igual ao que
// acontece com as evidências: um registro ruim não derruba o relatório das
// demais validações.
function buscarValidacao(id, arquivo = ARQUIVO_VALIDACOES) {
  const { registros, linhasIgnoradas } = lerJsonl(arquivo);

  avisarLinhasIgnoradas(arquivo, linhasIgnoradas);

  for (const registro of registros) {
    if (registro && registro.id === id) {
      return registro;
    }
  }

  return null;
}

// Evidências vinculadas a uma validação específica, pelo campo id_validacao.
// Sem o id, a evidência é geral e não entra em relatório nenhum.
function evidenciasDaValidacao(id, arquivo) {
  return listarEvidencias(arquivo, id);
}

// Página de erro do relatório: simples de propósito, sem CSS pesado.
function paginaNaoEncontrada(id) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatorio nao encontrado — Validador de Novos Negocios</title>
</head>
<body style="font-family: Georgia, serif; padding: 40px; color: #1a1a1a;">
<h1>Relatório não encontrado</h1>
<p>Não existe validação com o identificador <code>${id.replace(/[<>]/g, '')}</code>.</p>
<p><a href="/dashboard">Voltar ao dashboard</a></p>
</body>
</html>`;
}

// Página de link expirado. Simples de propósito, sem o CSS pesado.
function paginaExpirada(data) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link expirado — Validador de Novos Negócios</title>
</head>
<body style="font-family: Georgia, serif; padding: 40px; color: #1a1a1a;">
<h1>Este link expirou</h1>
<p>Os links de relatório expiram em 30 dias.${data ? ` Este link expirou em <strong>${escapar(data)}</strong>.` : ''}</p>
<p>Você pode gerar um novo relatório enviando a ideia novamente no
<a href="/dashboard">dashboard</a>.</p>
</body>
</html>`;
}

// Cria o app Express com as rotas. Não abre porta: use listen() quando precisar.
// Opções: { arquivoValidacoes } para apontar a persistência para outro caminho.
function createApp(opcoes = {}) {
  const arquivoValidacoes = opcoes.arquivoValidacoes || ARQUIVO_VALIDACOES;
  const arquivoEvidencias = opcoes.arquivoEvidencias || ARQUIVO_EVIDENCIAS;
  const fetchOpenRouter = opcoes.fetchOpenRouter || globalThis.fetch;
  const openRouterApiKey = opcoes.openRouterApiKey ?? OPENROUTER_API_KEY;
  const openRouterModel = opcoes.openRouterModel || OPENROUTER_MODEL;

  const app = express();

  // Limites de taxa. Cada um nasce aqui, dentro de createApp, e por isso cada
  // instância de teste começa com o balde vazio. Ver rate-limit.js.
  const limiteValidarIdeia = criarLimitador({ maximo: 10 });
  const limiteEscreverEvidencia = criarLimitador({ maximo: 30 });
  const limiteListarEvidencias = criarLimitador({ maximo: 30 });
  const limiteRelatorio = criarLimitador({ maximo: 60 });
  const limiteNota = criarLimitador({ maximo: 60 });
  const limiteDashboard = criarLimitador({ maximo: 60 });

  // A validação aceita imagens de até 10 MB, cujo Base64 ocupa cerca de 14 MB.
  // As demais rotas mantêm o limite original de 100 KB.
  app.use('/validar-ideia', express.json({ limit: LIMITE_CORPO_VALIDAR }));
  app.use(express.json({ limit: LIMITE_CORPO }));

  // Healthcheck
  app.get('/saude', (req, res) => {
    res.json({ ok: true, servico: SERVICO });
  });

  // Metodo errado no healthcheck: 405 com Allow: GET
  app.post('/saude', (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET' });
  });

  // Data de expiração do link de relatório: 30 dias a partir de agora, em ISO.
  // Validação antiga, sem expires_at, é tratada como não expirada — ver CONTRATO.md.
  function gerarExpiracao(agora = Date.now()) {
  return new Date(agora + DIAS_EXPIRACAO * MS_POR_DIA).toISOString();
}

// Diz se um link expirou. Sem expires_at, nunca considera expirado.
function linkExpirado(validacao, agora = Date.now()) {
  if (!validacao || !validacao.expires_at) {
    return false;
  }

  const limite = new Date(validacao.expires_at).getTime();

  if (Number.isNaN(limite)) {
    return false;
  }

  return agora >= limite;
}

// Endpoint POST /validar-ideia
  app.post('/validar-ideia', limiteValidarIdeia, async (req, res) => {
    const corpo = req.body;
    const temImagem = corpo && typeof corpo === 'object'
      && Object.prototype.hasOwnProperty.call(corpo, 'imagem_base64');
    let ideia;

    if (temImagem) {
      const validacaoImagem = validarImagemBase64(corpo.imagem_base64);

      if (!validacaoImagem.ok) {
        return res.status(400).json({ error: `Imagem invalida: ${validacaoImagem.erro}` });
      }

      try {
        ideia = await extrairDescricaoImagem(
          corpo.imagem_base64,
          fetchOpenRouter,
          openRouterApiKey,
          openRouterModel
        );
      } catch (erro) {
        return res.status(400).json({ error: `Falha ao processar imagem: ${erro.message}` });
      }
    } else {
      const resultado = validarIdeia(corpo);

      if (!resultado.ok) {
        return res.status(resultado.status).json({ error: resultado.erro });
      }

      ideia = resultado.ideia;
    }

    const registro = {
      id: gerarId(),
      ideia,
      tipo: classificarTipo(ideia),
      timestamp: new Date().toISOString(),
      expires_at: gerarExpiracao(),
      ...(temImagem ? { imagem_base64: corpo.imagem_base64 } : {})
    };

    registrarValidacao(registro, arquivoValidacoes);

    res.json({
      recebido: true,
      id: registro.id,
      ideia: registro.ideia,
      tipo: registro.tipo,
      timestamp: registro.timestamp,
      expires_at: registro.expires_at
    });
  });

  // Metodo errado no endpoint de validacao: 405 com Allow: POST
  app.get('/validar-ideia', (req, res) => {
    res.set('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'POST' });
  });

  // Lista as evidencias gravadas. Com ?id=<id de validacao>, devolve so as
// evidencias vinculadas a ele e a nota passa a ser por ideia; sem o parametro,
// devolve todas e a nota e a geral.
  // A listagem global devolve o arquivo inteiro de uma vez, e a rota mais cara
  // de ler. Leva limite proprio; o filtro por ?id= nao passa por aqui.
  app.get('/evidencias', (req, res) => {
    if (typeof req.query.id !== 'string') {
      return limiteListarEvidencias(req, res, () => responderEvidencias(req, res, undefined));
    }

    return responderEvidencias(req, res, req.query.id);
  });

  // Filtra por id e devolve o envelope { total, evidencias }. A checagem de
  // expiracao fica na rota, antes de chegar aqui.
  function responderEvidencias(req, res, filtro) {
    // Com ?id=, o filtro so funciona para uma validacao que existe e nao expirou.
    // Sem essa checagem, este era o ultimo caminho de leitura que aceitava um id de
    // validacao depois do prazo: o relatorio e a nota fechavam, e as evidencias cruas
    // continuavam saindo.
    if (filtro !== undefined) {
      const validacao = buscarValidacao(filtro, arquivoValidacoes);

      // 404 e nao lista vazia: antes, um id inexistente devolvia 200 com zero
      // evidencias, e isso indistinguia "nao ha evidencia para este id" de "este id nao existe".
      if (!validacao) {
        return res.status(404).json({ error: 'Validacao nao encontrada' });
      }

      if (linkExpirado(validacao)) {
        return res.status(410).json({ error: 'Este link expirou' });
      }
    }

    const evidencias = listarEvidencias(arquivoEvidencias, filtro);
    return res.json({ total: evidencias.length, evidencias });
  }

  // Registra uma evidencia. id e timestamp sao gerados pelo modulo, nunca
  // aceitos do cliente. O modulo lanca Error com .erros quando a evidencia e invalida.
  app.post('/evidencias', limiteEscreverEvidencia, (req, res) => {
    const corpo = req.body;
    const dados = {};

    for (const campo of CAMPOS_EVIDENCIA) {
      dados[campo] = corpo ? corpo[campo] : undefined;
    }

    try {
      const gravada = registrarEvidencia(dados, arquivoEvidencias);
      return res.status(201).json(gravada);
    } catch (erro) {
      return res.status(400).json({ error: erro.message });
    }
  });

// Calcula a nota a partir das evidencias registradas. Com ?id=<id de validacao>,
  // a nota e da ideia correspondente; sem o parametro, e a nota geral.
  //
  // A expiracao vale para a nota da ideia tanto quanto vale para o relatorio. Sem
  // esta verificacao, fechar a pagina e nao fechar o dado: quem soubesse o id
  // continuaria lendo a nota depois do prazo, que e o mesmo vazamento por outro
  // caminho. A nota geral, sem ?id=, nao tem prazo: ela nao pertence a uma
  // validacao, e nao ha expires_at de onde tirar um.
  app.get('/nota', limiteNota, (req, res) => {
    const filtro = typeof req.query.id === 'string' ? req.query.id : undefined;

    if (filtro !== undefined) {
      const validacao = buscarValidacao(filtro, arquivoValidacoes);

      // 410 e nao 404, como no relatorio: a validacao existe, o acesso e que nao.
      if (linkExpirado(validacao)) {
        return res.status(410).json({ error: 'Este link expirou' });
      }
    }

    const evidencias = listarEvidencias(arquivoEvidencias, filtro);
    return res.json(calcularNota(evidencias));
  });

  // Dashboard: formulário de ideia e resultado, com link de compartilhamento.
  app.get('/dashboard', limiteDashboard, (req, res) => {
    res.type('html').send(gerarHtmlDashboard());
  });

  // Relatório de uma validação, em HTML meant para impressão em A4.
  app.get('/relatorio/:id', limiteRelatorio, (req, res) => {
    const validacao = buscarValidacao(req.params.id, arquivoValidacoes);

    if (!validacao) {
      return res.status(404).type('html').send(paginaNaoEncontrada(String(req.params.id)));
    }

    // Link expirado responde 410 Gone, e não 404: a validação existe, o acesso é que não.
    if (linkExpirado(validacao)) {
      return res.status(410).type('html').send(paginaExpirada(formatarData(validacao.expires_at)));
    }

    const evidencias = evidenciasDaValidacao(validacao.id, arquivoEvidencias);
    const nota = calcularNota(evidencias);
    const base = `${req.protocol}://${req.get('host') || ''}`;

    return res.type('html').send(gerarHtmlRelatorio(validacao, nota, evidencias, base));
  });

  // Qualquer outro metodo em /nota: 405 com Allow: GET
  app.all('/nota', (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET' });
  });

  // Qualquer outro metodo em /evidencias: 405 com Allow: GET, POST
  app.all('/evidencias', (req, res) => {
    res.set('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo nao permitido', permitido: 'GET, POST' });
  });

  // Rota desconhecida
  app.use((req, res) => {
    res.status(404).json({ error: 'Rota nao encontrada', caminho: req.path });
  });

  // Erros do parser de corpo (limite excedido, JSON malformado)
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    if (erro.type === 'entity.too.large') {
      const limite = req.path === '/validar-ideia' ? LIMITE_CORPO_VALIDAR : LIMITE_CORPO;
      return res.status(413).json({ error: 'Corpo da requisicao excede o limite de ' + limite });
    }

    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON invalido' });
    }

    return next(erro);
  });

  return app;
}

// Só abre a porta quando este arquivo é executado diretamente
if (require.main === module) {
  const port = Number(process.env.PORT ?? PORTA_PADRAO);
  const app = createApp();

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Healthcheck: GET http://localhost:${port}/saude`);
    console.log(`Endpoint: POST http://localhost:${port}/validar-ideia`);
    console.log(`Evidencias: GET/POST http://localhost:${port}/evidencias`);
    console.log(`Persistindo em: ${ARQUIVO_VALIDACOES}`);
    console.log(`Evidencias em: ${ARQUIVO_EVIDENCIAS}`);
  });
}

module.exports = {
  createApp,
  classificarTipo,
  validarIdeia,
  registrarValidacao,
  gerarId,
  buscarValidacao,
  evidenciasDaValidacao,
  ARQUIVO_VALIDACOES,
  ARQUIVO_EVIDENCIAS,
  PORTA_PADRAO,
  LIMITE_CORPO,
  SERVICO,
  OPENROUTER_MODEL_PADRAO,
  PADRAO_MOBILE,
  CAMPOS_EVIDENCIA
};
