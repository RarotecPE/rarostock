# Migrations

Execute os arquivos `.sql` desta pasta em ordem crescente pelo prefixo numerico:

```text
001_initial_schema.sql
002_nome_da_alteracao.sql
003_nome_da_proxima_alteracao.sql
```

Para novas alteracoes no banco, crie sempre um novo arquivo com o proximo numero sequencial. Nao edite migrations antigas depois que elas ja tiverem sido executadas em algum ambiente.
