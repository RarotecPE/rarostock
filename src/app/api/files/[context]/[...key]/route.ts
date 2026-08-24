import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import {
  getAttachmentFromR2,
  isKnownAttachmentContext,
} from "@/lib/r2-storage";
import { canView } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ context: string; key: string[] }> }
) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { context, key } = await params;
  if (!isKnownAttachmentContext(context)) {
    return NextResponse.json({ error: "Contexto de arquivo invalido." }, { status: 400 });
  }

  try {
    const file = await getAttachmentFromR2(context, key.join("/"));
    const download = req.nextUrl.searchParams.get("download") === "1";

    return new NextResponse(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.filename)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arquivo nao encontrado.";
    const status = message === "Invalid storage path" ? 400 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
