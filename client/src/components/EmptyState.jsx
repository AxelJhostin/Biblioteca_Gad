export default function EmptyState({ icon = 'fa-book-open', title, text, action }) {
  return <div className="empty-state"><i className={`fas ${icon}`} /><h5>{title}</h5>{text && <p>{text}</p>}{action}</div>;
}
