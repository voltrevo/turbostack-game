import React, { useState, useRef } from 'react';
import { Board } from './Board';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import { relScoreDisplay } from './relScoreDisplay';
import { choosePreviewBoard, scoreDisplay } from './gameUtils';

const Game: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const [mousePos, setMousePos] = useState<{ i: number; j: number }>();
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
    const result = choosePreviewBoard(board, applicableChoices, mousePos);
    previewBoard = result.choice;
    previewBoardIndex = result.index;

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

  const renderGrid = () => {
    const cells = [];
    for (let i = 5; i < 20; i++) {
      for (let j = 0; j < 10; j++) {
        const isFilled = board.get(i, j);
        const applicableWeights = top5Only ? currentTop5CellWeights : currentCellWeights;
        const weight = applicableWeights ? applicableWeights[i][j] : 0;
        const isPreview = !isFilled && previewBoard && previewBoard.get(i, j);

        const className = isFilled
          ? 'cell filled'
          : isPreview
          ? 'cell preview'
          : 'cell';

        cells.push(
          <div key={`${i}-${j}`} className={className}>
            {showAi && <div className="ai-dot" style={{ opacity: weight }}></div>}
          </div>
        );
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
        <h3>
          Lines: {board.lines_cleared} / {stdMaxLines}
        </h3>
        <h3>Score: {scoreDisplay(board.score)}</h3>
        <h3>Tetris Rate: {Math.floor(board.getTetrisRate() * 100)}%</h3>
        <h3>
          <input
            type="checkbox"
            checked={showAi}
            onChange={() => setShowAi(!showAi)}
          />
          Show AI
        </h3>
        {showAi && (
          <>
            <h3>
              <input
                type="checkbox"
                checked={top5Only}
                onChange={() => setTop5Only(!top5Only)}
              />
              Top 5 Only
            </h3>
            {!top5Only && (
              <>
                <h3 style={{ width: '15em' }}>
                  Rating: {relScoreDisplay(relPreviewBoardRating)}
                </h3>
                <h3>
                  Prediction:{' '}
                  {currentChoiceWeights
                    ? `${scoreDisplay(Math.max(...currentChoiceWeights))}`
                    : ''}
                </h3>
              </>
            )}
          </>
        )}
        <div>
          {!board.finished && (
            <button onClick={() => ctx.restart()}>Restart</button>
          )}
        </div>
        {ctx.scoreModel && (
          <div style={{ marginTop: '0.5em' }}>
            <button
              onClick={() => {
                ctx.reviewMode.set('current');
                ctx.page.set('review');
              }}
            >
              Review Session
            </button>
          </div>
        )}
        {ctx.scoreModel && (
          <div style={{ marginTop: '0.5em' }}>
            <button
              onClick={() => {
                ctx.reviewMode.set('all');
                ctx.page.set('review');
              }}
            >
              Review History
            </button>
          </div>
        )}
        <div style={{ marginTop: '0.5em' }}>
          <button onClick={() => ctx.downloadData()}>
            Download your data
          </button>
        </div>
        <h3>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={() => ctx.autoPlay.set(!autoPlay)}
          />
          Autoplay
        </h3>
      </div>
    </div>
  );
};

export default Game;
