import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

interface FormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>();

  const onSubmit = async ({ email }: FormValues) => {
    try {
      const res = await authApi.forgotPassword(email);
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err; // keep isSubmitSuccessful false
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-400">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {isSubmitSuccessful ? (
        <p className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-4 text-sm text-brand-200">
          If an account exists for that email, a reset link is on its way. It expires in 30
          minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-400">
        Remembered it?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
