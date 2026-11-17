import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { FieldError } from '../ui/FormField.jsx'
import { PHOTO_RULES } from '../../data/reportOptions.js'
import { formatBytes } from '../../utils/reportValidation.js'

/** Optional photo picker with drag-and-drop, preview and remove. Validation happens in the parent. */
export default function PhotoUpload({ file, error, onSelect, onRemove }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  // Create / clean up the object URL used for the preview
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (files) => {
    const selected = files && files[0]
    if (selected) onSelect(selected)
  }

  const openPicker = () => inputRef.current?.click()

  const describedBy = ['photo-hint', error ? 'photo-error' : null].filter(Boolean).join(' ')

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept={PHOTO_RULES.accept}
        hidden
        tabIndex={-1}
        data-testid="photo-input"
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = '' // allow re-selecting the same file after removing it
        }}
      />

      {file && preview ? (
        <div className="photo-preview">
          <img src={preview} alt="Preview of the selected hazard photo" className="photo-preview__img" />
          <div className="photo-preview__info">
            <p className="photo-preview__name">{file.name}</p>
            <p className="photo-preview__meta">{formatBytes(file.size)}</p>
            <div className="photo-preview__actions">
              <Button variant="outline" size="sm" onClick={openPicker}>Change photo</Button>
              <Button variant="outline" size="sm" icon={Trash2} iconPosition="start" onClick={onRemove}>
                Remove photo
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone${dragging ? ' is-dragging' : ''}${error ? ' has-error' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files) }}
        >
          <span className="dropzone__icon"><ImagePlus size={26} aria-hidden="true" /></span>
          <p className="dropzone__text">Drag a photo here, or</p>
          <Button variant="outline" size="sm" onClick={openPicker} aria-describedby={describedBy}>
            Choose photo
          </Button>
        </div>
      )}

      <p id="photo-hint" className="field__hint photo-hint">JPG, JPEG, PNG or WEBP · up to 5 MB</p>
      <FieldError id="photo-error" message={error} />
    </div>
  )
}
