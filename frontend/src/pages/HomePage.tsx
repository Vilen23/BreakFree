import NavbarTop from '../components/NavbarTop'
import { HeroSection } from '../components/Hero'
import { AboutSection } from '../components/About'
import { OurServicesSection } from '../components/Services'
import { ContactUsSection } from '../components/ContactUs'
import { BreakFreeFooter } from '../components/Footer'

export default function HomePage() {
  return (
    <div>
      <NavbarTop />
      <HeroSection/>
      <AboutSection/> 
      <OurServicesSection/>
      <ContactUsSection/>
      <BreakFreeFooter/>
    </div>
  )
}
