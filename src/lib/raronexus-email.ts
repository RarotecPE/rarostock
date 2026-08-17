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
  return name || "Usuário";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  const body = `
    <p>${escapeHtml(request.requesterName)} abriu uma solicitação para o equipamento <strong>${escapeHtml(equipment.name)} (${escapeHtml(equipment.code)})</strong>.</p>
    <p>Movimentação solicitada: de <strong>${escapeHtml(from)}</strong> para <strong>${escapeHtml(to)}</strong>.</p>
    ${request.reason ? `<p>Motivo informado: ${escapeHtml(request.reason)}.</p>` : ""}
    ${requiresTerm ? "<p>Este equipamento exige termo, e a tela de decisão permitirá anexar o arquivo antes da aprovação.</p>" : ""}
    <p>Acesse o RaroStock para aprovar ou rejeitar a solicitação.</p>
    <p style="margin: 28px 0;">
      <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700;">
        Abrir solicitação
      </a>
    </p>
    <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <span style="word-break: break-all;">${escapeHtml(actionUrl)}</span>
    </p>
  `;

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
        subject: "Nova solicitação de equipamento no RaroStock",
        body,
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
