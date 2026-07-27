'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.replace('/admin');
        router.refresh();
        return;
      }

      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Не удалось войти');
    } catch {
      setError('Нет связи с сервером');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="admin-password">Пароль</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="btn btn-fire btn-block" type="submit" disabled={busy}>
        {busy ? 'Проверяем...' : 'Войти'}
      </button>
    </form>
  );
}
