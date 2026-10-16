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