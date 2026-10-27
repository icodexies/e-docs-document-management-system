// Single place where pdf.js is configured. The worker is bundled by Vite and
// emitted as an asset; nothing is loaded from a third-party CDN.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
