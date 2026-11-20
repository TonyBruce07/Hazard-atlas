/**
 * Report submission service: talks to the HazardAtlas FastAPI backend.
 *
 * POST {API_BASE_URL}/api/reports   (multipart/form-data)
 *   hazard_type, description, street, city      required
 *   latitude, longitude                         optional, always sent together or not at all
 *   photo                                       optional file
 *
 * The backend URL defaults to http://127.0.0.1:8000. Override it with VITE_API_BASE_URL
 * (for example in frontend/.env).
 */
import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const REPORTS_PATH = '/api/reports'
const REQUEST_TIMEOUT_MS = 30000

const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS })

/**
 * @typedef {Object} HazardReport  What the form hands to submitHazardReport()
 * @property {string} category            Hazard type value (sent to the API as `hazard_type`)
 * @property {string} description
 * @property {string} street
 * @property {string} city
 * @property {number|string|null} latitude
 * @property {number|string|null} longitude
 * @property {string} reportedSeverity
 * @property {File|null} photo
 */

/**
 * @typedef {Object} SubmittedReport  The API's 201 response
 * @property {number} id
 * @property {number|null} hazard_id
 * @property {string} description
 * @property {string|null} photo_path
 * @property {string} created_at
 * @property {{id:number, hazard_type:string, latitude:number|null, longitude:number|null,
 *             address:string, city:string, status:string, created_at:string}|null} hazard
 */

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

function toCoordinate(value) {
  if (value === null || value === undefined) return null

  const trimmed = String(value).trim()

  if (!trimmed) return null

  const number = Number(trimmed)

  return Number.isFinite(number) ? number : null
}

/** Maps the form's report object onto the backend's exact multipart field names. */
export function buildReportFormData(report) {
  const formData = new FormData()
  formData.append('hazard_type', report.category) // frontend "category" -> backend "hazard_type"
  formData.append('description', report.description)
  formData.append('street', report.street)
  formData.append('city', report.city)
  const severity = String(report.reportedSeverity || 'medium')
  .trim()
  .toLowerCase()

formData.append('reported_severity', severity)
  // Coordinates are both sent or both omitted; the backend rejects a lone value.
  const latitude = toCoordinate(report.latitude)
  const longitude = toCoordinate(report.longitude)
  if (latitude !== null && longitude !== null) {
    formData.append('latitude', String(latitude))
    formData.append('longitude', String(longitude))
  }

  if (report.photo) formData.append('photo', report.photo)
  return formData
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Friendly, UI-ready failure.
 *  kind: 'validation' | 'photo-too-large' | 'photo-type' | 'photo-invalid' | 'network' | 'timeout' | 'server' | 'unknown'
 *  fieldErrors: messages keyed by the FORM's field names (category, description, street, city, latitude, longitude)
 *  photoError: message for the photo section, or ''
 */
export class ReportSubmissionError extends Error {
  constructor(message, { kind = 'unknown', status = null, fieldErrors = {}, photoError = '' } = {}) {
    super(message)
    this.name = 'ReportSubmissionError'
    this.kind = kind
    this.status = status
    this.fieldErrors = fieldErrors
    this.photoError = photoError
  }
}

const FIELD_MAP = {
  hazard_type: 'category',
  description: 'description',
  street: 'street',
  city: 'city',
  latitude: 'latitude',
  longitude: 'longitude',
}

const FIELD_MESSAGES = {
  category: 'Please choose a valid type of hazard.',
  description: 'The description must be between 10 and 500 characters.',
  street: 'Please check the street or area name (up to 200 characters).',
  city: 'Please check the city name (up to 100 characters).',
  latitude: 'Please enter a valid latitude, together with a longitude.',
  longitude: 'Please enter a valid longitude, together with a latitude.',
}

const MESSAGES = {
  validation: 'Some details need another look. Please check the highlighted fields and try again.',
  validationUnknown: "The server couldn't accept the report. Please review your details and try again.",
  photoTooLarge: "Your report wasn't submitted because the photo is too large.",
  photoType: "Your report wasn't submitted because the photo isn't a supported image.",
  photoInvalid: "Your report wasn't submitted because there is a problem with the photo.",
  network:
    "We couldn't reach the HazardAtlas server. Please check your connection (or that the backend is running) and try again. Your details are still here.",
  timeout: 'The server took too long to respond. Please try again. Your details are still here.',
  server: 'Something went wrong on our side. Please try again in a moment. Your details are still here.',
  unknown: 'Something unexpected happened. Please try again. Your details are still here.',
}

/** Turns FastAPI's 422 `detail` into { fieldErrors, photoError }. */
function parseValidationDetail(detail) {
  const fieldErrors = {}
  let photoError = ''

  if (typeof detail === 'string') {
    // The backend answers 422 with a plain message when the uploaded photo is empty
    return { fieldErrors, photoError: 'That photo appears to be empty. Please choose a different image.' }
  }

  if (Array.isArray(detail)) {
    detail.forEach((item) => {
      const loc = Array.isArray(item?.loc) ? item.loc : []
      const backendField = loc.length > 1 ? String(loc[loc.length - 1]) : null

      if (backendField === 'photo') {
        photoError = 'There is a problem with the selected photo. Please choose a different image.'
      } else if (backendField && FIELD_MAP[backendField]) {
        const formField = FIELD_MAP[backendField]
        fieldErrors[formField] = FIELD_MESSAGES[formField]
      } else if (loc.length <= 1) {
        // Model-level error (latitude/longitude must come as a pair)
        fieldErrors.latitude = FIELD_MESSAGES.latitude
        fieldErrors.longitude = FIELD_MESSAGES.longitude
      }
    })
  }
  return { fieldErrors, photoError }
}

/** Converts anything thrown by Axios into a ReportSubmissionError. */
export function toSubmissionError(error) {
  if (error instanceof ReportSubmissionError) return error

  if (axios.isAxiosError(error)) {
    const response = error.response

    if (!response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ReportSubmissionError(timedOut ? MESSAGES.timeout : MESSAGES.network, {
        kind: timedOut ? 'timeout' : 'network',
      })
    }

    const { status, data } = response

    if (status === 413) {
      return new ReportSubmissionError(MESSAGES.photoTooLarge, {
        kind: 'photo-too-large',
        status,
        photoError: 'That photo is too large. Please choose an image under 5 MB.',
      })
    }
    if (status === 415) {
      return new ReportSubmissionError(MESSAGES.photoType, {
        kind: 'photo-type',
        status,
        photoError: "That file isn't a valid JPG, JPEG, PNG or WEBP image. Please choose a different photo.",
      })
    }
    if (status === 422) {
      const { fieldErrors, photoError } = parseValidationDetail(data?.detail)
      if (photoError && !Object.keys(fieldErrors).length) {
        return new ReportSubmissionError(MESSAGES.photoInvalid, { kind: 'photo-invalid', status, photoError })
      }
      const hasFieldErrors = Object.keys(fieldErrors).length > 0
      return new ReportSubmissionError(hasFieldErrors ? MESSAGES.validation : MESSAGES.validationUnknown, {
        kind: 'validation',
        status,
        fieldErrors,
        photoError,
      })
    }
    if (status >= 500) {
      return new ReportSubmissionError(MESSAGES.server, { kind: 'server', status })
    }
    return new ReportSubmissionError(MESSAGES.unknown, { kind: 'unknown', status })
  }

  return new ReportSubmissionError(MESSAGES.unknown, { kind: 'unknown' })
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Submits a report. Resolves with the created report (HTTP 201) or rejects with a ReportSubmissionError.
 *
 * No Content-Type header is set on purpose: Axios/the browser must generate
 * "multipart/form-data; boundary=..." themselves for FormData bodies.
 *
 * @param {HazardReport} report
 * @returns {Promise<SubmittedReport>}
 */
export async function submitHazardReport(report) {
  let data
  try {
    ;({ data } = await api.post(REPORTS_PATH, buildReportFormData(report)))
  } catch (error) {
    throw toSubmissionError(error)
  }

  if (!data || typeof data.id !== 'number') {
    // A 2xx answer that doesn't look like a HazardAtlas report (wrong server on that port?)
    throw new ReportSubmissionError(MESSAGES.unknown, { kind: 'unknown' })
  }
  return data
}
/**
 * Look up a citizen report using its tracking code.
 */
export async function trackHazardReport(trackingCode) {
  try {
    const { data } = await api.get(
      `${REPORTS_PATH}/track/${encodeURIComponent(
        trackingCode.trim().toUpperCase()
      )}`
    )

    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(
          'No report was found. Please check your tracking code.'
        )
      }

      if (!error.response) {
        throw new Error(
          'Could not connect to HazardAtlas. Please try again.'
        )
      }
    }

    throw new Error('Unable to retrieve this report. Please try again.')
  }
}