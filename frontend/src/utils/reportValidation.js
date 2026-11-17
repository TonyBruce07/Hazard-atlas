import { HAZARD_CATEGORIES, DESCRIPTION_LIMITS, PHOTO_RULES } from '../data/reportOptions.js'

/** Order used to find the first invalid field for focus. */
export const FIELD_ORDER = ['category', 'description', 'street', 'city', 'latitude', 'longitude']

export const INITIAL_VALUES = {
  category: '',
  description: '',
  street: '',
  city: '',
  latitude: '',
  longitude: '',
}

const COORD_PATTERN = /^-?\d+(\.\d+)?$/
const COORD_LIMITS = { latitude: 90, longitude: 180 }

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Returns an error message for one field, or '' when valid. */
export function validateField(name, values) {
  const { min, max } = DESCRIPTION_LIMITS

  switch (name) {
    case 'category':
      return HAZARD_CATEGORIES.some((c) => c.value === values.category)
        ? ''
        : 'Please choose the type of hazard.'

    case 'description': {
      const text = values.description.trim()
      if (!text) return 'Please describe the hazard.'
      if (text.length < min) return `Please add a little more detail (at least ${min} characters).`
      if (values.description.length > max) return `Please keep the description under ${max} characters.`
      return ''
    }

    case 'street':
      return values.street.trim() ? '' : 'Enter the street or area name.'

    case 'city':
      return values.city.trim() ? '' : 'Enter the city.'

    case 'latitude':
    case 'longitude': {
      const raw = values[name].trim()
      const other = values[name === 'latitude' ? 'longitude' : 'latitude'].trim()
      if (!raw) return other ? `Enter the ${name} too, or clear both coordinates.` : ''
      if (!COORD_PATTERN.test(raw)) return 'Enter a number such as 12.9716.'
      const limit = COORD_LIMITS[name]
      if (Math.abs(Number(raw)) > limit) return `${name === 'latitude' ? 'Latitude' : 'Longitude'} must be between -${limit} and ${limit}.`
      return ''
    }

    default:
      return ''
  }
}

/** Validates every field. Returns an object of { fieldName: message } (empty when valid). */
export function validateReport(values) {
  const errors = {}
  FIELD_ORDER.forEach((name) => {
    const message = validateField(name, values)
    if (message) errors[name] = message
  })
  return errors
}

/** Returns an error message for a selected photo, or '' when valid. */
export function validatePhoto(file) {
  if (!file) return ''
  const extension = file.name.split('.').pop().toLowerCase()
  const typeKnown = Boolean(file.type)
  const typeAllowed = typeKnown
    ? PHOTO_RULES.mimeTypes.includes(file.type)
    : PHOTO_RULES.extensions.includes(extension)

  if (!typeAllowed) return 'Unsupported file type. Please choose a JPG, JPEG, PNG or WEBP image.'
  if (file.size === 0) return 'That file looks empty. Please choose a different photo.'
  if (file.size > PHOTO_RULES.maxBytes) {
    return `That photo is ${formatBytes(file.size)}. Please choose an image under ${formatBytes(PHOTO_RULES.maxBytes)}.`
  }
  return ''
}
