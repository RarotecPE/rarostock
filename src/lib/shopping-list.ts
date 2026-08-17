import "server-only";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { db } from "@/db";
import { products } from "@/db/schema";

type ProductRow = typeof products.$inferSelect;

export type ShoppingListItem = ProductRow & {
  purchaseQuantity: number;
};

export type ShoppingListFilters = {
  search?: string | null;
  categories?: string[];
  statuses?: string[];
  productIds?: number[];
};

export function normalizeShoppingListText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getStatus(quantity: number, minimumLimit: number, desiredLimit: number) {
  if (quantity === 0) return "Indisponível";
  if (quantity < minimumLimit) return "Abaixo do Mínimo";
  if (quantity < desiredLimit) return "Abaixo do Desejável";
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

export function getShoppingListFilename(date = new Date()) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, ".");

  return `lista_de_compras_${formatted}.pdf`;
}

export function formatShoppingListFilters(search: string | null | undefined, categories: string[], statuses: string[]) {
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
  doc.roundedRect(42, y, 512, 24, 5).fill("#10233f").fillColor("#dbeafe").font("Helvetica-Bold").fontSize(8);
  doc.text("Código", 52, y + 8, { width: 54 });
  doc.text("Produto", 112, y + 8, { width: 132 });
  doc.text("Categoria", 250, y + 8, { width: 92 });
  doc.text("Estoque", 348, y + 8, { width: 46, align: "right" });
  doc.text("Desej.", 400, y + 8, { width: 44, align: "right" });
  doc.text("Comprar", 450, y + 8, { width: 54, align: "right" });
  doc.text("Un.", 510, y + 8, { width: 34 });
}

function drawPageFooter(doc: PDFKit.PDFDocument, page: number) {
  const previousX = doc.x;
  const previousY = doc.y;
  const bottom = doc.page.height - 36;
  doc.strokeColor("#dbeafe").lineWidth(0.5).moveTo(42, bottom - 10).lineTo(554, bottom - 10).stroke();
  doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(`RaroStock | Página ${page}`, 42, bottom, { width: 512, align: "right", lineBreak: false });
  doc.x = previousX;
  doc.y = previousY;
}

export async function listShoppingItems(filters: ShoppingListFilters) {
  const categoryFilters = filters.categories ?? [];
  const statusFilters = filters.statuses ?? [];
  const selectedIds = new Set(filters.productIds ?? []);
  const normalizedStatuses = statusFilters.map(normalizeShoppingListText);

  let allProducts = await db.select().from(products);

  if (categoryFilters.length) allProducts = allProducts.filter((item) => categoryFilters.includes(item.category));

  if (filters.search) {
    const normalizedSearch = normalizeShoppingListText(filters.search);
    allProducts = allProducts.filter(
      (item) => normalizeShoppingListText(item.name).includes(normalizedSearch) || normalizeShoppingListText(item.code).includes(normalizedSearch),
    );
  }

  if (normalizedStatuses.length) {
    allProducts = allProducts.filter((item) =>
      normalizedStatuses.includes(normalizeShoppingListText(getStatus(item.quantity, item.minimumLimit, item.desiredLimit))),
    );
  }

  if (selectedIds.size > 0) allProducts = allProducts.filter((item) => selectedIds.has(item.id));

  return allProducts
    .map((item) => ({ ...item, purchaseQuantity: Math.max(0, item.desiredLimit - item.quantity) }))
    .filter((item) => item.purchaseQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function renderShoppingListPdf(items: ShoppingListItem[], filtersLabel: string) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  let page = 1;

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(22).text("Lista de Compras RaroStock", 42, 42);
  doc.fillColor("#475569").font("Helvetica").fontSize(10).text(`Gerado em ${formatGeneratedAt(new Date())}`, 42, 72);

  doc.roundedRect(42, 98, 512, 58, 8).fill("#eff6ff").fillColor("#0f172a").font("Helvetica-Bold").fontSize(11);
  doc.text(`${items.length} ${items.length === 1 ? "item para reposição" : "itens para reposição"}`, 58, 114);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(filtersLabel, 58, 134, { width: 480 });

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

    doc.fillColor("#1d4ed8").font("Helvetica-Bold").text(String(item.purchaseQuantity), 450, y + 2, { width: 54, align: "right" });
    doc.fillColor("#0f172a").font("Helvetica").text(fitText(item.unit, 8), 510, y + 2, { width: 34 });

    y += 30;
  });

  drawPageFooter(doc, page);
  doc.end();
  return finished;
}
