import { useNavigate } from "react-router-dom"

export const HeroSection = () => {
  const navigate = useNavigate()
    return (
    <div className="min-h-[92vh] bg-gradient-to-br from-sky-50 to-emerald-50 flex items-center justify-center">
      <div className="px-8 py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-5xl font-[800] text-gray-800 leading-tight">
              Heal with AI-Powered
              <br />
              <span className="text-gray-700">Emotional Support</span>
            </h1>

            <p className="text-[18px] text-gray-600 leading-relaxed max-w-md">
              BreakFree AI helps you journal, track emotions, and stay on the
              path to recovery with personalized daily plans and relapse alerts.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate("/journal")} className="bg-blue-500 hover:bg-blue-600 cursor-pointer text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                Start Journaling
              </button>
              <button className="border-2 border-blue-500 text-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white px-8 py-3 rounded-full font-semibold transition-all duration-300">
                View Progress
              </button>
            </div>

            {/* Statistics */}
            <div className="flex gap-8 ">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">92%</div>
                <div className="text-sm text-gray-600">Recovery Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  15
                </div>
                <div className="text-sm text-gray-600">Lives Helped</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  24/7
                </div>
                <div className="text-sm text-gray-600">AI Support</div>
              </div>
            </div>
          </div>

          {/* Right Image Section */}
          <div className="relative">
            {/* Main Image Container */}
            <div className="relative rounded-3xl shadow-2xl">
              <img
                src="/HeroMainLand.jpeg"
                alt="hero"
                className="rounded-3xl h-[300px]"
              />

              {/* AI Detection Overlay */}
              <div className="absolute bottom-[-20px] left-[-20px] bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-600 mb-1">
                      AI
                    </div>
                    <div className="text-xs font-medium text-gray-800">
                      Emotion Detected
                    </div>
                    <div className="text-xs text-gray-600">Hopeful</div>
                  </div>
                </div>
              </div>
              <div className="">
                <img
                  src="/HeroMiniLand.jpeg"
                  alt="hero"
                  className="rounded-xl shadow-lg absolute top-[-20px] h-30 w-30 right-[-20px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
