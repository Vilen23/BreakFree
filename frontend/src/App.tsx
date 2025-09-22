import './App.css'
import HomePage from './pages/HomePage'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import NavbarTop from './components/NavbarTop'
import SignupPage from './pages/SignupPage'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import JournalingPage from './pages/JournalingPage'

function App() {

  return (
    <>
      <AuthProvider>
        <NavbarTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/journal" element={<JournalingPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </>
  )
}

export default App
