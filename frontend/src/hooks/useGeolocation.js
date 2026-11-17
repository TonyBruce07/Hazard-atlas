import { useCallback, useState } from 'react'

const IDLE = { status: 'idle', message: '' }

/**
 * Wraps navigator.geolocation with friendly states.
 * status: 'idle' | 'loading' | 'success' | 'error'
 */
export default function useGeolocation() {
  const [state, setState] = useState(IDLE)

  const locate = useCallback((onSuccess) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({
        status: 'error',
        message: "Your browser doesn't support location services. Please enter the street and city instead.",
      })
      return
    }

    setState({ status: 'loading', message: 'Requesting your location…' })

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onSuccess({
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        })
        const accuracy = coords.accuracy ? ` (accurate to about ${Math.round(coords.accuracy)} m)` : ''
        setState({
          status: 'success',
          message: `Coordinates added${accuracy}. Please still enter the street and city so the report is easy to find.`,
        })
      },
      (error) => {
        let message = "We couldn't get your location. Please enter the street and city instead."
        if (error.code === error.PERMISSION_DENIED) {
          message = window.isSecureContext
            ? 'Location permission was denied. You can allow it in your browser settings, or enter the street and city manually.'
            : 'Location is only available on secure (HTTPS) pages. Please enter the street and city manually.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Your location is currently unavailable. Please enter the street and city manually.'
        } else if (error.code === error.TIMEOUT) {
          message = 'Finding your location took too long. Try again, or enter the street and city manually.'
        }
        setState({ status: 'error', message })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  const reset = useCallback(() => setState(IDLE), [])

  return { ...state, locate, reset }
}
