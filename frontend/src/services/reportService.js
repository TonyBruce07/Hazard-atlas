/**
 * Report submission service.
 *
 * ⚠️ DEMO ONLY: there is no backend yet. This function simulates network latency and
 * returns a fake reference. Nothing is stored or sent anywhere.
 *
 * Connecting the real API later only requires replacing the body of
 * `submitHazardReport`; the form already passes it the final payload and
 * handles resolved / rejected promises.
 *
 *   npm install axios
 *
 *   import axios from 'axios'
 *   const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })
 *
 *   export async function submitHazardReport(report) {
 *     // Let the browser set the multipart Content-Type (with boundary) itself.
 *     const { data } = await api.post('/api/reports', buildReportFormData(report))
 *     return data // e.g. { referenceId, status }
 *   }
 */

const DEMO_DELAY_MS = 1200

/**
 * @typedef {Object} HazardReport
 * @property {string} category            One of the values in HAZARD_CATEGORIES
 * @property {string} description
 * @property {string} street
 * @property {string} city
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {File|null} photo
 */

/** Builds multipart form data for a future API call. Not used by the demo. */
export function buildReportFormData(report) {
  const formData = new FormData()
  Object.entries(report).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    formData.append(key, value)
  })
  return formData
}

/**
 * @param {HazardReport} report
 * @returns {Promise<{ demo: boolean, referenceId: string, receivedAt: string }>}
 */
export async function submitHazardReport(report) {
  void report // The demo does not use the payload; a real implementation will.
  await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS))
  return {
    demo: true,
    referenceId: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
  }
}
