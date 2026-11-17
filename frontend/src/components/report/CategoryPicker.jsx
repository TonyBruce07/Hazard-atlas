import { HAZARD_CATEGORIES } from '../../data/reportOptions.js'
import { FieldError } from '../ui/FormField.jsx'

/** Radio-card group. Native radios give arrow-key navigation and screen-reader support. */
export default function CategoryPicker({ value, error, onChange }) {
  return (
    <div role="radiogroup" aria-label="Hazard category" aria-required="true" aria-describedby={error ? 'category-error' : undefined}>
      <div className="category-grid">
        {HAZARD_CATEGORIES.map(({ value: optionValue, label, icon: Icon }) => (
          <label key={optionValue} className="category">
            <input
              type="radio"
              name="category"
              id={`category-${optionValue}`}
              value={optionValue}
              checked={value === optionValue}
              onChange={(e) => onChange('category', e.target.value)}
              aria-invalid={error ? 'true' : undefined}
            />
            <span className="category__card">
              <span className="category__icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="category__label">{label}</span>
            </span>
          </label>
        ))}
      </div>
      <FieldError id="category-error" message={error} />
    </div>
  )
}
