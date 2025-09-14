
export default function NavbarTop() {
  return (
    <nav className="bg-[#171717] w-full h-[8vh] px-6 py-4 flex items-center justify-between">
      <div>
        <img src="/nobg.png" alt="logo" className="h-10 cursor-pointer" />
      </div>
      <div>
        <ul className="flex items-center gap-5 text-white">
          <li>
            <a href="#" className="relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#" className="relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#" className="relative group">
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#" className="relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}
