const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/** Pavé de chiffres à gros boutons. */
export default function Keypad({ onDigit, disabled }: { onDigit: (d: string) => void; disabled?: boolean }) {
  return (
    <div className="keypad">
      {DIGITS.map((d) => (
        <button key={d} className="key" onClick={() => onDigit(d)} disabled={disabled}>
          {d}
        </button>
      ))}
    </div>
  );
}
