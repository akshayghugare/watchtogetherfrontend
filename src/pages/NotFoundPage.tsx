import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl">🎞️</div>
      <h1 className="text-3xl font-bold text-white">404 — Scene not found</h1>
      <p className="text-gray-400">This page seems to have been cut from the final edit.</p>
      <Link to={ROUTES.LANDING} className="btn-primary">
        Back to home
      </Link>
    </div>
  );
}
