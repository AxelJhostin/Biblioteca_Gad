export default function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <div className="page-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
      <div><h3 className="page-title mb-1"><i className={`fas ${icon} me-2 text-success`} />{title}</h3>{subtitle && <p className="text-muted mb-0">{subtitle}</p>}</div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

