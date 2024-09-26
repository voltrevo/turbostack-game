export default function softmax(x: number[]) {
  const e = x.map((v) => Math.exp(v));
  const sum = e.reduce((a, b) => a + b);
  return e.map((v) => v / sum);
}
