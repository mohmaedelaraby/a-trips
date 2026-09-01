import type { Metadata } from 'next';
import { LoginForm } from '../../../modules/auth/components/login-form';
import { AuthSplitLayout } from '../../../modules/auth/components/auth-split-layout';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthSplitLayout
      heading="Welcome back."
      subheading="Your bookings, saved hotels and past stays in one place."
    >
      <LoginForm />
    </AuthSplitLayout>
  );
}
