import { LocateFixed, Loader, CircleCheck, CircleAlert } from 'lucide-react'
import Button from '../ui/Button.jsx'
import FormField from '../ui/FormField.jsx'

export default function LocationFields({ values, errors, onChange, onBlur, geo, onLocate }) {
  const loading = geo.status === 'loading'

  return (
    <div className="location">
      <div className="form-row">
        <FormField id="street" label="Street or area name" required error={errors.street}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="text"
              name="street"
              autoComplete="street-address"
              placeholder="e.g. Station Road, near the post office"
              value={values.street}
              onChange={(e) => onChange('street', e.target.value)}
              onBlur={() => onBlur('street')}
            />
          )}
        </FormField>

        <FormField id="city" label="City" required error={errors.city}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="text"
              name="city"
              autoComplete="address-level2"
              placeholder="e.g. Your city"
              value={values.city}
              onChange={(e) => onChange('city', e.target.value)}
              onBlur={() => onBlur('city')}
            />
          )}
        </FormField>
      </div>

      <div className="geo">
        <div className="geo__head">
          <div>
            <h3 className="geo__title">Exact coordinates <span className="field__optional">Optional</span></h3>
            <p className="field__hint">Helps crews pinpoint the hazard. You can submit without them.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={loading ? Loader : LocateFixed}
            iconPosition="start"
            className={loading ? 'is-loading' : ''}
            onClick={onLocate}
            disabled={loading}
            aria-describedby="geo-status"
          >
            {loading ? 'Locating…' : 'Use My Current Location'}
          </Button>
        </div>

        <p
          id="geo-status"
          className={`geo__status geo__status--${geo.status}`}
          role="status"
          aria-live="polite"
        >
          {geo.status === 'success' && <CircleCheck size={16} aria-hidden="true" />}
          {geo.status === 'error' && <CircleAlert size={16} aria-hidden="true" />}
          {geo.message}
        </p>

        <div className="form-row">
          <FormField id="latitude" label="Latitude" error={errors.latitude}>
            {(props) => (
              <input
                {...props}
                className="input"
                type="text"
                inputMode="decimal"
                name="latitude"
                placeholder="e.g. 12.9716"
                value={values.latitude}
                onChange={(e) => onChange('latitude', e.target.value)}
                onBlur={() => onBlur('latitude')}
              />
            )}
          </FormField>

          <FormField id="longitude" label="Longitude" error={errors.longitude}>
            {(props) => (
              <input
                {...props}
                className="input"
                type="text"
                inputMode="decimal"
                name="longitude"
                placeholder="e.g. 77.5946"
                value={values.longitude}
                onChange={(e) => onChange('longitude', e.target.value)}
                onBlur={() => onBlur('longitude')}
              />
            )}
          </FormField>
        </div>
      </div>
    </div>
  )
}
