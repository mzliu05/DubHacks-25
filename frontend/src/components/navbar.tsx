import { NavLink } from 'react-router-dom'

export function Navbar() {
  return (
    <nav className="w-full py-4 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <NavLink to="/" className="text-xl font-bold text-blue-600">
          Chatbot App
        </NavLink>

        <div className="flex gap-3 text-gray-700">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/chat">
            Chat
          </NavLink>
        </div>
      </div>
    </nav>
  )
}