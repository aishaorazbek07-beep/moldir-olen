import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-guard';
import { LoginForm } from './LoginForm';
import '../admin.css';

export const metadata: Metadata = {
  title: 'Кіру | Админка',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Админка</h1>
        <p>Мөлдір өлең · панель управления</p>
        <LoginForm />
      </div>
    </div>
  );
}
