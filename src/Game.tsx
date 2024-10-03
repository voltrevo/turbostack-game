import React, { useState } from 'react';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import { relScoreDisplay } from './relScoreDisplay';
import { choosePreviewBoard, scoreDisplay } from './gameUtils';
import Grid from './components/Grid';
import { useMousePosition } from './hooks/useMousePosition';
import { Board } from './Board';

const Game: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const highScores = ctx.highScores.use();
  const [showAi, setShowAi] = useState(false);
  const [top5Only, setTop5Only] = useState(false);
  const autoPlay = ctx.autoPlay.use();
  const currentChoiceWeights = ctx.currentChoiceWeights.use();
  const currentCellWeights = ctx.currentCellWeights.use();
  const currentTop5CellWeights = ctx.currentTop5CellWeights.use();
  const applicableChoices = top5Only ? ctx.currentTop5Choices.use() : ctx.currentChoices.use();

  const { mousePos, gameAreaRef, handleMouseMove } = useMousePosition();

  let previewBoard: Board | undefined;
  let previewBoardIndex: number | undefined;
  let previewBoardRating: number | undefined;
  let relPreviewBoardRating: number | undefined;

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

  const applicableWeights = top5Only ? currentTop5CellWeights : currentCellWeights;

  return (
    <div className="game-container">
      <div
        className="game-area"
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <Grid
          board={board}
          previewBoard={previewBoard}
          currentCellWeights={applicableWeights}
          showAi={showAi}
        />
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
          <button onClick={() => ctx.downloadData()}>Download your data</button>
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