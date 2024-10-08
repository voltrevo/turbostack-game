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
        <div className="score-box">
          <div>Lines: {board.lines_cleared} / {stdMaxLines}</div>
          <div>Score: {scoreDisplay(board.score)}</div>
          <div>Tetris Rate: {Math.floor(board.getTetrisRate() * 100)}%</div>
        </div>

        <div className="score-box">
          <div>
            <input
              type="checkbox"
              checked={showAi}
              onChange={() => setShowAi(!showAi)}
            />
            Show AI
          </div>
          {showAi && (
            <>
              <div>
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={() => ctx.autoPlay.set(!autoPlay)}
                />
                Autoplay
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={top5Only}
                  onChange={() => setTop5Only(!top5Only)}
                />
                Top 5 Only
              </div>
              {!top5Only && (
                <>
                  <div>
                    Rating: {relScoreDisplay(relPreviewBoardRating)}
                  </div>
                  <div>
                    Prediction:{' '}
                    {currentChoiceWeights
                      ? `${scoreDisplay(Math.max(...currentChoiceWeights))}`
                      : ''}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="score-box">
          <div><button onClick={() => ctx.restart()}>Restart</button></div>
          {ctx.scoreModel && (
            <>
              <div><button onClick={() => {
                ctx.reviewMode.set('current');
                ctx.page.set('review');
              }}>
                Review Session
              </button></div>

              <div><button onClick={() => {
                ctx.reviewMode.set('all');
                ctx.page.set('review');
              }}>
                Review History
              </button></div>

              <div><button onClick={() => {
                ctx.page.set('versus');
              }}>
                Play vs AI
              </button></div>
            </>
          )}
          <button onClick={() => ctx.downloadData()}>Download your data</button>
        </div>
      </div>
    </div>
  );
};

export default Game;