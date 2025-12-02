import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HeroSection } from '../components/Hero'
import { AboutSection } from '../components/About'
import { OurServicesSection } from '../components/Services'
import { ContactUsSection } from '../components/ContactUs'
import { BreakFreeFooter } from '../components/Footer'

export default function HomePage() {
  const location = useLocation()

  useEffect(() => {
    // Handle hash scrolling when component mounts or hash changes
    if (location.hash) {
      const hash = location.hash.substring(1) // Remove the # symbol
      const element = document.getElementById(hash)
      if (element) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - 80 // 8vh navbar offset
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }, 100)
      }
    }
  }, [location.hash])

  return (
    <div className="pt-[8vh]">
      <HeroSection/>
      <AboutSection/> 
      <OurServicesSection/>
      <ContactUsSection/>
      <BreakFreeFooter/>
    </div>
  )
}
