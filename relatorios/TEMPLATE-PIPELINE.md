# TEMPLATE — seções obrigatórias dos relatórios

Este arquivo é o padrão das seções que todo relatório do projeto deve ter. Ele não é um
relatório: é o molde.

**Regra do projeto:** todo relatório novo termina com a Auditoria Red Team e a seção
Pipeline de evolução, imediatamente antes da confirmação de existência e tamanho. O
`ESTADO.md` é atualizado na mesma tarefa.

Seções obrigatórias, nesta ordem, no fim do arquivo:

1. `## Auditoria Red Team`
2. `## Pipeline de evolução`
3. `### Onde estamos`
4. `### O que foi feito até aqui`
5. `### O que falta`
6. `### Decisões tomadas`
7. `### Pendências conhecidas`
8. `### Próximo passo`
9. `## Confirmação de existência e tamanho deste relatório`

A ordem importa: a auditoria vem antes do pipeline, e a confirmação de existência e tamanho
é sempre a última coisa do arquivo.

---

## Auditoria Red Team

Toda tarefa responde às seis perguntas abaixo. A auditoria vem **antes** do pipeline, para que
a leitura do progresso comece pelo risco e não pelo que deu certo.

**A auditoria tem de ser honesta.** Um relatório que se absolve é pior que um relatório sem
avaliação. Vale mais uma admissão de risco concreto e verificável do que uma frase otimista
sobre testes passando.

Se uma pergunta não tiver resposta nesta tarefa, escreva **"Nao identificado nesta tarefa"**.
Nunca invente resposta plausível e nunca preencha com reticências. A lacuna é informação:
ela mostra o que ainda precisa ser olhado.

As seis perguntas obrigatórias:

1. Quais são os 3 maiores pontos de falha sob alto tráfego?
2. Onde há alucinação lógica neste fluxo?
3. O que acontece se um arquivo `.jsonl` for corrompido?
4. O que acontece se dois requests chegarem ao mesmo tempo?
5. O que um atacante faria com este sistema?
6. Qual é a mentira mais confortável que este relatório conta?

A pergunta 6 é obrigatória e não pode ser omitida, mesmo quando a resposta for "nenhuma".
Respondê-la é parte do trabalho.

---

## Pipeline de evolução

### Onde estamos

Fase do fluxograma e a tarefa em andamento. Uma ou duas frases.

### O que foi feito até aqui

Lista cumulativa, do começo ao mais recente, com o prefixo real de cada tarefa (`tarefa-NN`,
`doc-NN`, `fix-NN`).

### O que falta

Lista com prioridade explícita, no formato `- [Alta] ...`. Justificativa curta quando a
prioridade não for óbvia.

### Decisões tomadas

Decisões de produto e de técnica que mudam o caminho futuro, com o motivo. Se o motivo
completo já estiver no `ESTADO.md`, aponte para lá em vez de repetir: duas listas iguais
divergem assim que uma é atualizada e a outra não.

### Pendências conhecidas

Pendências abertas, cada uma com a origem e, quando possível, o que falta para fechar. Uma
pendência resolvida sai daqui; essa remoção é o registro de que foi resolvida.

### Próximo passo

Uma tarefa exata, com objetivo. Curta: o detalhamento fica no relatório.

---

## Contrato de dados

Campos, entidades e quem os produz e consome estão em `CONTRATO.md`, na raiz.

**Regra do projeto:** toda tarefa que adicionar, remover ou alterar um campo descrito em
`CONTRATO.md` atualiza o `CONTRATO.md` no mesmo commit.
