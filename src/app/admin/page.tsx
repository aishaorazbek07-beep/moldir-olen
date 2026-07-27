import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  loadAdjustments,
  loadAdminTeams,
  loadApplications,
  loadRecentPayments,
  loadSummary,
} from '@/lib/admin-data';
import { isAdmin } from '@/lib/admin-guard';
import { paymentsMode } from '@/lib/config';
import { dateTime, fmt, tenge } from '@/lib/format';
import { maskPhone } from '@/lib/phone';
import { LogoutButton } from './LogoutButton';
import { VoteAdjuster } from './VoteAdjuster';
import './admin.css';

export const metadata: Metadata = {
  title: 'Админка | Мөлдір өлең',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  vote: 'Голоса',
  ticket: 'Билеты',
  application: 'Заявки',
};

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [summary, teams, payments, adjustments, applications] = await Promise.all([
    loadSummary(),
    loadAdminTeams(),
    loadRecentPayments(),
    loadAdjustments(),
    loadApplications(),
  ]);

  const mode = paymentsMode();
  const MODE_LABEL: Record<string, string> = {
    offline: 'Оффлайн (без ApiPay)',
    sandbox: 'Песочница ApiPay',
    live: 'Боевой режим',
  };

  return (
    <div className="admin">
      <div className="admin-head">
        <h1>
          Мөлдір өлең
          <span className={`mode ${mode === 'live' ? 'live' : 'sandbox'}`}>{MODE_LABEL[mode]}</span>
        </h1>
        <LogoutButton />
      </div>

      <h2>Оплаты</h2>
      <div className="cards">
        <div className="acard">
          <span>Оплачено всего</span>
          <b>{fmt(summary.totals.paidCount)}</b>
          <small>{tenge(summary.totals.paidSum)}</small>
        </div>
        <div className="acard">
          <span>Сегодня</span>
          <b>{fmt(summary.totals.todayPaidCount)}</b>
          <small>{tenge(summary.totals.todayPaidSum)}</small>
        </div>
        <div className="acard">
          <span>Ждут оплаты</span>
          <b>{fmt(summary.totals.pendingCount)}</b>
          <small>счёт создан, деньги не пришли</small>
        </div>
        {summary.totals.mismatchCount > 0 ? (
          <div className="acard warn">
            <span>Сумма не сошлась</span>
            <b>{fmt(summary.totals.mismatchCount)}</b>
            <small>требует разбора</small>
          </div>
        ) : null}
      </div>

      <h2>По видам</h2>
      {summary.byKind.length === 0 ? (
        <p className="admin-empty">Платежей пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Вид</th>
                <th>Оплачено</th>
                <th>Сумма</th>
                <th>Начато</th>
                <th>Доходит до оплаты</th>
              </tr>
            </thead>
            <tbody>
              {summary.byKind.map((row) => (
                <tr key={row.kind}>
                  <td>{KIND_LABEL[row.kind] ?? row.kind}</td>
                  <td>{fmt(row.paidCount)}</td>
                  <td>{tenge(row.paidSum)}</td>
                  <td>{fmt(row.startedCount)}</td>
                  <td>
                    {row.startedCount > 0
                      ? `${Math.round((row.paidCount / row.startedCount) * 100)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Голоса</h2>
      <VoteAdjuster initialTeams={teams} />

      <h2>Журнал правок</h2>
      {adjustments.length === 0 ? (
        <p className="admin-empty">Правок не было.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Когда</th>
                <th>Команда</th>
                <th>Изменение</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row) => (
                <tr key={row.id}>
                  <td>{dateTime(row.createdAt)}</td>
                  <td>{row.teamName}</td>
                  <td>
                    {row.delta > 0 ? '+' : ''}
                    {fmt(row.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Последние платежи</h2>
      {payments.length === 0 ? (
        <p className="admin-empty">Платежей пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Создан</th>
                <th>Вид</th>
                <th>Что</th>
                <th>Сумма</th>
                <th>Телефон</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{dateTime(p.createdAt)}</td>
                  <td>{KIND_LABEL[p.kind] ?? p.kind}</td>
                  <td>{p.label}</td>
                  <td>{tenge(p.amount)}</td>
                  <td>{maskPhone(p.phone)}</td>
                  <td>
                    <span className={`pill ${statusClass(p.status)}`}>{statusLabel(p.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Заявки на 2-й сезон</h2>
      {applications.length === 0 ? (
        <p className="admin-empty">Оплаченных заявок пока нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Когда</th>
                <th>Имя</th>
                <th>Год</th>
                <th>Регион</th>
                <th>Телефон</th>
                <th>Резюме</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td>{dateTime(a.createdAt)}</td>
                  <td>{a.name}</td>
                  <td>{a.birthYear}</td>
                  <td>{a.region || '—'}</td>
                  <td>{maskPhone(a.phone)}</td>
                  <td className="resume-cell">{a.resume || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'оплачен';
    case 'pending':
      return 'ждёт оплаты';
    case 'expired':
      return 'истёк';
    case 'cancelled':
      return 'отменён';
    case 'amount_mismatch':
      return 'сумма не сошлась';
    default:
      return status;
  }
}

function statusClass(status: string): string {
  if (status === 'paid') return 'paid';
  if (status === 'pending') return 'pending';
  if (status === 'amount_mismatch' || status === 'error') return 'bad';
  return 'dead';
}
