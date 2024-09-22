import { grids, Piece, PieceType, RotateDir } from './PieceType';

class BoardRow {
    private value: number;

    constructor() {
        this.value = 0;
    }

    full(): boolean {
        return this.value === 0b1111111111; // 10 bits set to 1
    }

    get(j: number): boolean {
        return (this.value & (1 << (9 - j))) !== 0;
    }

    set(j: number, value: boolean): void {
        const bitMask = 1 << (9 - j);
        if (value) {
            this.value |= bitMask;
        } else {
            this.value &= ~bitMask;
        }
    }

    flip(j: number): void {
        this.value ^= 1 << (9 - j);
    }

    clone(): BoardRow {
        const newRow = new BoardRow();
        newRow.value = this.value;
        return newRow;
    }
}

class BoardCol {
    private value: number;

    constructor() {
        this.value = 0;
    }

    removeRow(i: number): void {
        const keepMask = (1 << (19 - i)) - 1;
        const shifted = this.value >> 1;
        this.value = (~keepMask & shifted) | (keepMask & this.value);
    }

    height(): number {
        return 32 - Math.clz32(this.value);
    }

    get(i: number): boolean {
        return (this.value & (1 << (19 - i))) !== 0;
    }

    getMinus1(i: number): boolean {
        return (this.value & (1 << (20 - i))) !== 0;
    }

    set(i: number, value: boolean): void {
        const mask = 1 << (19 - i);
        if (value) {
            this.value |= mask;
        } else {
            this.value &= ~mask;
        }
    }

    flip(i: number): void {
        this.value ^= 1 << (19 - i);
    }

    findRestPositions(j: number): [number, number][] {
        const height = this.height();
        const res: [number, number][] = height === 20 ? [] : [[19 - height, j]];

        const y = 1 << height;
        const fullOtherwise = y - 1;

        if (this.value === fullOtherwise) {
            return res;
        }

        for (let i = 21 - height; i < 20; i++) {
            if (!this.get(i) && (i === 19 || this.get(i + 1))) {
                res.push([i, j]);
            }
        }

        return res;
    }

    top(): number {
        return 20 - this.height();
    }

    clone(): BoardCol {
        const newCol = new BoardCol();
        newCol.value = this.value;
        return newCol;
    }
}

export type BoardJson = ReturnType<Board['toJson']>;

export class Board {
    rows: BoardRow[];
    cols: BoardCol[];
    lines_cleared: number;
    lines_cleared_max: number;
    finished: boolean;
    score: number;
    tetrises: number;

    constructor(lines_cleared_max: number) {
        this.rows = Array.from({ length: 20 }, () => new BoardRow());
        this.cols = Array.from({ length: 10 }, () => new BoardCol());
        this.lines_cleared = 0;
        this.lines_cleared_max = lines_cleared_max;
        this.finished = false;
        this.score = 0;
        this.tetrises = 0;
    }

    toJson() {
        return {
            compact: this.toCompactString(),
            linesCleared: this.lines_cleared,
            linesClearedMax: this.lines_cleared_max,
            finished: this.finished,
            score: this.score,
            tetrises: this.tetrises,
        };
    }

    static fromJson(json: BoardJson) {
        const board = Board.fromCompact(json.linesClearedMax, json.compact);
        board.lines_cleared = json.linesCleared;
        board.finished = json.finished;
        board.score = json.score;
        board.tetrises = json.tetrises;

        return board;
    }

    static fromCompact(lines_cleared_max: number, s: string): Board {
        const board = new Board(lines_cleared_max);

        for (let x = 0; x < s.length; x++) {
            const c = s.charAt(x);
            if (c === '1') {
                board.flip(Math.floor(x / 10), x % 10);
            }
        }

        return board;
    }

    getTetrisRate() {
        return (4 * this.tetrises) / this.lines_cleared;
    }

    removeClears(): void {
        let linesCleared = 0;

        for (let i = 0; i < 20; i++) {
            if (this.rows[i].full()) {
                this.removeRow(i);
                linesCleared += 1;
            }
        }

        switch (linesCleared) {
            case 0:
                this.score += 0;
                break;
            case 1:
                this.score += 40;
                break;
            case 2:
                this.score += 100;
                break;
            case 3:
                this.score += 300;
                break;
            case 4:
                this.tetrises += 1;
                this.score += 1200;
                break;
            default:
                throw new Error("Cleared more than 4 lines");
        }

        this.lines_cleared += linesCleared;

        if (this.lines_cleared >= this.lines_cleared_max) {
            this.finished = true;
        }
    }

    removeRow(i: number): void {
        for (let j = i; j >= 1; j--) {
            this.rows[j] = this.rows[j - 1];
        }
        this.rows[0] = new BoardRow();

        for (const col of this.cols) {
            col.removeRow(i);
        }
    }

    get(i: number, j: number): boolean {
        return this.rows[i].get(j);
    }

    getSigned(i: number, j: number): boolean {
        if (j < 0 || j >= 10) {
            return true;
        }

        if (i >= 20) {
            return true;
        }

        if (i < 0) {
            return false;
        }

        return this.get(i, j);
    }

    set(i: number, j: number, value: boolean): void {
        this.rows[i].set(j, value);
        this.cols[j].set(i, value);
    }

    flip(i: number, j: number): void {
        this.rows[i].flip(j);
        this.cols[j].flip(i);
    }

    pieceOverlaps(piece: Piece): boolean {
        for (const [i, j] of piece.cellPositions()) {
            if (this.getSigned(i, j)) {
                return true;
            }
        }
        return false;
    }

    static minI(_j: number): number {
        return 5;
    }

    canFitPiece(piece: Piece): boolean {
        if (this.pieceOverlaps(piece)) {
            return false;
        }

        if (this.pieceReachableSimple(piece)) {
            return true;
        }

        // Attempt to rotate or shift the piece
        for (const dir of [RotateDir.Cw, RotateDir.Ccw]) {
            const altPiece = piece.clone();
            altPiece.rotate(dir);

            if (!this.pieceOverlaps(altPiece) && this.pieceReachableSimple(altPiece)) {
                return true;
            }
        }

        for (const jShift of [-1, 1]) {
            const altPiece = piece.clone();
            altPiece.pos = [altPiece.pos[0], altPiece.pos[1] + jShift];

            if (!this.pieceOverlaps(altPiece) && this.pieceReachableSimple(altPiece)) {
                return true;
            }
        }

        return false;
    }

    pieceReachableSimple(piece: Piece): boolean {
        for (const [i, j] of piece.cellPositions()) {
            if (i < 0) {
                continue;
            }

            if (i > 20) {
                return false;
            }

            const cellHeight = 20 - i;
            const colHeight = this.cols[j].height();

            if (cellHeight <= colHeight) {
                return false;
            }
        }
        return true;
    }

    insertPieceUnchecked(piece: Piece): void {
        for (const [i, j] of piece.cellPositions()) {
            if (i < 0) {
                continue;
            }
            this.flip(i, j);
        }
    }

    findChoices(pieceType: PieceType): Board[] {
        const fittablePieces = new Map<number, Piece>();
        const restPositions = this.findRestPositions();

        for (const grid of grids(pieceType)) {
            const piece = new Piece(pieceType, grid, [0, 0]);

            for (const cellPos of piece.cellPositions()) {
                for (const restPos of restPositions) {
                    const newPiece = piece.clone();
                    newPiece.pos = [restPos[0] - cellPos[0], restPos[1] - cellPos[1]];

                    if (this.canFitPiece(newPiece)) {
                        const key = newPiece.toMapKey();
                        fittablePieces.set(key, newPiece);
                    }
                }
            }
        }

        const res: Board[] = [];

        for (const piece of fittablePieces.values()) {
            const board = this.clone();
            board.insertPieceUnchecked(piece);

            for (const [i, j] of board.cols.map((c, j) => [c.top(), j])) {
                if (i < Board.minI(j)) {
                    board.finished = true;
                }
            }

            res.push(board);
        }

        return res;
    }

    findRestPositions(): [number, number][] {
        let res: [number, number][] = [];

        for (let j = 0; j < 10; j++) {
            res = res.concat(this.cols[j].findRestPositions(j));
        }

        return res;
    }

    heights(): number[] {
        return this.cols.map(col => col.height());
    }

    toCompactString(): string {
        let res = '';

        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 10; j++) {
                res += this.get(i, j) ? '1' : '0';
            }
        }

        return res;
    }

    linesRemaining(): number {
        return Math.max(0, this.lines_cleared_max - this.lines_cleared);
    }

    clone(): Board {
        const newBoard = new Board(this.lines_cleared_max);
        newBoard.rows = this.rows.map(row => row.clone());
        newBoard.cols = this.cols.map(col => col.clone());
        newBoard.lines_cleared = this.lines_cleared;
        newBoard.finished = this.finished;
        newBoard.score = this.score;
        newBoard.tetrises = this.tetrises;
        return newBoard;
    }

    maxHeight() {
        return this.cols.map(c => c.height()).reduce((a, b) => Math.max(a, b));
    }

    toString(): string {
        let res = 'Board [\n';
        res += '   ....................\n';

        for (let i = 0; i < 20; i++) {
            res += '  |';
            for (let j = 0; j < 10; j++) {
                res += this.get(i, j) ? '[]' : '  ';
            }
            res += '|\n';
        }

        res += '  \\--------------------/\n\n';
        res += `  lines: ${this.lines_cleared}/${this.lines_cleared_max}\n`;
        res += `  score: ${this.score}\n`;
        res += `  eff  : ${Math.round(this.score / this.lines_cleared)}\n`;
        res += `  trt  : ${((4.0 * this.tetrises) / this.lines_cleared * 100).toFixed(1)}%\n`;
        res += ']';

        return res;
    }

    toStringDiff(prevBoard: Board): string {
        let res = 'Board [\n';
        res += '   ....................\n';

        for (let i = 0; i < 20; i++) {
            res += '  |';
            for (let j = 0; j < 10; j++) {
                const currCell = this.get(i, j);
                const prevCell = prevBoard.get(i, j);

                if (currCell && !prevCell) {
                    res += '##'; // New cell added
                } else if (!currCell && prevCell) {
                    res += '--'; // Cell removed (after line clear)
                } else if (currCell) {
                    res += '[]'; // Existing cell
                } else {
                    res += '  '; // Empty cell
                }
            }
            res += '|\n';
        }

        res += '  \\--------------------/\n\n';
        res += `  lines: ${this.lines_cleared}/${this.lines_cleared_max}\n`;
        res += `  score: ${this.score}\n`;
        res += `  eff  : ${Math.round(this.score / (this.lines_cleared || 1))}\n`;
        res += `  trt  : ${this.lines_cleared ? ((4.0 * this.tetrises) / this.lines_cleared * 100).toFixed(1) : '0.0'}%\n`;
        res += ']';

        return res;
    }
}
