import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../lib/api"
import axios from "axios"
import { Link } from "react-router-dom"

export const LoginPage = () => {
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const handleLogin = async () => {
    try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { email, password })
        const token: string = response.data?.access_token
        if (token) {
          await signIn(token)
          // Fetch user to decide redirect based on information_stores
          const { data } = await api.get(`/auth/me`)
          const target = data?.information_stores ? "/journal" : "/onboarding"
          const from = (location.state as any)?.from?.pathname || target
          navigate(from, { replace: true })
        }
    } catch (error) {
      setError("Invalid email or password")
    }
  }

  return (
    <div className="min-h-screen flex-col max-w-7xl mx-auto bg-gray-50 flex justify-center pt-[8vh]">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-600">
          Your journey is private and secure with us.
        </p>
      </div>
      <div className="flex">
        {/* Left side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md w-[400px]">
            {/* Login Form */}
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              
              <button
                onClick={handleLogin}
                type="button"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium"
              >
                Login
              </button>
              <div className="pt-4 flex justify-between px-3">
                <p className="text-sm text-gray-600 text-center text-[14px]">
                  Don't have an account?
                </p>

                  <Link to="/signup" className="text-blue-600 text-[14px] hover:text-blue-700 font-medium">     
                    Create Account
                  </Link>
              </div>
              <p className="text-sm text-gray-500 text-center">
                We never share your data. Everything is encrypted and
                confidential.
              </p>

              
            </div>
          </div>
        </div>

        {/* Right side - Workspace Images */}
        <div className="flex-1 bg-white p-8">
          <div className="space-y-4  ml-auto">
            {/* Workspace 1 */}
            <div className="flex gap-4">
              <div className="h-[206px] w-[250px] rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="/Login1.jpeg"
                  alt="login1"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Workspace 2 */}
              <div className="h-[206px] w-[250px] rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="/Login2.jpeg"
                  alt="login2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Workspace 3 */}
            <div className="h-[156px] w-[520px] rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/Login3.jpeg"
              alt="login3"
              className="w-[520px] h-full object-cover"
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
