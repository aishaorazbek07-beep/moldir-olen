import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadAdjustments, loadAdminTeams, loadClaimSummary, loadClaims } from '@/lib/admin-data';
import { isAdmin } from '@/lib/admin-guard';
import { loadSettings, loadTeams } from '@/lib/content';
import { loadDuels } from '@/lib/duels';
import { AdminPanel } from './AdminPanel';
import './admin.css';

export const metadata: Metadata = {
  title: 'Админка | Мөлдір өлең',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [{ teams, ok: teamsOk }, { settings }, { duels }] = await Promise.all([
    loadTeams(true),
    loadSettings(),
    loadDuels(true),
  ]);

  // Если база недоступна, показываем панель в режиме только для чтения —
  // это лучше, чем страница с ошибкой, когда нужно быстро понять, что случилось.
  let adminTeams = teams.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    placeLabel: t.placeLabel,
    colorIndex: t.colorIndex,
    kaspiUrl: t.kaspiUrl,
    isActive: t.isActive,
    counts: { claimed: 0, confirmed: 0, rejected: 0, adjustment: 0 },
    total: 0,
  }));
  let claims: Awaited<ReturnType<typeof loadClaims>> = [];
  let summary = {
    claimedCount: 0,
    claimedSum: 0,
    confirmedCount: 0,
    confirmedSum: 0,
    rejectedCount: 0,
    todayCount: 0,
    todaySum: 0,
  };
  let adjustments: Awaited<ReturnType<typeof loadAdjustments>> = [];
  let dbOk = teamsOk;

  if (teamsOk) {
    try {
      [adminTeams, claims, summary, adjustments] = await Promise.all([
        loadAdminTeams(teams),
        loadClaims('all'),
        loadClaimSummary(),
        loadAdjustments(),
      ]);
    } catch {
      dbOk = false;
    }
  }


  return (
    <AdminPanel
      teams={adminTeams}
      claims={claims}
      summary={summary}
      adjustments={adjustments}
      settings={settings}
      duels={duels}
      dbOk={dbOk}
    />
  );
}
