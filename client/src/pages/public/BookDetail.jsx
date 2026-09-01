import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api, { apiFileUrl } from '../../api.js';
import { useRequest } from '../../state/RequestContext.jsx';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const { add } = useRequest();
  useEffect(() => { api.get(`/catalogo/${id}`).then(({ data }) => setBook(data.item)); }, [id]);
  if (!book) return <div className="page-loader"><span className="spinner-border text-success" /></div>;
  const request = () => { add(book); Swal.fire({ icon: 'success', title: 'Añadido', text: 'El libro está listo en tu solicitud.', confirmButtonColor: '#F2705B' }); };
  return <div className="container py-5 detail-page">
    <Link to="/" className="back-link"><i className="fas fa-arrow-left me-2" />Volver al catálogo</Link>
    <div className="detail-card mt-3">
      <div className="detail-cover">{book.tiene_portada ? <img src={apiFileUrl(`/api/catalogo/${book.id}/portada`)} alt={`Portada de ${book.titulo}`} /> : <div className="cover-placeholder large"><i className="fas fa-book" /><span>Biblioteca Municipal</span></div>}</div>
      <div className="detail-info">
        <span className="eyebrow">{book.tipo_material_otro || book.tipo_material} · {book.genero_otro || book.genero}</span>
        <h1>{book.titulo}</h1>
        <p className="detail-authors">Por {book.autores.map((author) => author.nombre_completo).join(', ')}</p>
        <p className="detail-description">{book.descripcion || 'Esta obra aún no tiene una descripción registrada.'}</p>
        <dl className="book-facts"><div><dt>ID Libro</dt><dd>{book.id_libro_texto}</dd></div><div><dt>Año</dt><dd>{book.anio_publicacion || 'No registrado'}</dd></div><div><dt>Existencias</dt><dd>{book.cantidad_total}</dd></div><div><dt>Disponibles</dt><dd>{book.cantidad_disponible}</dd></div></dl>
        <div className="d-flex flex-wrap gap-2 mt-4">
          <button className="btn btn-primary btn-lg" disabled={Number(book.cantidad_disponible) === 0} onClick={request}><i className="fas fa-hand-holding me-2" />Solicitar préstamo</button>
          {book.digital_disponible && <Link className="btn btn-success btn-lg" to={`/libros/${book.id}/leer`}><i className="fas fa-book-open me-2" />Leer en línea</Link>}
        </div>
      </div>
    </div>
  </div>;
}
