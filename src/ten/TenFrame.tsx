interface Props {
  /** Jetons déjà là (les unités du nombre de départ). */
  start: number;
  /** Fagots à montrer à gauche (niveau « dizaine » : 47 → 4 fagots). */
  tens: number;
  /** Jetons ajoutés par l'enfant. */
  added: number;
  locked: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

/** Boîte de 10 : 2 rangées de 5 cases. Les jetons ajoutés sont orange et numérotés. */
export default function TenFrame({ start, tens, added, locked, onAdd, onRemove }: Props) {
  return (
    <div className="ten-box">
      {tens > 0 && (
        <div className="ten-fagots" aria-label={`${tens} dizaines`}>
          {Array.from({ length: tens }, (_, i) => (
            <span key={i} className="mini-fagot" />
          ))}
          <b className="t-d">{tens * 10}</b>
        </div>
      )}
      <div className="ten-frame" role="group" aria-label={`Boîte de 10 : ${start + added} jetons`}>
        {Array.from({ length: 10 }, (_, i) => {
          const kind = i < start ? 'base' : i < start + added ? 'add' : 'empty';
          return (
            <button
              key={i}
              className={`ten-cell ${kind}`}
              disabled={locked}
              onClick={() => (kind === 'empty' ? onAdd() : kind === 'add' && i === start + added - 1 ? onRemove() : undefined)}
              aria-label={kind === 'empty' ? 'Ajouter un jeton' : kind === 'add' ? 'Jeton ajouté' : 'Jeton'}
            >
              {kind !== 'empty' && <span className="token">{kind === 'add' ? i - start + 1 : ''}</span>}
            </button>
          );
        })}
      </div>
      <span className={`plus-chip ${added ? 'on' : ''}`} aria-live="polite">
        +{added}
      </span>
    </div>
  );
}
