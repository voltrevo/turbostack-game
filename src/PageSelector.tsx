import Game from "./Game";
import Review from "./Review";
import TurboStackCtx from "./TurboStackCtx";
import Versus from "./Versus";

export default function PageSelector() {
  const ctx = TurboStackCtx.use();
  const page = ctx.page.use();

  switch (page) {
    case 'game':
      return <Game />;
    case 'review':
      return <Review />;
    case 'versus':
      return <Versus />;

    default:
      softNever(page);
  }

  return <>Not found</>;
}

function softNever(_x: never) {}
