import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/axios';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false); // StrictMode double-invoke guard — token is single-use

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(getErrorMessage(err));
      });
  }, [token]);

  return (
    <div className="space-y-4 text-center">
      {status === 'verifying' && (
        <>
          <Spinner size="lg" className="mx-auto text-brand-400" />
          <p className="text-sm text-gray-400">Verifying your email…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold text-white">Email verified</h1>
          <p className="text-sm text-gray-400">{message}</p>
          <Link to={ROUTES.LOGIN} className="btn-primary inline-flex">
            Sign in
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-white">Verification failed</h1>
          <p className="text-sm text-gray-400">{message}</p>
          <Link to={ROUTES.LOGIN} className="btn-ghost inline-flex">
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
