import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canExport } from "@/lib/roles";

export const runtime = "nodejs";

type ProductRow = typeof products.$inferSelect;

type ShoppingListItem = ProductRow & {
  purchaseQuantity: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getStatus(quantity: number, minimumLimit: number, desiredLimit: number) {
  if (quantity === 0) return "Indisponivel";
  if (quantity < minimumLimit) return "Abaixo do Minimo";
  if (quantity < desiredLimit) return "Abaixo do Desejavel";
  return "Em Estoque";
}

function formatGeneratedAt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFilenameDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, ".");
}

function formatFilters(search: string | null, categories: string[], statuses: string[]) {
  const filters = [
    search ? `Busca: ${search}` : null,
    categories.length ? `Categorias: ${categories.join(", ")}` : null,
    statuses.length ? `Status: ${statuses.join(", ")}` : null,
  ].filter(Boolean);

  return filters.length ? filters.join(" | ") : "Sem filtros aplicados";
}

function fitText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc
    .roundedRect(42, y, 512, 24, 5)
    .fill("#10233f")
    .fillColor("#dbeafe")
    .font("Helvetica-Bold")
    .fontSize(8);

  doc.text("Codigo", 52, y + 8, { width: 54 });
  doc.text("Produto", 112, y + 8, { width: 132 });
  doc.text("Categoria", 250, y + 8, { width: 92 });
  doc.text("Estoque", 348, y + 8, { width: 46, align: "right" });
  doc.text("Desej.", 400, y + 8, { width: 44, align: "right" });
  doc.text("Comprar", 450, y + 8, { width: 54, align: "right" });
  doc.text("Un.", 510, y + 8, { width: 34 });
}

function drawPageFooter(doc: PDFKit.PDFDocument, page: number) {
  const bottom = doc.page.height - 36;
  doc
    .strokeColor("#dbeafe")
    .lineWidth(0.5)
    .moveTo(42, bottom - 10)
    .lineTo(554, bottom - 10)
    .stroke();
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text(`RaroStock | Pagina ${page}`, 42, bottom, { width: 512, align: "right" });
}

async function renderPdf(items: ShoppingListItem[], filtersLabel: string) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  let page = 1;

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("Lista de Compras RaroStock", 42, 42);
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(10)
    .text(`Gerado em ${formatGeneratedAt(new Date())}`, 42, 72);

  doc
    .roundedRect(42, 98, 512, 58, 8)
    .fill("#eff6ff")
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`${items.length} ${items.length === 1 ? "item para reposicao" : "itens para reposicao"}`, 58, 114);
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(9)
    .text(filtersLabel, 58, 134, { width: 480 });

  let y = 178;
  drawTableHeader(doc, y);
  y += 32;

  items.forEach((item, index) => {
    if (y > 752) {
      drawPageFooter(doc, page);
      doc.addPage();
      page += 1;
      y = 52;
      drawTableHeader(doc, y);
      y += 32;
    }

    const rowFill = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    doc.roundedRect(42, y - 6, 512, 28, 4).fill(rowFill);
    doc
      .fillColor("#0f172a")
      .font("Helvetica")
      .fontSize(8.5)
      .text(item.code, 52, y + 2, { width: 54 })
      .text(fitText(item.name, 28), 112, y + 2, { width: 132 })
      .text(fitText(item.category, 20), 250, y + 2, { width: 92 })
      .text(String(item.quantity), 348, y + 2, { width: 46, align: "right" })
      .text(String(item.desiredLimit), 400, y + 2, { width: 44, align: "right" });

    doc
      .fillColor("#1d4ed8")
      .font("Helvetica-Bold")
      .text(String(item.purchaseQuantity), 450, y + 2, { width: 54, align: "right" });

    doc
      .fillColor("#0f172a")
      .font("Helvetica")
      .text(fitText(item.unit, 8), 510, y + 2, { width: 34 });

    y += 30;
  });

  drawPageFooter(doc, page);
  doc.end();

  return finished;
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canExport);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const categoryFilters = url.searchParams.getAll("category");
  const statusFilters = url.searchParams.getAll("status");
  const search = url.searchParams.get("search");
  const normalizedStatuses = statusFilters.map(normalizeText);

  let allProducts = await db.select().from(products);

  if (categoryFilters.length) {
    allProducts = allProducts.filter((item) => categoryFilters.includes(item.category));
  }

  if (search) {
    const normalizedSearch = normalizeText(search);
    allProducts = allProducts.filter(
      (item) =>
        normalizeText(item.name).includes(normalizedSearch) ||
        normalizeText(item.code).includes(normalizedSearch),
    );
  }

  if (normalizedStatuses.length) {
    allProducts = allProducts.filter((item) =>
      normalizedStatuses.includes(normalizeText(getStatus(item.quantity, item.minimumLimit, item.desiredLimit))),
    );
  }

  const shoppingItems = allProducts
    .map((item) => ({
      ...item,
      purchaseQuantity: Math.max(0, item.desiredLimit - item.quantity),
    }))
    .filter((item) => item.purchaseQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  try {
    const pdf = await renderPdf(shoppingItems, formatFilters(search, categoryFilters, statusFilters));
    const filename = `lista_de_compras_${formatFilenameDate(new Date())}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate shopping list PDF", error);
    return NextResponse.json({ error: "Nao foi possivel gerar a lista de compras." }, { status: 500 });
  }
}


