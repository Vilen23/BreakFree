import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function PostOnboarding() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const allowed = sessionStorage.getItem("post_onboarding_allowed") === "1"
    // Allow only immediately after first onboarding submission
    if (!user || !user.information_stores || !allowed) {
      // If user exists and has info stored, send them to journal; otherwise onboarding
      navigate(user && user.information_stores ? "/journal" : "/onboarding", { replace: true })
      return
    }
    // Consume the flag so the page can't be revisited later
    sessionStorage.removeItem("post_onboarding_allowed")
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <div className="min-h-screen bg-[#F3F1F6] w-full flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">We’re preparing your daily plan</h1>
        <p className="mt-3 text-gray-600">
          Thanks for sharing your details. We’re generating personalized daily plans.
          In the meantime, feel free to explore the app or try the journaling feature.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            className="px-5 py-2.5 rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200"
            onClick={() => navigate("/", { replace: true })}
          >
            Explore the website
          </button>
          <button
            className="px-5 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/journal", { replace: true })}
          >
            Check out Journal
          </button>
        </div>
      </div>
    </div>
  )
}


