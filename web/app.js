const BOARD_SIZE = 20;
const PLAYERS = [
  { id: 0, name: "蓝", color: "#3b82f6", corner: [0, 0] },
  { id: 1, name: "黄", color: "#facc15", corner: [19, 0] },
  { id: 2, name: "红", color: "#ef4444", corner: [19, 19] },
  { id: 3, name: "绿", color: "#22c55e", corner: [0, 19] },
];

const PIECES = [
  ["1", [[0, 0]]],
  ["2", [[0, 0], [1, 0]]],
  ["I3", [[0, 0], [1, 0], [2, 0]]],
  ["V3", [[0, 0], [0, 1], [1, 0]]],
  ["I4", [[0, 0], [1, 0], [2, 0], [3, 0]]],
  ["O4", [[0, 0], [1, 0], [0, 1], [1, 1]]],
  ["L4", [[0, 0], [0, 1], [0, 2], [1, 0]]],
  ["Z4", [[0, 0], [1, 0], [1, 1], [2, 1]]],
  ["T4", [[0, 0], [1, 0], [2, 0], [1, 1]]],
  ["I5", [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]],
  ["L5", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0]]],
  ["V5", [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]],
  ["T5", [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]],
  ["N", [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]]],
  ["W", [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]],
  ["P", [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]],
  ["U", [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]],
  ["Y", [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1]]],
  ["F", [[1, 0], [0, 1], [1, 1], [1, 2], [2, 2]]],
  ["X", [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  ["Z5", [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]]],
].map(([name, cells]) => ({ name, cells }));

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
let currentPlayer = 0;
let selectedPiece = null;
let rot = 0;
let flipped = false;
let previewAt = null;
const passes = Array(PLAYERS.length).fill(false);
const playersState = PLAYERS.map(() => ({ used: new Set(), firstDone: false }));

const boardEl = document.getElementById("board");
const pieceListEl = document.getElementById("pieceList");
const scoreListEl = document.getElementById("scoreList");
const turnInfoEl = document.getElementById("turnInfo");
const statusEl = document.getElementById("status");

function normalize(cells) {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function transform(cells) {
  let out = cells.map(([x, y]) => [x, y]);
  if (flipped) out = out.map(([x, y]) => [-x, y]);
  for (let i = 0; i < rot; i += 1) out = out.map(([x, y]) => [y, -x]);
  return normalize(out);
}

function buildBoard() {
  boardEl.innerHTML = "";
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("mouseenter", () => {
        previewAt = [x, y];
        render();
      });
      cell.addEventListener("click", () => {
        tryPlace([x, y]);
      });
      boardEl.appendChild(cell);
    }
  }
}

function getCellsOnBoard(anchor) {
  if (!selectedPiece) return [];
  const shape = transform(selectedPiece.cells);
  return shape.map(([dx, dy]) => [anchor[0] + dx, anchor[1] + dy]);
}

function inBounds([x, y]) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

function isValidPlacement(playerId, cells) {
  if (!cells.length) return false;
  if (cells.some((c) => !inBounds(c))) return false;
  if (cells.some(([x, y]) => board[y][x] !== null)) return false;

  const first = !playersState[playerId].firstDone;
  const corner = PLAYERS[playerId].corner;
  if (first) {
    return cells.some(([x, y]) => x === corner[0] && y === corner[1]);
  }

  let hasCornerTouch = false;
  for (const [x, y] of cells) {
    const edges = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    if (edges.some(([ex, ey]) => inBounds([ex, ey]) && board[ey][ex] === playerId)) {
      return false;
    }
    const corners = [[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]];
    if (corners.some(([cx, cy]) => inBounds([cx, cy]) && board[cy][cx] === playerId)) {
      hasCornerTouch = true;
    }
  }

  return hasCornerTouch;
}

function tryPlace(anchor) {
  if (!selectedPiece) {
    statusEl.textContent = "请先选择一个棋子";
    return;
  }
  const cells = getCellsOnBoard(anchor);
  if (!isValidPlacement(currentPlayer, cells)) {
    statusEl.textContent = "当前位置不合法";
    return;
  }

  cells.forEach(([x, y]) => { board[y][x] = currentPlayer; });
  playersState[currentPlayer].used.add(selectedPiece.name);
  playersState[currentPlayer].firstDone = true;
  passes[currentPlayer] = false;
  selectedPiece = null;
  rot = 0;
  flipped = false;
  statusEl.textContent = "";
  nextTurn();
}

function nextTurn() {
  for (let i = 0; i < PLAYERS.length; i += 1) {
    currentPlayer = (currentPlayer + 1) % PLAYERS.length;
    if (playersState[currentPlayer].used.size < PIECES.length) break;
  }
  if (passes.every(Boolean)) {
    statusEl.textContent = "游戏结束：所有玩家都跳过了。";
  }
  render();
}

function renderPieces() {
  pieceListEl.innerHTML = "";
  const used = playersState[currentPlayer].used;
  PIECES.forEach((piece) => {
    if (used.has(piece.name)) return;
    const btn = document.createElement("button");
    btn.className = `piece ${selectedPiece?.name === piece.name ? "selected" : ""}`;
    btn.textContent = `${piece.name} (${piece.cells.length})`;
    btn.addEventListener("click", () => {
      selectedPiece = piece;
      statusEl.textContent = "";
      render();
    });
    pieceListEl.appendChild(btn);
  });
}

function renderScores() {
  scoreListEl.innerHTML = "";
  PLAYERS.forEach((p) => {
    const li = document.createElement("li");
    const score = board.flat().filter((v) => v === p.id).length;
    li.textContent = `${p.name}: ${score}`;
    li.style.color = p.color;
    scoreListEl.appendChild(li);
  });
}

function renderBoard() {
  const previewCells = previewAt ? getCellsOnBoard(previewAt) : [];
  const previewOk = isValidPlacement(currentPlayer, previewCells);
  [...boardEl.children].forEach((el) => {
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    const owner = board[y][x];
    el.className = "cell";
    el.style.background = owner === null ? "#1f2937" : PLAYERS[owner].color;

    if (previewCells.some(([px, py]) => px === x && py === y)) {
      el.classList.add(previewOk ? "preview-ok" : "preview-bad");
    }
  });
}

function render() {
  const player = PLAYERS[currentPlayer];
  turnInfoEl.textContent = `当前玩家：${player.name}`;
  turnInfoEl.style.color = player.color;
  renderPieces();
  renderScores();
  renderBoard();
}

document.getElementById("rotateBtn").addEventListener("click", () => {
  rot = (rot + 1) % 4;
  render();
});

document.getElementById("flipBtn").addEventListener("click", () => {
  flipped = !flipped;
  render();
});

document.getElementById("passBtn").addEventListener("click", () => {
  passes[currentPlayer] = true;
  selectedPiece = null;
  nextTurn();
});

document.getElementById("restartBtn").addEventListener("click", () => {
  window.location.reload();
});

buildBoard();
render();
