import Hero from '../components/home/Hero.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import Features from '../components/home/Features.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Home() {
  usePageTitle()
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
    </>
  )
}
