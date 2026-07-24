# Rarostock

Rarostock e um sistema web para controle de estoque, aquisicoes e baixas de materiais. O projeto usa Next.js, React, Drizzle ORM, PostgreSQL e Supabase para banco de dados e armazenamento de arquivos.

## Funcionalidades

- Cadastro de produtos de estoque com codigo automatico, categoria, unidade, tipo, marca, limite minimo e observacoes.
- Dashboard com visao geral de saldos e alertas.
- Pagina Produto com cadastro, busca, filtros e edicao.
- Registro de aquisicoes com carrinho de itens, valores unitarios, total calculado e anexo de nota fiscal.
- Upload de notas fiscais para Supabase Storage.
- Registro de baixas de estoque com motivo e validacao de saldo disponivel.
- Historico por item, incluindo aquisicoes, baixas e saldo apos movimentacoes.
- API de health check para validar conexao com o banco.

## Stack

- Next.js 16
- React 19
- TypeScript
- Drizzle ORM
- PostgreSQL
- Supabase Storage
- Tailwind CSS

## Requisitos

- Node.js 22 LTS recomendado.
- npm.
- Um projeto Supabase criado.
- Um bucket Supabase Storage chamado `invoices`.

Se usar Node 20, prefira Node `20.19+` para evitar avisos de engine em dependencias recentes.

## Instalacao

1. Instale as dependencias:

```bash
npm install
```

2. Configure o arquivo `.env.local` na raiz do projeto:

```env
# Supabase Postgres
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@YOUR_REGION.pooler.supabase.com:6543/postgres"

# Usado por Drizzle Kit para push/migrations, preferencialmente session pooler ou direct connection
DRIZZLE_DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@YOUR_REGION.pooler.supabase.com:5432/postgres"

# Supabase API / Storage
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SECRET_KEY="YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="invoices"
```

Observacoes:

- Nao use prefixo `NEXT_PUBLIC_` para `SUPABASE_SECRET_KEY`.
- Se a senha do banco tiver caracteres especiais, use URL encoding na senha.
- `.env.local` e ignorado pelo Git.

3. Crie as tabelas no Supabase.

Execute as migrations em ordem crescente no SQL Editor do Supabase:

```text
migrations/001_initial_schema.sql
```

Para mudancas futuras no banco, crie um novo arquivo com o proximo numero sequencial, por exemplo:

```text
migrations/002_adicionar_campo_exemplo.sql
```

Nao edite migrations antigas depois que elas ja tiverem sido executadas em algum ambiente.

4. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
```

Inicia o servidor local de desenvolvimento.

```bash
npm run build
```

Gera o build de producao.

```bash
npm run start
```

Inicia o app a partir do build de producao.

```bash
npm run typecheck
```

Executa a checagem TypeScript sem emitir arquivos.

```bash
npm run lint
```

Executa o ESLint.

## Banco de Dados

O schema principal fica em `src/db/schema.ts` e e usado pelo Drizzle ORM durante o desenvolvimento da aplicacao.

As migrations SQL ficam em `migrations/` e sao a forma recomendada para aplicar alteracoes no Supabase em sequencia controlada.

Arquivos importantes:

- `src/db/index.ts`: conexao PostgreSQL usada pela aplicacao.
- `src/db/schema.ts`: definicao Drizzle das tabelas.
- `drizzle.config.ts`: configuracao do Drizzle Kit lendo `.env.local`.
- `migrations/`: scripts SQL executaveis em ordem.

## Supabase Storage

Notas fiscais enviadas no fluxo de aquisicao sao salvas no bucket definido por `SUPABASE_STORAGE_BUCKET`.

O upload acontece em:

```text
src/app/api/upload/route.ts
```

Se o bucket for publico, a API retorna uma URL publica. Se o bucket for privado, a API cria uma URL assinada.

## Identidade Visual

O logo principal do sistema fica em:

```text
public/rarostock-logo.svg
```

O favicon do app fica em:

```text
src/app/icon.svg
```

Ao atualizar a marca, substitua os dois arquivos para manter menu principal e favicon alinhados.

## Atualizando Este README

Atualize este documento sempre que houver:

- nova funcionalidade relevante;
- nova variavel de ambiente;
- mudanca na instalacao ou nos scripts;
- alteracao no banco de dados ou novas migrations;
- mudanca no fluxo de deploy, storage ou autenticacao.

Um README atualizado reduz tempo de onboarding e evita configuracoes divergentes entre ambientes.
