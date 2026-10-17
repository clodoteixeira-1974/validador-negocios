const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createApp,
  classificarTipo,
  gerarId,
  ARQUIVO_VALIDACOES,
  ARQUIVO_EVIDENCIAS
} = require('./server');

// Formato do id de validação: UUID versão 4, como documentado em CONTRATO.md.
// O terceiro bloco começa com 4 e o quarto com 8, 9, a ou b, que é o que
// distingue a versão 4 dentro do padrão de UUID.
const REGEX_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    // A resposta traz o id gerado, que é o que dá acesso ao relatório.
    assert.notEqual(r.corpo.id, '');
    assert.match(r.corpo.id, REGEX_UUID_V4);

    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);

    const gravado = JSON.parse(linhas[0]);
    assert.notEqual(gravado.id, '');
    assert.match(gravado.id, REGEX_UUID_V4);
    assert.equal(gravado.id, r.corpo.id);

    assert.deepEqual(
      {
        ideia: gravado.ideia,
        tipo: gravado.tipo,
        timestamp: gravado.timestamp
      },
      {
        ideia: 'App para controlar gastos',
        tipo: 'mobile',
        timestamp: r.corpo.timestamp
      }
    );
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

test('classificarTipo usa limite de palavra e não casa dentro de outras palavras', async () => {
  // Estas são as asserções que a auditoria Red Team pediu e que falhavam
  // antes do fix-06.
  const casos = [
    // Palavras isoladas continuam classificando como mobile.
    { ideia: 'App para controlar gastos', esperado: 'mobile' },
    { ideia: 'Aplicativo de receitas', esperado: 'mobile' },
    { ideia: 'APP', esperado: 'mobile' },
    { ideia: 'app', esperado: 'mobile' },
    { ideia: 'APLICATIVO', esperado: 'mobile' },
    { ideia: 'Aplicativo', esperado: 'mobile' },
    { ideia: 'meu app de receitas', esperado: 'mobile' },
    { ideia: 'aplicativo-web de banco', esperado: 'mobile' },

    // "app" dentro de outra palavra não é mais aplicativo. Estes quatro
    // casos davam "mobile" por causa do includes().
    { ideia: 'Pineapple shop', esperado: 'outro' },
    { ideia: 'pineapple', esperado: 'outro' },
    { ideia: 'happy', esperado: 'outro' },
    { ideia: 'Snapple', esperado: 'outro' },
    { ideia: 'Application development', esperado: 'outro' },
    { ideia: 'AppStore', esperado: 'outro' },

    // Ideias sem nenhuma das palavras.
    { ideia: 'Consultoria de marketing', esperado: 'outro' },
    { ideia: 'cooperativa', esperado: 'outro' },
    { ideia: '', esperado: 'outro' }
  ];

  for (const caso of casos) {
    assert.equal(classificarTipo(caso.ideia), caso.esperado, JSON.stringify(caso.ideia));
  }
});

test('classificação corrigida é o que o POST /validar-ideia devolve e grava', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const falsoPositivo = await post(base, { ideia: 'Pineapple shop' });
    const verdadeiro = await post(base, { ideia: 'App para controlar gastos' });

    assert.equal(falsoPositivo.corpo.tipo, 'outro');
    assert.equal(verdadeiro.corpo.tipo, 'mobile');

    // E o que foi gravado no arquivo é o mesmo que foi respondido.
    const tipos = lerLinhas(arquivo).map((linha) => JSON.parse(linha).tipo);
    assert.deepEqual(tipos, ['outro', 'mobile']);
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
        },
        cabe_mais_um: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhum concorrente registrado. Mercado vazio.'
        },
        alguem_paga: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhuma evidencia de monetizacao registrada.'
        },
        alcance: {
          pontos: 0,
          maximo: 1,
          detalhe: 'Nenhuma evidencia de alcance registrada.'
        }
      },
      total: 0,
      maximo_possivel: 5,
      veredito: {
        decisao: 'PARAR',
        faixa: '0 a 1',
        explicacao: 'Sem informacao suficiente. Nao vale seguir.'
      }
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

    // 2 concorrentes também estão dentro da faixa de "cabe mais um?".
    assert.equal(r.corpo.criterios.cabe_mais_um.pontos, 1);
    assert.equal(r.corpo.criterios.cabe_mais_um.detalhe, '2 concorrentes registrados. Ha espaco para mais um.');

    assert.equal(r.corpo.total, 2);
    assert.equal(r.corpo.maximo_possivel, 5);
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

    // 1 concorrente está abaixo da faixa de "cabe mais um?".
    assert.equal(r.corpo.criterios.cabe_mais_um.pontos, 0);
    assert.equal(r.corpo.criterios.cabe_mais_um.detalhe, '1 concorrente registrado. Mercado pequeno.');

    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 5);

    // As duas evidências continuam registradas: a nota não consome nem apaga nada.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 2);
  });
});

test('GET /nota com 2 concorrentes e 1 reclamacao: total 3 de maximo_possivel 5', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(r.corpo.criterios.cabe_mais_um.pontos, 1);
    assert.equal(r.corpo.total, 3);
    assert.equal(r.corpo.maximo_possivel, 5);
  });
});

test('GET /nota com 5 concorrentes: tem_gente vale 1 e cabe_mais_um vale 0', async () => {
  await comServidor(async ({ base }) => {
    for (const fonte of ['A', 'B', 'C', 'D', 'E']) {
      await postEvidencia(base, evidenciaValida({ fonte: `Concorrente ${fonte}` }));
    }

    const r = await getNota(base);

    assert.equal(r.status, 200);

    // 5 concorrentes ainda provam que o mercado existe.
    assert.equal(r.corpo.criterios.tem_gente.pontos, 1);

    // Mas passam do máximo de 4, então o mercado é considerado saturado.
    assert.equal(r.corpo.criterios.cabe_mais_um.pontos, 0);
    assert.equal(r.corpo.criterios.cabe_mais_um.detalhe, '5 concorrentes registrados. Mercado saturado.');

    // Sem reclamações, o segundo critério não pontua.
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 0);

    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.maximo_possivel, 5);

    // As cinco evidências continuam registradas.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 5);
  });
});

test('POST /evidencias com tipo "monetizacao" é aceito e alimenta o quarto critério', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({
      tipo: 'monetizacao',
      fonte: 'Pagina de precos de concorrente',
      url: 'https://exemplo.com/precos',
      trecho_bruto: 'Planos a partir de R$ 19,90 por mes.',
      ideia_relacionada: 'App para controlar gastos',
      relevancia: 'alta'
    }));

    // O tipo novo é aceito pela API, que antes responderia 400.
    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'monetizacao');
    assert.equal(r.corpo.fonte, 'Pagina de precos de concorrente');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    // A evidência foi realmente gravada.
    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'monetizacao');

    // E aparece na listagem.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 1);
    assert.equal(evidencias.corpo.evidencias[0].tipo, 'monetizacao');

    // E faz o quarto critério pontuar.
    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.criterios.alguem_paga.pontos, 1);
    assert.equal(nota.corpo.criterios.alguem_paga.detalhe, '1 evidencia de monetizacao registrada.');
    assert.equal(nota.corpo.total, 1);
    assert.equal(nota.corpo.maximo_possivel, 5);
  });
});

test('POST /evidencias com tipo "alcance" é aceito e alimenta o quinto critério', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const r = await postEvidencia(base, evidenciaValida({
      tipo: 'alcance',
      fonte: 'Relatorio de audiencia de um canal',
      url: 'https://exemplo.com/audiencia',
      trecho_bruto: 'O publico-alvo esta concentrado em um grupo especifico, com canal conhecido.',
      ideia_relacionada: 'App para controlar gastos',
      relevancia: 'alta'
    }));

    // O tipo novo é aceito pela API, que antes responderia 400.
    assert.equal(r.status, 201);
    assert.equal(r.corpo.tipo, 'alcance');
    assert.match(r.corpo.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    const linhas = lerLinhas(arquivoEvidencias);
    assert.equal(linhas.length, 1);
    assert.equal(JSON.parse(linhas[0]).tipo, 'alcance');

    // Aparece na listagem.
    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.corpo.total, 1);

    // E faz o quinto critério pontuar.
    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.criterios.alcance.pontos, 1);
    assert.equal(nota.corpo.criterios.alcance.detalhe, '1 evidencia de alcance registrada.');
    assert.equal(nota.corpo.total, 1);
    assert.equal(nota.corpo.maximo_possivel, 5);
  });
});

test('GET /nota com um registro de cada tipo: a regua completa vale 5 de 5', async () => {
  await comServidor(async ({ base }) => {
    // 2 concorrentes: satisfazem "tem gente?" e "cabe mais um?".
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));

    // Um registro de cada um dos outros três tipos.
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'monetizacao', fonte: 'Pagina de precos' }));
    await postEvidencia(base, evidenciaValida({ tipo: 'alcance', fonte: 'Relatorio de audiencia' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 5);
    assert.equal(r.corpo.maximo_possivel, 5);

    // Todos os cinco critérios pontuam.
    for (const [nome, criterio] of Object.entries(r.corpo.criterios)) {
      assert.equal(criterio.pontos, 1, nome);
      assert.equal(criterio.maximo, 1, nome);
    }

    assert.equal(Object.keys(r.corpo.criterios).length, 5);

    // Regua completa: o veredito manda seguir.
    assert.equal(r.corpo.veredito.decisao, 'SEGUIR');
    assert.equal(r.corpo.veredito.faixa, '4 a 5');
    assert.notEqual(r.corpo.veredito.explicacao.trim(), '');
  });
});

test('GET /nota com nota 3: veredito manda mudar o recorte', async () => {
  await comServidor(async ({ base }) => {
    // 3 concorrentes satisfazem "tem gente?" e "cabe mais um?".
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente C' }));

    // Uma reclamação satisfaz "tem gente insatisfeita?".
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 3);
    assert.equal(r.corpo.maximo_possivel, 5);

    assert.equal(r.corpo.veredito.decisao, 'MUDAR_O_RECORTE');
    assert.equal(r.corpo.veredito.faixa, '2 a 3');
    assert.equal(
      r.corpo.veredito.explicacao,
      'Existe sinal, mas o publico ou a oferta precisa ser ajustada.'
    );
  });
});

test('GET /nota com 1 reclamacao e sem concorrentes: total 1 e veredito PARAR', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ tipo: 'reclamacao', fonte: 'Reclamacao X' }));

    const r = await getNota(base);

    assert.equal(r.status, 200);
    assert.equal(r.corpo.total, 1);
    assert.equal(r.corpo.criterios.tem_gente_insatisfeita.pontos, 1);

    // Um único sinal não basta para seguir.
    assert.equal(r.corpo.veredito.decisao, 'PARAR');
    assert.equal(r.corpo.veredito.faixa, '0 a 1');
  });
});

test('POST /validar-ideia: a resposta inclui o id que dá acesso ao relatório', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const primeira = await post(base, { ideia: 'App para controlar gastos' });
    const segunda = await post(base, { ideia: 'Consultoria de marketing' });

    for (const r of [primeira, segunda]) {
      assert.equal(r.status, 200);
      assert.equal(r.corpo.recebido, true);
      assert.equal(typeof r.corpo.id, 'string');
      assert.match(r.corpo.id, REGEX_UUID_V4);
    }

    // Cada validação recebe um id próprio.
    assert.notEqual(primeira.corpo.id, segunda.corpo.id);

    // E os dois ids estão gravados no arquivo temporário.
    const ids = lerLinhas(arquivo).map((linha) => JSON.parse(linha).id);
    assert.deepEqual(ids, [primeira.corpo.id, segunda.corpo.id]);
  });
});

test('GET /relatorio/:id com id válido: 200 com HTML do relatório', async () => {
  await comServidor(async ({ base, arquivo }) => {
    // Valida uma ideia e registra uma evidência vinculada a ela.
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    await postEvidencia(base, evidenciaValida({
      fonte: 'Concorrente A',
      ideia_relacionada: 'App para controlar gastos',
      id_validacao: validacao.corpo.id
    }));

    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-type') || '', /text\/html/);

    // Cabeçalho, ideia e metadados da validação.
    assert.match(corpo, /Validador de Novos Negócios/);
    assert.match(corpo, /App para controlar gastos/);
    assert.match(corpo, /mobile/);
    assert.ok(corpo.includes(validacao.corpo.id));

    // Nota e veredito.
    assert.match(corpo, /de<\/span>|de\s*5 pontos|5 pontos/);
    assert.ok(/PARAR|MUDAR_O_RECORTE|SEGUIR/.test(corpo));

    // Detalhamento dos cinco critérios.
    for (const criterio of ['tem_gente', 'tem_gente_insatisfeita', 'cabe_mais_um', 'alguem_paga', 'alcance']) {
      assert.ok(corpo.includes(criterio), criterio);
    }

    // A evidência relacionada aparece no relatório.
    assert.match(corpo, /Concorrente A/);

    // Rodapé com o link para o dashboard.
    assert.match(corpo, /\/dashboard/);
  });
});

test('GET /relatorio/:id com id inválido: 404 com HTML', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/relatorio/nao-existe-12345`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 404);
    assert.match(resposta.headers.get('content-type') || '', /text\/html/);
    assert.match(corpo, /não encontrado/i);
    assert.match(corpo, /\/dashboard/);
  });
});

test('GET /dashboard: 200 com HTML, formulário e botão de copiar', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/dashboard`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-type') || '', /text\/html/);

    // Formulário para enviar a ideia.
    assert.match(corpo, /<textarea/);
    assert.match(corpo, /id="ideia"/);
    assert.match(corpo, /Validar ideia/);

    // Área de resultado com nota e veredito.
    assert.match(corpo, /id="r-nota"/);
    assert.match(corpo, /id="r-veredito"/);

    // Botão de copiar o link do relatório, com aviso visual de confirmação.
    assert.match(corpo, /Copiar link do relatório/);
    assert.match(corpo, /id="aviso-copia"/);
    assert.match(corpo, /class="aviso oculto"/);
    assert.match(corpo, /Link copiado!/);
    assert.match(corpo, /Erro ao copiar/);

    // O aviso começa escondido e some depois de 2 segundos.
    assert.match(corpo, /\.aviso\.oculto \{\s*\n?\s*display: none;/);
    assert.match(corpo, /2000/);

    // O JavaScript fala com as rotas da API.
    assert.match(corpo, /\/validar-ideia/);
    assert.match(corpo, /\/nota/);
    assert.match(corpo, /\/relatorio\//);

    // O dashboard não carrega nada de fora: sem fonte, script ou imagem externa.
    // A decisão do PO na Tarefa 25 adicionou link para o GitHub, que é uma URL
    // absoluta. Por isso a checagem passou a mirar o que é realmente baixado —
    // <a href> é navegação só quando a pessoa clica, não é recurso carregado.
    assert.ok(!/<script[^>]+src=/.test(corpo), 'nenhum script externo');
    assert.ok(!/<link[^>]+href=/.test(corpo), 'nenhuma folha de estilo externa');
    assert.ok(!/<img[^>]+src=/.test(corpo), 'nenhuma imagem externa');
    assert.ok(!corpo.includes('@import'), 'nenhum @import de fonte');
    assert.ok(!/<iframe/.test(corpo), 'nenhum iframe');

    // E os links de portfólio estão lá, como a decisão do PO pede.
    assert.match(corpo, /<a class="botao-secundario" href="https:\/\/github\.com\/clodoteixeira-1974\/validador-negocios"/);
    assert.match(corpo, /Ver código-fonte/);
  });
});

test('o HTML do relatório traz @page A4 e @media print escondendo os controles', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    // Página A4 com margem de 2cm.
    assert.match(corpo, /@page/);
    assert.match(corpo, /size:\s*A4/);
    assert.match(corpo, /margin:\s*2cm/);

    // Regras de impressão que escondem botões e painéis.
    assert.match(corpo, /@media print/);
    assert.match(corpo, /button/);

    // E nenhum recurso externo: o CSS é embutido.
    assert.ok(!corpo.includes('<link '), 'nenhum CSS externo');
    assert.ok(!/<script/i.test(corpo), 'relatório não deve ter JavaScript');
  });
});

test('POST /evidencias com id_validacao é aceito e vincula a evidência', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    const r = await postEvidencia(base, evidenciaValida({
      fonte: 'Concorrente A',
      ideia_relacionada: 'App para controlar gastos',
      id_validacao: validacao.corpo.id
    }));

    assert.equal(r.status, 201);
    assert.equal(r.corpo.id_validacao, validacao.corpo.id);

    // O vínculo foi gravado no arquivo temporário.
    const gravada = JSON.parse(lerLinhas(arquivoEvidencias)[0]);
    assert.equal(gravada.id_validacao, validacao.corpo.id);
  });
});

test('GET /nota?id= calcula a nota so com as evidencias daquele id', async () => {
  await comServidor(async ({ base }) => {
    // Duas validações distintas, cada uma com suas evidências.
    const ideiaA = await post(base, { ideia: 'App para controlar gastos' });
    const ideiaB = await post(base, { ideia: 'Consultoria de marketing' });

    // A tem um concorrente: não atinge o mínimo de 2.
    await postEvidencia(base, evidenciaValida({
      fonte: 'Concorrente A1',
      id_validacao: ideiaA.corpo.id
    }));

    // B tem dois concorrentes e uma reclamação: pontua tem_gente, insatisfeita e cabe_mais_um.
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B1', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B2', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({
      tipo: 'reclamacao',
      fonte: 'Reclamacao B',
      id_validacao: ideiaB.corpo.id
    }));

    const resposta = await fetch(`${base}/nota?id=${encodeURIComponent(ideiaA.corpo.id)}`);
    const nota = await resposta.json();

    // A nota de A é 0: o único concorrente dele não pontua.
    assert.equal(resposta.status, 200);
    assert.equal(nota.total, 0);
    assert.equal(nota.criterios.tem_gente.pontos, 0);
    assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 0);
    assert.equal(nota.criterios.cabe_mais_um.pontos, 0);
    assert.equal(nota.veredito.decisao, 'PARAR');

    // A de B é 3: as evidências de A não contam para B nem o contrário.
    const respostaB = await fetch(`${base}/nota?id=${encodeURIComponent(ideiaB.corpo.id)}`);
    const notaB = await respostaB.json();

    assert.equal(notaB.total, 3);
    assert.equal(notaB.criterios.tem_gente.pontos, 1);
    assert.equal(notaB.criterios.tem_gente_insatisfeita.pontos, 1);
    assert.equal(notaB.criterios.cabe_mais_um.pontos, 1);
    assert.equal(notaB.veredito.decisao, 'MUDAR_O_RECORTE');
    assert.equal(notaB.maximo_possivel, 5);
  });
});

test('GET /nota sem ?id= mantém a nota global, sobre todas as evidencias', async () => {
  await comServidor(async ({ base }) => {
    const ideiaA = await post(base, { ideia: 'App para controlar gastos' });
    const ideiaB = await post(base, { ideia: 'Consultoria de marketing' });

    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A1', id_validacao: ideiaA.corpo.id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B1', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B2', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({
      tipo: 'reclamacao',
      fonte: 'Reclamacao B',
      id_validacao: ideiaB.corpo.id
    }));

    const resposta = await fetch(`${base}/nota`);
    const nota = await resposta.json();

    // Sem filtro, a nota soma as duas validações: 3 concorrentes + 1 reclamação.
    // Os 3 concorrentes estão na faixa de "cabe mais um?", então valem 1 ponto.
    assert.equal(resposta.status, 200);
    assert.equal(nota.total, 3);
    assert.equal(nota.criterios.tem_gente.pontos, 1);
    assert.equal(nota.criterios.cabe_mais_um.pontos, 1);
    assert.equal(nota.criterios.tem_gente_insatisfeita.pontos, 1);
  });
});

test('GET /relatorio/:id mostra a nota daquela validacao, e nao a global', async () => {
  await comServidor(async ({ base }) => {
    // A ideia A é fraca: um concorrente, que não pontua.
    const ideiaA = await post(base, { ideia: 'App para controlar gastos' });
    await postEvidencia(base, evidenciaValida({
      fonte: 'Concorrente A1',
      id_validacao: ideiaA.corpo.id
    }));

    // A ideia B é forte: duas concorrentes e uma reclamação. Sem vínculo com A.
    const ideiaB = await post(base, { ideia: 'Consultoria de marketing' });
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B1', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B2', id_validacao: ideiaB.corpo.id }));
    await postEvidencia(base, evidenciaValida({
      tipo: 'reclamacao',
      fonte: 'Reclamacao B',
      id_validacao: ideiaB.corpo.id
    }));

    // O relatório de A não pode herdar a nota de B.
    const relatorioA = await (await fetch(`${base}/relatorio/${ideiaA.corpo.id}`)).text();
    assert.match(relatorioA, /nota-grande">0</);
    assert.match(relatorioA, /PARAR/);
    assert.ok(relatorioA.includes('Concorrente A1'));
    assert.ok(!relatorioA.includes('Concorrente B1'), 'nao deve trazer evidencias de outra ideia');

    // O relatório de B mostra a nota dele.
    const relatorioB = await (await fetch(`${base}/relatorio/${ideiaB.corpo.id}`)).text();
    assert.match(relatorioB, /nota-grande">3</);
    assert.match(relatorioB, /MUDAR_O_RECORTE/);
    assert.ok(relatorioB.includes('Concorrente B1'));
    assert.ok(!relatorioB.includes('Concorrente A1'), 'nao deve trazer evidencias de outra ideia');
  });
});

test('arquivo de validacoes corrompido não impede o relatório das validações boas', async () => {
  await comServidor(async ({ base, arquivo, arquivoEvidencias }) => {
    const primeira = await post(base, { ideia: 'App para controlar gastos' });
    const segunda = await post(base, { ideia: 'Consultoria de marketing' });

    // Corrompe a segunda das duas linhas do arquivo de validacoes.
    const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
    linhas[1] = '{isto nao e json valido';
    fs.writeFileSync(arquivo, linhas.join('\n'), 'utf8');

    // A validação boa continua acessível e o relatório abre.
    const relatorio = await fetch(`${base}/relatorio/${primeira.corpo.id}`);
    const corpo = await relatorio.text();

    assert.equal(relatorio.status, 200);
    assert.ok(corpo.includes('App para controlar gastos'));

    // A validação corrompida simplesmente não existe mais.
    const relatorioPerdido = await fetch(`${base}/relatorio/${segunda.corpo.id}`);
    assert.equal(relatorioPerdido.status, 404);
  });
});

test('arquivo de evidencias corrompido não derruba /nota nem /evidencias', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    // A validação precisa existir: desde o fix-09, /evidencias?id= devolve 404 para
    // id que não corresponde a nenhuma validação, e o 200 com lista vazia saiu de uso.
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    const id = validacao.corpo.id;

    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A', id_validacao: id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B', id_validacao: id }));

    // Corrompe uma linha no meio das duas.
    const linhas = fs.readFileSync(arquivoEvidencias, 'utf8').split('\n');
    linhas[0] = '{quebrada';
    fs.writeFileSync(arquivoEvidencias, linhas.join('\n'), 'utf8');

    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.status, 200);
    assert.equal(evidencias.corpo.total, 1);
    assert.equal(evidencias.corpo.evidencias[0].fonte, 'Concorrente B');

    // A nota é calculada com o que sobrou, sem erro 500.
    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.total, 0);
    assert.equal(nota.corpo.criterios.tem_gente.detalhe, '1 concorrente registrado. Minimo: 2.');

    // E o filtro por id também funciona com o arquivo pela metade: sobra a linha boa
    // da mesma validação, e a corrompida é ignorada.
    const filtrada = await fetch(`${base}/evidencias?id=${encodeURIComponent(id)}`);
    const corpoFiltrado = await filtrada.json();
    assert.equal(filtrada.status, 200);
    assert.equal(corpoFiltrado.total, 1);
    assert.equal(corpoFiltrado.evidencias[0].fonte, 'Concorrente B');
  });
});

test('relatório e nota abrem mesmo com os dois arquivos corrompidos', async () => {
  await comServidor(async ({ base, arquivo, arquivoEvidencias }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    fs.writeFileSync(arquivo, '{lixo\n', 'utf8');
    fs.writeFileSync(arquivoEvidencias, '{"tipo":"concorrente"\n', 'utf8');

    const relatorio = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    assert.equal(relatorio.status, 404);

    const nota = await getNota(base);
    assert.equal(nota.status, 200);
    assert.equal(nota.corpo.total, 0);
    assert.equal(nota.corpo.veredito.decisao, 'PARAR');

    const evidencias = await getEvidencias(base);
    assert.equal(evidencias.status, 200);
    assert.equal(evidencias.corpo.total, 0);
  });
});

test('gerarId devolve um UUID v4, no formato documentado no contrato', () => {
  for (let i = 0; i < 200; i++) {
    const id = gerarId();

    assert.match(id, REGEX_UUID_V4);
    assert.equal(typeof id, 'string');
    assert.equal(id.length, 36);
  }
});

test('dois ids gerados em sequência são diferentes', () => {
  const ids = [];

  for (let i = 0; i < 500; i++) {
    ids.push(gerarId());
  }

  assert.equal(ids.length, 500);
  assert.equal(new Set(ids).size, 500, 'nenhum id pode se repetir');
});

test('o id não carrega timestamp: não começa com 13 dígitos nem com data', () => {
  for (let i = 0; i < 100; i++) {
    const id = gerarId();

    // O formato antigo era "<Date.now()>-<aleatório>", começando por 13 dígitos.
    assert.ok(!/^\d{13}/.test(id), id);

    // E nenhum dos cinco blocos é um número puro de 13 dígitos.
    for (const bloco of id.split('-')) {
      assert.ok(!/^\d{13}$/.test(bloco), bloco);
    }
  }
});

test('o link do relatório funciona com o id em formato UUID', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    // O id novo aparece cru na URL, sem nenhum caractere que precise de escape.
    const url = `${base}/relatorio/${validacao.corpo.id}`;
    assert.ok(!url.includes('%'), 'o id não deve precisar de encode');

    const resposta = await fetch(url);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.ok(corpo.includes(validacao.corpo.id));
    assert.match(corpo, /App para controlar gastos/);

    // Um id com a mesma forma, mas que não existe, continua devolvendo 404.
    const inexistente = await fetch(`${base}/relatorio/${gerarId()}`);
    assert.equal(inexistente.status, 404);
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

test('POST /nota: 405 com header Allow: GET', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const resposta = await fetch(`${base}/nota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET' });

    // O GET continua funcionando depois do 405.
    const depois = await getNota(base);
    assert.equal(depois.status, 200);
    assert.equal(depois.corpo.total, 0);

    // Nenhum arquivo foi criado ou alterado por causa do 405.
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

test('PUT /evidencias: 405 com header Allow: GET, POST', async () => {
  await comServidor(async ({ base, arquivoEvidencias }) => {
    const resposta = await fetch(`${base}/evidencias`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidenciaValida({ fonte: 'Nao deve ser gravada' }))
    });
    const corpo = await resposta.json();

    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET, POST');
    assert.deepEqual(corpo, { error: 'Metodo nao permitido', permitido: 'GET, POST' });

    // O PUT não pode ter gravado evidência nenhuma.
    assert.equal(lerLinhas(arquivoEvidencias).length, 0);
  });
});

// Reescreve o expires_at da validação gravada no arquivo temporário. Existe para
// os testes de expiração: em vez de esperar 30 dias, o teste troca a data no
// arquivo e deixa o servidor decidir. É o mesmo caminho de leitura do produto,
// então o que está sob teste é o comportamento real, não um mock.
function definirExpiracao(arquivo, id, expiresAt) {
  const linhas = lerLinhas(arquivo).map((linha) => {
    const registro = JSON.parse(linha);

    if (registro.id !== id) {
      return linha;
    }

    if (expiresAt === null) {
      // Simula uma validação anterior à Tarefa 25, gravada sem o campo.
      delete registro.expires_at;
    } else {
      registro.expires_at = expiresAt;
    }

    return JSON.stringify(registro);
  });

  fs.writeFileSync(arquivo, `${linhas.join('\n')}\n`, 'utf8');
}

test('POST /validar-ideia devolve expires_at 30 dias no futuro', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const antes = Date.now();
    const r = await post(base, { ideia: 'App para controlar gastos' });
    const depois = Date.now();

    assert.equal(r.status, 200);
    assert.ok(r.corpo.expires_at, 'a resposta precisa trazer expires_at');

    const limite = new Date(r.corpo.expires_at).getTime();
    assert.ok(!Number.isNaN(limite), 'expires_at precisa ser uma data legível');
    assert.equal(new Date(r.corpo.expires_at).toISOString(), r.corpo.expires_at);

    const trintaDias = 30 * 24 * 60 * 60 * 1000;
    assert.ok(limite >= antes + trintaDias, 'expires_at deve estar 30 dias à frente');
    assert.ok(limite <= depois + trintaDias, 'expires_at não pode passar de 30 dias');

    // O campo tem de estar no arquivo também: a expiração sobrevive ao restart.
    const gravado = lerLinhas(arquivo).map((l) => JSON.parse(l))
      .find((registro) => registro.id === r.corpo.id);

    assert.ok(gravado, 'a validação precisa estar gravada');
    assert.equal(gravado.expires_at, r.corpo.expires_at);
  });
});

test('GET /relatorio com link no prazo devolve 200 e a data de expiração', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    assert.ok(validacao.corpo.expires_at, 'sem expires_at não há o que testar');

    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.ok(!corpo.includes('Este link expirou'), 'não pode mostrar a página de expirado');

    const esperado = new Date(validacao.corpo.expires_at)
      .toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    assert.ok(corpo.includes(`Este link expira em ${esperado}.`),
      'o relatório precisa mostrar a data de expiração');
  });
});

test('GET /relatorio com link expirado devolve 410 e a página de expirado', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    // Um dia no passado: a validação existe, mas o acesso já não vale.
    definirExpiracao(arquivo, validacao.corpo.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    // 410 Gone, e não 404: a validação existe, o acesso é que não.
    assert.equal(resposta.status, 410);
    assert.match(resposta.headers.get('content-type') || '', /html/);
    assert.ok(corpo.includes('Este link expirou'));
    assert.ok(!corpo.includes('Validador de Novos Negócios</h1>'),
      'a página de expirado não é o relatório');

    // A mesma validacao continua existindo para o resto do sistema: uma expiração
    // não deve apagar a nota nem a validação.
    assert.equal(lerLinhas(arquivo).length, 1);
  });
});

test('validação antiga sem expires_at continua abrindo: 200 (compatibilidade)', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    // Validação gravada antes da expiração existir: o campo some do arquivo.
    definirExpiracao(arquivo, validacao.corpo.id, null);

    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200, 'validação antiga não pode voltar 410');
    assert.ok(corpo.includes('App para controlar gastos'));
    assert.ok(!corpo.includes('Este link expirou'));

    // E o rodapé diz que não há data, em vez de ficar calado sobre isso.
    assert.ok(corpo.includes('não tem data de expiração'));
  });
});

test('o dashboard avisa que é projeto de portfólio e aponta o código-fonte', async () => {
  await comServidor(async ({ base }) => {
    const resposta = await fetch(`${base}/dashboard`);
    const corpo = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.ok(corpo.includes('Este é um projeto de portfólio.'));
    assert.ok(corpo.includes('Não use para decisões de negócio'));
    assert.ok(corpo.includes('As evidências são fornecidas por usuários'));
    assert.ok(corpo.includes('A qualidade da nota'));
    assert.ok(corpo.includes('Ver código-fonte'));
    assert.ok(corpo.includes('Desenvolvido por'));
    assert.ok(corpo.includes('https://github.com/clodoteixeira-1974/validador-negocios'));
  });
});

test('o relatório avisa que a evidência não é verificada', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    const resposta = await fetch(`${base}/relatorio/${validacao.corpo.id}`);
    const corpo = await resposta.text();

    assert.ok(corpo.includes('evidências fornecidas por usuários'));
    assert.ok(corpo.includes('Não há verificação de fonte automática'));
  });
});

test('GET /nota?id= com id expirado devolve 410 em JSON', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    definirExpiracao(arquivo, validacao.corpo.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const resposta = await fetch(`${base}/nota?id=${encodeURIComponent(validacao.corpo.id)}`);
    const corpo = await resposta.json();

    // A expiracao precisa valer para o dado, e nao so para a pagina: sem isso,
    // fechar o relatorio e nao fechar o vazamento.
    assert.equal(resposta.status, 410);
    assert.match(resposta.headers.get('content-type') || '', /json/);
    assert.deepEqual(corpo, { error: 'Este link expirou' });

    // E o corpo nao pode vazar a nota no meio do erro.
    assert.equal(corpo.total, undefined);
    assert.equal(corpo.criterios, undefined);
  });
});

test('GET /nota?id= com id valido devolve 200 e a nota da ideia', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));

    const resposta = await fetch(`${base}/nota?id=${encodeURIComponent(validacao.corpo.id)}`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.equal(typeof corpo.total, 'number');
    assert.equal(typeof corpo.maximo_possivel, 'number');
    assert.ok(corpo.criterios, 'a nota por ideia precisa vir com os criterios');
  });
});

test('GET /nota sem ?id= continua devolvendo a nota geral, sem expiracao', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    // Todas as validacoes deste teste estao expiradas, e a nota geral continua
    // de pe: ela nao pertence a uma validacao, entao nao tem prazo.
    definirExpiracao(arquivo, validacao.corpo.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));

    const resposta = await fetch(`${base}/nota`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.equal(typeof corpo.total, 'number');
    assert.equal(typeof corpo.maximo_possivel, 'number');
  });
});

test('GET /evidencias?id= com id valido e nao expirado devolve 200 com as evidencias', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    const id = validacao.corpo.id;

    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A', id_validacao: id }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B', id_validacao: id }));

    const resposta = await fetch(`${base}/evidencias?id=${encodeURIComponent(id)}`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.equal(corpo.total, 2);
    assert.deepEqual(
      corpo.evidencias.map((evidencia) => evidencia.fonte),
      ['Concorrente A', 'Concorrente B']
    );
  });
});

test('GET /evidencias?id= com id expirado devolve 410 e nao vaza as evidencias', async () => {
  await comServidor(async ({ base, arquivo, arquivoEvidencias }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    const id = validacao.corpo.id;
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A', id_validacao: id }));

    definirExpiracao(arquivo, id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const resposta = await fetch(`${base}/evidencias?id=${encodeURIComponent(id)}`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 410);
    assert.match(resposta.headers.get('content-type') || '', /json/);
    assert.deepEqual(corpo, { error: 'Este link expirou' });

    // O corpo do erro nao pode carregar nem um trecho da evidencia.
    assert.equal(corpo.evidencias, undefined);
    assert.equal(corpo.total, undefined);

    // Expirar fecha o acesso, e nao apaga o dado.
    assert.equal(lerLinhas(arquivoEvidencias).length, 1);
  });
});

test('GET /evidencias?id= com id inexistente devolve 404, e nao lista vazia', async () => {
  await comServidor(async ({ base }) => {
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A', id_validacao: 'v1' }));

    const resposta = await fetch(`${base}/evidencias?id=${encodeURIComponent(gerarId())}`);
    const corpo = await resposta.json();

    // Antes, um id inexistente devolvia 200 com zero evidencias, e isso indistinguia
    // "nao ha evidencia para este id" de "este id nao existe".
    assert.equal(resposta.status, 404);
    assert.deepEqual(corpo, { error: 'Validacao nao encontrada' });
  });
});

test('GET /evidencias sem ?id= continua listando todas, mesmo com validacoes expiradas', async () => {
  await comServidor(async ({ base, arquivo }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente A' }));
    await postEvidencia(base, evidenciaValida({ fonte: 'Concorrente B' }));

    definirExpiracao(arquivo, validacao.corpo.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const resposta = await fetch(`${base}/evidencias`);
    const corpo = await resposta.json();

    assert.equal(resposta.status, 200);
    assert.equal(corpo.total, 2, 'a listagem global nao tem prazo');
  });
});

// ---------------------------------------------------------------------------
// Limite de taxa (Tarefa 26)
//
// Cada teste abaixo cria o servidor por comServidor, e cada createApp cria os
// limitadores novos. O balde de cada IP comeca vazio a cada teste, entao nao ha
// necessidade de IP falso por header nem de funcao de reset: o isolamento vem de
// criar a instancia, nao de contornar o limite.
// ---------------------------------------------------------------------------

async function repetir(requisicao, vezes) {
  const respostas = [];

  for (let i = 0; i < vezes; i += 1) {
    respostas.push(await requisicao());
  }

  return respostas;
}

test('POST /validar-ideia barra a 11a requisicao do mesmo IP', async () => {
  await comServidor(async ({ base }) => {
    const respostas = await repetir(
      () => post(base, { ideia: 'App para controlar gastos' }),
      11
    );

    // Dez passam, a decima primeira e barrada.
    for (const resposta of respostas.slice(0, 10)) {
      assert.equal(resposta.status, 200);
    }

    assert.equal(respostas[10].status, 429);
    assert.deepEqual(respostas[10].corpo, {
      error: 'Muitas requisicoes. Tente novamente em 1 minuto.'
    });
  });
});

test('POST /evidencias barra a 31a requisicao do mesmo IP', async () => {
  await comServidor(async ({ base }) => {
    const respostas = await repetir(
      () => postEvidencia(base, evidenciaValida({ fonte: 'Concorrente' })),
      31
    );

    for (const resposta of respostas.slice(0, 30)) {
      assert.equal(resposta.status, 201);
    }

    assert.equal(respostas[30].status, 429);
    assert.match(respostas[30].corpo.error, /Muitas requisicoes/);
  });
});

test('GET /evidencias sem filtro barra a 31a requisicao, mas o filtro por id nao conta', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });

    const respostas = await repetir(() => getEvidencias(base), 31);

    for (const resposta of respostas.slice(0, 30)) {
      assert.equal(resposta.status, 200);
    }

    assert.equal(respostas[30].status, 429);

    // O limite e so da listagem global. Filtrar por id nao passa pelo limitador,
    // e continua respondendo depois de a listagem ter sido barrada.
    const filtrada = await fetch(`${base}/evidencias?id=${encodeURIComponent(validacao.corpo.id)}`);
    assert.equal(filtrada.status, 200);
  });
});

test('GET /relatorio/:id barra a 61a requisicao do mesmo IP', async () => {
  await comServidor(async ({ base }) => {
    const validacao = await post(base, { ideia: 'App para controlar gastos' });
    const url = `${base}/relatorio/${validacao.corpo.id}`;

    const respostas = await repetir(() => fetch(url), 61);

    for (const resposta of respostas.slice(0, 60)) {
      assert.equal(resposta.status, 200);
    }

    assert.equal(respostas[60].status, 429);
  });
});

test('GET /nota barra a 61a requisicao do mesmo IP', async () => {
  await comServidor(async ({ base }) => {
    const respostas = await repetir(() => getNota(base), 61);

    for (const resposta of respostas.slice(0, 60)) {
      assert.equal(resposta.status, 200);
    }

    assert.equal(respostas[60].status, 429);
  });
});

test('GET /dashboard barra a 61a requisicao do mesmo IP', async () => {
  await comServidor(async ({ base }) => {
    const respostas = await repetir(() => fetch(`${base}/dashboard`), 61);

    for (const resposta of respostas.slice(0, 60)) {
      assert.equal(resposta.status, 200);
    }

    assert.equal(respostas[60].status, 429);
  });
});

test('GET /saude nao tem limite: 100 requisicoes seguidas respondem 200', async () => {
  await comServidor(async ({ base }) => {
    // Healthcheck sem limite é deliberado: é o que o balanceador consulta para
    // saber se a instância está viva, e um healthcheck barrado derruba a instância.
    const respostas = await repetir(() => fetch(`${base}/saude`), 100);

    for (const resposta of respostas) {
      assert.equal(resposta.status, 200);
    }
  });
});

test('a resposta 429 traz Retry-After em segundos e os headers de contagem', async () => {
  await comServidor(async ({ base }) => {
    const pedir = () => fetch(`${base}/validar-ideia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideia: 'App para controlar gastos' })
    });

    await repetir(pedir, 10);

    // fetch cru, e nao o helper post(), porque este teste precisa dos headers:
    // o helper devolve so o corpo.
    const resposta = await pedir();
    assert.equal(resposta.status, 429);
    assert.match(resposta.headers.get('content-type') || '', /json/);

    const corpo = await resposta.json();
    assert.deepEqual(corpo, {
      error: 'Muitas requisicoes. Tente novamente em 1 minuto.'
    });

    const segundos = Number(resposta.headers.get('retry-after'));
    assert.ok(Number.isInteger(segundos), 'Retry-After precisa ser um inteiro');
    assert.ok(segundos > 0 && segundos <= 60,
      `Retry-After deveria estar entre 1 e 60, veio ${segundos}`);

    // Os headers de contagem ajudam o cliente a se regular sem gastar uma
    // requisicao para descobrir que está no fim.
    assert.equal(resposta.headers.get('x-ratelimit-limit'), '10');
    assert.equal(resposta.headers.get('x-ratelimit-remaining'), '0');
  });
});
