const path = require('path');

const { lerJsonl, escreverJsonl, avisarLinhasIgnoradas } = require('./jsonl');

// Arquivo de evidências (JSON Lines), na mesma pasta do server.js
const ARQUIVO_EVIDENCIAS = path.join(__dirname, 'evidencias.jsonl');

// Tipos aceitos
const TIPOS = ['concorrente', 'reclamacao', 'dado_mercado', 'monetizacao', 'alcance'];

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

// Campos aceitos, porém opcionais. "id_validacao" amarra a evidência a uma
// validação específica: sem ele a evidência é geral, com ele a evidência
// responde por um único id e é assim que a nota passa a ser por ideia.
const CAMPOS_OPCIONAIS = ['id_validacao'];

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

  // Campos opcionais: só são validados quando presentes.
  for (const campo of CAMPOS_OPCIONAIS) {
    if (evidencia[campo] === undefined) {
      continue;
    }

    if (typeof evidencia[campo] !== 'string') {
      erros.push(`campo opcional "${campo}" deve ser string, recebido ${typeof evidencia[campo]}`);
      continue;
    }

    if (evidencia[campo].trim() === '') {
      erros.push(`campo opcional "${campo}" não pode ser vazio: apague o campo para deixar de ser vinculado`);
    }
  }

  return erros;
}

// Grava uma evidência em evidencias.jsonl (append). Retorna a evidência gravada.
// O caminho é opcional: os testes automatizados passam um arquivo temporário.
function registrarEvidencia(evidencia, arquivo = ARQUIVO_EVIDENCIAS) {
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

  // Vínculo com a validação: some quando não informado. Ausente é diferente de
  // vazio: um id em branco é recusado pela validação, porque pareceria vinculado
  // a uma validação que não existe.
  if (registro.id_validacao === undefined || registro.id_validacao === null) {
    delete registro.id_validacao;
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

  // O vínculo vem por último para não mudar a ordem dos campos já gravados.
  if (registro.id_validacao !== undefined) {
    ordem.id_validacao = registro.id_validacao;
  }

  escreverJsonl(arquivo, ordem);

  return ordem;
}

// Lê o arquivo e devolve um array de objetos. Arquivo inexistente = array vazio.
// Com idValidacao informado, devolve só as evidências vinculadas a ele; sem o
// parâmetro, devolve todas.
// Linha corrompida é ignorada com aviso, e não interrompe a leitura: um registro
// ruim não pode derrubar o histórico inteiro.
// O caminho é opcional e segue a mesma regra de registrarEvidencia.
function listarEvidencias(arquivo = ARQUIVO_EVIDENCIAS, idValidacao) {
  const { registros, linhasIgnoradas } = lerJsonl(arquivo);

  avisarLinhasIgnoradas(arquivo, linhasIgnoradas);

  if (typeof idValidacao !== 'string' || idValidacao.trim() === '') {
    return registros;
  }

  return registros.filter((registro) => registro && registro.id_validacao === idValidacao);
}

module.exports = {
  registrarEvidencia,
  listarEvidencias,
  validarEvidencia,
  gerarId,
  ARQUIVO_EVIDENCIAS,
  CAMPOS_OBRIGATORIOS,
  CAMPOS_OPCIONAIS,
  TIPOS,
  RELEVANCIAS
};