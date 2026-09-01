import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api, { apiFileUrl } from '../../api.js';
import {
  clampReaderZoom,
  nextReaderPage,
  normalizeReaderPage,
  previousReaderPage,
  readerPageWidth,
  READER_ZOOM_STEP,
  visibleReaderPages,
} from '../../lib/readerLayout.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export default function Reader() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(760);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('single');
  const [compact, setCompact] = useState(false);
  const [turn, setTurn] = useState({ direction: 'next', sequence: 0 });
  const shell = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    api.get(`/catalogo/${id}`).then(({ data }) => setBook(data.item));
  }, [id]);

  useEffect(() => {
    const update = () => {
      const width = shell.current?.clientWidth || window.innerWidth || 760;
      const isCompact = width < 720;
      setContainerWidth(Math.max(280, width - (isCompact ? 24 : 48)));
      setCompact(isCompact);
      if (isCompact) setViewMode('single');
    };
    update();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    if (observer && shell.current) observer.observe(shell.current);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const displayedPages = useMemo(
    () => visibleReaderPages(page, pages, viewMode),
    [page, pages, viewMode],
  );
  const pageWidth = readerPageWidth(containerWidth, viewMode, zoom);
  const canGoBack = page > 1;
  const canGoForward = pages > 0 && nextReaderPage(page, pages, viewMode) !== page;

  const navigate = useCallback((target, direction) => {
    setPage((current) => {
      const normalized = normalizeReaderPage(target, pages, viewMode);
      if (normalized === current) return current;
      setTurn((value) => ({ direction, sequence: value.sequence + 1 }));
      return normalized;
    });
  }, [pages, viewMode]);

  const previous = useCallback(() => {
    navigate(previousReaderPage(page, pages, viewMode), 'previous');
  }, [navigate, page, pages, viewMode]);

  const next = useCallback(() => {
    navigate(nextReaderPage(page, pages, viewMode), 'next');
  }, [navigate, page, pages, viewMode]);

  const changeZoom = useCallback((value) => {
    setZoom(clampReaderZoom(value));
  }, []);

  const changeView = useCallback((mode) => {
    if (mode === 'double' && compact) return;
    setViewMode(mode);
    setPage((current) => normalizeReaderPage(current, pages, mode));
    setTurn((value) => ({ direction: 'next', sequence: value.sequence + 1 }));
  }, [compact, pages]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        previous();
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        next();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((value) => clampReaderZoom(value + READER_ZOOM_STEP));
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom((value) => clampReaderZoom(value - READER_ZOOM_STEP));
      } else if (event.key === '0') {
        event.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, previous]);

  const onTouchStart = (event) => {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 55) return;
    if (distance < 0) next(); else previous();
  };

  const positionLabel = displayedPages.length > 1
    ? `Páginas ${displayedPages[0]}–${displayedPages.at(-1)} de ${pages}`
    : `Página ${displayedPages[0] || page} de ${pages || '—'}`;

  return <div className="reader-page">
    <header className="reader-toolbar">
      <div className="reader-toolbar-main">
        <Link to={`/libros/${id}`} aria-label="Volver al detalle del libro"><i className="fas fa-arrow-left" /> <span>Volver</span></Link>
        <strong title={book?.titulo}>{book?.titulo || 'Cargando…'}</strong>
        <span className="reader-position">{positionLabel}</span>
      </div>
      <div className="reader-tools" role="toolbar" aria-label="Herramientas del lector">
        <div className="reader-tool-group" aria-label="Modo de visualización">
          <button type="button" className={viewMode === 'single' ? 'active' : ''} onClick={() => changeView('single')} aria-label="Ver una página" aria-pressed={viewMode === 'single'} title="Ver una página">
            <i className="fas fa-file" /><span>Una página</span>
          </button>
          <button type="button" className={viewMode === 'double' ? 'active' : ''} onClick={() => changeView('double')} aria-label="Ver dos páginas" aria-pressed={viewMode === 'double'} disabled={compact} title={compact ? 'Disponible en pantallas más amplias' : 'Ver dos páginas como un libro'}>
            <i className="fas fa-book-open" /><span>Dos páginas</span>
          </button>
        </div>
        <div className="reader-tool-group reader-zoom" aria-label="Controles de zoom">
          <button type="button" onClick={() => changeZoom(zoom - READER_ZOOM_STEP)} disabled={zoom <= 0.5} aria-label="Alejar" title="Alejar (−)"><i className="fas fa-magnifying-glass-minus" /></button>
          <button type="button" className="reader-zoom-value" onClick={() => changeZoom(1)} aria-label={`Restablecer zoom, actualmente ${Math.round(zoom * 100)} por ciento`} title="Restablecer zoom (0)">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => changeZoom(zoom + READER_ZOOM_STEP)} disabled={zoom >= 2} aria-label="Acercar" title="Acercar (+)"><i className="fas fa-magnifying-glass-plus" /></button>
        </div>
      </div>
    </header>

    <main className="reader-shell" ref={shell} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Document
        file={apiFileUrl(`/api/catalogo/${id}/visor`)}
        onLoadSuccess={({ numPages }) => {
          setPages(numPages);
          setPage((current) => normalizeReaderPage(current, numPages, viewMode));
        }}
        loading={<div className="page-loader" role="status"><span className="spinner-border text-light" /><span className="visually-hidden">Cargando libro digital</span></div>}
        error={<div className="alert alert-danger">No fue posible abrir el documento.</div>}
      >
        <div key={`${viewMode}-${page}-${turn.sequence}`} className={`reader-spread reader-turn-${turn.direction} ${displayedPages.length === 1 ? 'reader-spread-single' : ''}`}>
          {displayedPages.map((pageNumber, index) => <div key={pageNumber} className={`reader-sheet reader-sheet-${index === 0 ? 'left' : 'right'}`}>
            <Page pageNumber={pageNumber} width={pageWidth} renderAnnotationLayer={false} loading={null} />
          </div>)}
        </div>
      </Document>
    </main>

    <nav className="reader-controls" aria-label="Navegación del libro">
      <button type="button" disabled={!canGoBack} onClick={previous} aria-label="Página anterior" title="Página anterior (←)"><i className="fas fa-chevron-left" /></button>
      <span aria-live="polite">{displayedPages.length > 1 ? `${displayedPages[0]}–${displayedPages.at(-1)}` : page} / {pages || 1}</span>
      <button type="button" disabled={!canGoForward} onClick={next} aria-label="Página siguiente" title="Página siguiente (→)"><i className="fas fa-chevron-right" /></button>
    </nav>
  </div>;
}
