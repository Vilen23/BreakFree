import NavbarTop from '../components/NavbarTop'
import { HeroSection } from '../components/Hero'
import { AboutSection } from '../components/About'

export default function HomePage() {
  return (
    <div>
      <NavbarTop />
      <HeroSection/>
      <AboutSection/> 
    </div>
  )
}
