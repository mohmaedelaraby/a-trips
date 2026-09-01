import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../../modules/auth/components/forgot-password-form';
import { AuthSplitLayout } from '../../../modules/auth/components/auth-split-layout';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      heading="Forgot something?"
      subheading="It happens. We'll get you a link to pick a new password."
    >
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
