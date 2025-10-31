import axios from "axios"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function SignupPage() {
  const [firstname, setFirstName] = useState("")
  const [lastname, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [gender, setGender] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const handleSignup = async () => {
    try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/signup`, { firstname, lastname, email, gender, password })
        console.log("Signup data:", { firstname, lastname, email, gender, password })
        console.log(response)  
        navigate("/login")
    } catch (error) {
        console.log(error)
    }
  }

  return (
    <div className="min-h-screen flex-col max-w-7xl mx-auto bg-gray-50 flex justify-center pt-[8vh]">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Community</h1>
        <p className="text-gray-600">
          Create your account and start your secure journey with us.
        </p>
      </div>
      <div className="flex">
        {/* Left side - Signup Form */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md w-[400px]">
            {/* Signup Form */}
            <div className="space-y-6">
              {/* Name Fields Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

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
                  htmlFor="gender"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
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
                    placeholder="Enter your password"
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

              <button
                onClick={handleSignup}
                type="button"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium"
              >
                Create Account
              </button>

              <p className="text-sm text-gray-500 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Workspace Images */}
        <div className="flex-1 bg-white p-8">
          <div className="space-y-4 ml-auto">
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
            <div className="h-[186px] w-[520px] rounded-2xl overflow-hidden shadow-lg">
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