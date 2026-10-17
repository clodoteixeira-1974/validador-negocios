// Limite de taxa por IP, em memória, sem dependência externa.
//
// O serviço é público, e sem limite um laço de POST enche o disco e um laço de
// GET /evidencias sem filtro segura o event loop, porque o I/O do projeto é
// síncrono. Esta é a Tarefa 26.
//
// O que este módulo NÃO é: não é autenticação, não é defesa contra abuso
// distribuído e não sobrevive a reinício. Um Map por processo é o que dá para
// fazer sem Redis e sem dependência, e o custo é dizer com todas as letras que
// o limite é por instância.

const JANELA_PADRAO_MS = 60000;
const MAXIMO_PADRAO = 60;

// Mensagem de 429. O texto diz "em 1 minuto" e isso está amarrado à janela padrão
// de 60 s: mudar janelaMs sem mudar o texto deixa a resposta mentindo. O
// Retry-After é calculado de verdade, então quem integra deve usar ele.
const MENSAGEM_LIMITE =
  'Muitas requisicoes. Tente novamente em 1 minuto.';

// Extrai o IP de quem fez a requisição.
//
// req.ip é o endereço do socket. Atrás de um proxy ou balanceador, como a VPS
// vai ficar, esse é o IP do proxy e todo mundo compartilha o mesmo balde — o
// limite passa a valer para o serviço inteiro, não para a pessoa. Ler
// X-Forwarded-For resolveria, mas abriria a porta de chamar a rota com o header
// e burlar o limite num serviço sem proxy nenhum. Por isso o comportamento é o
// conservador, e a consequência está anotada em CONTRATO.md: com proxy, é preciso
// ligar app.set('trust proxy', ...) e aí o X-Forwarded-For passa a valer.
function extrairIp(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

// Cria um middleware de limite de taxa.
//
// Devolve uma função com assinatura de middleware do Express. Cada chamada cria
// um Map próprio, e é por isso que o mapa nasce dentro de createApp e não no
// escopo do módulo: assim cada instância de teste começa zerada, sem precisar de
// cabeçalho de IP falso nem de função de reset.
//
// Opções:
//   janelaMs  duração da janela, em milissegundos (padrão 60000)
//   maximo    requisições permitidas por janela, por IP (padrão 60)
//   mensagem  texto da resposta 429 (padrão o de cima)
function criarLimitador(opcoes = {}) {
  const janelaMs = opcoes.janelaMs || JANELA_PADRAO_MS;
  const maximo = opcoes.maximo || MAXIMO_PADRAO;
  const mensagem = opcoes.mensagem || MENSAGEM_LIMITE;

  // IP -> { contagem, resetEm }. Vive enquanto a janela estiver aberta.
  const registros = new Map();

  // Remove entradas cuja janela já passou. Sem isso o Map só cresce, e um
  // serviço público receberia visitor de todo IP do mundo sem liberar memória.
  // A varredura é preguiçosa: só acontece quando alguém é barrado de verdade, e
  // nesse momento o Map tem no máximo o tamanho da janela, não o de sempre.
  function limparExpirados(agora) {
    for (const [ip, registro] of registros) {
      if (registro.resetEm <= agora) {
        registros.delete(ip);
      }
    }
  }

  return function limitar(requisicao, resposta, proximo) {
    const agora = Date.now();
    const ip = extrairIp(requisicao);
    let registro = registros.get(ip);

    // Janela nova para este IP: começa a contar do zero.
    if (registro === undefined || registro.resetEm <= agora) {
      registro = { contagem: 0, resetEm: agora + janelaMs };
      registros.set(ip, registro);
    }

    registro.contagem += 1;

    const restante = Math.max(0, Math.ceil((registro.resetEm - agora) / 1000));
    resposta.set('X-RateLimit-Limit', String(maximo));
    resposta.set('X-RateLimit-Remaining', String(Math.max(0, maximo - registro.contagem)));

    if (registro.contagem > maximo) {
      limparExpirados(agora);
      resposta.set('Retry-After', String(restante));
      return resposta.status(429).json({ error: mensagem });
    }

    return proximo();
  };
}

module.exports = {
  criarLimitador,
  JANELA_PADRAO_MS,
  MAXIMO_PADRAO
};
