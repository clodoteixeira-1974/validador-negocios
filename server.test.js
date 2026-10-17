const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp, ARQUIVO_VALIDACOES, ARQUIVO_EVIDENCIAS } = require('./server');

// Cada teste sobe o servidor em uma porta efêmera (listen(0)) e grava em arquivos
// temporários. Os .jsonl de produção nunca são tocados.
function arquivoTemporario(prefixo = 'validacoes') {
  const sufixo = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return path.join(os.tmpdir(), `${prefixo}-teste-${sufixo}.jsonl`);
}

async function comServidor(fn) {
  const arquivo = arquivoTemporario('validacoes');
  const arquivoEvidencias = arquivoTemporario('evidencias');
  const app = createApp({ arquivoValidacoes: arquivo, arquivoEvidencias });

  // app.listen() devolve o servidor HTTP; é nele que ficam listen/address/close
  const servidor = app.listen(0);
  await new Promise((resolve, reject) => {
    servidor.once('listening', resolve);
    servidor.once('error', reject);
  });
  const { port } = servidor.address();

  try {
    return await fn({
      base: `http://127.0.0.1:${port}`,
      arquivo,
      arquivoEvidencias
    });
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
    fs.rmSync(arquivo, { force: true });
    fs.rmSync(arquivoEvidencias, { force: true });
  }
}

async function post(base, corpo) {
  const resposta = await fetch(`${base}/validar-ideia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

async function postCru(base, corpoTexto) {
  const resposta = await fetch(`${base}/validar-ideia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: corpoTexto
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

function lerLinhas(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  return fs.readFileSync(arquivo, 'utf8').split('\n').filter((linha) => linha.trim() !== '');
}

async function postEvidencia(base, corpo) {
  const resposta = await fetch(`${base}/evidencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

async function getEvidencias(base) {
  const resposta = await fetch(`${base}/evidencias`);
  return { status: resposta.status, corpo: await resposta.json() };
}

async function getNota(base) {
  const resposta = await fetch(`${base}/nota`);
  return { status: resposta.status, corpo: await resposta.json() };
}

function evidenciaValida(extra = {}) {
  return Object.assign({
    tipo: 'concorrente',
    fonte: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=exemplo.financas',
    trecho_bruto: 'Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas.',
    ideia_relacionada: 'App para controlar gastos',
    relevancia: 'alta'
  }, extra);
}

test('ideia mobile: 200 com tipo "mobile" e gravacao no arquivo temporario', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'App para controlar gastos' });

    assert.equal(r.status, 200);
    assert.equal(r.corpo.recebido, true);
    assert.equal(r.corpo.ideia, 'App para controlar gastos');
    assert.equal(r.corpo.tipo, 'mobile');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), {
      ideia: 'App para controlar gastos',
      tipo: 'mobile',
      timestamp: r.corpo.timestamp
    });
  });
});

test('ideia nao mobile: 200 com tipo "outro"', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'Consultoria de marketing' });

    assert.equal(r.status, 200);
    assert.equal(r.corpo.recebido, true);
    assert.equal(r.corpo.tipo, 'outro');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'outro');
  });
});

test('campo ausente: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, {});

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, "Campo 'ideia' ausente ou vazio");
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('campo vazio ou so com espacos: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const vazio = await post(base, { ideia: '' });
    assert.equal(vazio.status, 400);
    assert.equal(vazio.corpo.error, "Campo 'ideia' ausente ou vazio");

    const espacos = await post(base, { ideia: '   ' });
    assert.equal(espacos.status, 400);
    assert.equal(espacos.corpo.error, "Campo 'ideia' ausente ou vazio");

    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('ideia com tipo errado (numero): 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 123 });

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, "Campo 'ideia' deve ser um texto (string)");
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('body que nao e objeto JSON: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, ['App para controlar gastos']);

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, 'Corpo da requisicao deve ser um objeto JSON');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('JSON malformado: 400 com mensagem em JSON (sem pagina HTML)', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await postCru(base, '{"ideia": ');

    assert.equal(r.status, 400);
    assert.equal(r.corpo.error, 'JSON invalido');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('corpo acima de 100kb: 413 e nada gravado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const r = await post(base, { ideia: 'a'.repeat(101 * 1024) });

    assert.equal(r.status, 413);
    assert.equal(r.corpo.error, 'Corpo da requisicao excede o limite de 100kb');
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('GET /saude: 200 com ok e servico', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/saude`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.deepEqual(corpo, { ok: true, servico: 'validador-negocios' });
  });
});

test('rota desconhecida: 404 em JSON', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/nao-existe`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 404);
    assert.equal(corpo.error, 'Rota nao encontrada');
    assert.equal(corpo.caminho, '/nao-existe');
  });
});

test('GET /validar-ideia: 405 com header Allow: POST', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const resposta = await fetch(`${base}/validar-ideia`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'POST');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'POST' });
    assert.equal(lerLinhas(arquivo).length, 0);
  });
});

test('POST /saude: 405 com header Allow: GET', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/saude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET' });
  });
});

test('nenhum teste grava no validacoes.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_VALIDACOES).length;

  await comServidor(async ({ base }) => {
    await post(base, { ideia: 'App de receitas' });
  });

  const depois = lerLinhas(ARQUIVO_VALIDACOES).length;

  assert.equal(depois, antes);
});

test('POST /evidencias valido: 201 com id e timestamp gerados pelo servidor', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    // id e timestamp vao no corpo de proposito: o servidor deve ignorar e gerar os seus.
    const r = await postEvidencia(base, evidenciaValida({
      id: 'id-falsificado-do-cliente',
      timestamp: '1999-01-01T00:00:00.000Z'
    }));

    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'concorrente');
    assert.equal(r.corpo.fonte, 'Google Play');
    assert.equal(r.corpo.relevancia, 'alta');
    assert.notEqual(r.corpo.id, '');
    assert.notEqual(r.corpo.id, 'id-falsificado-do-cliente');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.notEqual(r.corpo.timestamp, '1999-01-01T00:00:00.000Z');

    // O que foi devolvido e o que esta no arquivo temporario.
    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), r.corpo);
  });
});

test('POST /evidencias sem "fonte": 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const semFonte = evidenciaValida();
    delete semFonte.fonte;

    const r = await postEvidencia(base, semFonte);

    assert.equal(r.status, 400);
    assert.match(r.corpo.error, /Evidência inválida/);
    assert.match(r.corpo.error, /"fonte"/);
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('POST /evidencias com "tipo" invalido: 400 e nada gravado', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({ tipo: 'blog' }));

    assert.equal(r.status, 400);
    assert.match(r.corpo.error, /"tipo" inválido/);
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('GET /evidencias vazio: 200 com total 0 e lista vazia', async () => {
  await comServidor(async ({ base }) => {
    const r = await getEvidencias(base);

    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo, { total: 0, evidencias: [] });
  });
});

test('GET /evidencias apos 3 POSTs: 200 com total 3 na ordem de gravacao', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Fonte A' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Fonte B', relevancia: 'media' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'dado_mercado', fonte: 'Fonte C', relevancia: 'baixa' }));

    const r = await getEvidencias(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 3);
    assert.equal(r.corpo.evidencias.length, 3);
    assert.deepEqual(
      r.corpo.evidencias.map((evidencia) => evidencia.fonte),
      ['Fonte A', 'Fonte B', 'Fonte C']
    );
    assert.deepEqual(
      r.corpo.evidencias.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado']
    );
  });
});

test('nenhum teste de /evidencias grava no evidencias.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Somente teste' }));
    await getEvidencias(base);
  });

  const depois = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  assert.equal(depois, antes);
});

test('GET /nota com arquivo de evidencias vazio: 200 com total 0', async () => {
  await comServidor(async ({ base }) => {
    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.deepEqual(r.corpo, {
      criterios: {
        tem_gente: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhum concorrente registrado. Minimo: 2.'
        },
        tem_gente_insatisfeita: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhuma reclamacao registrada.'
        }
      },
      total: 0,
      maximo_possivel: 2
    });
  });
});

test('GET /nota apos 2 concorrentes: 200 com tem_gente.pontos igual a 1', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente.maximo, 1);
    assert.equal(r.corpo.criterios.tem_gente.detalhe, '2 concorrentes registrados');
    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 2);
  });
});

test('GET /nota com 1 concorrente e 1 reclamacao: tem_gente vale 0 e a insatisfeita vale 1', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);

    // 1 concorrente não atinge o mínimo de 2 do primeiro critério.
    assert.equal(r.corpo.criterios.tem_gente.pontos, 0);
    assert.equal(r.corpo.criterios.tem_gente.detalhe, '1 concorrente registrado. Minimo: 2.');

    // 1 reclamação basta para o segundo critério.
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.detalhe, '1 reclamacao registrada');

    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 2);

    // As duas evidências continuam registradas: a nota não consome nem apaga nada.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 2);
  });
});

test('GET /nota com 2 concorrentes e 1 reclamacao: total 2 e maximo_possivel 2', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(r.corpo.total, 2);
    assert.equal(r.corpo.maximo_possivel, 2);
  });
});

test('nenhum teste de /nota grava no evidencias.jsonl de producao', async () => {
  const antes = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await getNota(base);
  });

  const depois = lerLinhas(ARQUIVO_EVIDENCIAS).length;

  assert.equal(depois, antes);
});