const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  registrarEvidencia,
  listarEvidencias,
  validarEvidencia,
  TIPOS,
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

test('tipo "monetizacao" é aceito, gravado e listado', async () => {
  await comArquivo(async (arquivo) => {
    // O novo tipo está na lista de tipos válidos.
    assert.ok(TIPOS.includes('monetizacao'));

    const gravada = registrarEvidencia(definicaoValida({
      tipo: 'monetizacao',
      fonte: 'Pagina de precos de concorrente',
      url: 'https://exemplo.com/precos',
      trecho_bruto: 'Planos a partir de R$ 19,90 por mes.',
      relevancia: 'alta'
    }), arquivo);

    assert.equal(gravada.tipo, 'monetizacao');
    assert.equal(gravada.fonte, 'Pagina de precos de concorrente');

    // Nada foi recusado: o registro está no arquivo e volta na listagem.
    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);

    const listadas = listarEvidencias(arquivo);
    assert.equal(listadas.length, 1);
    assert.deepEqual(listadas[0], gravada);
    assert.equal(listadas[0].tipo, 'monetizacao');

    // E continua sendo uma evidência válida para o módulo.
    assert.deepEqual(validarEvidencia(gravada), []);
  });
});

test('o tipo "monetizacao" convive com os outros tres na mesma gravacao', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ tipo: 'concorrente' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'reclamacao' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'dado_mercado' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'monetizacao' }), arquivo);

    const listadas = listarEvidencias(arquivo);

    assert.equal(listadas.length, 4);
    assert.deepEqual(
      listadas.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado', 'monetizacao']
    );
  });
});

test('tipo "alcance" é aceito, gravado e listado', async () => {
  await comArquivo(async (arquivo) => {
    // O novo tipo está na lista de tipos válidos.
    assert.ok(TIPOS.includes('alcance'));

    const gravada = registrarEvidencia(definicaoValida({
      tipo: 'alcance',
      fonte: 'Relatorio de audiencia de um canal',
      url: 'https://exemplo.com/audiencia',
      trecho_bruto: 'O publico-alvo esta concentrado em um grupo especifico, com canal de acesso conhecido.',
      relevancia: 'alta'
    }), arquivo);

    assert.equal(gravada.tipo, 'alcance');
    assert.equal(gravada.fonte, 'Relatorio de audiencia de um canal');

    // Nada foi recusado: o registro está no arquivo e volta na listagem.
    const linhas = lerLinhas(arquivo);
    assert.equal(linhas.length, 1);

    const listadas = listarEvidencias(arquivo);
    assert.equal(listadas.length, 1);
    assert.deepEqual(listadas[0], gravada);
    assert.equal(listadas[0].tipo, 'alcance');

    // E continua sendo uma evidência válida para o módulo.
    assert.deepEqual(validarEvidencia(gravada), []);
  });
});

test('os 5 tipos convivem na mesma gravacao, na ordem em que foram gravados', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ tipo: 'concorrente' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'reclamacao' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'dado_mercado' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'monetizacao' }), arquivo);
    registrarEvidencia(definicaoValida({ tipo: 'alcance' }), arquivo);

    const listadas = listarEvidencias(arquivo);

    assert.equal(listadas.length, 5);
    assert.deepEqual(
      listadas.map((evidencia) => evidencia.tipo),
      ['concorrente', 'reclamacao', 'dado_mercado', 'monetizacao', 'alcance']
    );

    // Todos os cinco tipos do módulo estão representados, e nenhum outro.
    assert.equal(TIPOS.length, 5);
    assert.deepEqual(
      Array.from(new Set(listadas.map((evidencia) => evidencia.tipo))).sort(),
      TIPOS.slice().sort()
    );
  });
});

test('evidência com id_validacao é gravada e recuperada', async () => {
  await comArquivo(async (arquivo) => {
    const gravada = registrarEvidencia(definicaoValida({ id_validacao: 'val-abc' }), arquivo);

    assert.equal(gravada.id_validacao, 'val-abc');
    assert.equal(JSON.parse(lerLinhas(arquivo)[0]).id_validacao, 'val-abc');

    const listadas = listarEvidencias(arquivo);
    assert.equal(listadas[0].id_validacao, 'val-abc');
    assert.deepEqual(validarEvidencia(gravada), []);
  });
});

test('id_validacao ausente não é gravado, e id_validacao vazio é recusado', async () => {
  await comArquivo(async (arquivo) => {
    const semVinculo = registrarEvidencia(definicaoValida(), arquivo);

    assert.equal('id_validacao' in semVinculo, false);
    assert.equal('id_validacao' in JSON.parse(lerLinhas(arquivo)[0]), false);

    // Vazio não é o mesmo que ausente: um id vazio pareceria vinculado.
    assert.throws(
      () => registrarEvidencia(definicaoValida({ id_validacao: '   ' }), arquivo),
      /não pode ser vazio/
    );

    // E o tipo errado é recusado.
    assert.throws(
      () => registrarEvidencia(definicaoValida({ id_validacao: 123 }), arquivo),
      /deve ser string/
    );

    assert.equal(contagemLinhas(arquivo), 1);
  });
});

test('listarEvidencias com filtro devolve só as evidencias daquele id_validacao', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'A1', id_validacao: 'val-1' }), arquivo);
    registrarEvidencia(definicaoValida({ fonte: 'B1', id_validacao: 'val-2' }), arquivo);
    registrarEvidencia(definicaoValida({ fonte: 'A2', id_validacao: 'val-1' }), arquivo);
    registrarEvidencia(definicaoValida({ fonte: 'Solto' }), arquivo);

    const daVal1 = listarEvidencias(arquivo, 'val-1');
    const daVal2 = listarEvidencias(arquivo, 'val-2');
    const deNinguem = listarEvidencias(arquivo, 'val-inexistente');

    assert.equal(daVal1.length, 2);
    assert.deepEqual(daVal1.map((evidencia) => evidencia.fonte), ['A1', 'A2']);

    assert.equal(daVal2.length, 1);
    assert.equal(daVal2[0].fonte, 'B1');

    // Id sem evidencias não devolve nada, e não devolve todas.
    assert.deepEqual(deNinguem, []);

    // Filtro vazio é ignorado: devolve todas, como não filtrar.
    assert.equal(listarEvidencias(arquivo, '').length, 4);
    assert.equal(listarEvidencias(arquivo, undefined).length, 4);
    assert.equal(listarEvidencias(arquivo, null).length, 4);
  });
});

test('listarEvidencias sem filtro devolve todas, na ordem de gravação', async () => {
  await comArquivo(async (arquivo) => {
    registrarEvidencia(definicaoValida({ fonte: 'A', id_validacao: 'val-1' }), arquivo);
    registrarEvidencia(definicaoValida({ fonte: 'B', id_validacao: 'val-2' }), arquivo);
    registrarEvidencia(definicaoValida({ fonte: 'C' }), arquivo);

    const todas = listarEvidencias(arquivo);

    assert.equal(todas.length, 3);
    assert.deepEqual(
      todas.map((evidencia) => evidencia.fonte),
      ['A', 'B', 'C']
    );

    // E o arquivo continua com as tres linhas: filtrar não apaga nada.
    assert.equal(contagemLinhas(arquivo), 3);
  });
});