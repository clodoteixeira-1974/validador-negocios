const fs = require('fs');
const path = require('path');

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

  fs.appendFileSync(arquivo, JSON.stringify(ordem) + '\n', 'utf8');

  return ordem;
}

// Lê o arquivo e devolve um array de objetos. Arquivo inexistente = array vazio.
// O caminho é opcional e segue a mesma regra de registrarEvidencia.
function listarEvidencias(arquivo = ARQUIVO_EVIDENCIAS) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  const conteudo = fs.readFileSync(arquivo, 'utf8');
  const linhas = conteudo.split('\n').filter((linha) => linha.trim() !== '');

  return linhas.map((linha, indice) => {
    try {
      return JSON.parse(linha);
    } catch (erro) {
      throw new Error(`Linha ${indice + 1} de ${path.basename(arquivo)} não é um JSON válido: ${erro.message}`);
    }
  });
}

module.exports = {
  registrarEvidencia,
  listarEvidencias,
  validarEvidencia,
  gerarId,
  ARQUIVO_EVIDENCIAS,
  CAMPOS_OBRIGATORIOS,
  TIPOS,
  RELEVANCIAS
};