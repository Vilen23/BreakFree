
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavbarTop() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/')
  }

  const handleNavClick = (anchor: string) => {
    if (window.location.pathname !== '/') {
      // Navigate to home page with hash
      navigate(`/#${anchor}`)
    } else {
      // Already on home page, update hash and scroll
      window.location.hash = anchor
      const element = document.getElementById(anchor)
      if (element) {
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - 80 // 8vh navbar offset
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
  }
  return (
    <nav className="bg-[#171717] w-full h-[8vh] px-6 py-4 flex items-center justify-between fixed top-0 left-0 z-[60] transition-opacity duration-300">
      <div>
        <Link to="/">
          <img src="/nobg.png" alt="logo" className="h-10 cursor-pointer" />
        </Link>
      </div>
      <div>
        <ul className="flex items-center gap-8 text-[14px] text-white">
          <li>
            <Link to="/" className="relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </li>
          <li>
            <button onClick={() => handleNavClick('about')} className="relative group cursor-pointer">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
          </li>
          <li>
            <button onClick={() => handleNavClick('services')} className="relative group cursor-pointer">
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
          </li>
          <li>
            <button onClick={() => handleNavClick('contact')} className="relative group cursor-pointer">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
          </li>
          {user ? (
            <>
              <li>
                <Link to="/journal" className="relative group">
                  Journal
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              {user.information_stores && (
                <li>
                  <Link to="/daily-tasks" className="relative group">
                    Daily Tasks
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </li>
              )}
              <li>
                <button onClick={handleLogout} className="relative cursor-pointer group">
                  Logout
                  <span className="absolute  -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" className="relative group">
                Login
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}
