import { Link } from 'react-router-dom'

function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Login</h1>

        <form className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-blue-400"
              placeholder="tu@email.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-300">Contrasena</span>
            <input
              type="password"
              className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-blue-400"
              placeholder="********"
            />
          </label>

          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition-all duration-200 hover:bg-blue-500"
          >
            Ingresar
          </button>
        </form>

        <Link
          to="/"
          className="mt-5 inline-block text-sm text-zinc-300 transition-all duration-200 hover:text-blue-300"
        >
          Volver a inicio
        </Link>
      </div>
    </div>
  )
}

export default Login
