import { useMemo, useState } from 'react';
import { choicesFor } from '../engine/choices';

interface Props {
  a: number;
  b: number;
  solved: boolean;
  onAnswer: (value: number) => boolean;
}

/** Trois bulles : la bonne réponse et deux erreurs courantes (retenue oubliée…). */
export default function ChoiceAnswer({ a, b, solved, onAnswer }: Props) {
  const options = useMemo(() => choicesFor(a, b), [a, b]);
  const [wrong, setWrong] = useState<number[]>([]);
  return (
    <div className="choices">
      {options.map((v) => {
        const isWrong = wrong.includes(v);
        const isRight = solved && v === a + b;
        return (
          <button
            key={v}
            className={`choice ${isWrong ? 'wrong' : ''} ${isRight ? 'right' : ''}`}
            disabled={solved || isWrong}
            onClick={() => {
              if (!onAnswer(v)) setWrong((w) => [...w, v]);
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
