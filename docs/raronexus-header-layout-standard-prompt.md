# Prompt reutilizavel: layout superior padrao RaroNexus

Voce esta trabalhando em um projeto web integrado ao RaroNexus e precisa criar ou padronizar o layout superior das areas privadas seguindo o padrao visual e comportamental usado no RaroStock.

Use este prompt quando a autenticacao com RaroNexus ja existir ou estiver sendo implementada pelo prompt geral `docs/raronexus-integration-prompt.md`. Este arquivo trata do header/shell superior, suas acoes e o endpoint local usado pelo botao `Aplicativos`.

## Objetivo

Implementar um header padrao para projetos Rarotec integrados ao RaroNexus, mantendo consistencia visual entre aplicacoes e preservando as mesmas acoes principais:

- Notificacoes, quando o app possuir alertas.
- Alternancia de tema, quando o app possuir tema claro/escuro.
- Botao obrigatorio `Aplicativos`.
- Menu de conta com perfil e logout.

## Contexto do projeto

- Nome do sistema: `[NOME_DO_SISTEMA]`
- Caminho do logo/icone do sistema: `[CAMINHO_DO_LOGO]`
- Rota inicial privada: `[ROTA_INICIAL]`
- Rotas de navegacao privadas: `[ROTAS_DE_NAVEGACAO]`
- Chave de tema no localStorage: `[THEME_STORAGE_KEY]`
- Permissoes/papeis do app: `[PERMISSOES_DO_APP]`
- Client ID no RaroNexus: `[RARONEXUS_CLIENT_ID]`
- URL base do RaroNexus: `[RARONEXUS_BASE_URL]`

## Padrao esperado

O layout final deve manter:

- Header fixo no topo das rotas privadas.
- Visual escuro por padrao, compativel com tema claro se o app ja possuir suporte.
- Titulo da rota atual no desktop.
- Acoes do usuario alinhadas a direita.
- Dropdowns consistentes para notificacoes, aplicativos e conta.
- Botao `Aplicativos` sempre presente para navegar entre sistemas autorizados no RaroNexus.

## Estrutura visual do header

No shell das areas privadas, criar um header com:

- `sticky top-0 z-[45]`
- `bg-slate-900/95 backdrop-blur`
- `border-b border-slate-800`
- altura interna `h-16`
- container interno `relative flex items-center justify-between px-4 sm:px-6 h-16`

No desktop, exibir o titulo da rota atual:

```tsx
<div className="hidden lg:block">
  <h2 className="text-lg font-semibold text-white">{currentRoute.label}</h2>
</div>
```

As acoes do header devem ficar em um grupo a direita:

```tsx
<div className="flex items-center gap-1.5 sm:gap-2">
  {/* Notificacoes, Tema, Aplicativos, Conta */}
</div>
```

## Botao padrao do header

Criar um componente reutilizavel equivalente a `HeaderIconButton`.

Contrato esperado:

```ts
type HeaderIconButtonProps = {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};
```

Visual obrigatorio:

```tsx
className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-400 transition-colors hover:text-white sm:h-10 sm:w-10 ${
  active
    ? "border-blue-500/40 bg-blue-600/20 text-blue-300"
    : "border-transparent hover:border-slate-700 hover:bg-slate-800/70"
} ${className}`}
```

Regras:

- Usar `aria-label={label}`.
- Usar `title={label}`.
- Chamar `event.stopPropagation()` no clique para nao fechar dropdowns indevidamente.
- Preferir icones simples ou a biblioteca de icones ja usada pelo projeto.

## Dropdown padrao do header

Criar um componente reutilizavel equivalente a `HeaderDropdown`.

Contrato esperado:

```ts
type HeaderDropdownProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "right" | "center";
};
```

Comportamento obrigatorio:

- Fechar ao clicar fora.
- Fechar ao pressionar `Escape`.
- Fechar ao trocar de rota.
- Renderizar `null` quando `open` for falso.

Visual obrigatorio:

```tsx
<div className={`absolute top-full z-[60] mt-2 ${alignmentClass} ${className}`}>
  <div className="max-h-[70dvh] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
    {children}
  </div>
</div>
```

O alinhamento deve ser:

- `right-0` por padrao.
- `left-1/2 -translate-x-1/2` quando `align === "center"`.

## Botao Aplicativos

O botao `Aplicativos` e obrigatorio em todos os apps integrados ao RaroNexus.

Implementar no grupo de acoes do header:

```tsx
<HeaderIconButton
  label="Aplicativos"
  active={openMenu === "applications"}
  onClick={() => openDropdown("applications")}
>
  <AppsIcon />
</HeaderIconButton>
```

Regras obrigatorias:

- `aria-label` e `title` devem receber exatamente `Aplicativos`.
- Ao abrir o dropdown pela primeira vez, chamar `GET /api/auth/applications`.
- Usar `cache: "no-store"` no `fetch` client-side.
- Armazenar em estado local:
  - `applications`
  - `nexusProfileUrl`
  - `appsLoading`
  - `appsError`
- Reutilizar o mesmo carregamento quando o menu de conta precisar do link de perfil.

Layout do dropdown:

```tsx
<HeaderDropdown open={openMenu === "applications"} onClose={closeMenu}>
  <div className="border-b border-slate-800 px-4 py-3">
    <h3 className="font-semibold text-white">Aplicativos</h3>
    <p className="text-xs text-slate-500">Sistemas disponiveis para sua conta</p>
  </div>
  <div className="max-h-80 overflow-y-auto p-2">
    {/* estados e lista */}
  </div>
</HeaderDropdown>
```

Textos obrigatorios:

- `Aplicativos`
- `Sistemas disponiveis para sua conta`
- `Carregando aplicativos...`
- `Nao foi possivel carregar os aplicativos.`
- `Tentar novamente`
- `Nenhum outro aplicativo disponivel.`

Cada aplicativo deve ser um link:

```tsx
<a
  href={application.homepage_url}
  target="_blank"
  rel="noreferrer"
  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800/50"
>
  <ApplicationLogo application={application} />
  <span className="min-w-0 flex-1">
    <span className="block truncate text-sm font-medium text-white">{application.nome}</span>
  </span>
  {/* icone de abrir em nova aba */}
</a>
```

O logo do aplicativo deve:

- Ter tamanho `h-9 w-9`.
- Usar `rounded-lg`.
- Usar imagem quando `logo_url` existir.
- Exibir a primeira letra de `application.nome` como fallback.
- Ignorar imagem quebrada apos `onError`.

## Endpoint local de aplicativos

Criar ou padronizar:

`GET /api/auth/applications`

Ele deve:

- Ler o token global salvo em cookie HTTP-only local.
- Retornar `401` quando a sessao local nao existir.
- Chamar:

`GET [RARONEXUS_BASE_URL]/api/v1/applications`

Com header:

```http
Cookie: raronexus_global_session=[token]
```

- Usar `cache: "no-store"`.
- Tratar falha de rede como `502`.
- Tratar resposta invalida ou sem sucesso como erro com status da resposta, ou `502`.
- Filtrar apps inativos (`ativo === false`).
- Remover o app atual usando `[RARONEXUS_CLIENT_ID]`.
- Remover apps sem `homepage_url`.
- Mapear apenas os campos necessarios para o client.
- Se o app atual nao for `raronexus`, adicionar `RaroNexus` como primeiro item quando ele nao vier da API.
- Retornar tambem `nexusProfileUrl` apontando para `[RARONEXUS_BASE_URL]/profile`.

Formato de resposta esperado:

```ts
type HeaderApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
};

type ApplicationsResponse = {
  applications: HeaderApplication[];
  nexusProfileUrl: string;
};
```

Aplicativo RaroNexus padrao:

```ts
{
  nome: "RaroNexus",
  client_id: "raronexus",
  logo_url: new URL("/raronexus-logo.png", request.nextUrl.origin).toString(),
  homepage_url: new URL("/home", nexusBaseUrl).toString(),
}
```

## Botao Notificacoes

Quando o app possuir alertas, implementar botao `Notificacoes`.

Regras:

- Label do botao: `Notificacoes`.
- Usar dropdown centralizado com `align="center"`.
- Exibir badge no canto superior direito do icone quando houver alertas.
- Para mais de 9 alertas, exibir `9+`.
- Exibir estado vazio quando nao houver alertas.

Textos padrao:

- `Notificacoes`
- `Nenhuma notificacao no momento`

Estrutura visual do badge:

```tsx
<span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
  {totalAlerts > 9 ? "9+" : totalAlerts}
</span>
```

Se o app nao possuir alertas, omitir somente o botao de notificacoes e manter as demais acoes.

## Botao de tema

Quando o app possuir suporte a tema claro/escuro, implementar botao de tema no header.

Regras:

- Persistir o tema em `localStorage` usando `[THEME_STORAGE_KEY]`.
- Aplicar classe `theme-light` no `body` quando o tema for claro.
- Atualizar `document.documentElement.style.colorScheme`.
- Alternar entre `dark` e `light`.
- O tema padrao deve ser `dark`.

Labels obrigatorias:

- `Ativar modo escuro`, quando o tema atual for claro.
- `Ativar modo claro`, quando o tema atual for escuro.

Helpers esperados:

```ts
type ColorTheme = "dark" | "light";

function applyColorTheme(theme: ColorTheme) {
  document.body.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("[THEME_STORAGE_KEY]") === "light" ? "light" : "dark";
}

function storeColorTheme(theme: ColorTheme) {
  window.localStorage.setItem("[THEME_STORAGE_KEY]", theme);
  applyColorTheme(theme);
}
```

Se o app nao possuir tema, omitir somente o botao de tema.

## Menu de conta

Implementar menu de conta como ultima acao do header.

Botao:

- Circular.
- Tamanho `h-10 w-10`.
- `aria-label="Conta do usuario"`.
- `title="Conta do usuario"`.
- Exibir avatar do usuario quando `avatar_url` existir.
- Exibir inicial de `nome` como fallback.
- Usar `U` como fallback final.

Dropdown:

- Exibir nome do usuario.
- Exibir email do usuario.
- Exibir papel/perfil local do app.
- Mostrar link `Editar perfil` quando `nexusProfileUrl` ja existir.
- Caso contrario, mostrar botao `Carregar perfil` ou `Carregando perfil...`.
- Mostrar botao `Sair`.

Textos obrigatorios:

- `Conta do usuario`
- `Perfil no [NOME_DO_SISTEMA]`
- `Editar perfil`
- `Carregar perfil`
- `Carregando perfil...`
- `Sair`

A acao `Sair` deve chamar o logout local do app, normalmente:

`POST /api/auth/logout`

Depois do logout, redirecionar para a tela de login com `next` apontando para a rota atual.

## Integracao com sessao

O shell privado deve:

- Chamar `GET /api/auth/session` ao montar.
- Redirecionar para `/login?next=[rota_atual]` se nao houver sessao valida.
- Guardar `user`, `role`, `roleLabel` e permissoes em estado/contexto local.
- Enquanto verifica a sessao, exibir loading.
- Interceptar respostas `401` de APIs internas:
  - chamar `POST /api/auth/logout`
  - redirecionar para `/login?next=[rota_atual]`

Formato minimo de usuario esperado:

```ts
type SessionUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
};
```

## Cuidados obrigatorios

- Nao expor o token global no client.
- Nao chamar endpoints privados do RaroNexus diretamente do browser.
- Nao salvar sessao em `localStorage`.
- Nao expor `RARONEXUS_CLIENT_SECRET`.
- Usar cookies HTTP-only para sessao.
- Usar `cache: "no-store"` nas chamadas de sessao, aplicativos e introspeccao.
- Tratar ausencia de sessao como `401`.
- Tratar falha do RaroNexus como `502` no endpoint de aplicativos.
- Fechar dropdowns em clique externo, `Escape` e troca de rota.
- Manter textos padronizados para consistencia entre sistemas.
- Adaptar apenas nome, logo, rotas, permissoes, tema e alertas ao app alvo.

## Checklist de aceite

Ao finalizar, validar:

- O header aparece fixo no topo das rotas privadas.
- O header possui altura `h-16`, fundo `bg-slate-900/95`, blur e borda inferior.
- O titulo da rota aparece no desktop.
- As acoes ficam alinhadas a direita.
- O botao `Aplicativos` aparece com `aria-label` e `title` exatamente `Aplicativos`.
- Ao abrir `Aplicativos`, o app chama `/api/auth/applications`.
- O dropdown de aplicativos mostra corretamente loading, erro, vazio e lista preenchida.
- O botao `Tentar novamente` recarrega aplicativos apos erro.
- Cada aplicativo abre em nova aba.
- O app atual nao aparece na lista.
- O item `RaroNexus` aparece quando aplicavel.
- O menu de conta mostra avatar ou inicial, nome, email, perfil, editar perfil e sair.
- O logout chama `/api/auth/logout` e redireciona para login.
- Dropdowns fecham ao clicar fora, pressionar `Escape` e navegar.
- O botao de tema alterna claro/escuro, quando o app possuir tema.
- O botao de notificacoes mostra badge e estado vazio, quando o app possuir alertas.

Ao implementar, siga este documento como fonte unica do padrao do layout superior e ajuste somente os placeholders do sistema alvo.
