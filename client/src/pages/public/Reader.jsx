import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api, { apiFileUrl } from '../../api.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export default function Reader() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(760);
  const shell = useRef(null);
  useEffect(() => { api.get(`/catalogo/${id}`).then(({ data }) => setBook(data.item)); }, [id]);
  useEffect(() => {
    const update = () => setWidth(Math.min(820, Math.max(280, shell.current?.clientWidth - 32 || 760)));
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, []);
  return <div className="reader-page"><div className="reader-toolbar"><Link to={`/libros/${id}`}><i className="fas fa-arrow-left" /> Volver</Link><strong>{book?.titulo || 'Cargando…'}</strong><span>Página {page} de {pages || '—'}</span></div>
    <div className="reader-shell" ref={shell}><Document file={apiFileUrl(`/api/catalogo/${id}/visor`)} onLoadSuccess={({ numPages }) => setPages(numPages)} loading={<div className="page-loader"><span className="spinner-border text-light" /></div>} error={<div className="alert alert-danger">No fue posible abrir el documento.</div>}><Page pageNumber={page} width={width} renderAnnotationLayer={false} /></Document></div>
    <div className="reader-controls"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><i className="fas fa-chevron-left" /></button><span>{page} / {pages || 1}</span><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><i className="fas fa-chevron-right" /></button></div>
  </div>;
}

