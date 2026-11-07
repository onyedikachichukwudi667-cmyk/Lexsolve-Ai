import type { PageText } from "./library";

// All extraction runs in the browser, so Cloudflare Worker limits never apply to uploads.
export async function extractFile(file: File): Promise<PageText[]> {
  const name = file.name.toLowerCase();
  if (file.size > 15 * 1024 * 1024) throw new Error("File is larger than 15 MB.");

  if (name.endsWith(".txt")) return [{ text: await file.text() }];

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return [{ text: value }];
  }

  if (name.endsWith(".pdf")) {
    // The legacy build works on older Android browsers that lack newer JavaScript features.
    // @ts-ignore legacy build has no bundled type declarations
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: PageText[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      const text = content.items.map((i: any) => ("str" in i ? i.str : "")).join(" ");
      if (text.trim()) pages.push({ page: p, text });
    }
    if (!pages.length) throw new Error("This PDF has no selectable text (it may be a scan).");
    return pages;
  }
  throw new Error("Only PDF, DOCX and TXT files are supported.");
}
