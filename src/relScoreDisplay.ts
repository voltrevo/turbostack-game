export function relScoreDisplay(relPreviewBoardRating: number | undefined) {
  if (relPreviewBoardRating === undefined) {
    return '';
  }

  if (relPreviewBoardRating === 0) {
    return 'optimal';
  }

  return `${(-relPreviewBoardRating / 1200).toFixed(2)} fewer tetrises`;
}
