import './App.css'
import HomePage from './pages/HomePage'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import NavbarTop from './components/NavbarTop'
import SignupPage from './pages/SignupPage'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import JournalingPage from './pages/JournalingPage'
import { OnboardingFlow } from './pages/OnBoarding'
import PostOnboarding from './pages/PostOnboarding'
import DailyWellnessPlanner from './pages/DailyTasks'

function App() {

  return (
    <>
      <AuthProvider>
        <NavbarTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/post-onboarding" element={<PostOnboarding />} />
            <Route path="/journal" element={<JournalingPage />} />
            <Route path="/daily-tasks" element={<DailyWellnessPlanner />} />
          </Route>
        </Routes>
      </AuthProvider>
    </>
  )
}

export default App
