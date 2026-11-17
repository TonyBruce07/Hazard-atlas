/** Navy page banner reused by inner pages. */
export default function PageHeader({ eyebrow, title, description }) {
  return (
    <section className="page-header">
      <div className="container page-header__inner">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header__desc">{description}</p>}
      </div>
    </section>
  )
}
