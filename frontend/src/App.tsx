import './App.css'
import HomePage from './pages/HomePage'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import NavbarTop from './components/NavbarTop'
import SignupPage from './pages/SignupPage'

function App() {

  return (
    <>
      <NavbarTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </>
  )
}

export default App
