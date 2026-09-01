import type { Metadata } from 'next';
import { RegisterForm } from '../../../modules/auth/components/register-form';
import { AuthSplitLayout } from '../../../modules/auth/components/auth-split-layout';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      heading="Join ATrips."
      subheading="Hand-picked hotels across Egypt, booked direct at local rates."
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
