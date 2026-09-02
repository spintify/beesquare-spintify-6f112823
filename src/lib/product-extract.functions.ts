import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string().min(20),
});

export type ExtractedProduct = {
  name: string;
  productId: string;
  hsn?: string;
  mrp: number;
  quantity: number;
};

const PROMPT = `You extract product/inventory rows from a photo of an invoice, price list, packing slip, spreadsheet or handwritten list.
Return ONLY JSON matching: {"products":[{"name":string,"productId":string,"hsn":string,"mrp":number,"quantity":number}]}
Rules:
- name = product/part name. productId = part number / SKU / product code (if absent, derive a short code from the name).
- hsn = HSN/SAC code if visible, else "".
- mrp = per unit price (GST inclusive if shown that way) as a plain number, no currency symbols or commas.
- quantity = quantity visible in the image, else 0.
- Skip totals, taxes, discounts, headers and any row without a usable name.
- No markdown, no explanation, JSON only.`;

export const extractProductsFromImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ products: ExtractedProduct[] }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured (missing API key).");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate limited. Please retry in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
      throw new Error(`AI extraction failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Could not read any products from the image.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("Could not read any products from the image.");
    }

    const shape = z.object({
      products: z
        .array(
          z.object({
            name: z.string().optional().default(""),
            productId: z.string().optional().default(""),
            hsn: z.string().optional().default(""),
            mrp: z.union([z.number(), z.string()]).optional().default(0),
            quantity: z.union([z.number(), z.string()]).optional().default(0),
          })
        )
        .default([]),
    });
    const out = shape.safeParse(parsed);
    if (!out.success) throw new Error("Could not read any products from the image.");

    const num = (v: number | string) => {
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const products: ExtractedProduct[] = out.data.products
      .map((p) => ({
        name: p.name.trim(),
        productId: (p.productId || p.name).trim().slice(0, 64),
        hsn: p.hsn?.trim() || undefined,
        mrp: +num(p.mrp).toFixed(2),
        quantity: Math.max(0, Math.floor(num(p.quantity))),
      }))
      .filter((p) => p.name.length > 0);

    return { products };
  });
