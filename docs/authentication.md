# Instrucoes para integrar uma nova aplicacao ao RaroNexus

Este documento orienta o agente responsavel pelo desenvolvimento de uma nova aplicacao. O RaroNexus e o sistema central de identidade e integracao de todas as aplicacoes deste escopo. Implemente autenticacao por SSO com o RaroNexus, sessao em cookie HttpOnly e autorizacao definida pela aplicacao consumidora.

Adote os nomes, a estrutura e as bibliotecas do novo projeto consumidor. Mantenha os nomes de variaveis, endpoints e campos do contrato do RaroNexus descritos abaixo. Apenas o identificador, segredo, origem, cookies e regras de negocio da aplicacao consumidora devem ser adaptados.

## Responsabilidades

| Componente | Responsabilidade |
| --- | --- |
| RaroNexus | Centralizar identidade, autenticar usuarios, emitir e validar sessoes, fornecer o perfil da aplicacao e disponibilizar revogacao. |
| Backend da aplicacao | Iniciar SSO, validar callback, trocar codigo por sessao e verificar acesso. |
| Modulo de autorizacao local | Definir perfis, permissoes e regras de acesso aos dados da aplicacao. |
| Banco da aplicacao | Armazenar dados de negocio e vinculos ao identificador global do usuario. |
| Frontend | Consultar a sessao pelo backend local e ajustar a interface conforme as permissoes. |

Mantenha as credenciais do usuario no RaroNexus. Consuma sua API HTTP, sem acessar diretamente o banco ou implementar um login independente no projeto consumidor.

## Antes de implementar

1. Leia o projeto e identifique seus padroes de rotas, configuracao, acesso a dados e tratamento de erros.
2. Implemente os contratos de autorizacao, troca de codigo, introspeccao e revogacao do RaroNexus descritos neste documento.
3. Registre a nova aplicacao no RaroNexus e confirme callbacks autorizados, identificador e segredo do cliente.
4. Identifique a origem da atribuicao de perfis e defina as permissoes locais.
5. Configure URLs, credenciais e cookies separados por aplicacao e ambiente.

Os endpoints e payloads do RaroNexus abaixo correspondem ao contrato consumido pela integracao de referencia. Confirme a disponibilidade na instancia e no ambiente de destino. Se faltar URL, cadastro ou credencial, prepare os componentes independentes desses dados e registre o que falta para concluir a integracao.

## Configuracao

Prepare estas variaveis server-side com placeholders no arquivo de ambiente do novo projeto:

```env
# RaroNexus: sistema central de autenticacao
RARONEXUS_BASE_URL="https://[RARONEXUS_HOST]"
RARONEXUS_CLIENT_ID="[NOVO_PROJETO_CLIENT_ID]"
RARONEXUS_CLIENT_SECRET="[SEGREDO_DO_CLIENTE_CADASTRADO_NO_RARONEXUS]"

# Origem publica do novo projeto consumidor
APP_BASE_URL="https://[NOVO_PROJETO_HOST]"
```

- `RARONEXUS_BASE_URL`: origem do RaroNexus, acessivel pelo navegador e pelo backend.
- `RARONEXUS_CLIENT_ID`: identificador exclusivo da nova aplicacao cadastrada no RaroNexus.
- `RARONEXUS_CLIENT_SECRET`: segredo do cliente fornecido pelo RaroNexus, exclusivo do backend.
- `APP_BASE_URL`: origem publica da aplicacao, usada para construir o callback.

Construa o callback como `${APP_BASE_URL}/api/auth/raronexus/callback`. Registre essa URL exata no RaroNexus para cada ambiente e envie a mesma URL na autorizacao e na troca do codigo. Use HTTPS em producao.

Para desenvolvimento local, configure `RARONEXUS_BASE_URL` com a origem da instancia local, por exemplo `http://localhost:3001`, e `APP_BASE_URL` com a origem do novo projeto. Os hosts de producao e os segredos devem ser fornecidos pelo responsavel pelo RaroNexus; nao presuma seus valores.

Guarde segredos em arquivos de ambiente ignorados pelo controle de versao ou no gerenciador de segredos da hospedagem. Nunca exponha o segredo em variaveis publicas, bundles, URLs, logs ou respostas ao navegador.

## Fluxo de autenticacao

1. Consulte a sessao local ao iniciar a interface. Com sessao valida e acesso permitido, abra o destino interno solicitado.
2. Sem sessao valida, inicie a autorizacao no RaroNexus.
3. Gere `state` criptograficamente aleatorio e guarde-o com o destino interno em cookies temporarios. Use, por exemplo, 24 bytes aleatorios e validade de cinco minutos.
4. Redirecione para `${RARONEXUS_BASE_URL}/sso/authorize`, enviando `client_id`, `redirect_uri` e `state`.
5. No retorno, valide o `state` antes de aceitar o resultado. No fluxo de sucesso, exija tambem o codigo de autorizacao.
6. Troque o codigo por uma sessao exclusivamente no backend em `POST /api/v1/sso/token` do RaroNexus.
7. Valide a resposta, mapeie `data.role.chave` para o perfil da aplicacao e confirme o direito de acesso.
8. Grave o token em cookie HttpOnly, remova cookies temporarios e conclua a navegacao.
9. Em cada operacao protegida, valide a sessao e a permissao no backend antes de acessar dados.

Defina um destino interno padrao adequado ao novo sistema. Valide destinos como URLs da propria aplicacao, rejeitando origens externas, caminhos ambiguos e rotas inadequadas para navegacao apos login.

Implemente a tentativa de SSO silencioso pelo RaroNexus com `prompt=none` na autorizacao. Trate `error=login_required` como necessidade de login interativo. Use popup, iframe ou redirecionamento conforme as restricoes do navegador e mantenha uma alternativa interativa quando a tentativa silenciosa falhar.

Em popup ou iframe, o callback local deve enviar uma mensagem de tipo `raronexus:sso`, com `status`, `mode`, `message` e `redirectTo`, sem incluir tokens. Valide origem, janela emissora e formato da mensagem. Defina limite de espera visual e trate popup bloqueado ou fechado.

## Contratos de integracao

Crie um adaptador server-side para concentrar as chamadas ao RaroNexus. Os endpoints abaixo sao relativos a `RARONEXUS_BASE_URL`. Envie corpos JSON com `Content-Type: application/json` nas chamadas POST.

| Operacao | Endpoint do RaroNexus | Dados enviados |
| --- | --- | --- |
| Autorizacao | `GET /sso/authorize` | Query: `client_id`, `redirect_uri`, `state` e `prompt=none` no modo silencioso. |
| Troca de codigo | `POST /api/v1/sso/token` | JSON: `grant_type`, `client_id`, `client_secret`, `code`, `redirect_uri`. |
| Introspeccao | `POST /api/v1/sessions/introspect` | JSON: `token`, `client_id`. |
| Revogacao | `POST /api/v1/sessions/revoke` | JSON: `token`. |

### Troca de codigo

Envie o corpo abaixo, substituindo os placeholders pelas configuracoes e pelo codigo recebido:

```json
{
  "grant_type": "authorization_code",
  "client_id": "[RARONEXUS_CLIENT_ID]",
  "client_secret": "[RARONEXUS_CLIENT_SECRET]",
  "code": "[CODIGO_RECEBIDO_NO_CALLBACK]",
  "redirect_uri": "[APP_BASE_URL]/api/auth/raronexus/callback"
}
```

Resposta de sucesso esperada:

```json
{
  "success": true,
  "data": {
    "global_session_token": "[TOKEN_DE_SESSAO_GLOBAL]",
    "user": {
      "id": "[IDENTIFICADOR_GLOBAL_DO_USUARIO]",
      "nome": "[NOME_DO_USUARIO]",
      "email": "[EMAIL_DO_USUARIO]",
      "avatar_url": null
    },
    "role": {
      "chave": "[CHAVE_DO_PERFIL_DA_APLICACAO]",
      "nome": "[NOME_DO_PERFIL]"
    }
  }
}
```

Exija sucesso HTTP, `success: true`, token nao vazio e identidade e perfil validos antes de criar a sessao local. Preserve os campos `nome`, `global_session_token` e `role.chave` ao consumir o contrato; normalize-os apenas dentro do adaptador, se necessario.

### Introspeccao

Envie:

```json
{
  "token": "[TOKEN_DO_COOKIE_LOCAL]",
  "client_id": "[RARONEXUS_CLIENT_ID]"
}
```

Resposta de sucesso esperada:

```json
{
  "success": true,
  "data": {
    "active": true,
    "user": {
      "id": "[IDENTIFICADOR_GLOBAL_DO_USUARIO]",
      "nome": "[NOME_DO_USUARIO]",
      "email": "[EMAIL_DO_USUARIO]",
      "avatar_url": null
    },
    "role": {
      "id": "[IDENTIFICADOR_DO_PERFIL]",
      "nome": "[NOME_DO_PERFIL]",
      "chave": "[CHAVE_DO_PERFIL_DA_APLICACAO]"
    }
  }
}
```

Consulte com `cache: "no-store"` ou equivalente. Exija sucesso HTTP, `success: true`, `data.active: true` e identidade e perfil validos. Quando presente nas respostas de falha, `message` descreve o erro e deve ser tratado sem expor credenciais.

### Revogacao

Envie `{"token":"[TOKEN_DO_COOKIE_LOCAL]"}` a `POST /api/v1/sessions/revoke`. Limpe o cookie local independentemente do resultado remoto. Verifique o status HTTP e confirme o formato de sucesso publicado pela instancia do RaroNexus antes de declarar revogacao global concluida.

Trate `global_session_token` como credencial de sessao validada por introspeccao no RaroNexus. Nao substitua essa consulta por decodificacao JWT ou validacao JWKS. Negue acesso quando a sessao estiver inativa ou a resposta nao puder ser validada.

Configure limites de tempo e trate erros HTTP, payloads invalidos e indisponibilidade do RaroNexus. Este e um contrato SSO proprio; nao presuma compatibilidade completa OAuth/OIDC. Qualquer adicao de PKCE ou mudanca no contrato deve ser coordenada com o RaroNexus.

## Cookies e ciclo de vida

Use nomes exclusivos para a aplicacao:

| Cookie de exemplo | Conteudo | Ciclo de vida |
| --- | --- | --- |
| `<app>_global_session` | Token retornado pelo RaroNexus | Conforme a politica de sessao do ambiente. |
| `<app>_sso_state` | Estado da tentativa de login | Curto, por exemplo cinco minutos. |
| `<app>_sso_next` | Destino interno validado | Mesmo prazo da tentativa de login. |

Configure `HttpOnly`, `Path=/`, `Secure` em producao e `SameSite` adequado ao fluxo. Para callback por navegacao GET, `SameSite=Lax` pode ser usado; confirme compatibilidade quando o contrato adotar outro retorno.

Prefira cookies restritos ao host da aplicacao. Cada sistema deve estabelecer sua sessao pelo RaroNexus, sem depender de compartilhamento de cookies entre sistemas.

Alinhe a duracao do cookie com a politica do servico. Um cookie persistente nao garante sessao valida. Nao armazene tokens em `localStorage` nem aceite cookie de perfil como prova de permissao.

## Perfis e permissoes

Defina localmente as permissoes e regras de negocio. Escolha nomes de perfis e permissoes adequados ao dominio do novo sistema.

Documente expressamente a origem da atribuicao do perfil:

- No contrato apresentado, o RaroNexus fornece o perfil especifico do cliente em `data.role.chave`. Valide essa chave e mapeie-a para as permissoes definidas localmente no novo projeto.
- Se o escopo exigir atribuicao de perfis no banco local, implemente essa adaptacao explicitamente usando `data.user.id` validado pelo RaroNexus. Nao presuma que essa variante ja seja parte do fluxo descrito.

Rejeite perfis desconhecidos. Autenticacao valida, por si so, nao concede acesso ao sistema. Quando houver provisionamento no primeiro login, defina o acesso inicial explicitamente.

Crie um guard reutilizavel com a seguinte sequencia:

```text
ler cookie de sessao
validar sessao no RaroNexus por introspeccao
validar identidade retornada
resolver perfil e permissoes da aplicacao
verificar permissao da operacao
verificar acesso ao registro solicitado
executar a operacao
```

Retorne `401` para sessao ausente ou invalida e `403` para usuario autenticado sem permissao. Trate indisponibilidade do provedor como falha de acesso, seguindo os padroes do projeto e sem conceder acesso por fallback.

Verifique propriedade de registros, organizacao e demais limites do dominio. Use a identidade validada pelo backend, sem confiar em identificadores ou perfis enviados livremente pelo frontend.

## Interface e endpoints locais

Implemente os recursos abaixo, adaptando rotas ao framework e as convencoes do projeto:

| Recurso | Exemplo de rota | Finalidade |
| --- | --- | --- |
| Inicio do SSO | `GET /api/auth/raronexus/start` | Gerar estado e iniciar autorizacao no RaroNexus. |
| Callback | `GET /api/auth/raronexus/callback` | Validar retorno, trocar codigo e criar cookie. |
| Consulta de sessao | `GET /api/auth/session` | Informar identidade e permissoes sem expor token. |
| Logout | `POST /api/auth/logout` | Limpar sessao local e solicitar revogacao conforme politica. |

A consulta de sessao deve informar autenticacao e acesso a aplicacao. Retorne apenas os dados necessarios para a interface, como identidade, perfil e permissoes efetivas.

Consulte a sessao antes de renderizar conteudo protegido e trate expiracao durante o uso. Ajuste comandos conforme permissoes, mantendo as verificacoes correspondentes nas APIs.

No logout, limpe cookies locais mesmo se a revogacao remota falhar. Diferencie limpeza local de revogacao global confirmada. Documente se sair de um sistema encerra tambem as sessoes dos demais.

### Catalogo de aplicativos e perfil central

Quando o novo sistema incluir navegacao entre aplicativos, consulte `GET /api/v1/applications` no RaroNexus pelo backend, com `cache: "no-store"` e o header `Cookie: raronexus_global_session=TOKEN_CODIFICADO`. Codifique o token com `encodeURIComponent` ou equivalente. Esse nome de cookie pertence ao contrato do RaroNexus e nao deve ser renomeado para o nome do projeto consumidor.

A resposta consumida e `{ "success": true, "data": [...] }`, com aplicativos contendo `nome`, `client_id`, `logo_url`, `homepage_url` e `ativo`. Exclua aplicativos inativos, sem URL de destino e o proprio cliente da lista de outros sistemas. Nao envie o token ao frontend.

Use `${RARONEXUS_BASE_URL}/profile` para o perfil central e `${RARONEXUS_BASE_URL}/home` para a pagina inicial do RaroNexus. Esses recursos sao complementares e nao substituem a validacao de acesso.

## Organizacao da implementacao

Distribua os componentes segundo os padroes do projeto, cobrindo estas responsabilidades:

- Configuracao server-side do cliente e das URLs do RaroNexus.
- Adaptador para troca de codigo, introspeccao e revogacao.
- Helpers para cookies e validacao de destinos.
- Modulo de perfis, permissoes e guard das operacoes.
- Handlers de inicio, callback, consulta de sessao e logout.
- Interface de login e controle de sessao no layout protegido.
- Persistencia de vinculos locais de usuario e perfil, quando prevista.

Reutilize bibliotecas e abstracoes existentes. Separe o adaptador do provedor das regras de negocio para permitir manutencao sem alterar todos os handlers.

## Criterios de validacao

1. Teste login, retorno ao destino interno e reutilizacao da sessao central, quando suportada.
2. Confirme que codigo ausente, `state` divergente, callback com erro e resposta invalida nao concedem acesso.
3. Teste perfis desconhecidos, usuarios sem acesso e cada permissao local.
4. Confirme `401` sem sessao valida e `403` em operacoes proibidas.
5. Verifique restricoes de acesso a registros de outros usuarios ou organizacoes.
6. Revogue ou expire a sessao no RaroNexus e confirme bloqueio das novas operacoes.
7. Teste indisponibilidade do provedor e logout com falha remota, distinguindo os resultados.
8. Inspecione cookies e confirme ausencia de segredos e tokens em respostas, bundles e logs.
9. Teste mecanismos de retorno e alternativas para popup ou iframe bloqueados, quando utilizados.
10. Execute verificacoes de tipos, testes relevantes e build previstos pelo projeto.

## Documentacao e entrega

Atualize o README com as variaveis `RARONEXUS_BASE_URL`, `RARONEXUS_CLIENT_ID`, `RARONEXUS_CLIENT_SECRET` e `APP_BASE_URL`, o cadastro do cliente no RaroNexus, callbacks por ambiente, configuracao de perfis e comportamento de logout. Forneca placeholders para segredos e explique como obte-los.

Registre contratos confirmados, decisoes de autorizacao e configuracoes externas pendentes. Nao declare validacao de ponta a ponta enquanto ela depender de credenciais ou configuracoes ainda nao fornecidas.

Atualize este documento quando houver alteracoes no fluxo SSO, contratos, cookies ou politica de autorizacao.
