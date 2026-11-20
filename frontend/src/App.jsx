
import axios from 'axios'
import { Routes, Route } from 'react-router-dom'

import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Home from './pages/Home.jsx'
import ReportHazard from './pages/ReportHazard.jsx'
import TrackReport from './pages/TrackReport.jsx'
import HazardMap from './components/HazardMap.jsx'
import AuthorityDashboard from './pages/AuthorityDashboard.jsx'
import Login from './pages/Login.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import { Compass } from 'lucide-react'

// Attach the current authority token to API requests.
axios.interceptors.request.use(config => {
  const token = sessionStorage.getItem('hazardatlas_token')

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// If an authority session expires, return to login.
axios.interceptors.response.use(
  response => response,
  error => {
    const url = error.config?.url || ''

    if (
      error.response?.status === 401 &&
      url.includes('/api/authority/')
    ) {
      sessionStorage.removeItem('hazardatlas_token')

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="report" element={<ReportHazard />} />
        <Route path="track" element={<TrackReport />} />
        <Route path="map" element={<HazardMap />} />
        <Route path="login" element={<Login />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <AuthorityDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <PlaceholderPage
              icon={Compass}
              title="Page not found"
              description="We couldn't find the page you were looking for."
              badge="404"
            />
          }
        />
      </Route>
    </Routes>
  )
}
