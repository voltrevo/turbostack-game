import React, { useState, useEffect } from 'react';
import TurboStackCtx from './TurboStackCtx';
import { stdMaxLines } from './params';
import getReviewData, { ReviewData } from './getReviewData';
import dataCollector from './dataCollector';
import { relScoreDisplay } from './relScoreDisplay';
import { choosePreviewBoard, scoreDisplay } from './gameUtils';
import Grid from './components/Grid';
import { useMousePosition } from './hooks/useMousePosition';

const Review: React.FC = () => {
  const ctx = TurboStackCtx.use();
  const board = ctx.board.use();
  const currentChoices = ctx.currentChoices.use();
  const currentChoiceWeights = ctx.currentChoiceWeights.use();
  const [reviewData, setReviewData] = useState<ReviewData>();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [progress, setProgress] = useState('');

  const { mousePos, gameAreaRef, handleMouseMove } = useMousePosition();

  useEffect(() => {
    (async () => {
      if (!ctx.scoreModel) {
        return;
      }

      const rd = await getReviewData(
        ctx.reviewMode.get(),
        ctx.scoreModel,
        setProgress
      );

      if (rd.length === 0) {
        return;
      }

      setReviewData(rd);
      ctx.board.set(rd[0].from);
      ctx.setCurrentPiece(rd[0].pieceType);
    })();
  }, [ctx]);

  const { choice: previewBoard } = choosePreviewBoard(
    board,
    currentChoices,
    mousePos
  );
  let previewWeight: number | undefined;

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
        <Grid
          board={board}
          previewBoard={previewBoard}
          currentCellWeights={ctx.currentCellWeights.get()}
          showAi={true}
          onCellRender={(i, j) => {
            const isFilled = board.get(i, j);
            const isPreviousMove =
              !isFilled &&
              reviewData &&
              reviewData[reviewIndex].to.get(i, j);
            return isPreviousMove ? (
              <div className="previous-move-marker"></div>
            ) : null;
          }}
        />
      </div>
      <div className="score-panel" style={{ width: '17em' }}>
        <h3>
          Review: {reviewIndex + 1} / {reviewData.length}
        </h3>
        <h3>
          Yellow:{' '}
          {relScoreDisplay(
            reviewData[reviewIndex].weight - reviewData[reviewIndex].maxWeight
          )}
        </h3>
        <h3>
          Selected:{' '}
          {relScoreDisplay(
            previewWeight && previewWeight - reviewData[reviewIndex].maxWeight
          )}
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
          <button onClick={() => ctx.downloadData()}>
            Download your data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Review;
