export function samplePdf(content = 'MARIA Y JOSE - 20/12/2026') {
  const stream = `BT /F1 14 Tf 20 110 Td (${content.replace(/[()\\]/g,' ')}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 272.126 158.740] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let data='%PDF-1.4\n', offsets=[0];
  objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${object}\nendobj\n`;});
  const start=Buffer.byteLength(data);data+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(data);
}
export async function sampleImage(page, title='MARIA Y JOSE', date='20/12/2026') {
  return page.evaluate(({title,date})=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#eef6ff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#2460a2';x.lineWidth=12;x.strokeRect(30,30,1140,740);x.fillStyle='#163650';x.textAlign='center';x.font='bold 80px sans-serif';x.fillText(title,600,330);x.font='bold 64px sans-serif';x.fillText(date,600,500);return c.toDataURL('image/png').split(',')[1];},{title,date});
}
