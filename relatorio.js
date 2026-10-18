// Geração das páginas HTML do Validador de Novos Negócios.
//
// São duas páginas:
//   - o relatório de uma validação, feito para ser lido e impresso em A4;
//   - o dashboard, onde se envia uma ideia e se acompanha o resultado.
//
// Nenhuma das duas depende de framework ou biblioteca visual: ambas carregam a
// folha CSS compartilhada servida localmente. A única dependência continua sendo
// express, e o relatório permanece imprimível em A4.

// Identidade do projeto, usada nos rodapés do dashboard e do relatório.
// Ficam aqui, e não repetidas no HTML, para que trocar o nome do autor seja uma
// edição de um lugar só.
const AUTOR_PROJETO = 'Clodoaldo Teixeira';
const PERFIL_AUTOR = 'https://github.com/clodoteixeira-1974';
const REPOSITORIO = 'https://github.com/clodoteixeira-1974/validador-negocios';

// Escapa o que vier de dentro para o HTML. Os dados são texto do usuário e não
// podem ser interpretados como marcação.
function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Data em português, para leitura, no formato dia/mês/ano.
function formatarData(iso) {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return String(iso);
  }

  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// O rodapé do relatório: quando foi gerado, a data de expiração do link, o
// aviso de que a evidência não é verificada, e onde está o dashboard.
//
// A expiração vem do expires_at da validação. Validação antiga, sem esse campo,
// não expira nunca: o texto diz isso em vez de omitir a linha, porque um rodapé
// calado pode ser lido como "não expira" quando o oposto também é verdade.
function gerarRodape(base, validacao) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' });
  const expiracao = validacao && validacao.expires_at
    ? `Este link expira em ${escapar(formatarData(validacao.expires_at))}.`
    : 'Validação anterior à expiração: este link não tem data de expiração.';

  return `
    <div class="rodape">
      Gerado em ${escapar(agora)} (UTC) &middot;
      ${expiracao} &middot;
      <a class="no-print" href="${escapar(base)}/dashboard">abrir o dashboard</a>
    </div>
    <p class="disclaimer">
      Este relatório é gerado a partir de evidências fornecidas por usuários.
      Não há verificação de fonte automática. A nota reflete a qualidade das
      evidências registradas, e não uma checagem independente dos fatos.
    </p>`;
}

// Monta o relatório de uma validação. Recebe o registro da validação, o objeto
// de nota devolvido por calcularNota, as evidências relacionadas (pode ser
// vazio) e a URL base, usada só nos links.
function gerarHtmlRelatorio(validacao, nota, evidencias, base) {
  const veredito = nota.veredito || {};
  const classe = `veredito decisao-${escapar(veredito.decisao || '')}`;

  const linhasCriterios = Object.entries(nota.criterios || {})
    .map(([nome, criterio]) => `
          <tr>
            <td>${escapar(nome)}</td>
            <td class="pontos">${escapar(criterio.pontos)} de ${escapar(criterio.maximo)}</td>
            <td>${escapar(criterio.detalhe)}</td>
          </tr>`)
    .join('');

  const linhasEvidencias = evidencias.length > 0
    ? evidencias.map((evidencia) => `
          <tr>
            <td>${escapar(evidencia.tipo)}</td>
            <td>${escapar(evidencia.fonte)}</td>
            <td>${escapar(evidencia.trecho_bruto)}</td>
          </tr>`)
    .join('')
    : '';

  const blocoEvidencias = evidencias.length > 0
    ? `<h2>Evidências relacionadas</h2>
      <table>
        <thead>
          <tr><th>Tipo</th><th>Fonte</th><th>Trecho</th></tr>
        </thead>
        <tbody>${linhasEvidencias}
        </tbody>
      </table>`
    : '<h2>Evidências relacionadas</h2><p class="vazio">Nenhuma evidência registrada para esta ideia.</p>';

  const blocoImagem = validacao.imagem_base64
    ? `<img class="imagem-validacao" src="${escapar(validacao.imagem_base64)}" alt="Imagem enviada com a ideia">`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório — Validador de Novos Negócios</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<main class="folha card relatorio">
  <h1>Validador de Novos Negócios</h1>
  <p class="subtitulo">Relatório de validação de ideia</p>

  <h2>A ideia</h2>
  <dl class="meta">
    <dt>Ideia</dt><dd>${escapar(validacao.ideia)}</dd>
    <dt>Tipo</dt><dd>${escapar(validacao.tipo)}</dd>
    <dt>Validada em</dt><dd>${escapar(formatarData(validacao.timestamp))}</dd>
    <dt>Identificador</dt><dd>${escapar(validacao.id)}</dd>
  </dl>
  ${blocoImagem}

  <h2>Nota</h2>
  <p class="nota-grande">${escapar(nota.total)}</p>
  <p class="nota-max">de ${escapar(nota.maximo_possivel)} pontos</p>

  <div class="${classe}">
    <p class="decisao">${escapar(veredito.decisao)}</p>
    <p class="explicacao">Faixa ${escapar(veredito.faixa)} — ${escapar(veredito.explicacao)}</p>
  </div>

  <h2>Critérios</h2>
  <table>
    <thead>
      <tr><th>Critério</th><th>Pontos</th><th>Detalhe</th></tr>
    </thead>
    <tbody>${linhasCriterios}
    </tbody>
  </table>
${blocoEvidencias}
${gerarRodape(base || '', validacao)}
</main>
</body>
</html>`;
}

// Monta o dashboard: formulário para enviar uma ideia, área de resultado e botão
// para copiar o link do relatório. O JavaScript só fala com a API.
function gerarHtmlDashboard() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Validador de Novos Negócios</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<main class="painel card">
  <div class="banner">
    <strong class="badge">Este é um projeto de portfólio.</strong>
    <p>Os dados são fictícios ou de demonstração. Não use para decisões de negócio
    reais.</p>
  </div>

  <h1>Validador de Novos Negócios</h1>
  <p class="subtitulo">Descreva a ideia e veja a nota de viabilidade.</p>

  <div class="entrada-ideia">
    <div>
      <label for="ideia">Sua ideia de negócio</label>
      <textarea id="ideia" placeholder="Ex.: App para controlar gastos"></textarea>
    </div>
    <div class="campo-imagem">
      <label for="imagem">Ou envie uma imagem</label>
      <input id="imagem" type="file" accept="image/*">
      <label class="btn-secundario upload-botao" for="imagem">Escolher arquivo</label>
      <img id="preview-imagem" class="preview-imagem" alt="Pré-visualização da imagem selecionada" hidden>
    </div>
  </div>
  <button class="btn-primario" id="enviar" type="button">Validar ideia</button>

  <p class="banner-suave">As evidências são fornecidas por usuários. A qualidade da nota
  depende da qualidade das evidências.</p>

  <p class="aviso" id="aviso" hidden></p>

  <div class="resultado" id="resultado" hidden>
    <h2>Resultado</h2>
    <dl class="meta">
      <dt>Ideia</dt><dd id="r-ideia"></dd>
      <dt>Tipo</dt><dd id="r-tipo"></dd>
      <dt>Nota</dt><dd id="r-nota"></dd>
      <dt>Veredito</dt><dd id="r-veredito"></dd>
      <dt>Explicação</dt><dd id="r-explicacao"></dd>
    </dl>

    <h2>Link do relatório</h2>
    <p class="link-caixa code-block" id="r-link"></p>
    <p class="banner-suave" id="r-expira"></p>
    <button class="btn-secundario" id="copiar" type="button">Copiar link do relatório</button>
    <div id="aviso-copia" class="aviso oculto" role="status" aria-live="polite">Link copiado!</div>
  </div>

  <div class="vitrine">
    <p>Projeto de portfólio. Desenvolvido por
      <a href="${escapar(PERFIL_AUTOR)}">${escapar(AUTOR_PROJETO)}</a>.</p>
    <p class="vitrine-skills">Node.js · Express · OpenRouter · OpenAI Luna · CSS puro · RAG · Determinismo</p>
    <div class="vitrine-links">
      <a class="botao-secundario btn-secundario" href="${escapar(REPOSITORIO)}" rel="noopener">Ver código-fonte</a>
    </div>
  </div>
</main>

<script>
(function () {
  var campoIdeia = document.getElementById('ideia');
  var campoImagem = document.getElementById('imagem');
  var previewImagem = document.getElementById('preview-imagem');
  var botaoEnviar = document.getElementById('enviar');
  var botaoCopiar = document.getElementById('copiar');
  var aviso = document.getElementById('aviso');
  var avisoCopia = document.getElementById('aviso-copia');
  var resultado = document.getElementById('resultado');
  var linkRelatorio = '';
  var timerCopia = null;

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.classList.toggle('aviso-erro', texto !== '');
    aviso.hidden = texto === '';
  }

  // Mostra o aviso de cópia e o esconde depois de 2 segundos. Clicar de novo
  // enquanto ele está visível reinicia a contagem, em vez de sumir cedo.
  function mostrarAvisoCopia(texto, erro) {
    if (timerCopia !== null) {
      clearTimeout(timerCopia);
    }

    avisoCopia.textContent = texto;
    avisoCopia.classList.toggle('aviso-erro', erro === true);
    avisoCopia.classList.remove('oculto');

    timerCopia = setTimeout(function () {
      avisoCopia.classList.add('oculto');
      timerCopia = null;
    }, 2000);
  }

  function urlBase() {
    return window.location.origin;
  }

  function lerImagemComoDataUri(arquivo) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onload = function () { resolve(leitor.result); };
      leitor.onerror = function () { reject(new Error('Nao foi possivel ler a imagem.')); };
      leitor.readAsDataURL(arquivo);
    });
  }

  campoImagem.addEventListener('change', function () {
    var arquivo = campoImagem.files && campoImagem.files[0];

    if (!arquivo) {
      previewImagem.removeAttribute('src');
      previewImagem.hidden = true;
      return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      campoImagem.value = '';
      previewImagem.removeAttribute('src');
      previewImagem.hidden = true;
      mostrarAviso('A imagem deve ter no máximo 10 MB.');
      return;
    }

    lerImagemComoDataUri(arquivo).then(function (dataUri) {
      previewImagem.src = dataUri;
      previewImagem.hidden = false;
      mostrarAviso('');
    }).catch(function () {
      mostrarAviso('Nao foi possivel ler a imagem selecionada.');
    });
  });

  async function enviar() {
    var ideia = campoIdeia.value.trim();
    var arquivoImagem = campoImagem.files && campoImagem.files[0];

    if (ideia === '' && !arquivoImagem) {
      mostrarAviso('Escreva a ideia ou selecione uma imagem antes de validar.');
      return;
    }

    botaoEnviar.disabled = true;
    mostrarAviso('');

    try {
      var dados = {};

      if (ideia !== '') {
        dados.ideia = ideia;
      }

      if (arquivoImagem) {
        dados.imagem_base64 = await lerImagemComoDataUri(arquivoImagem);
      }

      var respostaValidacao = await fetch('/validar-ideia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      var validacao = await respostaValidacao.json();

      if (!respostaValidacao.ok) {
        mostrarAviso(validacao.error || 'Nao foi possivel validar a ideia.');
        return;
      }

      var respostaNota = await fetch('/nota?id=' + encodeURIComponent(validacao.id));
      var nota = await respostaNota.json();

      document.getElementById('r-ideia').textContent = validacao.ideia;
      document.getElementById('r-tipo').textContent = validacao.tipo;
      document.getElementById('r-nota').textContent = nota.total + ' de ' + nota.maximo_possivel;
      document.getElementById('r-veredito').textContent = nota.veredito.decisao;
      document.getElementById('r-explicacao').textContent = nota.veredito.explicacao;

      linkRelatorio = urlBase() + '/relatorio/' + encodeURIComponent(validacao.id);
      document.getElementById('r-link').textContent = linkRelatorio;

      // A data de expiração vem do servidor, em ISO. Se a validação for antiga e
      // não tiver o campo, a linha fica vazia em vez de dizer algo falso.
      var textoExpira = document.getElementById('r-expira');

      if (validacao.expires_at) {
        var expira = new Date(validacao.expires_at);

        textoExpira.textContent = Number.isNaN(expira.getTime())
          ? ''
          : 'Este link expira em ' + expira.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) + '.';
      } else {
        textoExpira.textContent = '';
      }

      resultado.hidden = false;
    } catch (erro) {
      mostrarAviso('Falha de comunicacao com o servidor.');
    } finally {
      botaoEnviar.disabled = false;
    }
  }

  async function copiar() {
    if (linkRelatorio === '') {
      return;
    }

    try {
      await navigator.clipboard.writeText(linkRelatorio);
      mostrarAvisoCopia('Link copiado!', false);
    } catch (erro) {
      mostrarAvisoCopia('Erro ao copiar. Copie manualmente.', true);
    }
  }

  botaoEnviar.addEventListener('click', enviar);
  botaoCopiar.addEventListener('click', copiar);
})();
</script>
</body>
</html>`;
}

module.exports = {
  gerarHtmlRelatorio,
  gerarHtmlDashboard,
  escapar,
  formatarData
};
