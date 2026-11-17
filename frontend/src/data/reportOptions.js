import { CircleDot, Layers, Disc, Construction, Footprints, Ellipsis } from 'lucide-react'

export const HAZARD_CATEGORIES = [
  { value: 'pothole', label: 'Pothole', icon: CircleDot },
  { value: 'damaged_surface', label: 'Damaged Road Surface', icon: Layers },
  { value: 'uncovered_manhole', label: 'Uncovered Manhole', icon: Disc },
  { value: 'road_obstruction', label: 'Road Obstruction', icon: Construction },
  { value: 'unsafe_crossing', label: 'Unsafe Crossing', icon: Footprints },
  { value: 'other', label: 'Other', icon: Ellipsis },
]

export const DESCRIPTION_LIMITS = { min: 10, max: 500 }

export const PHOTO_RULES = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
  accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
}

export const REPORT_TIPS = [
  'Say exactly where the hazard is: a landmark, junction or house number helps crews find it.',
  'Describe the size and the danger, for example "deep enough to damage a tyre".',
  'Add a clear, well-lit photo if you can. Try to avoid capturing faces or number plates.',
]
