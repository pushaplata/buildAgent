export const createPdfWithText = (text: string): Buffer => {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const stream = Buffer.from(`BT /F1 12 Tf 50 720 Td (${escaped}) Tj ET`, "ascii");

  const object = (id: number, body: Buffer): Buffer =>
    Buffer.concat([
      Buffer.from(`${id} 0 obj\n`, "ascii"),
      body,
      Buffer.from("\nendobj\n", "ascii"),
    ]);

  const obj1 = object(
    1,
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
  );
  const obj2 = object(
    2,
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
  );
  const obj3 = object(
    3,
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "ascii",
    ),
  );
  const obj4 = object(
    4,
    Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
      stream,
      Buffer.from("\nendstream", "ascii"),
    ]),
  );
  const obj5 = object(
    5,
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "ascii"),
  );

  const header = Buffer.from("%PDF-1.4\n", "ascii");
  const objects = [obj1, obj2, obj3, obj4, obj5];
  const offsets: number[] = [];
  let position = header.length;

  for (const current of objects) {
    offsets.push(position);
    position += current.length;
  }

  const body = Buffer.concat([header, ...objects]);
  const xrefLines = ["xref", "0 6", "0000000000 65535 f "];

  for (const offset of offsets) {
    xrefLines.push(`${offset.toString().padStart(10, "0")} 00000 n `);
  }

  const xref = Buffer.from(`${xrefLines.join("\n")}\n`, "ascii");
  const trailer = Buffer.from(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`,
    "ascii",
  );

  return Buffer.concat([body, xref, trailer]);
};
