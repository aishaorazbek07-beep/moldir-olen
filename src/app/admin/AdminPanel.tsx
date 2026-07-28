'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { AdjustmentRow, AdminTeamRow, ClaimRow, ClaimSummary } from '@/lib/admin-data';
import type { SiteSettings } from '@/lib/content';
import { dateTime, fmt, tenge } from '@/lib/format';

const ADJUST_STEPS = [1, 10, 100, 1000];

type Tab = 'claims' | 'teams' | 'content';

export function AdminPanel({
  teams,
  claims,
  summary,
  adjustments,
  settings,
  dbOk,
}: {
  teams: AdminTeamRow[];
  claims: ClaimRow[];
  summary: ClaimSummary;
  adjustments: AdjustmentRow[];
  settings: SiteSettings;
  dbOk: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('claims');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const send = async (payload: Record<string, unknown>, okText?: string) => {
    setBusy(true);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? 'Не удалось выполнить');
        return false;
      }

      if (okText) setFlash(okText);
      router.refresh();
      return true;
    } catch {
      setError('Нет связи с сервером');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin">
      <div className="admin-head">
        <h1>Мөлдір өлең</h1>
        <div className="admin-head-right">
          <a className="text-link" href="/dauys" target="_blank" rel="noreferrer">
            Открыть сайт
          </a>
          <LogoutButton />
        </div>
      </div>

      {!dbOk ? (
        <p className="banner bad">
          База недоступна — сайт сейчас показывает резервные данные из кода. Правки
          сохранить нельзя.
        </p>
      ) : null}
      {error ? <p className="banner bad">{error}</p> : null}
      {flash ? <p className="banner good">{flash}</p> : null}

      <div className="tabs">
        <button className={tab === 'claims' ? 'on' : ''} onClick={() => setTab('claims')} type="button">
          Заявки и сверка
        </button>
        <button className={tab === 'teams' ? 'on' : ''} onClick={() => setTab('teams')} type="button">
          Города
        </button>
        <button className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')} type="button">
          Тексты и цены
        </button>
      </div>

      {tab === 'claims' ? (
        <ClaimsTab
          claims={claims}
          summary={summary}
          teams={teams}
          adjustments={adjustments}
          busy={busy}
          send={send}
        />
      ) : tab === 'teams' ? (
        <TeamsTab teams={teams} busy={busy} send={send} />
      ) : (
        <ContentTab settings={settings} busy={busy} send={send} />
      )}
    </div>
  );
}

type Send = (payload: Record<string, unknown>, okText?: string) => Promise<boolean>;

// ---------------------------------------------------------------------------
//  Заявки: сверка платежей и корректировка счётчиков
// ---------------------------------------------------------------------------
function ClaimsTab({
  claims,
  summary,
  teams,
  adjustments,
  busy,
  send,
}: {
  claims: ClaimRow[];
  summary: ClaimSummary;
  teams: AdminTeamRow[];
  adjustments: AdjustmentRow[];
  busy: boolean;
  send: Send;
}) {
  const [filter, setFilter] = useState<'all' | 'claimed' | 'confirmed' | 'rejected'>('claimed');
  const nameBySlug = new Map(teams.map((t) => [t.slug, t.name]));

  const shown = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  return (
    <>
      <div className="cards">
        <div className="acard">
          <span>Ждут сверки</span>
          <b>{fmt(summary.claimedCount)}</b>
          <small>на {tenge(summary.claimedSum)}</small>
        </div>
        <div className="acard">
          <span>Подтверждено</span>
          <b>{fmt(summary.confirmedCount)}</b>
          <small>на {tenge(summary.confirmedSum)}</small>
        </div>
        <div className="acard">
          <span>Отклонено</span>
          <b>{fmt(summary.rejectedCount)}</b>
          <small>оплата не найдена</small>
        </div>
        <div className="acard">
          <span>Сегодня</span>
          <b>{fmt(summary.todayCount)}</b>
          <small>на {tenge(summary.todaySum)}</small>
        </div>
      </div>

      <h2>Счётчики городов</h2>
      <p className="admin-note">
        На сайте показывается: заявлено + подтверждено + корректировка. Отклонённые
        не считаются — как только вы отклоняете заявку, голос уходит со счётчика.
      </p>

      {teams.map((team) => (
        <div className="team-admin" key={team.id}>
          <div className="team-admin-top">
            <b>{team.name}</b>
            <small>{team.isActive ? team.placeLabel : 'скрыт'}</small>
          </div>

          <div className="breakdown">
            <div>
              <span>Заявлено</span>
              <b>{fmt(team.counts.claimed)}</b>
            </div>
            <div>
              <span>Подтверждено</span>
              <b>{fmt(team.counts.confirmed)}</b>
            </div>
            <div>
              <span>Отклонено</span>
              <b>{fmt(team.counts.rejected)}</b>
            </div>
            <div className="adj">
              <span>Корректировка</span>
              <b className={team.counts.adjustment >= 0 ? 'plus' : 'minus'}>
                {team.counts.adjustment > 0 ? '+' : ''}
                {fmt(team.counts.adjustment)}
              </b>
            </div>
            <div className="total">
              <span>На сайте</span>
              <b>{fmt(team.total)}</b>
            </div>
          </div>

          <div className="adjust-row">
            {ADJUST_STEPS.map((step) => (
              <button
                key={`p${step}`}
                className="plus"
                disabled={busy}
                type="button"
                onClick={() => void send({ action: 'votes.adjust', teamSlug: team.slug, delta: step })}
              >
                +{step}
              </button>
            ))}
            {ADJUST_STEPS.map((step) => (
              <button
                key={`m${step}`}
                className="minus"
                disabled={busy}
                type="button"
                onClick={() => void send({ action: 'votes.adjust', teamSlug: team.slug, delta: -step })}
              >
                −{step}
              </button>
            ))}
          </div>
        </div>
      ))}

      <h2>Заявки</h2>
      <p className="admin-note">
        Ищите платёж по номеру чека в выписке Kaspi. Нашли — «подтвердить»; нет —
        «отклонить», и голос сразу уходит со счётчика.
      </p>

      <div className="filters">
        {(['claimed', 'confirmed', 'rejected', 'all'] as const).map((f) => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)} type="button">
            {f === 'claimed'
              ? 'Ждут сверки'
              : f === 'confirmed'
                ? 'Подтверждённые'
                : f === 'rejected'
                  ? 'Отклонённые'
                  : 'Все'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="admin-empty">Заявок нет.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Когда</th>
                <th>Город</th>
                <th>Чек</th>
                <th>Имя</th>
                <th>Сумма</th>
                <th>Голосов</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((claim) => (
                <tr key={claim.id}>
                  <td>{dateTime(claim.createdAt)}</td>
                  <td>{nameBySlug.get(claim.teamSlug ?? '') ?? claim.teamSlug ?? '—'}</td>
                  <td className="mono">{claim.receipt || '—'}</td>
                  <td>{claim.payerName || '—'}</td>
                  <td>{tenge(claim.amount)}</td>
                  <td>{fmt(claim.quantity)}</td>
                  <td>
                    <span className={`pill ${statusClass(claim.status)}`}>
                      {statusLabel(claim.status)}
                    </span>
                  </td>
                  <td className="row-actions">
                    {claim.status !== 'confirmed' ? (
                      <button
                        className="mini ok"
                        disabled={busy}
                        type="button"
                        onClick={() =>
                          void send({ action: 'claim.status', id: claim.id, status: 'confirmed' })
                        }
                      >
                        Подтвердить
                      </button>
                    ) : null}
                    {claim.status !== 'rejected' ? (
                      <button
                        className="mini no"
                        disabled={busy}
                        type="button"
                        onClick={() =>
                          void send({ action: 'claim.status', id: claim.id, status: 'rejected' })
                        }
                      >
                        Отклонить
                      </button>
                    ) : (
                      <button
                        className="mini"
                        disabled={busy}
                        type="button"
                        onClick={() =>
                          void send({ action: 'claim.status', id: claim.id, status: 'claimed' })
                        }
                      >
                        Вернуть
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Журнал корректировок</h2>
      {adjustments.length === 0 ? (
        <p className="admin-empty">Правок не было.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Когда</th>
                <th>Город</th>
                <th>Изменение</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id}>
                  <td>{dateTime(a.createdAt)}</td>
                  <td>{nameBySlug.get(a.teamSlug) ?? a.teamSlug}</td>
                  <td>
                    {a.delta > 0 ? '+' : ''}
                    {fmt(a.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
//  Города
// ---------------------------------------------------------------------------
function TeamsTab({ teams, busy, send }: { teams: AdminTeamRow[]; busy: boolean; send: Send }) {
  const [newName, setNewName] = useState('');
  const [newKaspi, setNewKaspi] = useState('');

  return (
    <>
      <h2>Города</h2>
      <p className="admin-note">
        Порядок здесь — порядок карточек на сайте. У каждого города своя ссылка Kaspi:
        без неё кнопка оплаты скажет, что ссылка не подключена.
      </p>

      {teams.map((team, i) => (
        <TeamEditor
          key={team.id}
          team={team}
          busy={busy}
          send={send}
          isFirst={i === 0}
          isLast={i === teams.length - 1}
        />
      ))}

      <h2>Добавить город</h2>
      <div className="team-admin">
        <div className="grid2">
          <label>
            Название
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Шымкент" />
          </label>
          <label>
            Ссылка Kaspi
            <input
              value={newKaspi}
              onChange={(e) => setNewKaspi(e.target.value)}
              placeholder="https://pay.kaspi.kz/pay/..."
            />
          </label>
        </div>
        <button
          className="btn btn-fire"
          disabled={busy || newName.trim().length < 2}
          type="button"
          onClick={async () => {
            const ok = await send(
              { action: 'team.create', name: newName.trim(), kaspiUrl: newKaspi.trim(), placeLabel: 'Финалист' },
              'Город добавлен',
            );
            if (ok) {
              setNewName('');
              setNewKaspi('');
            }
          }}
        >
          Добавить
        </button>
      </div>
    </>
  );
}

function TeamEditor({
  team,
  busy,
  send,
  isFirst,
  isLast,
}: {
  team: AdminTeamRow;
  busy: boolean;
  send: Send;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [name, setName] = useState(team.name);
  const [placeLabel, setPlaceLabel] = useState(team.placeLabel);
  const [kaspiUrl, setKaspiUrl] = useState(team.kaspiUrl);
  const [colorIndex, setColorIndex] = useState(team.colorIndex);
  const [isActive, setIsActive] = useState(team.isActive);

  return (
    <div className={`team-admin${team.isActive ? '' : ' dim'}`}>
      <div className="team-admin-top">
        <b>{team.name}</b>
        <small>
          {team.slug} · {fmt(team.total)} голосов
        </small>
      </div>

      <div className="grid2">
        <label>
          Название
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Подпись
          <input value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} />
        </label>
      </div>

      <label className="full">
        Ссылка Kaspi
        <input
          value={kaspiUrl}
          onChange={(e) => setKaspiUrl(e.target.value)}
          placeholder="https://pay.kaspi.kz/pay/..."
        />
      </label>
      {!kaspiUrl.trim() ? (
        <p className="hint bad">Ссылка не задана — оплата за этот город не работает.</p>
      ) : null}

      <div className="grid2">
        <label>
          Цвет
          <select value={colorIndex} onChange={(e) => setColorIndex(Number(e.target.value))}>
            <option value={1}>Розовый</option>
            <option value={2}>Золотой</option>
            <option value={3}>Бирюзовый</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Показывать на сайте
        </label>
      </div>

      <div className="adjust-row">
        <button
          className="btn btn-fire mini-btn"
          disabled={busy}
          type="button"
          onClick={() =>
            void send(
              { action: 'team.update', id: team.id, name, placeLabel, kaspiUrl, colorIndex, isActive },
              'Сохранено',
            )
          }
        >
          Сохранить
        </button>
        <button
          className="mini"
          disabled={busy || isFirst}
          type="button"
          onClick={() => void send({ action: 'team.move', id: team.id, direction: 'up' })}
        >
          ↑ выше
        </button>
        <button
          className="mini"
          disabled={busy || isLast}
          type="button"
          onClick={() => void send({ action: 'team.move', id: team.id, direction: 'down' })}
        >
          ↓ ниже
        </button>
        {team.isActive ? (
          <button
            className="mini no"
            disabled={busy}
            type="button"
            onClick={() => void send({ action: 'team.hide', id: team.id }, 'Город скрыт')}
          >
            Скрыть
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Тексты и цены
// ---------------------------------------------------------------------------
function ContentTab({
  settings,
  busy,
  send,
}: {
  settings: SiteSettings;
  busy: boolean;
  send: Send;
}) {
  const [values, setValues] = useState({
    vote_price: String(settings.votePrice),
    whatsapp_number: settings.whatsappNumber,
    vote_eyebrow: settings.voteEyebrow,
    vote_title: settings.voteTitle,
    vote_lead: settings.voteLead,
    vote_note: settings.voteNote,
    hero_tagline: settings.heroTagline,
    hero_tag_1: settings.heroTags[0] ?? '',
    hero_tag_2: settings.heroTags[1] ?? '',
    hero_tag_3: settings.heroTags[2] ?? '',
    closed_notice: settings.closedNotice,
  });

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <h2>Голосование</h2>
      <div className="team-admin">
        <div className="grid2">
          <label>
            Цена одного голоса, ₸
            <input type="number" min={1} value={values.vote_price} onChange={set('vote_price')} />
          </label>
          <label>
            WhatsApp для скриншотов
            <input
              value={values.whatsapp_number}
              onChange={set('whatsapp_number')}
              placeholder="77011234567"
            />
          </label>
        </div>
        {!values.whatsapp_number.trim() ? (
          <p className="hint bad">Без номера кнопка WhatsApp у людей не откроется.</p>
        ) : null}

        <div className="grid2">
          <label>
            Надзаголовок
            <input value={values.vote_eyebrow} onChange={set('vote_eyebrow')} />
          </label>
          <label>
            Заголовок
            <input value={values.vote_title} onChange={set('vote_title')} />
          </label>
        </div>
        <label className="full">
          Подпись под заголовком
          <textarea value={values.vote_lead} onChange={set('vote_lead')} rows={2} />
        </label>
        <label className="full">
          Строка про оплату
          <input value={values.vote_note} onChange={set('vote_note')} />
        </label>
      </div>

      <h2>Главная страница</h2>
      <div className="team-admin">
        <label className="full">
          Надпись над названием
          <input value={values.hero_tagline} onChange={set('hero_tagline')} />
        </label>
        <div className="grid3">
          <label>
            Плашка 1
            <input value={values.hero_tag_1} onChange={set('hero_tag_1')} />
          </label>
          <label>
            Плашка 2
            <input value={values.hero_tag_2} onChange={set('hero_tag_2')} />
          </label>
          <label>
            Плашка 3
            <input value={values.hero_tag_3} onChange={set('hero_tag_3')} />
          </label>
        </div>
        <p className="hint">Последнее слово плашки — подпись, всё до него выделяется цветом.</p>
      </div>

      <h2>Закрытые разделы</h2>
      <div className="team-admin">
        <label className="full">
          Текст на страницах «Билет» и «Өтінім»
          <textarea value={values.closed_notice} onChange={set('closed_notice')} rows={2} />
        </label>
      </div>

      <button
        className="btn btn-fire"
        disabled={busy}
        type="button"
        onClick={() => void send({ action: 'settings.save', values }, 'Сохранено')}
      >
        Сохранить всё
      </button>
    </>
  );
}

function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="text-link"
      type="button"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.replace('/admin/login');
        router.refresh();
      }}
    >
      Выйти
    </button>
  );
}

function statusLabel(status: string): string {
  if (status === 'claimed') return 'ждёт сверки';
  if (status === 'confirmed') return 'подтверждён';
  if (status === 'rejected') return 'отклонён';
  return status;
}

function statusClass(status: string): string {
  if (status === 'confirmed') return 'paid';
  if (status === 'claimed') return 'pending';
  return 'bad';
}

export type { ReactNode };
