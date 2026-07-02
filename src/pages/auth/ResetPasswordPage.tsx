import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants';

interface FormValues {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async ({ password }: FormValues) => {
    try {
      const res = await authApi.resetPassword(token ?? '', password);
      toast.success(res.message);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-gray-400">You'll be signed out of all other devices.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="New password"
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
          label="Confirm new password"
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
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-400">
        <Link to={ROUTES.LOGIN} className="font-medium text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
