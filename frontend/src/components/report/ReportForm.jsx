import { useState } from 'react'
import { Send, Loader, Info, CircleAlert, RotateCcw } from 'lucide-react'
import Button from '../ui/Button.jsx'
import FormField from '../ui/FormField.jsx'
import FormSection from './FormSection.jsx'
import CategoryPicker from './CategoryPicker.jsx'
import LocationFields from './LocationFields.jsx'
import PhotoUpload from './PhotoUpload.jsx'
import ReportSuccess from './ReportSuccess.jsx'
import useGeolocation from '../../hooks/useGeolocation.js'
import { submitHazardReport, ReportSubmissionError } from '../../services/reportService.js'
import { DESCRIPTION_LIMITS } from '../../data/reportOptions.js'
import {
  FIELD_ORDER,
  INITIAL_VALUES,
  validateField,
  validateReport,
  validatePhoto,
} from '../../utils/reportValidation.js'

const NO_PHOTO = { file: null, error: '' }

export default function ReportForm() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [photo, setPhoto] = useState(NO_PHOTO)
  const [attempted, setAttempted] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success'
  const [submitError, setSubmitError] = useState('')
  const [submission, setSubmission] = useState(null) // the API's 201 response
  const geo = useGeolocation()

  const submitting = status === 'submitting'
  const { max } = DESCRIPTION_LIMITS

  /* ---------- field updates ---------- */
  const handleChange = (name, value) => {
    const next = { ...values, [name]: value }
    setValues(next)
    // Re-check fields that are currently showing an error so messages clear as soon as they're fixed
    setErrors((prev) => {
      const flagged = Object.keys(prev)
      if (!flagged.length) return prev
      const updated = { ...prev }
      flagged.forEach((key) => {
        const message = validateField(key, next)
        if (message) updated[key] = message
        else delete updated[key]
      })
      return updated
    })
  }

  const handleBlur = (name) => {
    setErrors((prev) => {
      const message = validateField(name, values)
      const updated = { ...prev }
      if (message) updated[name] = message
      else delete updated[name]
      return updated
    })
  }

  const handleLocate = () => {
    geo.locate((coords) => {
      setValues((prev) => ({ ...prev, ...coords }))
      setErrors((prev) => {
        const { latitude, longitude, ...rest } = prev
        return rest
      })
    })
  }

  /* ---------- photo ---------- */
  const handlePhotoSelect = (file) => {
    const error = validatePhoto(file)
    setPhoto(error ? { file: null, error } : { file, error: '' })
  }

  /* ---------- submit / reset ---------- */
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    setAttempted(true)
    const found = validateReport(values)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      const firstInvalid = FIELD_ORDER.find((name) => found[name])
      requestAnimationFrame(() => {
        document.querySelector(`[name="${firstInvalid}"]`)?.focus()
      })
      return
    }

    const report = {
      category: values.category,
      description: values.description.trim(),
      street: values.street.trim(),
      city: values.city.trim(),
      latitude: values.latitude.trim() ? Number(values.latitude) : null,
      longitude: values.longitude.trim() ? Number(values.longitude) : null,
      photo: photo.file,
    }

    setStatus('submitting')
    setSubmitError('')
    // Clear a previous server-side photo complaint; client-side photo errors have no file attached
    setPhoto((prev) => (prev.file ? { ...prev, error: '' } : prev))

    try {
      const created = await submitHazardReport(report)
      setSubmission(created)
      setStatus('success')
    } catch (error) {
      // Everything the user typed stays in state; only the messages change.
      const failure =
        error instanceof ReportSubmissionError
          ? error
          : new ReportSubmissionError('Something unexpected happened. Please try again.')

      setSubmitError(failure.message)
      if (failure.photoError) setPhoto((prev) => ({ ...prev, error: failure.photoError }))

      const serverFieldErrors = failure.fieldErrors
      if (Object.keys(serverFieldErrors).length > 0) {
        setErrors(serverFieldErrors)
        const firstInvalid = FIELD_ORDER.find((name) => serverFieldErrors[name])
        requestAnimationFrame(() => {
          document.querySelector(`[name="${firstInvalid}"]`)?.focus()
        })
      }
      setStatus('idle')
    }
  }

  const handleReset = () => {
    setValues(INITIAL_VALUES)
    setErrors({})
    setPhoto(NO_PHOTO)
    setAttempted(false)
    setSubmitError('')
    setSubmission(null)
    setStatus('idle')
    geo.reset()
    window.scrollTo({ top: 0 })
  }

  if (status === 'success' && submission) {
    return <ReportSuccess result={submission} onReset={handleReset} />
  }

  const length = values.description.length
  const hasErrors = Object.keys(errors).length > 0

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="alert alert--info" role="note">
        <Info size={20} className="alert__icon" aria-hidden="true" />
        <p>
          Your report is saved to the local HazardAtlas system. It is not sent to a municipality or
          authority yet.
        </p>
      </div>

      <p className="form-note"><span aria-hidden="true">*</span> Required field</p>

      {/* The outer fieldset locks every control while a submission is processing */}
      <fieldset className="form-body" disabled={submitting}>
        <FormSection number="1" title="What kind of hazard is it?" description="Choose the closest match.">
          <CategoryPicker value={values.category} error={errors.category} onChange={handleChange} />
        </FormSection>

        <FormSection number="2" title="Describe the hazard">
          <FormField
            id="description"
            label="Description"
            required
            hint="What is it, exactly where is it, and why is it dangerous?"
            error={errors.description}
          >
            {(props) => (
              <>
                <textarea
                  {...props}
                  aria-describedby={`${props['aria-describedby'] ?? ''} description-counter`.trim()}
                  className="textarea"
                  name="description"
                  rows={5}
                  maxLength={max}
                  placeholder="e.g. A deep pothole in the left lane, close to the junction. Two-wheelers swerve to avoid it."
                  value={values.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  onBlur={() => handleBlur('description')}
                />
                <p
                  id="description-counter"
                  className={`counter${length >= max * 0.9 ? ' is-near' : ''}`}
                >
                  {length} / {max} characters
                </p>
              </>
            )}
          </FormField>
        </FormSection>

        <FormSection number="3" title="Where is it?" description="A street and city are enough. Coordinates are a bonus.">
          <LocationFields
            values={values}
            errors={errors}
            onChange={handleChange}
            onBlur={handleBlur}
            geo={geo}
            onLocate={handleLocate}
          />
        </FormSection>

        <FormSection number="4" title="Add a photo" optional description="A clear photo helps crews understand the problem.">
          <PhotoUpload
            file={photo.file}
            error={photo.error}
            onSelect={handlePhotoSelect}
            onRemove={() => setPhoto(NO_PHOTO)}
          />
        </FormSection>

        {attempted && hasErrors && !submitError && (
          <div className="alert alert--error" role="alert">
            <CircleAlert size={20} className="alert__icon" aria-hidden="true" />
            <p>Please fix the highlighted fields before submitting.</p>
          </div>
        )}
        {submitError && (
          <div className="alert alert--error" role="alert">
            <CircleAlert size={20} className="alert__icon" aria-hidden="true" />
            <p>{submitError}</p>
          </div>
        )}

        <div className="form-actions">
          <Button
            type="submit"
            variant="primary"
            icon={submitting ? Loader : Send}
            iconPosition="start"
            className={submitting ? 'is-loading' : ''}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
          <Button variant="outline" icon={RotateCcw} iconPosition="start" onClick={handleReset}>
            Clear form
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
