import LoginUI from '@/modules/auth/components/login-ui';
import { requireUnAuth } from '@/modules/auth/utils/auth-utils';

export default async function LoginPage() {
  await requireUnAuth();
  return <LoginUI />;
}