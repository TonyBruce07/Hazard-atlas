import HazardMap from './components/HazardMap.jsx'
import { Routes, Route } from 'react-router-dom'
import { Map, LayoutDashboard, Compass } from 'lucide-react'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import ReportHazard from './pages/ReportHazard.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="report" element={<ReportHazard />} />
        <Route path="map" element={<HazardMap />} />
        <Route
          path="dashboard"
          element={
            <PlaceholderPage
              icon={LayoutDashboard}
              title="Authority Dashboard"
              description="The authority dashboard is coming soon. Municipal teams will see ranked priorities, recurring hazards and repair status."
            />
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
