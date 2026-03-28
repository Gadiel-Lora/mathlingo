import { useState } from 'react'

export default function ExportButton() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // Lazy load html2pdf purely on client side for the export action
      const html2pdf = (await import('html2pdf.js')).default
      
      const element = document.getElementById('dashboard-export-area')
      if (element) {
        const opt = {
          margin: 0.5,
          filename: 'progreso-mathlingo.pdf',
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        }
        await html2pdf().set(opt).from(element).save()
      }
    } catch (e) {
      console.error("PDF Export failed", e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
    >
      <span>{exporting ? '⏳' : '📥'}</span>
      {exporting ? 'Generando...' : 'Exportar PDF'}
    </button>
  )
}
