import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { acquisitions } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canManageStock } from "@/lib/roles";
import { deleteInvoiceFromFtp } from "@/lib/ftp-storage";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const acquisitionId = Number(id);

  if (!Number.isInteger(acquisitionId)) {
    return NextResponse.json({ error: "Aquisicao inválida." }, { status: 400 });
  }

  const body = (await req.json()) as {
    invoiceUrl?: unknown;
    invoiceFilename?: unknown;
    invoiceStoragePath?: unknown;
  };

  if (typeof body.invoiceUrl !== "string" || !body.invoiceUrl.trim()) {
    return NextResponse.json(
      { error: "URL da nota fiscal e obrigatoria." },
      { status: 400 }
    );
  }

  if (
    typeof body.invoiceFilename !== "string" ||
    !body.invoiceFilename.trim()
  ) {
    return NextResponse.json(
      { error: "Nome do arquivo da nota fiscal e obrigatorio." },
      { status: 400 }
    );
  }

  const [current] = await db
    .select()
    .from(acquisitions)
    .where(eq(acquisitions.id, acquisitionId))
    .limit(1);

  if (!current) {
    return NextResponse.json(
      { error: "Aquisicao não encontrada." },
      { status: 404 }
    );
  }

  if (current.invoiceUrl) {
    return NextResponse.json(
      { error: "Esta aquisicao ja possui nota fiscal anexada." },
      { status: 409 }
    );
  }

  const [updated] = await db
    .update(acquisitions)
    .set({
      invoiceUrl: body.invoiceUrl.trim(),
      invoiceFilename: body.invoiceFilename.trim(),
      invoiceStoragePath:
        typeof body.invoiceStoragePath === "string"
          ? body.invoiceStoragePath.trim() || null
          : null,
    })
    .where(eq(acquisitions.id, acquisitionId))
    .returning();

  return NextResponse.json({ acquisition: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(
    req,
    canAdmin,
    "Apenas administradores podem excluir nota fiscal."
  );
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const acquisitionId = Number(id);

  if (!Number.isInteger(acquisitionId)) {
    return NextResponse.json({ error: "Aquisicao inválida." }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(acquisitions)
    .where(eq(acquisitions.id, acquisitionId))
    .limit(1);

  if (!current) {
    return NextResponse.json(
      { error: "Aquisicao não encontrada." },
      { status: 404 }
    );
  }

  let storageDeleted = false;

  if (current.invoiceStoragePath) {
    try {
      await deleteInvoiceFromFtp(current.invoiceStoragePath);
      storageDeleted = true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a nota fiscal do storage.";

      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const [updated] = await db
    .update(acquisitions)
    .set({
      invoiceUrl: null,
      invoiceFilename: null,
      invoiceStoragePath: null,
    })
    .where(eq(acquisitions.id, acquisitionId))
    .returning();

  return NextResponse.json({ acquisition: updated, storageDeleted });
}

