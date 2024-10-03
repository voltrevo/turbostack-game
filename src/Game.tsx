import React, { useState, useRef } from 'react';
import { Board } from './Board';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import { relScoreDisplay } from './relScoreDisplay';

const Game: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const [mousePos, setMousePos] = useState<{ i: number, j: number }>();
  const highScores = ctx.highScores.use();
  const currentChoices = ctx.currentChoices.use();
  const currentTop5Choices = ctx.currentTop5Choices.use();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [showAi, setShowAi] = useState(false);
  const [top5Only, setTop5Only] = useState(false);
  const autoPlay = ctx.autoPlay.use();
  const currentChoiceWeights = ctx.currentChoiceWeights.use();
  const currentCellWeights = ctx.currentCellWeights.use();
  const currentTop5CellWeights = ctx.currentTop5CellWeights.use();
  const applicableChoices = top5Only ? currentTop5Choices : currentChoices;

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

  let previewBoard: Board | undefined = undefined;
  let previewBoardIndex: number | undefined = undefined;
  let previewBoardRating: number | undefined = undefined;
  let relPreviewBoardRating: number | undefined = undefined;

  if (!autoPlay) {
    previewBoardIndex = choosePreviewBoard(board, applicableChoices, mousePos);
    previewBoard = previewBoardIndex !== undefined ? applicableChoices[previewBoardIndex] : undefined;

    if (currentChoiceWeights && previewBoardIndex !== undefined) {
      const maxRating = Math.max(...currentChoiceWeights);
      previewBoardRating = currentChoiceWeights[previewBoardIndex];
      relPreviewBoardRating = previewBoardRating - maxRating;
    }
  }

  const handleClick = () => {
    if (!board.finished && previewBoard) {
      ctx.chooseBoard(previewBoard);
    }
  };

  const renderCell = (i: number, j: number) => {
    const isFilled = board.get(i, j);

    const applicableWeights = top5Only ? currentTop5CellWeights : currentCellWeights;

    const weight = applicableWeights ? applicableWeights[i][j] : 0;
    let isPreview = false;

    if (!isFilled && previewBoard && previewBoard.get(i, j)) {
      isPreview = true;
    }

    const className = isFilled
      ? 'cell filled'
      : isPreview
      ? 'cell preview'
      : 'cell';

    return <>
      <div
        key={`${i}-${j}`}
        className={className}
      >
        {showAi && <div className="ai-dot" style={{ opacity: weight }}></div>}
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
        <h3>
          <input type="checkbox" checked={showAi} onChange={() => setShowAi(!showAi)} />
          Show AI
        </h3>
        {showAi && <>
          <h3>
            <input type="checkbox" checked={top5Only} onChange={() => setTop5Only(!top5Only)} />
            Top 5 Only
          </h3>
        </>}
        {showAi && !top5Only && <>
          <h3 style={{ width: '15em' }}>
            Rating: {relScoreDisplay(relPreviewBoardRating)}
          </h3>
          <h3>Prediction: {(() => {
            if (currentChoiceWeights === undefined) {
              return '';
            }

            return `${scoreDisplay(Math.max(...currentChoiceWeights))}`;
          })()}</h3>
        </>}
        <div>
          {!board.finished && <button onClick={() => ctx.restart()}>Restart</button>}
        </div>
        {ctx.scoreModel && (
          <div style={{ marginTop: '0.5em' }}>
            <button onClick={() => {
              ctx.reviewMode.set('current');
              ctx.page.set('review');
            }}>Review Session</button>
          </div>
        )}
        {ctx.scoreModel && (
          <div style={{ marginTop: '0.5em' }}>
            <button onClick={() => {
              ctx.reviewMode.set('all');
              ctx.page.set('review');
            }}>Review History</button>
          </div>
        )}
        <div style={{ marginTop: '0.5em' }}>
          <button onClick={() => ctx.downloadData()}>Download your data</button>
        </div>
        <h3>
          <input type="checkbox" checked={autoPlay} onChange={() => ctx.autoPlay.set(!autoPlay)} />
          Autoplay
        </h3>
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
    if (center === null) {
      return Infinity;
    }
    const di = center.i - mousePos.i;
    const dj = center.j - mousePos.j;
    return Math.sqrt(di * di + dj * dj);
  });

  const sortedIndexes = [...new Array(currentChoices.length)].map((_, i) => i);
  sortedIndexes.sort((a, b) => choiceDistances[a] - choiceDistances[b]);

  const closestChoiceIndex = sortedIndexes[0];
  // const closestChoiceDistance = choiceDistances[sortedIndexes[pick % sortedIndexes.length]];

  return closestChoiceIndex;
}

function scoreDisplay(rawScore: number) {
  return Math.round(19 * rawScore).toLocaleString();
}

export default Game;
