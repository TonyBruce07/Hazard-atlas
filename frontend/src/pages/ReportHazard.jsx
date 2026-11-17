import PageHeader from '../components/ui/PageHeader.jsx'
import ReportForm from '../components/report/ReportForm.jsx'
import ReportAside from '../components/report/ReportAside.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function ReportHazard() {
  usePageTitle('Report a Hazard')
  return (
    <>
      <PageHeader
        eyebrow="Citizen report"
        title="Report a road hazard"
        description="Tell us what you've spotted and where. Clear reports help the right teams find and fix hazards sooner."
      />
      <section className="report">
        <div className="container report__grid">
          <div className="report-card">
            <ReportForm />
          </div>
          <ReportAside />
        </div>
      </section>
    </>
  )
}
