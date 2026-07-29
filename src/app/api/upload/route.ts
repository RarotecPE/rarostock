import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock } from "@/lib/roles";

const signedUrlExpiresIn = 60 * 60 * 24 * 365;

const getStorageBucket = () => {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!bucket) {
    throw new Error("SUPABASE_STORAGE_BUCKET is required");
  }

  return bucket;
};

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "_");

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bucket = getStorageBucket();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const storagePath = `invoices/${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: bucketData } = await supabaseAdmin.storage.getBucket(bucket);
    let url: string;

    if (bucketData?.public) {
      const publicUrl = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      url = publicUrl.data.publicUrl;
    } else {
      const { data: signedUrlData, error: signedUrlError } =
        await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(storagePath, signedUrlExpiresIn);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return NextResponse.json(
          {
            error:
              signedUrlError?.message ??
              "Could not create a signed URL for the uploaded file",
          },
          { status: 500 }
        );
      }

      url = signedUrlData.signedUrl;
    }

    return NextResponse.json({
      url,
      filename: file.name,
      storagePath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
