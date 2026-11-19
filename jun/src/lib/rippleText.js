export function getRippleTextLayout(width, height, lineCount = 3) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeLineCount = Math.max(1, lineCount);
  const fontSize = Math.min(safeWidth * 0.16, safeHeight * 0.34);
  const lineHeight = fontSize * 0.84;
  const totalHeight = lineHeight * safeLineCount + fontSize * 0.16;

  return {
    fontSize,
    lineHeight,
    startY: Math.max(0, (safeHeight - totalHeight) / 2),
  };
}
