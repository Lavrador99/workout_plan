# Fase 6 — Relatório de avaliação

Desenho técnico para a app `coach-web`. Estado: implementada e por publicar.

## 1. Pressupostos

- **O relatório sai da app.** O cliente recebe-o em PDF e pode reencaminhá-lo, por isso só leva o que pode ser lido por terceiros.
- **Os factos vêm da app; as conclusões são do treinador.** A app não escreve recomendações. Põe os resultados, as mudanças e as referências; o treinador escreve o que encontrou, as prioridades e o plano.
- **Sem dependências novas.** É uma página da app feita para impressão. "Imprimir → Guardar como PDF" no browser (ou "Partilhar → Imprimir" no iPhone) gera o ficheiro.

## 2. Âmbito

**Entra:** página de relatório por avaliação, comparação com uma avaliação anterior, cuidados de treino da triagem, objetivos, texto do treinador, perfil profissional (nome, título, cédula, contactos, logótipo) e folha de estilo de impressão.

**Fica de fora:** gráficos de evolução, IPI (é um índice interno, difícil de explicar numa folha), diagnósticos, medicação, sintomas e gravidez, envio automático por email ou WhatsApp.

## 3. Conteúdo

Uma ou duas folhas A4, por esta ordem:

1. **Cabeçalho:** logótipo, nome, título e n.º da cédula do treinador; nome e idade do cliente, data e título da avaliação.
2. **Cuidados no treino** (só com triagem): lesões ativas ou em recuperação (zona, lado, o que agrava), se há autorização médica e as suas restrições. Nada de doenças, medicação ou sintomas.
3. **O que encontrei** — texto do treinador.
4. **Resultados**, agrupados por categoria do teste:
   - valor de hoje e, se houver, o da avaliação de comparação;
   - mudança, com cor só quando ultrapassa o erro de medição (a mesma regra da comparação);
   - assimetria nos testes por lado;
   - posição na referência quando há uma compatível (`benchmark.ts`), com a população indicada; estimados identificados como tal.
5. **Objetivos:** os ativos, com o valor inicial, o atual, o alvo e a % do caminho.
6. **Prioridades** — até 3, do treinador.
7. **Plano** — texto do treinador: o que se vai fazer nas próximas semanas.
8. **Próxima reavaliação** — data, por omissão 6 semanas depois.
9. **Rodapé:** contactos do treinador, uma linha sobre o erro de medição e as fontes das referências usadas.

## 4. Modelo de dados

### 4.1 Texto do relatório

Fica na própria avaliação, num campo opcional. Não é um tipo novo, por isso não precisa da API.

```ts
export interface AssessmentReport {
  compareWith: string | null; // assessment id; unset = the previous one with results
  findings: string;
  priorities: string[]; // up to 3
  plan: string;
  nextDate: string | null; // YYYY-MM-DD
}

// Assessment
report?: AssessmentReport | null;
```

### 4.2 Perfil do treinador

Um registo único, sincronizado entre aparelhos: tipo novo `profile`, tabela `profiles`, id fixo `coach-profile`.

```ts
export interface CoachProfile extends SyncMeta {
  name: string;
  title: string; // "Técnico de Exercício Físico"
  licence: string; // n.º do título profissional (IPDJ)
  phone: string;
  email: string;
  instagram: string;
  logo: string | null; // data URL, reduced on upload
}
```

- **Logótipo:** ao carregar, a imagem é reduzida no browser (canvas) para no máximo 400 px de lado, em PNG se tiver transparência e em JPEG caso contrário, e guardada como data URL. Fica na ordem das dezenas de KB, dentro do que uma linha da D1 aguenta.
- Os dados ficam nas Definições, numa secção "Perfil profissional".

## 5. Ecrãs

- **Avaliação → Relatório:** botão novo no cabeçalho da avaliação. Abre `#/report/<id>`.
- **Página do relatório:** em cima, os campos do treinador (comparar com, o que encontrei, prioridades, plano, próxima reavaliação) e o botão "Imprimir / PDF". Por baixo, a pré-visualização exatamente como vai sair.
- **Impressão:** `@media print` esconde a navegação, os avisos de sync, o cabeçalho da app e os campos de edição; força cores claras e evita partir um teste entre páginas.
- **Avisos:** sem perfil profissional preenchido, o relatório mostra um aviso com ligação às Definições. Sem consentimento de imagem não muda nada (o relatório não tem fotos).

## 6. Sync e API

- `report` em `Assessment`: só tipos, sem migração.
- `profiles` / `profile`: `TableName`, `TABLES`, `KIND`, `DEFAULTS`, cópia de segurança e Dexie versão 8 com o `delete("lastSeq")` habitual.
- Na API, `KINDS` aceita `profile`. Não há migração SQL.
- Na Fase 4.2, a projeção para o papel `client` não envia `report` nem `profile` (o cliente recebe o PDF, não os dados).

## 7. Ordem de publicação

Igual às anteriores, e pode ir junto com a Fase 5:

1. Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql`.
2. `npm run deploy:api`, com `KINDS` a aceitar `screening` e `profile`.
3. Só depois, push para `main` com a app nova.

## 8. Passos

1. Tipos, `CoachProfile` no sync, Dexie, API e cópia de segurança.
2. Perfil profissional nas Definições, com o logótipo reduzido.
3. `lib/report.ts`: funções puras que montam o relatório (resultados agrupados, mudanças, referências, objetivos, cuidados), com testes.
4. Página do relatório, campos do treinador e botão na avaliação.
5. Folha de impressão e verificação em A4.
6. Relatório preenchido na avaliação mais recente do cliente "Teste".
