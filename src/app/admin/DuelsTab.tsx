'use client';

import { useState } from 'react';
import type { Duel } from '@/lib/duels';

type Send = (payload: Record<string, unknown>, okText?: string) => Promise<boolean>;

/** Дата-время для поля `datetime-local`: локальное время без часового пояса. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DuelsTab({ duels, busy, send }: { duels: Duel[]; busy: boolean; send: Send }) {
  const [newDuel, setNewDuel] = useState({ startsAt: '', teamA: '', teamB: '', price: '10000' });

  return (
    <>
      <h2>Алдағы дуэльдер</h2>
      <p className="admin-note">
        Афиша показывается над карточкой. Загрузить можно PNG, JPEG, WEBP или GIF до 1500 КБ —
        файл хранится в базе, отдельное хранилище не нужно.
      </p>

      {duels.length === 0 ? <p className="admin-empty">Дуэлей пока нет.</p> : null}

      {duels.map((duel) => (
        <DuelEditor key={duel.id} duel={duel} busy={busy} send={send} />
      ))}

      <h2>Добавить дуэль</h2>
      <div className="team-admin">
        <div className="grid2">
          <label>
            Дата и время
            <input
              type="datetime-local"
              value={newDuel.startsAt}
              onChange={(e) => setNewDuel({ ...newDuel, startsAt: e.target.value })}
            />
          </label>
          <label>
            Цена билета, ₸
            <input
              type="number"
              min={0}
              value={newDuel.price}
              onChange={(e) => setNewDuel({ ...newDuel, price: e.target.value })}
            />
          </label>
        </div>
        <div className="grid2">
          <label>
            Первый участник
            <input
              value={newDuel.teamA}
              onChange={(e) => setNewDuel({ ...newDuel, teamA: e.target.value })}
              placeholder="Астана қаласы"
            />
          </label>
          <label>
            Второй участник
            <input
              value={newDuel.teamB}
              onChange={(e) => setNewDuel({ ...newDuel, teamB: e.target.value })}
              placeholder="Павлодар облысы"
            />
          </label>
        </div>
        <button
          className="btn btn-fire"
          disabled={busy || !newDuel.startsAt || newDuel.teamA.length < 2 || newDuel.teamB.length < 2}
          type="button"
          onClick={async () => {
            const ok = await send(
              {
                action: 'duel.create',
                startsAt: new Date(newDuel.startsAt).toISOString(),
                teamA: newDuel.teamA,
                teamB: newDuel.teamB,
                price: Number(newDuel.price),
              },
              'Дуэль добавлена',
            );
            if (ok) setNewDuel({ startsAt: '', teamA: '', teamB: '', price: '10000' });
          }}
        >
          Добавить
        </button>
      </div>
    </>
  );
}

function DuelEditor({ duel, busy, send }: { duel: Duel; busy: boolean; send: Send }) {
  const [startsAt, setStartsAt] = useState(toLocalInput(duel.startsAt));
  const [teamA, setTeamA] = useState(duel.teamA);
  const [teamB, setTeamB] = useState(duel.teamB);
  const [price, setPrice] = useState(String(duel.price));
  const [ticketUrl, setTicketUrl] = useState(duel.ticketUrl);
  const [isActive, setIsActive] = useState(duel.isActive);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPoster = (file: File) => {
    setUploadError(null);

    if (file.size > 1_500_000) {
      setUploadError(`Файл ${Math.round(file.size / 1024)} КБ — слишком большой. Нужно до 1500 КБ.`);
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      await send({ action: 'duel.poster', id: duel.id, dataUrl: String(reader.result) }, 'Афиша загружена');
      setUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Не удалось прочитать файл');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`team-admin${duel.isActive ? '' : ' dim'}`}>
      <div className="team-admin-top">
        <b>
          {duel.teamA} — {duel.teamB}
        </b>
        <small>{duel.hasPoster ? 'афиша есть' : 'без афиши'}</small>
      </div>

      {duel.hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="poster-preview" src={`/api/duel/${duel.id}/poster`} alt="Афиша" />
      ) : null}

      <div className="grid2">
        <label>
          Дата и время
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label>
          Цена билета, ₸
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
      </div>

      <div className="grid2">
        <label>
          Первый участник
          <input value={teamA} onChange={(e) => setTeamA(e.target.value)} />
        </label>
        <label>
          Второй участник
          <input value={teamB} onChange={(e) => setTeamB(e.target.value)} />
        </label>
      </div>

      <label className="full">
        Ссылка на покупку билета (можно оставить пустой)
        <input value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://..." />
      </label>

      <div className="grid2">
        <label>
          Афиша
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={busy || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPoster(file);
              e.target.value = '';
            }}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Показывать на сайте
        </label>
      </div>

      {uploading ? <p className="hint">Загрузка афиши...</p> : null}
      {uploadError ? <p className="hint bad">{uploadError}</p> : null}

      <div className="adjust-row">
        <button
          className="btn btn-fire mini-btn"
          disabled={busy}
          type="button"
          onClick={() =>
            void send(
              {
                action: 'duel.update',
                id: duel.id,
                startsAt: new Date(startsAt).toISOString(),
                teamA,
                teamB,
                price: Number(price),
                ticketUrl,
                isActive,
              },
              'Сохранено',
            )
          }
        >
          Сохранить
        </button>
        {duel.hasPoster ? (
          <button
            className="mini"
            disabled={busy}
            type="button"
            onClick={() => void send({ action: 'duel.poster', id: duel.id, dataUrl: '' }, 'Афиша убрана')}
          >
            Убрать афишу
          </button>
        ) : null}
        <button
          className="mini no"
          disabled={busy}
          type="button"
          onClick={() => void send({ action: 'duel.delete', id: duel.id }, 'Дуэль удалена')}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
