import React from 'react';
import TurboStackCtx from './TurboStackCtx';
import { choosePreviewBoard, scoreDisplay } from './gameUtils';
import Grid from './components/Grid';
import { useMousePosition } from './hooks/useMousePosition';
import { Board } from './Board';
import { stdMaxLines } from './hyperParams';

const Game: React.FC = () => {
  const ctx = TurboStackCtx.use().vs;

  const playerBoard = ctx.boards.player.use();
  const aiBoard = ctx.boards.ai.use();
  const aiNextBoard = ctx.boards.aiNextBoard.use();
  const choices = ctx.currentChoices.use();
  const gameOver = ctx.gameOver.use();

  const gameResult = (() => {
    if (playerBoard.score > aiBoard.score) {
      return { player: 'WIN', ai: 'LOSE' };
    }

    if (playerBoard.score < aiBoard.score) {
      return { player: 'LOSE', ai: 'WIN' };
    }

    return { player: 'DRAW', ai: 'DRAW' };
  })();

  const { mousePos, gameAreaRef, handleMouseMove } = useMousePosition();

  let previewBoard: Board | undefined;

  {
    const result = choosePreviewBoard(playerBoard, choices, mousePos);
    previewBoard = result.choice;
  }

  const handleClick = () => {
    if (!playerBoard.finished && previewBoard) {
      ctx.chooseBoard(previewBoard);
    }
  };

  return (
    <div className="multi-game-container">
      <div className="game-container">
        <div className="score-panel">
          <div className="score-box">
            <div className="score-item">Lines<br/>{playerBoard.lines_cleared} / {stdMaxLines}</div>
            <div className="score-item">Score<br/>{scoreDisplay(playerBoard.score)}</div>
            <div className="score-item">Tetris Rate<br/>{Math.floor(playerBoard.getTetrisRate() * 100)}%</div>
          </div>
        </div>
        <div
          className="small-game-area"
          ref={gameAreaRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          <Grid
            board={playerBoard}
            previewBoard={previewBoard}
          />
          {gameOver && <div className="game-over">
            <h2>{gameResult.player}</h2>
            <button onClick={() => ctx.restart()}>Play Again</button>
          </div>}
        </div>
      </div>
      <div className="game-container">
        <div className="score-panel">
          <div className="score-box">
            <div className="score-item">Lines<br/>{aiBoard.lines_cleared} / {stdMaxLines}</div>
            <div className="score-item">Score<br/>{scoreDisplay(aiBoard.score)}</div>
            <div className="score-item">Tetris Rate<br/>{Math.floor(aiBoard.getTetrisRate() * 100)}%</div>
          </div>
        </div>
        <div className="small-game-area">
          <Grid
            board={aiBoard}
            previewBoard={aiNextBoard}
          />
          {gameOver && <div className="game-over">
            <h2>{gameResult.ai}</h2>
            <button style={{ visibility: 'hidden' }} onClick={() => ctx.restart()}>Play Again</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default Game;
