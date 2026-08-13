import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock } from "@/lib/roles";
import { uploadInvoiceToFtp } from "@/lib/ftp-storage";

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contextValue = formData.get("context");
    const context =
      contextValue === "equipment" || contextValue === "equipmentTerm" || contextValue === "equipmentResponsibilityTerm" || contextValue === "equipmentDevolutionTerm"
        ? contextValue
        : "product";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const upload = await uploadInvoiceToFtp(file, context);

    return NextResponse.json({
      url: upload.url,
      filename: upload.filename,
      storagePath: upload.storagePath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload error";
    const status = message.includes("Tipo de arquivo não permitido") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}


