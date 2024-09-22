export enum PieceType {
    I,
    O,
    J,
    L,
    S,
    Z,
    T,
}

export const ALL_PIECE_TYPES: PieceType[] = [
    PieceType.I,
    PieceType.O,
    PieceType.J,
    PieceType.L,
    PieceType.S,
    PieceType.Z,
    PieceType.T,
];

export enum RotateDir {
    Cw,
    Ccw,
}

export const PIECE_GRIDS: { [key in PieceType]: number[] } = {
    [PieceType.I]: [
        0b0000_0000_1111_0000,
        0b0010_0010_0010_0010,
        0b0000_0000_1111_0000,
        0b0010_0010_0010_0010,
    ],
    [PieceType.O]: [
        0b0000_0110_0110_0000,
        0b0000_0110_0110_0000,
        0b0000_0110_0110_0000,
        0b0000_0110_0110_0000,
    ],
    [PieceType.J]: [
        0b0000_1110_0010_0000,
        0b0100_0100_1100_0000,
        0b1000_1110_0000_0000,
        0b0110_0100_0100_0000,
    ],
    [PieceType.L]: [
        0b0000_1110_1000_0000,
        0b1100_0100_0100_0000,
        0b0010_1110_0000_0000,
        0b0100_0100_0110_0000,
    ],
    [PieceType.S]: [
        0b0000_0110_1100_0000,
        0b0100_0110_0010_0000,
        0b0000_0110_1100_0000,
        0b0100_0110_0010_0000,
    ],
    [PieceType.Z]: [
        0b0000_1100_0110_0000,
        0b0010_0110_0100_0000,
        0b0000_1100_0110_0000,
        0b0010_0110_0100_0000,
    ],
    [PieceType.T]: [
        0b0000_1110_0100_0000,
        0b0100_1100_0100_0000,
        0b0100_1110_0000_0000,
        0b0100_0110_0100_0000,
    ],
};

export function grids(pieceType: PieceType): number[] {
    return PIECE_GRIDS[pieceType];
}

export function findGridIndex(grids: number[], grid: number): number {
    for (let i = 0; i < grids.length; i++) {
        if (grids[i] === grid) {
            return i;
        }
    }
    throw new Error("Grid not found");
}

export class Piece {
    type_: PieceType;
    grid: number;
    pos: [number, number];

    constructor(type_: PieceType, grid: number, pos: [number, number]) {
        this.type_ = type_;
        this.grid = grid;
        this.pos = pos;
    }

    clone() {
        return new Piece(this.type_, this.grid, [this.pos[0], this.pos[1]]);
    }

    toMapKey() {
        let res = 0;

        res += Number(this.type_);

        res *= 2 ** 16;
        res += this.grid;

        res *= 200;
        res += 10 * this.pos[0] + this.pos[1];

        return res;
    }

    numRotations(): number {
        switch (this.type_) {
            case PieceType.I:
            case PieceType.S:
            case PieceType.Z:
                return 2;
            case PieceType.O:
                return 1;
            case PieceType.J:
            case PieceType.L:
            case PieceType.T:
                return 4;
        }
    }

    rotate(dir: RotateDir): void {
        const offset = dir === RotateDir.Cw ? 1 : 3;
        const gridsForType = grids(this.type_);
        const gridIndex = findGridIndex(gridsForType, this.grid);
        this.grid = gridsForType[(gridIndex + offset) % 4];
    }

    at(i: number, j: number): boolean {
        return (this.grid & (1 << (4 * i + j))) !== 0;
    }

    cellPositions(): [number, number][] {
        const res: [number, number][] = [];
        for (let i = 0; i < 16; i++) {
            const mask = 1 << (15 - i);
            if ((this.grid & mask) !== 0) {
                res.push([
                    this.pos[0] + Math.floor(i / 4),
                    this.pos[1] + (i % 4),
                ]);
                if (res.length === 4) {
                    return res;
                }
            }
        }
        throw new Error("Failed to find 4 cells in tetromino");
    }
}

// Helper function to get a random PieceType
export function getRandomPieceType(): PieceType {
    const randomIndex = Math.floor(Math.random() * ALL_PIECE_TYPES.length);
    return ALL_PIECE_TYPES[randomIndex];
}
