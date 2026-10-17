# TEMPLATE — seção "Pipeline de evolução"

Este arquivo é o padrão da seção **Pipeline de evolução**. Ele não é um relatório: é o
molde que os próximos relatórios copiam, e que o `ESTADO.md` também mantém.

**Regra do projeto:** todo relatório novo termina com esta seção, imediatamente antes da
confirmação de existência e tamanho. A seção `ESTADO.md` correspondente é atualizada na
mesma tarefa.

Seções obrigatórias, nesta ordem:

1. `### Onde estamos`
2. `### O que foi feito até aqui`
3. `### O que falta`
4. `### Decisões tomadas`
5. `### Pendências conhecidas`
6. `### Próximo passo`

**A lista "O que foi feito até aqui" é cumulativa**: ela cresce a cada tarefa e não é
reescrita do zero. O mesmo vale para "O que falta", "Decisões tomadas" e "Pendências
conhecidas" — itens concluídos saem da lista do que falta; itens resolvidos saem da lista de
pendências, e a remoção é o registro de que foram resolvidos.

---

## Modelo

### Onde estamos

Fase do fluxograma e a tarefa em andamento. Uma ou duas frases.

### O que foi feito até aqui

Lista cumulativa, do começo ao mais recente. Prefira a ordem cronológica das tarefas, com
o prefixo real de cada uma (`tarefa-NN`, `doc-NN`, `fix-NN`).

### O que falta

Lista com prioridade explícita, no formato `- [Alta] ...`. Justificativa curta quando a
prioridade não for óbvia.

### Decisões tomadas

Decisões de produto e de técnica que mudam o caminho futuro, com o motivo. Não repita o que
já está escrito em `ESTADO.md`: aponte para lá.

### Pendências conhecidas

Pendências abertas, cada uma com a origem e, quando possível, o que falta para fechar. Uma
pendência resolvida sai daqui; essa remoção é o registro do conserto.

### Próximo passo

Uma tarefa exata, com objetivo. Curta: o detalhamento fica no relatório.
