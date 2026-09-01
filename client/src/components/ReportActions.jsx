import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../api.js';

const formatLabels = { pdf: 'PDF', xlsx: 'Excel' };

async function errorMessage(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text()).message; } catch { return null; }
  }
  return data?.message;
}

function responseFilename(headers, type, format) {
  const disposition = headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `biblioteca-jipijapa-${type}.${format}`;
}

export default function ReportActions({ type, filters = {}, label = 'Exportar' }) {
  const [downloading, setDownloading] = useState('');

  const download = async (format) => {
    setDownloading(format);
    try {
      const { data, headers } = await api.get(`/reportes/${type}/${format}`, {
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== false)),
        responseType: 'blob',
        timeout: 60000,
      });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = responseFilename(headers, type, format);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el reporte',
        text: await errorMessage(error) || 'Inténtalo nuevamente o aplica un filtro más específico.',
        confirmButtonColor: '#F2705B',
      });
    } finally {
      setDownloading('');
    }
  };

  return <div className="report-actions" role="group" aria-label={`${label} reporte`}>
    <span className="report-actions-label"><i className="fas fa-file-arrow-down" />{label}</span>
    {Object.entries(formatLabels).map(([format, text]) => <button
      type="button"
      key={format}
      className={`btn btn-sm ${format === 'pdf' ? 'btn-outline-primary' : 'btn-outline-success'}`}
      disabled={Boolean(downloading)}
      onClick={() => download(format)}
      data-testid={`export-${type}-${format}`}
      aria-label={`${label} ${type} en ${text}`}
    >
      {downloading === format
        ? <span className="spinner-border spinner-border-sm" aria-label="Generando reporte" />
        : <><i className={`fas ${format === 'pdf' ? 'fa-file-pdf' : 'fa-file-excel'} me-1`} />{text}</>}
    </button>)}
  </div>;
}
