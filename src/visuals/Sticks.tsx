import { useWidth } from '../lib/hooks';
import { Columns, Extras, Pieces } from './Board';
import type { VisualProps } from './common';
import { layoutPieces, type PiecesConfig } from './pieces';

export const STICKS_CONFIG: PiecesConfig = {
  lineH: 42,
  dims: [
    { w: 6, h: 36, pitch: 10 },
    { w: 14, h: 36, pitch: 19 },
    { w: 18, h: 36, pitch: 23 },
  ],
  squeeze: [
    { w: 1.4, pitch: 1.4 },
    { w: 1.8, pitch: 1.8 },
    { w: 2, pitch: 2 },
  ],
  style: 'bundle',
};

/** Bâtonnets, fagots de 10 et gros paquets de 100. */
export default function Sticks({ lesson, step }: VisualProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const layout = width ? layoutPieces(lesson, step, width, STICKS_CONFIG) : null;
  return (
    <div ref={ref} className="vis sticks">
      {layout && (
        <Columns lesson={lesson} step={step} width={width} height={layout.height}>
          <Pieces items={layout.items} />
          <Extras extras={layout.extras} />
        </Columns>
      )}
    </div>
  );
}
