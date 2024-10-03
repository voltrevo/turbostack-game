import React, { useState, useRef, useEffect } from 'react';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import getReviewData, { ReviewData } from './getReviewData';
import dataCollector from './dataCollector';
import { relScoreDisplay } from './relScoreDisplay';
import { choosePreviewBoard, scoreDisplay } from './gameUtils';

const Review: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const [mousePos, setMousePos] = useState<{ i: number; j: number }>();
  const currentChoices = ctx.currentChoices.use();
  const currentChoiceWeights = ctx.currentChoiceWeights.use();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const [reviewData, setReviewData] = useState<ReviewData>();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    (async () => {
      if (!ctx.scoreModel) {
        return;
      }

      const rd = await getReviewData(ctx.reviewMode.get(), ctx.scoreModel, setProgress);

      if (rd.length === 0) {
        return;
      }

      setReviewData(rd);
      ctx.board.set(rd[0].from);
      ctx.setCurrentPiece(rd[0].pieceType);
    })();
  }, [ctx]);

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

  const { choice: previewBoard } = choosePreviewBoard(board, currentChoices, mousePos);
  let previewWeight: number | undefined = undefined;

  if (previewBoard && currentChoiceWeights) {
    const pi = currentChoices.indexOf(previewBoard);
    previewWeight = currentChoiceWeights[pi];
  }

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
      alert('Finished reviewing!');
      return;
    }

    const ri = reviewIndex + 1;
    setReviewIndex(ri);
    ctx.board.set(reviewData[ri].from);
    ctx.setCurrentPiece(reviewData[ri].pieceType);
  };

  const renderGrid = () => {
    const cells = [];
    for (let i = 5; i < 20; i++) {
      for (let j = 0; j < 10; j++) {
        const isFilled = board.get(i, j);

        const isPreviousMove =
          !isFilled && reviewData && reviewData[reviewIndex].to.get(i, j);

        const currentCellWeights = ctx.currentCellWeights.get();
        const weight = currentCellWeights ? currentCellWeights[i][j] : 0;

        const isPreview =
          !isFilled && previewBoard && previewBoard.get(i, j);

        const className = isFilled
          ? 'cell filled'
          : isPreview
          ? 'cell preview'
          : isPreviousMove
          ? 'cell previous-move'
          : 'cell';

        cells.push(
          <div key={`${i}-${j}`} className={className}>
            <div className="ai-dot" style={{ opacity: weight }}></div>
          </div>
        );
      }
    }
    return <div className="grid">{cells}</div>;
  };

  if (!reviewData) {
    return (
      <div>
        Loading... {progress}
      </div>
    );
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
      <div className="score-panel" style={{ width: '17em' }}>
        <h3>
          Review: {reviewIndex + 1} / {reviewData.length}
        </h3>
        <h3>
          Yellow: {relScoreDisplay(reviewData[reviewIndex].weight - reviewData[reviewIndex].maxWeight)}
        </h3>
        <h3>
          Selected: {relScoreDisplay(previewWeight && previewWeight - reviewData[reviewIndex].maxWeight)}
        </h3>
        <h3>
          Lines: {board.lines_cleared} / {stdMaxLines}
        </h3>
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

export default Review;
