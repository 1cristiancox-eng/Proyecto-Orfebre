// Exportación de reportes a Excel (SheetJS) y PDF (jsPDF)
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtDate } from './format.js'

// --- Excel ---------------------------------------------------------------

// sheets = [{ name, rows: [{...}] }]
export function exportExcel(filename, sheets) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': 'Sin datos' }])
    // Ancho automático aproximado
    const cols = Object.keys(s.rows[0] || { col: '' }).map((k) => ({ wch: Math.max(12, k.length + 2) }))
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

// --- PDF -----------------------------------------------------------------

// tables = [{ title, head: [...], body: [[...]] }]
export function exportPDF(filename, docTitle, tables, meta = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Encabezado
  doc.setFillColor(138, 109, 26)
  doc.rect(0, 0, pageW, 60, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(meta.negocio || 'Taller de Orfebrería', 40, 28)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(docTitle, 40, 46)
  doc.setFontSize(9)
  doc.text(`Generado: ${fmtDate(new Date().toISOString().slice(0, 10))}`, pageW - 40, 46, { align: 'right' })

  let y = 84
  for (const t of tables) {
    if (t.title) {
      doc.setTextColor(40, 42, 48)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(t.title, 40, y)
      y += 8
    }
    autoTable(doc, {
      startY: y + 6,
      head: [t.head],
      body: t.body.length ? t.body : [t.head.map(() => '—')],
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [201, 162, 39], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 247, 239] },
      margin: { left: 40, right: 40 },
    })
    y = doc.lastAutoTable.finalY + 24
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      y = 60
    }
  }
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
