import { Board } from './Board.ts';

export function calculateCenterOfMass(board: Board, choice: Board) {
  let sumI = 0;
  let sumJ = 0;
  let count = 0;

  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 10; j++) {
      if (choice.get(i, j) && !board.get(i, j)) {
        sumI += i + 0.5;
        sumJ += j + 0.5;
        count++;
      }
    }
  }

  if (count === 0) {
    return null;
  }

  return { i: sumI / count, j: sumJ / count };
}

export function choosePreviewBoard(
  board: Board,
  currentChoices: Board[],
  mousePos: { i: number; j: number } | undefined
): { choice: Board | undefined; index: number | undefined } {
  if (board.finished || currentChoices.length === 0 || !mousePos) {
    return { choice: undefined, index: undefined };
  }

  const choiceDistances = currentChoices.map((choice) => {
    const center = calculateCenterOfMass(board, choice);

    if (center === null) {
      return Infinity;
    }

    const di = center.i - mousePos.i;
    const dj = center.j - mousePos.j;
    return Math.sqrt(di * di + dj * dj);
  });

  const sortedIndexes = choiceDistances
    .map((distance, index) => ({ distance, index }))
    .sort((a, b) => a.distance - b.distance);

  const closestChoiceIndex = sortedIndexes[0]?.index;
  const closestChoice = closestChoiceIndex !== undefined ? currentChoices[closestChoiceIndex] : undefined;

  return { choice: closestChoice, index: closestChoiceIndex };
}

export function scoreDisplay(rawScore: number) {
  return Math.round(19 * rawScore).toLocaleString();
}
