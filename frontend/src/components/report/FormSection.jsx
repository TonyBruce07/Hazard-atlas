/**
 * Numbered section. The wrapper carries the divider and spacing; the inner <fieldset>
 * (with its <legend>) stays unstyled so the legend renders as a normal heading.
 */
export default function FormSection({ number, title, optional, description, children }) {
  return (
    <section className="form-section">
      <fieldset className="form-section__fieldset">
        <legend className="form-section__title">
          <span className="form-section__number" aria-hidden="true">{number}</span>
          {title}
          {optional && <span className="field__optional">Optional</span>}
        </legend>
        {description && <p className="form-section__desc">{description}</p>}
        {children}
      </fieldset>
    </section>
  )
}
