import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/api/axios';
import { authApi, type LoginInput } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showResend, setShowResend] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>();

  const onSubmit = async (input: LoginInput) => {
    try {
      await login(input);
      toast.success('Welcome back!');
      const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.DASHBOARD;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(message);
      if (message.toLowerCase().includes('verify')) setShowResend(true);
    }
  };

  const resendVerification = async () => {
    try {
      const res = await authApi.resendVerification(getValues('email'));
      toast.success(res.message);
      setShowResend(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-gray-400">Watch together, perfectly in sync.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex justify-end">
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-brand-400 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      {showResend && (
        <button
          type="button"
          onClick={resendVerification}
          className="w-full text-sm text-brand-400 hover:text-brand-300"
        >
          Resend verification email
        </button>
      )}

      <p className="text-center text-sm text-gray-400">
        No account yet?{' '}
        <Link to={ROUTES.REGISTER} className="font-medium text-brand-400 hover:text-brand-300">
          Create one
        </Link>
      </p>
    </div>
  );
}
