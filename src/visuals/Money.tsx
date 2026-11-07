import { useWidth } from '../lib/hooks';
import { Columns, Extras, Pieces, columnRects } from './Board';
import { GestureLayer } from './Gesture';
import type { VisualProps } from './common';
import { layoutPieces, type PiecesConfig } from './pieces';

export const MONEY_CONFIG: PiecesConfig = {
  lineH: 30,
  dims: [
    { w: 22, h: 22, pitch: 15 },
    { w: 36, h: 20, pitch: 13 },
    { w: 40, h: 22, pitch: 13 },
  ],
  squeeze: [
    { w: 22, pitch: 1.2 },
    { w: 36, pitch: 1 },
    { w: 40, pitch: 1 },
  ],
  style: 'exchange',
};

export const MONEY_LABEL = ['1€', '10 €', '100 €'];

/** Pièces de 1 €, billets de 10 € et de 100 €, échangés à la banque. */
export default function Money({ lesson, step, gesture }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const layout = width ? layoutPieces(lesson, step, width, MONEY_CONFIG) : null;
  return (
    <div ref={ref} className="vis money">
      {layout && (
        <Columns lesson={lesson} step={step} width={width} height={layout.height}>
          <Pieces items={layout.items} render={(p) => <span>{MONEY_LABEL[p.rank]}</span>} />
          <Extras extras={layout.extras} />
          {gesture && <GestureLayer rects={columnRects(lesson.n, width)} height={layout.height} gesture={gesture} />}
        </Columns>
      )}
    </div>
  );
}
