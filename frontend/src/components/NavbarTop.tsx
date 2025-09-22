
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavbarTop() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut()
    navigate('/')
  }
  return (
    <nav className="bg-[#171717] w-full h-[8vh] px-6 py-4 flex items-center justify-between fixed top-0 left-0 z-50">
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
            <a href="#about" className="relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#services" className="relative group">
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#contact" className="relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          {user ? (
            <>
              <li>
                <Link to="/journal" className="relative group">
                  Journal
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="relative group">
                  Logout
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
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
