import { uploadInvoiceToFtp } from "@/lib/ftp-storage";

export type EquipmentTermType = "responsibility" | "devolution";

export type EquipmentTermPayload = {
  url: string;
  filename: string;
  storagePath: string;
};

export function getTermFieldPrefix(termType: EquipmentTermType) {
  return termType === "responsibility" ? "responsibilityTerm" : "devolutionTerm";
}

export function termTypeFromValue(value: FormDataEntryValue | null): EquipmentTermType | null {
  return value === "responsibility" || value === "devolution" ? value : null;
}

export async function uploadEquipmentTermFile(file: File, termType: EquipmentTermType): Promise<EquipmentTermPayload> {
  return uploadInvoiceToFtp(
    file,
    termType === "responsibility" ? "equipmentResponsibilityTerm" : "equipmentDevolutionTerm",
  );
}

export async function uploadOptionalEquipmentTermFromFormData(
  formData: FormData,
  termType: EquipmentTermType,
  fieldName = "termFile",
): Promise<EquipmentTermPayload | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  return uploadEquipmentTermFile(file, termType);
}

export function assignMovementTermPayload(termType: EquipmentTermType, payload: EquipmentTermPayload | null) {
  if (!payload) return {};
  return termType === "responsibility"
    ? {
        responsibilityTermUrl: payload.url,
        responsibilityTermFilename: payload.filename,
        responsibilityTermStoragePath: payload.storagePath,
      }
    : {
        devolutionTermUrl: payload.url,
        devolutionTermFilename: payload.filename,
        devolutionTermStoragePath: payload.storagePath,
      };
}
export type ParsedTermRequest = {
  body: Record<string, unknown>;
  termPayload: EquipmentTermPayload | null;
};

const formValueToString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : undefined;

export async function parseRequestWithOptionalEquipmentTerm(
  req: Request,
  termType: EquipmentTermType,
): Promise<ParsedTermRequest> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const body: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "termFile") continue;
      const stringValue = formValueToString(value);
      if (stringValue === undefined) continue;
      body[key] = stringValue;
    }

    return {
      body,
      termPayload: await uploadOptionalEquipmentTermFromFormData(formData, termType),
    };
  }

  return {
    body: await req.json().catch(() => ({})),
    termPayload: null,
  };
}

export function hasConfirmedMissingTerm(value: unknown) {
  return value === true || value === "true";
}
