const LINES = [
  'Сөз - жүректің мөлдір бұлағы',
  'Өлең - өмірдің өзегі',
  'Ақын айтса - халық ұғады',
  'Жыр - жанның қанаты',
];

export function Ribbon() {
  // Список дублируется: бесконечная прокрутка сдвигает дорожку на половину ширины.
  const track = [...LINES, ...LINES];

  return (
    <div className="ribbon">
      <div className="ribbon-track">
        {track.map((line, i) => (
          <span key={`${line}-${i}`}>
            {line} <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
