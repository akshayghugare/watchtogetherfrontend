import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi, type RegisterInput } from '@/api/auth.api';
import { getErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

type FormValues = RegisterInput & { confirmPassword: string };

export function RegisterPage() {
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async ({ confirmPassword: _confirm, ...input }: FormValues) => {
    try {
      const res = await authApi.register(input);
      toast.success(res.message);
      setRegistered(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (registered) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-bold text-white">Check your inbox</h1>
        <p className="text-sm text-gray-400">
          We sent you a verification link. Click it, then sign in.
        </p>
        <Link to={ROUTES.LOGIN} className="btn-primary inline-flex">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-gray-400">Free forever. Movie nights included.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Username"
          placeholder="movie_buff"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 30, message: 'At most 30 characters' },
            pattern: {
              value: /^[a-zA-Z0-9_.]+$/,
              message: 'Only letters, numbers, "_" and "."',
            },
          })}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
          })}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: {
              lower: (v) => /[a-z]/.test(v) || 'Needs a lowercase letter',
              upper: (v) => /[A-Z]/.test(v) || 'Needs an uppercase letter',
              digit: (v) => /\d/.test(v) || 'Needs a number',
            },
          })}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
