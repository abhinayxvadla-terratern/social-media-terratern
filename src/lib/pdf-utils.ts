import { PDFDocument } from 'pdf-lib';

/**
 * Ensures any PDF document downloaded by a user is served as a clean 1-page document.
 * If a document was designed as a one-pager but spilled over onto page 2
 * (a common issue when exporting or printing web pages to PDF where trailing cards overflow),
 * this embeds and scales both pages onto a single standard A4 page seamlessly.
 */
export async function ensureSinglePagePdf(pdfBuffer: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  try {
    const doc = await PDFDocument.load(pdfBuffer);
    const pageCount = doc.getPageCount();

    // If already 1 page (or empty), return original
    if (pageCount <= 1) {
      return new Uint8Array(pdfBuffer);
    }

    // If 2 pages (the common spillover case for one-pagers):
    if (pageCount === 2) {
      const p1 = doc.getPage(0);
      const p2 = doc.getPage(1);
      const { width: p1W, height: p1H } = p1.getSize();
      const { width: p2W, height: p2H } = p2.getSize();

      const newDoc = await PDFDocument.create();
      const targetW = p1W || 595.28;
      const targetH = p1H || 841.89;
      const targetPage = newDoc.addPage([targetW, targetH]);

      const [embeddedP1, embeddedP2] = await newDoc.embedPages([p1, p2]);

      // Calculate scale factor:
      // Page 1 is full content, Page 2 overflow typically occupies ~20-25% at top.
      const overflowPt = Math.min(p2H * 0.28, 220);
      const totalContentH = p1H + overflowPt;

      // Scale so entire combined content fits comfortably within targetH with small safety padding
      const scale = (targetH - 16) / totalContentH;
      const offsetX = (targetW - p1W * scale) / 2;

      // Draw Page 1 at the top of the canvas
      const y1 = (targetH - 8) - p1H * scale;
      targetPage.drawPage(embeddedP1, {
        x: offsetX,
        y: y1,
        xScale: scale,
        yScale: scale,
      });

      // Draw Page 2 directly below Page 1.
      // In PDF coordinates, page 2 content is at the top (y = p2H down to p2H - overflowPt).
      // When drawn at y2, its top (y = p2H) aligns with y1.
      const y2 = y1 - p2H * scale;
      targetPage.drawPage(embeddedP2, {
        x: offsetX,
        y: y2,
        xScale: scale,
        yScale: scale,
      });

      return await newDoc.save();
    }

    return new Uint8Array(pdfBuffer);
  } catch (err) {
    console.warn('[PDF Utils] ensureSinglePagePdf fallback to original:', err);
    return new Uint8Array(pdfBuffer);
  }
}
