import { CircleAlert } from 'lucide-react'

export function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="field__error" role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

/**
 * Label + hint + error wrapper. `children` is a function that receives the props the
 * control needs (id, aria-describedby, aria-invalid, aria-required):
 *
 *   <FormField id="city" label="City" required error={errors.city}>
 *     {(props) => <input className="input" {...props} />}
 *   </FormField>
 */
export default function FormField({ id, label, required, optional, hint, error, className = '', children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__req" aria-hidden="true">*</span>}
        {optional && <span className="field__optional">Optional</span>}
      </label>
      {hint && <p id={hintId} className="field__hint">{hint}</p>}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
      })}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
