const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  registrarEvidencia,
  listarEvidencias,
  ARQUIVO_EVIDENCIAS
} = require('./evidencias');

// Cada teste grava em um arquivo temporário. O evidencias.jsonl de produção
// nunca é tocado. O caminho é passado como segundo argumento das funções.
function arquivoTemporario() {
  const sufixo = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return path.join(os.tmpdir(), `evidencias-teste-${sufixo}.jsonl`);
}

// Executa fn com um arquivo temporário limpo e garante a remoção ao final.
async function comArquivo(fn) {
  const arquivo = arquivoTemporario();

  try {
    return await fn(arquivo);
  } finally {
    fs.rmSync(arquivo, { force: true });
  }
}

function lerLinhas(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  return fs.readFileSync(arquivo, 'utf8').split('\n').filter((linha) => linha.trim() !== '');
}

function contagemLinhas(arquivo) {
  return lerLinhas(arquivo).length;
}

// Evidência válida, sem id e sem timestamp: os dois devem ser preenchidos pelo módulo.
function definicaoValida(extra = {}) {
  return Object.assign({
    tipo: 'concorrente',
    fonte: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=exemplo.financas',
    trecho_bruto: 'Organize suas contas, cartões e metas em um só lugar. 4,5 estrelas.',
    ideia_relacionada: 'App para controlar gastos',
    relevancia: 'alta'
  }, extra);
}

test('evidência válida: grava e devolve id e timestamp preenchidos', async () => {
  await comArquivo(async (arquivo) => {
    const gravada = registrarEvidencia(definicaoValida(), arquivo);

    assert.equal(gravada.tipo, 'concorrente');
    assert.equal(gravada.fonte, 'Google Play');
    assert.equal(gravada.url, 'https://play.google.com/store/apps/details?id=exemplo.financas');
    assert.equal(gravada.relevancia, 'alta');
    assert.notEqual(gravada.id, '');
    assert.match(gravada.id, /^\d+-[a-z0-9]+$/);
    assert.match(gravada.timestamp, /^\d{4}-\d{2}-\d{2}T/);

    // O arquivo temporário recebeu exatamente uma linha, com os mesmos campos.
    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);
    assert.deepEqual(JSON.parse(linhas[0]), gravada);
  });
});

test('evidência sem "fonte": lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    const semFonte = definicaoValida();
    delete semFonte.fonte;

    assert.throws(
      () => registrarEvidencia(semFonte, arquivo),
      (erro) => {
        assert.ok(erro instanceof Error);
        assert.match(erro.message, /Evidência inválida/);
        assert.ok(Array.isArray(erro.erros));
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"fonte"')));
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('evidência com "tipo" inválido: lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    assert.throws(
      () => registrarEvidencia(definicaoValida({ tipo: 'blog' }), arquivo),
      (erro) => {
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"tipo"')));
        assert.match(erro.message, /aceitos: concorrente, reclamacao, dado_mercado/);
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('evidência com "relevancia" inválida: lança erro e não grava', async () => {
  await comArquivo(async (arquivo) => {
    assert.throws(
      () => registrarEvidencia(definicaoValida({ relevancia: 'muito alta' }), arquivo),
      (erro) => {
        assert.ok(erro.erros.some((mensagem) => mensagem.includes('"relevancia"')));
        assert.match(erro.message, /aceitos: alta, media, baixa/);
        return true;
      }
    );

    assert.equal(contagemLinhas(arquivo), 0);
  });
});

test('listar evidências de arquivo vazio: devolve []', async () => {
  await comArquivo(async (arquivo) => {
    // Arquivo existe, mas está vazio.
    fs.writeFileSync(arquivo, '', 'utf8');

    assert.deepEqual(listarEvidencias(arquivo), []);

    // Arquivo inexistente também devolve [].
    fs.rmSync(arquivo, { force: true });
    assert.deepEqual(listarEvidencias(arquivo), []);
  });
});

test('listar evidências após registrar 3: devolve 3 na ordem de gravação', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'Fonte A' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'reclamacao', fonte: 'Fonte B', relevancia: 'media' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'dado_mercado', fonte: 'Fonte C', relevancia: 'baixa' }), arquivo);

    const evidencias = listarEvidencias(arquivo);

    assert.equal(evidencias.length, 3);
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.fonte),
      ['Fonte A', 'Fonte B', 'Fonte C']
    );
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado']
    );
    assert.deepEqual(
      evidencias.map((evidencia) => evidencia.relevancia),
      ['alta', 'media', 'baixa']
    );

    // Cada registro tem o mesmo conjunto de campos, na ordem do módulo.
    const camposEsperados = ['id', 'tipo', 'fonte', 'url', 'trecho_bruto', 'ideia_relacionada', 'timestamp', 'relevancia'];
    for (const evidencia of evidencias) {
      assert.deepEqual(Object.keys(evidencia), camposEsperados);
    }

    // Os ids gerados são distintos.
    assert.equal(new Set(evidencias.map((evidencia) => evidencia.id)).size, 3);
  });
});

test('nenhum teste grava no evidencias.jsonl de produção', async () => {
  const antes = contagemLinhas(ARQUIVO_EVIDENCIAS);

  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'Somente teste' }), arquivo);
    listarEvidencias(arquivo);
  });

  const depois = contagemLinhas(ARQUIVO_EVIDENCIAS);

  assert.equal(depois, antes);
});