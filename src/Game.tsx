import React, { useState, useRef } from 'react';
import { Board } from './Board';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';

const Game: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const [mousePos, setMousePos] = useState<{ i: number, j: number }>();
  const highScores = ctx.highScores.use();
  const currentChoices = ctx.currentChoices.use();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const cellWidth = rect.width / 10;
    const cellHeight = rect.height / 15;

    setMousePos({
      i: (event.clientY - rect.top) / cellHeight + 5,
      j: (event.clientX - rect.left) / cellWidth,
    });
  };

  const previewBoard = choosePreviewBoard(board, currentChoices, mousePos);

  const handleClick = () => {
    if (!board.finished && previewBoard) {
      ctx.chooseBoard(previewBoard);
    }
  };

  const renderCell = (i: number, j: number) => {
    const isFilled = board.get(i, j);

    const currentChoiceWeights = ctx.currentChoiceWeights.get();

    const weight = currentChoiceWeights ? currentChoiceWeights[i][j] : 0;
    let isPreview = false;

    if (!isFilled && previewBoard && previewBoard.get(i, j)) {
      isPreview = true;
    }

    const className = isFilled
      ? 'cell filled'
      : isPreview
      ? 'cell preview'
      : 'cell';

    // const cv = Math.floor(16 + 100 * weight);

    return <>
      <div
        // style={{ border: `3px solid rgb(${cv}, ${cv}, ${cv})` }}
        key={`${i}-${j}`}
        className={className}
      >
        <div className="ai-dot" style={{ opacity: weight }}></div>
      </div>
    </>;
  };

  const renderGrid = () => {
    const cells = [];
    for (let i = 5; i < 20; i++) {
      for (let j = 0; j < 10; j++) {
        cells.push(renderCell(i, j));
      }
    }
    return <div className="grid">{cells}</div>;
  };

  return (
    <div className="game-container">
      <div
        className="game-area"
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {renderGrid()}
        {board.finished && (
          <div className="game-over">
            <h2>Game Over</h2>
            <button onClick={() => ctx.restart()}>Play Again</button>
            <div className="high-scores">
              <h3>High Scores</h3>
              <ol>
                {highScores.map((score, index) => (
                  <li
                    key={index}
                    className={score === board.score ? 'current-score' : ''}
                  >
                    {scoreDisplay(score)}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
      <div className="score-panel">
        <h3>Lines: {board.lines_cleared} / {stdMaxLines}</h3>
        <h3>Score: {scoreDisplay(board.score)}</h3>
        <h3>Tetris Rate: {Math.floor(board.getTetrisRate() * 100)}%</h3>
        <div>
          {!board.finished && <button onClick={() => ctx.restart()}>Restart</button>}
        </div>
        {ctx.predictionModel && (
          <div style={{ marginTop: '0.5em' }}>
            <button onClick={() => ctx.page.set('review')}>Review</button>
          </div>
        )}
        <div style={{ marginTop: '0.5em' }}>
          <button onClick={() => ctx.downloadData()}>Download your data</button>
        </div>
      </div>
    </div>
  );
};

function calculateCenterOfMass(
  board: Board,
  choice: Board,
) {
  let sumI = 0;
  let sumJ = 0;
  let count = 0;

  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 10; j++) {
      if (choice.get(i, j) && !board.get(i, j)) {
        // Calculate the center position of this block
        sumI += (i + 0.5);
        sumJ += (j + 0.5);
        count++;
      }
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    i: sumI / count,
    j: sumJ / count,
  };
}

function choosePreviewBoard(
  board: Board,
  currentChoices: Board[],
  mousePos: { i: number, j: number } | undefined,
) {
  if (board.finished || currentChoices.length === 0 || !mousePos) {
    return undefined;
  }

  const choiceDistances = currentChoices.map(choice => {
    const center = calculateCenterOfMass(board, choice)!;
    const di = center.i - mousePos.i;
    const dj = center.j - mousePos.j;
    return Math.sqrt(di * di + dj * dj);
  });

  const sortedIndexes = [...new Array(currentChoices.length)].map((_, i) => i);
  sortedIndexes.sort((a, b) => choiceDistances[a] - choiceDistances[b]);

  const closestChoice = currentChoices[sortedIndexes[0]];
  // const closestChoiceDistance = choiceDistances[sortedIndexes[pick % sortedIndexes.length]];

  return closestChoice;
}

function scoreDisplay(rawScore: number) {
  return (19 * rawScore).toLocaleString();
}

export default Game;
