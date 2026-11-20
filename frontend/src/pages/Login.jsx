
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle.js'
import './Login.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

export default function Login() {
  usePageTitle('Authority Login')

  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { username, password },
        { timeout: 15000 }
      )

      sessionStorage.setItem(
        'hazardatlas_token',
        response.data.access_token
      )

      const destination =
        location.state?.from?.pathname || '/dashboard'

      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Login failed. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-icon">
          <ShieldCheck size={30} />
        </div>

        <span className="login-eyebrow">
          HAZARDATLAS • SECURE ACCESS
        </span>

        <h1>Authority sign in</h1>

        <p>
          Sign in with your authorized account to manage
          road safety reports and cases.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="authority-username">Username</label>
          <input
            id="authority-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={event => setUsername(event.target.value)}
            required
          />

          <label htmlFor="authority-password">Password</label>
          <input
            id="authority-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in securely'}
          </button>
        </form>

        <small>Authorized personnel only</small>
      </section>
    </main>
  )
}
