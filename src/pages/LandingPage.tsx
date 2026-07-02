import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants';

const features = [
  { icon: '🎬', title: 'Perfect sync', text: 'Play, pause and seek together — everyone stays on the same frame.' },
  { icon: '💬', title: 'Live chat', text: 'React, reply and share emojis while the movie plays.' },
  { icon: '📞', title: 'Voice & video', text: 'Talk over the movie with built-in WebRTC calls.' },
  { icon: '👥', title: 'Friends', text: 'See who is online and jump into their movie night instantly.' },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const cta = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.REGISTER;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span>🎬</span>
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            CollabPlatform
          </span>
        </div>
        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to={ROUTES.DASHBOARD} className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="btn-ghost">
                Sign in
              </Link>
              <Link to={ROUTES.REGISTER} className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-6xl"
        >
          Movie nights,{' '}
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            together
          </span>{' '}
          — from anywhere
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 max-w-xl text-lg text-gray-400"
        >
          Watch in perfect sync, chat in real time and hop on voice or video — like Teleparty,
          Discord and Google Meet had a movie night.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <Link to={cta} className="btn-primary px-8 py-3 text-base">
            Start watching together →
          </Link>
        </motion.div>

        <div className="mt-24 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="card p-6 text-left"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} CollabPlatform
      </footer>
    </div>
  );
}
