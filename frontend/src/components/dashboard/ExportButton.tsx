import { useState } from 'react'

export default function ExportButton() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default

      const element = document.getElementById('dashboard-export-area')
      if (element) {
        const opt = {
          margin: 0.5,
          filename: 'progreso-mathlingo.pdf',
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
        }
        await html2pdf().set(opt).from(element).save()
      }
    } catch (e) {
      console.error('PDF Export failed', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="cm-btn-primary min-h-0 gap-2 px-3 py-2 text-sm disabled:opacity-50"
    >
      <span className="font-serif font-black">{exporting ? '...' : 'PDF'}</span>
      {exporting ? 'Generando...' : 'Exportar PDF'}
    </button>
  )
}
