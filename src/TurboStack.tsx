import React, { useState, useEffect, useRef } from 'react';
import { Board } from './Board';
import { stdMaxLines } from './params';
import { getRandomPieceType } from './PieceType';

const TurboStack: React.FC = () => {
  const [board, setBoard] = useState<Board>(new Board(stdMaxLines));
  const [previewBoard, setPreviewBoard] = useState<Board | null>(null);
  const [boardSequence, setBoardSequence] = useState<Board[]>([]);
  const [highScores, setHighScores] = useState<number[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Board[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!board.finished) {
      const choices = board.findChoices(getRandomPieceType());
      setCurrentChoices(choices);
    } else {
      // Update high scores
      const newScores = [...highScores, board.score]
        .sort((a, b) => b - a)
        .slice(0, 10);
      setHighScores(newScores);
    }
  }, [board]);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (board.finished || currentChoices.length === 0) return;

    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const cellWidth = rect.width / 10;
    const cellHeight = rect.height / 20;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Map cursor position to grid coordinates
    const col = Math.floor(mouseX / cellWidth);
    const row = Math.floor(mouseY / cellHeight);

    // Find the choice closest to the cursor
    let closestChoice: Board | null = null;
    let minDistance = Infinity;

    currentChoices.forEach((choice) => {
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 10; j++) {
          if (choice.get(i, j) && !board.get(i, j)) {
            const dx = j - col;
            const dy = i - row;
            const distance = dx * dx + dy * dy;
            if (distance < minDistance) {
              minDistance = distance;
              closestChoice = choice;
            }
          }
        }
      }
    });

    setPreviewBoard(closestChoice);
  };

  const handleClick = () => {
    if (board.finished || !previewBoard) return;

    // Confirm placement
    setBoard(previewBoard);
    setBoardSequence([...boardSequence, previewBoard]);
    setPreviewBoard(null);
  };

  const handleRestart = () => {
    const newBoard = new Board(stdMaxLines);
    setBoard(newBoard);
    setBoardSequence([]);
    setPreviewBoard(null);
  };

  const renderCell = (i: number, j: number) => {
    const isFilled = board.get(i, j);
    let isPreview = false;

    if (previewBoard && !isFilled) {
      isPreview = previewBoard.get(i, j);
    }

    const className = isFilled
      ? 'cell filled'
      : isPreview
      ? 'cell preview'
      : 'cell';

    return <div key={`${i}-${j}`} className={className} />;
  };

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < 20; i++) {
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
            <button onClick={handleRestart}>Restart</button>
            <div className="high-scores">
              <h3>High Scores</h3>
              <ol>
                {highScores.map((score, index) => (
                  <li
                    key={index}
                    className={score === board.score ? 'current-score' : ''}
                  >
                    {score}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
      <div className="score-panel">
        <h3>Score: {board.score}</h3>
        <h3>Tetris Rate: {Math.floor(board.getTetrisRate() * 100)}%</h3>
        {!board.finished && <button onClick={handleRestart}>Restart</button>}
      </div>
    </div>
  );
};

export default TurboStack;
