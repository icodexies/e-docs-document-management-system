// Builds the one-page sample used for E-Docs demos.
//
//   npm run make:sample
//
// The sample uses the Garamond fonts installed on Windows (GARA.TTF /
// GARABD.TTF) so the detector can show the "Garamond Bold · 16 pt" hint. On a
// machine without those fonts it falls back to Times, which still has a real
// text layer and matches the same names.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "samples", "E-Docs-Sample-Approval.pdf");

const fontsDir = join(process.env.WINDIR || "C:\\Windows", "Fonts");
const regularPath = join(fontsDir, "GARA.TTF");
const boldPath = join(fontsDir, "GARABD.TTF");
const useGaramond = existsSync(regularPath) && existsSync(boldPath);

const pdf = await PDFDocument.create();
if (useGaramond) pdf.registerFontkit(fontkit);

const regular = useGaramond
  ? await pdf.embedFont(readFileSync(regularPath), { subset: true })
  : await pdf.embedFont(StandardFonts.TimesRoman);
const bold = useGaramond
  ? await pdf.embedFont(readFileSync(boldPath), { subset: true })
  : await pdf.embedFont(StandardFonts.TimesRomanBold);

pdf.setTitle("E-Docs Sample Approval Sheet");
pdf.setAuthor("E-Docs");
pdf.setSubject("Sample document for testing name detection and electronic signatures.");
pdf.setCreator("E-Docs sample generator");

const page = pdf.addPage([595.28, 841.89]);
const ink = rgb(0.043, 0.075, 0.188);
const muted = rgb(0.35, 0.38, 0.45);
const line = rgb(0.72, 0.75, 0.8);
const accent = rgb(0.23, 0.29, 0.53);

page.drawText("E-DOCS", {
  x: 56,
  y: 800,
  size: 9,
  font: regular,
  color: accent,
});
page.drawText("SAMPLE APPROVAL SHEET", {
  x: 56,
  y: 758,
  size: 22,
  font: bold,
  color: ink,
});
page.drawLine({
  start: { x: 56, y: 744 },
  end: { x: 539, y: 744 },
  thickness: 1,
  color: line,
});
page.drawText("Use this PDF to test E-Docs.", {
  x: 56,
  y: 718,
  size: 10,
  font: regular,
  color: muted,
});

const blocks = [
  { label: "Prepared by:", name: "JUAN DELA CRUZ", y: 560 },
  { label: "Reviewed by:", name: "MARIA SANTOS", y: 370 },
  { label: "Approved by:", name: "PEDRO REYES", y: 180 },
];

for (const block of blocks) {
  page.drawText(block.label, {
    x: 56,
    y: block.y + 52,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawLine({
    start: { x: 56, y: block.y + 20 },
    end: { x: 360, y: block.y + 20 },
    thickness: 0.7,
    color: line,
  });
  page.drawText(block.name, {
    x: 56,
    y: block.y,
    size: 16,
    font: bold,
    color: ink,
  });
  page.drawText("Signature over Printed Name", {
    x: 56,
    y: block.y - 15,
    size: 8,
    font: regular,
    color: muted,
  });
}

page.drawText("SAMPLE / SAMPLE / SAMPLE", {
  x: 56,
  y: 50,
  size: 8,
  font: regular,
  color: muted,
});

const bytes = await pdf.save();
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);

console.log(`Wrote ${output}`);
console.log(
  `Font: ${useGaramond ? "Garamond (local Windows fonts)" : "Times (Garamond not found)"}`,
);
console.log(`Size: ${(bytes.length / 1024).toFixed(1)} KB`);
