# Prompt reutilizável: conectar e enviar dados para a API RaroNexus

Você está trabalhando em um projeto que precisa consumir um endpoint da API RaroNexus por meio de uma integração server-to-server.

Use este prompt para implementar somente a conexão autenticada e o envio de dados. O endpoint, o método HTTP, o conteúdo do payload e o formato da resposta dependem do contrato da operação que será consumida e devem ser substituídos pelos valores do projeto.

## Objetivo

Implementar uma chamada server-side para a API RaroNexus seguindo o padrão usado no RaroStock:

- construir a URL do endpoint a partir da URL base do RaroNexus;
- autenticar a aplicação com Client ID e Client Secret;
- enviar o conteúdo como JSON;
- validar a resposta HTTP;
- tratar respostas inválidas e falhas de rede sem expor informações sensíveis.

Este prompt não cobre login, SSO, cookies de sessão ou autenticação de usuários.

## Contexto da integração

Preencha os valores abaixo antes de implementar:

- Projeto consumidor: `[NOME_DO_PROJETO]`
- URL base do RaroNexus: `[RARONEXUS_BASE_URL]`
- Client ID da aplicação: `[RARONEXUS_CLIENT_ID]`
- Caminho do endpoint: `[RARONEXUS_API_PATH]`
- Método HTTP: `[HTTP_METHOD]`
- Payload enviado: `[PAYLOAD_GENERICO]`
- Formato esperado da resposta: `[FORMATO_DA_RESPOSTA]`

O caminho do endpoint deve começar com `/`, por exemplo `/api/exemplo`, para que possa ser combinado com a URL base usando `new URL`.

## Variáveis de ambiente

Configure as credenciais somente no ambiente do servidor:

```env
RARONEXUS_BASE_URL="[RARONEXUS_BASE_URL]"
RARONEXUS_CLIENT_ID="[RARONEXUS_CLIENT_ID]"
RARONEXUS_CLIENT_SECRET="[RARONEXUS_CLIENT_SECRET]"
```

Crie um helper que valide as variáveis antes do uso:

```ts
function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
```

Não use prefixos que tornem o Client Secret público, como `NEXT_PUBLIC_`. A chamada deve acontecer em uma rota de API, Server Action, serviço backend ou outro contexto exclusivamente server-side.

## Implementação TypeScript com `fetch`

Adapte os tipos, o caminho, o método e o payload ao contrato real do endpoint:

```ts
type RaroNexusRequest = Record<string, unknown>;
type RaroNexusResponse = Record<string, unknown>;

export async function sendToRaroNexus(
  payload: RaroNexusRequest,
): Promise<RaroNexusResponse> {
  const baseUrl = getEnv("RARONEXUS_BASE_URL");
  const endpoint = "[RARONEXUS_API_PATH]";
  let response: Response;

  try {
    response = await fetch(new URL(endpoint, baseUrl), {
      method: "[HTTP_METHOD]",
      headers: {
        "Content-Type": "application/json",
        "X-RaroNexus-Client-Id": getEnv("RARONEXUS_CLIENT_ID"),
        "X-RaroNexus-Client-Secret": getEnv("RARONEXUS_CLIENT_SECRET"),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.error("raronexus_network_error", {
      endpoint,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    throw error;
  }

  const responsePayload = await response.json().catch(() => null) as RaroNexusResponse | null;

  if (!response.ok) {
    const message =
      typeof responsePayload?.message === "string"
        ? responsePayload.message
        : typeof responsePayload?.error === "string"
          ? responsePayload.error
          : "A API RaroNexus retornou uma resposta sem sucesso.";

    console.warn("raronexus_request_failed", {
      endpoint,
      status: response.status,
      message,
    });

    throw new Error(message);
  }

  if (!responsePayload) {
    throw new Error("A API RaroNexus retornou uma resposta inválida.");
  }

  return responsePayload;
}
```

Exemplo genérico de uso:

```ts
await sendToRaroNexus({
  dado: "[VALOR]",
  propriedades: {
    campo: "[OUTRO_VALOR]",
  },
});
```

Substitua esse objeto pelo `[PAYLOAD_GENERICO]` definido para a integração. Não presuma nomes de campos, regras de validação ou estrutura de resposta que não estejam documentados no contrato do endpoint.

## Exemplo equivalente com cURL

O exemplo abaixo representa o mesmo contrato HTTP da implementação TypeScript:

```bash
curl --request "[HTTP_METHOD]" \
  "${RARONEXUS_BASE_URL}[RARONEXUS_API_PATH]" \
  --header "Content-Type: application/json" \
  --header "X-RaroNexus-Client-Id: ${RARONEXUS_CLIENT_ID}" \
  --header "X-RaroNexus-Client-Secret: ${RARONEXUS_CLIENT_SECRET}" \
  --data '[PAYLOAD_GENERICO_EM_JSON]'
```

Execute o cURL somente em um ambiente seguro. Não cole credenciais reais no comando, no histórico compartilhado do terminal, em tickets ou na documentação versionada.

## Tratamento de erros

A implementação deve:

- considerar `response.ok` antes de tratar a operação como concluída;
- tentar ler a resposta como JSON sem assumir que todos os erros terão corpo JSON válido;
- usar `message` ou `error` da resposta apenas quando forem strings;
- definir uma mensagem segura para respostas sem detalhes utilizáveis;
- distinguir, nos logs, o status HTTP recebido de uma falha de rede ou execução;
- propagar ou converter o erro conforme o padrão do projeto consumidor;
- nunca registrar Client Secret, headers completos, tokens ou o payload quando ele puder conter dados sensíveis.

Se o contrato permitir resposta vazia, ajuste o exemplo para aceitar explicitamente o status esperado, como `204 No Content`, em vez de exigir JSON.

## Cuidados obrigatórios

- Fazer a chamada exclusivamente no servidor.
- Nunca enviar `RARONEXUS_CLIENT_SECRET` ao navegador.
- Não armazenar credenciais em código-fonte, payload, query string ou logs.
- Usar HTTPS fora do ambiente local.
- Manter `Content-Type: application/json` quando o contrato definir corpo JSON.
- Usar exatamente os headers `X-RaroNexus-Client-Id` e `X-RaroNexus-Client-Secret` para autenticação da aplicação.
- Usar `JSON.stringify` para serializar o payload.
- Usar `cache: "no-store"` quando o runtime suportar essa opção.
- Validar dados de entrada antes de encaminhá-los ao RaroNexus.
- Definir timeout ou cancelamento quando o padrão técnico do projeto já oferecer esse mecanismo.

## Critérios de aceite

- A URL final combina `RARONEXUS_BASE_URL` e `[RARONEXUS_API_PATH]` com `new URL`.
- A requisição usa `[HTTP_METHOD]`, JSON e os dois headers de autenticação da aplicação.
- O payload permanece genérico e é substituído conforme o contrato da API consumida.
- O exemplo TypeScript e o exemplo cURL descrevem a mesma requisição.
- Credenciais ficam restritas ao backend e às variáveis de ambiente.
- Respostas sem sucesso, respostas não JSON e falhas de rede são tratadas.
- Logs não revelam credenciais nem conteúdo sensível.
- A implementação não adiciona dependência de SSO, cookies ou sessão de usuário.

Ao implementar, preserve a arquitetura do projeto consumidor e altere somente os arquivos necessários para a integração server-to-server.
