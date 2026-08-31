export default function EmptyState({ icon = 'fa-book-open', title, text }) {
  return <div className="empty-state"><i className={`fas ${icon}`} /><h5>{title}</h5>{text && <p>{text}</p>}</div>;
}

