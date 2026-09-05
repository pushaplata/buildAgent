declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;

  export = pdfParse;
}
