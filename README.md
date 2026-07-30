# Rarostock

Rarostock e um sistema web para controle de estoque, aquisicoes e baixas de materiais. O projeto usa Next.js, React, Drizzle ORM, PostgreSQL e Supabase para banco de dados e armazenamento de arquivos.

## Funcionalidades

- Cadastro de produtos de estoque com codigo automatico, categoria, unidade, tipo, marca, limite minimo e observacoes.
- Dashboard com visao geral de saldos, alertas e graficos de analise mensal.
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
# Banco PostgreSQL da aplicacao
# Formato: host:port;banco;usuario;senha
DATABASE_CONNECTION="HOST:5432;DATABASE;USER;PASSWORD"

# Storage publico HTTP escrito via FTP
FTP_HOST="108.61.158.43"
FTP_PORT="21"
FTP_USER="YOUR_FTP_USER"
FTP_PASSWORD="YOUR_FTP_PASSWORD"
FTP_BASE_DIR="/assets/rarostock/invoices"
FTP_SECURE="false"
PUBLIC_STORAGE_BASE_URL="https://arquivos.rarotec.com/assets/rarostock/invoices"

# Opcional: aviso visual em ambientes nao produtivos
NEXT_PUBLIC_ENVIRONMENT_LABEL="HOMOLOGAÇÃO"
```

Observacoes:

- O RaroStock usa `DATABASE_CONNECTION` para o banco.
- `PUBLIC_STORAGE_BASE_URL` deve ser HTTP/HTTPS; nunca use `ftp://` no frontend.
- Remova ou deixe `NEXT_PUBLIC_ENVIRONMENT_LABEL` vazio em producao.
- `.env.local` e ignorado pelo Git.

3. Crie as tabelas no banco PostgreSQL configurado.

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

## Dashboard

O Dashboard exibe cards de resumo e graficos analiticos dos ultimos 12 meses:

- entradas vs baixas por mes;
- valor total de aquisicoes por mes;
- top produtos com mais saida;
- top produtos mais comprados;
- status atual do estoque;
- distribuicao de produtos por categoria.

Os graficos usam a API `GET /api/dashboard/analytics` e a biblioteca `recharts`.

## Storage de Notas Fiscais

Notas fiscais enviadas no fluxo de aquisicao sao gravadas via FTP no diretorio definido por `FTP_BASE_DIR`.
Esse diretorio deve ser servido publicamente pela URL configurada em `PUBLIC_STORAGE_BASE_URL`.

O upload acontece em:

```text
src/app/api/upload/route.ts
```

A API aceita imagens e PDFs, retorna a URL HTTP/HTTPS publica para exibicao e guarda o caminho interno em `invoice_storage_path` para permitir exclusao posterior. O nome salvo em `invoice_filename` e o nome fisico do arquivo sao gerados de forma unica para evitar sobrescrita.

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
