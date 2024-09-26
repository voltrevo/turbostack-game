import React, { useState, useRef, useEffect } from 'react';
import { Board } from './Board';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import getReviewData, { ReviewData } from './getReviewData';
import dataCollector from './dataCollector';

const Review: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const [mousePos, setMousePos] = useState<{ i: number, j: number }>();
  const currentChoices = ctx.currentChoices.use();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [reviewData, setReviewData] = useState<ReviewData>();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    (async () => {
      if (!ctx.predictionModel) {
        return;
      }

      const rd = await getReviewData(ctx.predictionModel, setProgress);

      if (rd.length === 0) {
        return;
      }

      setReviewData(rd);
      ctx.board.set(rd[0].from);
      ctx.setCurrentPiece(rd[0].pieceType);
    })();
  }, []);

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
    if (!reviewData || !previewBoard) {
      return;
    }

    const rev = reviewData[reviewIndex];

    dataCollector.at(rev.i).set({
      time: rev.time,
      lastReview: Date.now(),
      from: rev.from.toJson(),
      to: rev.to.toJson(),
    });

    if (reviewIndex === reviewData.length - 1) {
      alert('finished');
      return;
    }

    const ri = reviewIndex + 1;
    setReviewIndex(ri);
    ctx.board.set(reviewData[ri].from);
    ctx.setCurrentPiece(reviewData[ri].pieceType);
  };

  const renderCell = (i: number, j: number) => {
    const isFilled = board.get(i, j);

    const isPreviousMove = (
      (
        !isFilled &&
        reviewData &&
        reviewData[reviewIndex].to.get(i, j)
      ) ||
      false
    );

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
      : isPreviousMove
      ? 'cell previous-move'
      : 'cell';

    return <>
      <div
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

  if (!reviewData) {
    return <div>Loading... {progress}</div>;
  }

  return (
    <div className="game-container">
      <div
        className="game-area"
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {renderGrid()}
      </div>
      <div className="score-panel">
        <h3>Lines: {board.lines_cleared} / {stdMaxLines}</h3>
        <h3>Score: {scoreDisplay(board.score)}</h3>
        <h3>Tetris Rate: {Math.floor(board.getTetrisRate() * 100)}%</h3>
        <div style={{ marginTop: '0.5em' }}>
          <button onClick={() => ctx.page.set('game')}>Play Game</button>
        </div>
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

export default Review;
