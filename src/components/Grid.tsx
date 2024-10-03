import React from 'react';
import { Board } from '../Board';

type GridProps = {
  board: Board;
  previewBoard?: Board;
  currentCellWeights?: number[][];
  showAi?: boolean;
  onCellRender?: (i: number, j: number) => React.ReactNode;
  startRow?: number;
  endRow?: number;
};

const Grid: React.FC<GridProps> = ({
  board,
  previewBoard,
  currentCellWeights,
  showAi,
  onCellRender,
  startRow = 5,
  endRow = 20,
}) => {
  const cells = [];
  for (let i = startRow; i < endRow; i++) {
    for (let j = 0; j < 10; j++) {
      const isFilled = board.get(i, j);
      const weight = currentCellWeights ? currentCellWeights[i][j] : 0;
      const isPreview = !isFilled && previewBoard && previewBoard.get(i, j);

      const className = isFilled
        ? 'cell filled'
        : isPreview
        ? 'cell preview'
        : 'cell';

      cells.push(
        <div key={`${i}-${j}`} className={className}>
          {showAi && <div className="ai-dot" style={{ opacity: weight }}></div>}
          {onCellRender && onCellRender(i, j)}
        </div>
      );
    }
  }
  return <div className="grid">{cells}</div>;
};

export default Grid;