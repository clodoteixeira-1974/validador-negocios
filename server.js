const express = require('express');
const fs = require('fs');
const path = require('path');

const {
  registrarEvidencia,
  listarEvidencias,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

const { calcularNota } = require('./nota');

const { gerarHtmlRelatorio, gerarHtmlDashboard } = require('./relatorio');

const PORTA_PADRAO = 3000;
const LIMITE_CORPO = '100kb';
const SERVICO = 'validador-negocios';

// Arquivo de persistência (JSON Lines), na mesma pasta do server.js
const ARQUIVO_VALIDACOES = path.join(__dirname, 'validacoes.jsonl');

// Palavras que classificam a ideia como mobile
const PALAVRAS_MOBILE = ['app', 'aplicativo'];

// Campos que o cliente pode enviar em POST /evidencias.
// id e timestamp nao entram aqui: sao gerados pelo modulo evidencias.js.
// id_validacao entra: e o que amarra a evidencia a uma validacao especifica.
const CAMPOS_EVIDENCIA = ['tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'relevancia', 'id_validacao'];

// Regra única de classificação
function classificarTipo(ideia) {
  const texto = ideia.toLowerCase();
  const ehMobile = PALAVRAS_MOBILE.some((palavra) => texto.includes(palavra));
  return ehMobile ? 'mobile' : 'outro';
}

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

// Gera um id único de validação: timestamp em ms + sufixo aleatório.
function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Grava uma validação bem-sucedida em JSON Lines (append).
// O caminho é opcional: os testes automatizados passam um arquivo temporário.
function registrarValidacao(registro, arquivo = ARQUIVO_VALIDACOES) {
  const linha = JSON.stringify(registro);
  fs.appendFileSync(arquivo, linha + '\n', 'utf8');
}

// Procura uma validação pelo id. Devolve null quando não achar ou quando o
// arquivo não existe. Linhas com JSON inválido são puladas em vez de quebrar a
// leitura: um registro corrompido não deve derrubar o relatório das demais.
function buscarValidacao(id, arquivo = ARQUIVO_VALIDACOES) {
  if (!fs.existsSync(arquivo)) {
    return null;
  }

  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n').filter((linha) => linha.trim() !== '');

  for (const linha of linhas) {
    let registro;

    try {
      registro = JSON.parse(linha);
    } catch (erro) {
      continue;
    }

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

// Cria o app Express com as rotas. Não abre porta: use listen() quando precisar.
// Opções: { arquivoValidacoes } para apontar a persistência para outro caminho.
function createApp(opcoes = {}) {
  const arquivoValidacoes = opcoes.arquivoValidacoes || ARQUIVO_VALIDACOES;
  const arquivoEvidencias = opcoes.arquivoEvidencias || ARQUIVO_EVIDENCIAS;

  const app = express();

  // Middleware para parsear JSON, com limite de tamanho de corpo
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

  // Endpoint POST /validar-ideia
  app.post('/validar-ideia', (req, res) => {
    const resultado = validarIdeia(req.body);

    if (!resultado.ok) {
      return res.status(resultado.status).json({ error: resultado.erro });
    }

    const registro = {
      id: gerarId(),
      ideia: resultado.ideia,
      tipo: classificarTipo(resultado.ideia),
      timestamp: new Date().toISOString()
    };

    registrarValidacao(registro, arquivoValidacoes);

    res.json({
      recebido: true,
      id: registro.id,
      ideia: registro.ideia,
      tipo: registro.tipo,
      timestamp: registro.timestamp
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
  app.get('/evidencias', (req, res) => {
    const filtro = typeof req.query.id === 'string' ? req.query.id : undefined;
    const evidencias = listarEvidencias(arquivoEvidencias, filtro);
    return res.json({ total: evidencias.length, evidencias });
  });

  // Registra uma evidencia. id e timestamp sao gerados pelo modulo, nunca
  // aceitos do cliente. O modulo lanca Error com .erros quando a evidencia e invalida.
  app.post('/evidencias', (req, res) => {
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
  app.get('/nota', (req, res) => {
    const filtro = typeof req.query.id === 'string' ? req.query.id : undefined;
    const evidencias = listarEvidencias(arquivoEvidencias, filtro);
    return res.json(calcularNota(evidencias));
  });

  // Dashboard: formulário de ideia e resultado, com link de compartilhamento.
  app.get('/dashboard', (req, res) => {
    res.type('html').send(gerarHtmlDashboard());
  });

  // Relatório de uma validação, em HTML meant para impressão em A4.
  app.get('/relatorio/:id', (req, res) => {
    const validacao = buscarValidacao(req.params.id, arquivoValidacoes);

    if (!validacao) {
      return res.status(404).type('html').send(paginaNaoEncontrada(String(req.params.id)));
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
      return res.status(413).json({ error: 'Corpo da requisicao excede o limite de ' + LIMITE_CORPO });
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
  PALAVRAS_MOBILE,
  CAMPOS_EVIDENCIA
};