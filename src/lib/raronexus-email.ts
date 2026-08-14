import { equipments, equipmentRequests } from "@/db/schema";

type EquipmentRequestRow = typeof equipmentRequests.$inferSelect;
type EquipmentRow = typeof equipments.$inferSelect;

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function buildStockUrl(path: string) {
  const stockBaseUrl = getEnv("RAROSTOCK_BASE_URL", "http://localhost:3000");
  return new URL(path, stockBaseUrl).toString();
}

function getResponsibleRecipient(request: EquipmentRequestRow) {
  if (request.type === "obtain") {
    return {
      email: request.fromUserEmail,
      name: request.fromUserName,
    };
  }

  return {
    email: request.toUserEmail,
    name: request.toUserName,
  };
}

function formatHolder(name: string | null, holderType: string | null) {
  if (holderType === "company") return "RAROTEC";
  return name || "Usuario";
}

export async function notifyEquipmentRequestByEmail(request: EquipmentRequestRow, equipment: EquipmentRow) {
  if (request.status !== "pending") return;

  const recipient = getResponsibleRecipient(request);
  if (!recipient.email || recipient.email === request.requesterEmail) return;

  const from = formatHolder(request.fromUserName, request.fromHolderType);
  const to = formatHolder(request.toUserName, request.toHolderType);
  const requiresTerm = Boolean(equipment.requiresResponsibilityTerm);
  const actionUrl = buildStockUrl(`/solicitacoes/${request.id}`);
  const nexusBaseUrl = getEnv("RARONEXUS_BASE_URL", "http://localhost:3001");

  const message = [
    `${request.requesterName} abriu uma solicitacao para o equipamento ${equipment.name} (${equipment.code}).`,
    `Movimentacao solicitada: de ${from} para ${to}.`,
    request.reason ? `Motivo informado: ${request.reason}.` : null,
    requiresTerm ? "Este equipamento exige termo, e a tela de decisao permitira anexar o arquivo antes da aprovacao." : null,
    "Acesse o RaroStock para aprovar ou rejeitar a solicitacao.",
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch(new URL("/api/email/equipment-transfer-request", nexusBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RaroNexus-Client-Id": getEnv("RARONEXUS_CLIENT_ID", "rarostock"),
        "X-RaroNexus-Client-Secret": getEnv("RARONEXUS_CLIENT_SECRET"),
      },
      body: JSON.stringify({
        to: recipient.email,
        subject: "Nova solicitacao de equipamento no RaroStock",
        title: "Voce recebeu uma solicitacao de equipamento",
        message,
        action_label: "Abrir solicitacao",
        action_url: actionUrl,
        metadata: {
          request_id: request.id,
          equipment_id: request.equipmentId,
          type: request.type,
          requires_term: requiresTerm,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn("raronexus_equipment_request_email_failed", {
        requestId: request.id,
        status: response.status,
        message: payload?.message ?? payload?.error,
      });
    }
  } catch (error) {
    console.warn("raronexus_equipment_request_email_failed", {
      requestId: request.id,
      error,
    });
  }
}