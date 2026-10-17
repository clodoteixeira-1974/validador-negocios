# Tarefa 22 — Cobaia de comunicação política

**Data:** 17/10/2026
**Projeto:** Validador de Novos Negócios
**Ideia validada:** Plataforma de gestão de campanhas eleitorais para candidatos e partidos no Brasil

## Execução

A aplicação foi criada com `createApp()` e recebeu requisições HTTP via `fetch` para uma porta
efêmera `127.0.0.1` no mesmo processo Node. O processo encerrou o servidor ao terminar; não
houve servidor em segundo plano nem uso de `curl.exe`.

Os arquivos locais de persistência já existiam antes desta execução: `validacoes.jsonl` tinha
6 linhas e `evidencias.jsonl` tinha 3 linhas. Depois das operações, a verificação real encontrou
7 e 8 linhas, respectivamente. Os JSONL são dados locais ignorados pelo Git e não foram
incluídos no push; o relatório registra as respostas desta execução.

O comando `memory --action read --target daily` não está instalado. Não foi encontrado arquivo
diário para 17/10/2026; foram lidos o status disponível de 16/10/2026 e o `ESTADO.md`.

## Respostas HTTP reais

### Validação

`POST /validar-ideia` respondeu HTTP 200:

```json
{
  "recebido": true,
  "id": "43120523-dacf-41a6-961b-9148c2979e1f",
  "ideia": "Plataforma de gestão de campanhas eleitorais para candidatos e partidos no Brasil",
  "tipo": "outro",
  "timestamp": "2026-10-17T17:01:56.399Z",
  "expires_at": "2026-11-16T17:01:56.401Z"
}
```

Este `id` foi usado nas cinco chamadas `POST /evidencias`; todas responderam HTTP 201. O
servidor gerou os IDs e timestamps abaixo:

| Evidência | Tipo | Fonte | ID gerado | Timestamp retornado |
| --- | --- | --- | --- | --- |
| Concorrente 1 | `concorrente` | NationBuilder | `1792256516460-84jxx6` | `2026-10-17T17:01:56.460Z` |
| Concorrente 2 | `concorrente` | Elegis | `1792256516471-cenlbr` | `2026-10-17T17:01:56.471Z` |
| Reclamação | `reclamacao` | Google Play (Votly) | `1792256516480-mathpb` | `2026-10-17T17:01:56.480Z` |
| Monetização | `monetizacao` | Elegis | `1792256516487-mqkmet` | `2026-10-17T17:01:56.487Z` |
| Alcance | `alcance` | NationBuilder | `1792256516498-u0j3mi` | `2026-10-17T17:01:56.498Z` |

As cinco evidências foram vinculadas a `43120523-dacf-41a6-961b-9148c2979e1f`. Seus textos,
URLs, relevâncias e fontes foram enviados exatamente como especificados na tarefa. `GET
/evidencias?id=43120523-dacf-41a6-961b-9148c2979e1f` respondeu HTTP 200 com `total: 5` e
devolveu os cinco registros.

### Nota e veredito

Saída real de `GET /nota?id=43120523-dacf-41a6-961b-9148c2979e1f`:

```json
{
  "status": 200,
  "body": {
    "criterios": {
      "tem_gente": {
        "pontos": 1,
        "maximo": 1,
        "detalhe": "2 concorrentes registrados"
      },
      "tem_gente_insatisfeita": {
        "pontos": 1,
        "maximo": 1,
        "detalhe": "1 reclamacao registrada"
      },
      "cabe_mais_um": {
        "pontos": 1,
        "maximo": 1,
        "detalhe": "2 concorrentes registrados. Ha espaco para mais um."
      },
      "alguem_paga": {
        "pontos": 1,
        "maximo": 1,
        "detalhe": "1 evidencia de monetizacao registrada."
      },
      "alcance": {
        "pontos": 1,
        "maximo": 1,
        "detalhe": "1 evidencia de alcance registrada."
      }
    },
    "total": 5,
    "maximo_possivel": 5,
    "veredito": {
      "decisao": "SEGUIR",
      "faixa": "4 a 5",
      "explicacao": "Vale gastar as proximas 24h testando com gente de verdade."
    }
  }
}
```

### Relatório A4

`GET /relatorio/43120523-dacf-41a6-961b-9148c2979e1f` respondeu HTTP 200. O HTML retornado
foi conferido e os resultados reais dos checks foram:

```json
{
  "status": 200,
  "containsScore": true,
  "containsMaximum": true,
  "containsVerdict": true,
  "containsAllFiveEvidenceExcerpts": true,
  "containsAllEvidenceSources": true
}
```

## Leitura responsável do resultado

A aplicação atribuiu 5/5 e `SEGUIR` porque recebeu um concorrente por critério de mercado,
uma reclamação, uma monetização e um alcance; os dois concorrentes também pontuam `cabe_mais_um`.
Isso demonstra o funcionamento da régua com os dados enviados, não comprova a viabilidade do
negócio.

As afirmações e os trechos vieram da especificação do PO. Nesta tarefa, as URLs e o conteúdo das
páginas não foram consultados nem verificados de forma independente. O relatório HTML também
avisa que a fonte não é verificada automaticamente. A reclamação descrita é sobre o app Votly e
não comprova, por si só, que os mesmos problemas ocorram em ferramentas de gestão de campanha.

## Auditoria Red Team

1. **Quais são os 3 maiores pontos de falha sob alto tráfego?** Escritas JSONL síncronas
   bloqueiam o event loop; o limite de taxa é por IP e processo, sem coordenação entre
   instâncias; e os endpoints públicos permitem aumentar o volume de gravações sem controle de
   identidade.
2. **Onde há alucinação lógica neste fluxo?** A nota transforma contagens de tipos de evidência
   em sinais de mercado sem validar se a fonte sustenta o trecho, se a reclamação é comparável
   ou se o público é o mesmo. O `SEGUIR` é uma saída da régua, não uma conclusão eleitoral.
3. **O que acontece se um arquivo `.jsonl` for corrompido?** Linhas inválidas são ignoradas com
   aviso, e as linhas válidas continuam sendo lidas; não há reparo automático da linha ruim.
4. **O que acontece se dois requests chegarem ao mesmo tempo?** Escritas síncronas são
   serializadas pelo processo local; não existe coordenação transacional de append entre
   instâncias diferentes.
5. **O que um atacante faria com este sistema?** Como `/evidencias` não exige autenticação,
   poderia enviar evidências falsas ou manipuladas para uma validação conhecida e alterar a
   nota apresentada. O limite atual também não é compartilhado entre processos.
6. **Qual é a mentira mais confortável que este relatório conta?** O `SEGUIR` pode parecer uma
   recomendação validada. Na realidade, os cinco registros reproduzem dados fornecidos pelo PO,
   não verificados externamente, e a régua apenas contou esses registros.

## Pipeline de evolução

### Onde estamos

A Tarefa 22 foi executada como cobaia da ideia de comunicação política: uma validação com cinco
evidências vinculadas, nota 5/5 e veredito `SEGUIR`. A verificação externa das fontes permanece
pendente.

### O que foi feito até aqui

- Tarefas e correções anteriores conforme o histórico em `ESTADO.md`.
- Tarefa 22: validação de gestão de campanhas eleitorais, duas evidências de concorrentes,
  uma reclamação, uma evidência de monetização e uma de alcance; nota e relatório A4 conferidos.

### O que falta

- [Alta] Conferir as URLs e validar as afirmações das cinco evidências antes de tratá-las como
  fatos de mercado.
- [Alta] Coletar entrevistas e sinais reais de candidatos, partidos e equipes de campanha.
- [Média] Definir com o PO o próximo item do backlog depois desta cobaia.
- [Média] Avaliar autenticação e limites de escrita compartilhados entre instâncias.

### Decisões tomadas

- Os campos das evidências foram registrados como fornecidos pelo PO, sem reescrita ou
  verificação externa nesta execução.
- A nota foi calculada pela régua existente; não foi interpretada como decisão final de negócio.
- A validação e as cinco evidências foram gravadas nos JSONL locais. Esses arquivos são
  ignorados pelo Git e permanecem apenas nesta máquina.

### Pendências conhecidas

- A validação externa das fontes NationBuilder, Elegis e Google Play (Votly), incluindo os
  preços, percentuais e contagens citados, permanece pendente.
- A alegação de homologação no TSE e os problemas relatados por usuários não foram confirmados
  nesta tarefa.
- Permanecem os riscos de escrita pública, integridade das evidências e persistência local
  descritos em `ESTADO.md`.

### Próximo passo

Revisão humana das cinco fontes e afirmações desta cobaia; em seguida, o PO define o próximo
item do backlog.

## Confirmação de existência e tamanho deste relatório

Comandos executados no PowerShell:

```powershell
Test-Path "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-22-cobaia-politica.md"
(Get-Item "C:\Users\clodo\Downloads\iavalidadora\relatorios\tarefa-22-cobaia-politica.md").Length
```

Saída real:

```text
True
8377
```
