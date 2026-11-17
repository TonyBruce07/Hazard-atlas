import { Routes, Route } from 'react-router-dom'
import { Camera, Map, LayoutDashboard, Compass } from 'lucide-react'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="report"
          element={
            <PlaceholderPage
              icon={Camera}
              title="Report a Hazard"
              description="The hazard reporting flow is coming soon. Citizens will be able to add a photo, pin a location and describe the problem."
            />
          }
        />
        <Route
          path="map"
          element={
            <PlaceholderPage
              icon={Map}
              title="Explore Map"
              description="The interactive hazard map is coming soon. You will be able to browse reports and hotspots across the city."
            />
          }
        />
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
