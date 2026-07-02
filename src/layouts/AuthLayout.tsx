import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to={ROUTES.LANDING} className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <span>🎬</span>
        <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          CollabPlatform
        </span>
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="card">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
