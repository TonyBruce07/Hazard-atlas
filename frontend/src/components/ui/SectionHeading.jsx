export default function SectionHeading({ id, eyebrow, title, description }) {
  return (
    <div className="section-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {description && <p className="section-heading__desc">{description}</p>}
    </div>
  )
}
