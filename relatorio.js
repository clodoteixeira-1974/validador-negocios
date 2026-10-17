// Geração das páginas HTML do Validador de Novos Negócios.
//
// São duas páginas:
//   - o relatório de uma validação, meant para ser lido e impresso em A4;
//   - o dashboard, onde se envia uma ideia e se acompanha o resultado.
//
// Nenhuma das duas depende de fonte externa, framework ou biblioteca: o CSS é
// embutido no próprio HTML e a única concessionária é a API, à qual a página
// fala por fetch. Isso mantém o projeto com a única dependência que tem
// (express), sem abrir mão de um documento imprimível.

const CSS = `
* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 24px;
  font-family: Georgia, "Times New Roman", serif;
  color: #1a1a1a;
  background: #f4f4f2;
  line-height: 1.5;
}

.folha {
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm 18mm;
  background: #ffffff;
  border: 1px solid #d8d8d4;
}

h1 {
  margin: 0 0 4px;
  font-size: 22pt;
  letter-spacing: -0.3px;
}

h2 {
  margin: 26px 0 8px;
  font-size: 12pt;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #555555;
  border-bottom: 1px solid #e2e2de;
  padding-bottom: 4px;
}

.subtitulo {
  margin: 0 0 22px;
  font-size: 10pt;
  color: #777770;
}

.meta {
  font-size: 10pt;
  color: #444440;
}

.meta dt {
  display: inline-block;
  min-width: 34mm;
  font-weight: bold;
  color: #666660;
}

.meta dd {
  display: inline-block;
  margin: 0 0 4px;
}

.nota-grande {
  font-size: 34pt;
  line-height: 1;
  font-weight: bold;
}

.nota-max {
  font-size: 14pt;
  color: #777770;
}

.veredito {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-left: 4px solid #999990;
  background: #f7f7f4;
}

.veredito.decisao-PARAR { border-left-color: #a33a3a; }
.veredito.decisao-MUDAR_O_RECORTE { border-left-color: #b0801f; }
.veredito.decisao-SEGUIR { border-left-color: #3d7a4e; }

.decisao {
  font-size: 15pt;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.explicacao {
  font-size: 10.5pt;
  color: #444440;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}

th, td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid #ecece8;
  vertical-align: top;
}

th {
  font-size: 8.5pt;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #777770;
  border-bottom: 1px solid #d8d8d4;
}

td.pontos {
  width: 14mm;
  font-weight: bold;
}

.vazio {
  font-size: 10pt;
  color: #888880;
  font-style: italic;
}

.rodape {
  margin-top: 30px;
  padding-top: 10px;
  border-top: 1px solid #e2e2de;
  font-size: 8.5pt;
  color: #888880;
}

.rodape a {
  color: #555550;
}

/* Dashboard */

.painel {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px;
  background: #ffffff;
  border: 1px solid #d8d8d4;
}

label {
  display: block;
  margin: 0 0 6px;
  font-size: 11pt;
  font-weight: bold;
  color: #444440;
}

textarea {
  width: 100%;
  min-height: 110px;
  padding: 10px;
  font-family: inherit;
  font-size: 11pt;
  border: 1px solid #c8c8c2;
  background: #fdfdfb;
}

button {
  margin-top: 10px;
  padding: 9px 18px;
  font-family: inherit;
  font-size: 11pt;
  cursor: pointer;
  border: 1px solid #8a8a82;
  background: #f0f0ec;
}

button:hover { background: #e6e6e0; }

button:disabled {
  opacity: 0.55;
  cursor: default;
}

.resultado {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #e2e2de;
}

.link-caixa {
  margin-top: 12px;
  padding: 10px;
  font-family: "Courier New", monospace;
  font-size: 10pt;
  word-break: break-all;
  background: #f4f4f2;
  border: 1px solid #e2e2de;
}

.aviso {
  margin-top: 12px;
  font-size: 10pt;
  color: #a33a3a;
}

/* Impressão: folha A4 limpa, sem controles. */

@page {
  size: A4;
  margin: 2cm;
}

@media print {
  body {
    padding: 0;
    background: #ffffff;
  }

  .folha {
    max-width: none;
    margin: 0;
    padding: 0;
    border: none;
  }

  .painel, .link-caixa, button, .aviso {
    display: none;
  }

  .relatorio { display: block !important; }

  a {
    color: #1a1a1a;
    text-decoration: none;
  }
}
`;

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

// O rodapé do relatório: quando foi gerado e onde está o dashboard.
function gerarRodape(base) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' });

  return `
    <div class="rodape">
      Gerado em ${escapar(agora)} (UTC) &middot;
      <a href="${escapar(base)}/dashboard">abrir o dashboard</a>
    </div>`;
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

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório — Validador de Novos Negócios</title>
<style>${CSS}</style>
</head>
<body>
<main class="folha">
  <h1>Validador de Novos Negócios</h1>
  <p class="subtitulo">Relatório de validação de ideia</p>

  <h2>A ideia</h2>
  <dl class="meta">
    <dt>Ideia</dt><dd>${escapar(validacao.ideia)}</dd>
    <dt>Tipo</dt><dd>${escapar(validacao.tipo)}</dd>
    <dt>Validada em</dt><dd>${escapar(formatarData(validacao.timestamp))}</dd>
    <dt>Identificador</dt><dd>${escapar(validacao.id)}</dd>
  </dl>

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
${gerarRodape(base || '')}
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
<style>${CSS}</style>
</head>
<body>
<main class="painel">
  <h1>Validador de Novos Negócios</h1>
  <p class="subtitulo">Descreva a ideia e veja a nota de viabilidade.</p>

  <label for="ideia">Sua ideia de negócio</label>
  <textarea id="ideia" placeholder="Ex.: App para controlar gastos"></textarea>
  <button id="enviar" type="button">Validar ideia</button>

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
    <p class="link-caixa" id="r-link"></p>
    <button id="copiar" type="button">Copiar link do relatório</button>
  </div>

  <div class="rodape">
    <a href="/relatorio">Validador de Novos Negócios</a>
  </div>
</main>

<script>
(function () {
  var campoIdeia = document.getElementById('ideia');
  var botaoEnviar = document.getElementById('enviar');
  var botaoCopiar = document.getElementById('copiar');
  var aviso = document.getElementById('aviso');
  var resultado = document.getElementById('resultado');
  var linkRelatorio = '';

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = texto === '';
  }

  function urlBase() {
    return window.location.origin;
  }

  async function enviar() {
    var ideia = campoIdeia.value.trim();

    if (ideia === '') {
      mostrarAviso('Escreva a ideia antes de validar.');
      return;
    }

    botaoEnviar.disabled = true;
    mostrarAviso('');

    try {
      var respostaValidacao = await fetch('/validar-ideia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideia: ideia })
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
      mostrarAviso('Link copiado.');
    } catch (erro) {
      mostrarAviso('Nao foi possivel copiar. Selecione o link acima.');
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
  CSS,
  escapar,
  formatarData
};
