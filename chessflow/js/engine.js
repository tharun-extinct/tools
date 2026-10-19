/*************************************************************************
 * 1. COMPLETE SELF-CONTAINED LEGAL CHESS ENGINE (FEN, SAN, PGN, RULES)
 *************************************************************************/
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

class ChessEngine {
  constructor(fen = START_FEN) {
    this.loadFen(fen);
  }

  loadFen(fen) {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const parts = fen.trim().split(/\s+/);
    const rows = parts[0].split('/');
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (ch >= '1' && ch <= '8') {
          c += parseInt(ch, 10);
        } else {
          const color = ch === ch.toUpperCase() ? 'w' : 'b';
          this.board[r][c] = { type: ch.toLowerCase(), color };
          c++;
        }
      }
    }
    this.turn = parts[1] || 'w';
    const castleStr = parts[2] || '-';
    this.castling = {
      K: castleStr.includes('K'),
      Q: castleStr.includes('Q'),
      k: castleStr.includes('k'),
      q: castleStr.includes('q')
    };
    this.epSquare = parts[3] && parts[3] !== '-' ? ChessEngine.algToCoord(parts[3]) : null;
    this.halfMove = parseInt(parts[4] || '0', 10);
    this.fullMove = parseInt(parts[5] || '1', 10);
  }

  toFen() {
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) {
            rowStr += empty;
            empty = 0;
          }
          rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty > 0) rowStr += empty;
      rows.push(rowStr);
    }
    let cStr = '';
    if (this.castling.K) cStr += 'K';
    if (this.castling.Q) cStr += 'Q';
    if (this.castling.k) cStr += 'k';
    if (this.castling.q) cStr += 'q';
    if (!cStr) cStr = '-';
    const ep = this.epSquare ? ChessEngine.coordToAlg(this.epSquare.r, this.epSquare.c) : '-';
    return `${rows.join('/')} ${this.turn} ${cStr} ${ep} ${this.halfMove} ${this.fullMove}`;
  }

  clone() {
    return new ChessEngine(this.toFen());
  }

  static coordToAlg(r, c) {
    return FILES[c] + RANKS[r];
  }

  static algToCoord(alg) {
    if (!alg || alg.length < 2) return null;
    const c = FILES.indexOf(alg[0]);
    const r = RANKS.indexOf(alg[1]);
    if (c < 0 || r < 0) return null;
    return { r, c };
  }

  inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && p.type === 'k') return { r, c };
      }
    }
    return null;
  }

  isSquareAttacked(targetR, targetC, byColor) {
    // Pawn attacks
    const pawnDir = byColor === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = targetR + pawnDir;
      const pc = targetC + dc;
      if (this.inBounds(pr, pc)) {
        const p = this.board[pr][pc];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
    }
    // Knight attacks
    const knightJumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightJumps) {
      const nr = targetR + dr, nc = targetC + dc;
      if (this.inBounds(nr, nc)) {
        const p = this.board[nr][nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }
    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const kr = targetR + dr, kc = targetC + dc;
        if (this.inBounds(kr, kc)) {
          const p = this.board[kr][kc];
          if (p && p.color === byColor && p.type === 'k') return true;
        }
      }
    }
    // Orthogonal (Rook / Queen)
    const orthoDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of orthoDirs) {
      let r = targetR + dr, c = targetC + dc;
      while (this.inBounds(r, c)) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }
    // Diagonal (Bishop / Queen)
    const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, dc] of diagDirs) {
      let r = targetR + dr, c = targetC + dc;
      while (this.inBounds(r, c)) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        r += dr; c += dc;
      }
    }
    return false;
  }

  inCheck(color = this.turn) {
    const k = this.findKing(color);
    if (!k) return false;
    const enemy = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(k.r, k.c, enemy);
  }

  generatePseudoMoves(color = this.turn) {
    const moves = [];
    const enemy = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;

        if (p.type === 'p') {
          const dir = color === 'w' ? -1 : 1;
          const startRank = color === 'w' ? 6 : 1;
          const promoRank = color === 'w' ? 0 : 7;
          const nr = r + dir;
          if (this.inBounds(nr, c) && !this.board[nr][c]) {
            if (nr === promoRank) {
              for (const promo of ['q', 'r', 'b', 'n']) {
                moves.push({ from: { r, c }, to: { r: nr, c }, piece: p, promotion: promo });
              }
            } else {
              moves.push({ from: { r, c }, to: { r: nr, c }, piece: p });
              const nr2 = r + dir * 2;
              if (r === startRank && !this.board[nr2][c]) {
                moves.push({ from: { r, c }, to: { r: nr2, c }, piece: p, doublePawn: true });
              }
            }
          }
          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (!this.inBounds(nr, nc)) continue;
            const target = this.board[nr][nc];
            if (target && target.color === enemy) {
              if (nr === promoRank) {
                for (const promo of ['q', 'r', 'b', 'n']) {
                  moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p, captured: target, promotion: promo });
                }
              } else {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p, captured: target });
              }
            } else if (this.epSquare && this.epSquare.r === nr && this.epSquare.c === nc) {
              moves.push({
                from: { r, c },
                to: { r: nr, c: nc },
                piece: p,
                captured: { type: 'p', color: enemy },
                enPassant: true
              });
            }
          }
        } else if (p.type === 'n') {
          const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
          for (const [dr, dc] of jumps) {
            const nr = r + dr, nc = c + dc;
            if (!this.inBounds(nr, nc)) continue;
            const target = this.board[nr][nc];
            if (!target || target.color === enemy) {
              moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p, captured: target || null });
            }
          }
        } else if (p.type === 'k') {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (!this.inBounds(nr, nc)) continue;
              const target = this.board[nr][nc];
              if (!target || target.color === enemy) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p, captured: target || null });
              }
            }
          }
          // Castling
          const homeRank = color === 'w' ? 7 : 0;
          if (r === homeRank && c === 4 && !this.inCheck(color)) {
            const canK = color === 'w' ? this.castling.K : this.castling.k;
            const canQ = color === 'w' ? this.castling.Q : this.castling.q;
            if (
              canK &&
              !this.board[homeRank][5] &&
              !this.board[homeRank][6] &&
              !this.isSquareAttacked(homeRank, 5, enemy) &&
              !this.isSquareAttacked(homeRank, 6, enemy)
            ) {
              moves.push({ from: { r, c }, to: { r: homeRank, c: 6 }, piece: p, castling: 'K' });
            }
            if (
              canQ &&
              !this.board[homeRank][3] &&
              !this.board[homeRank][2] &&
              !this.board[homeRank][1] &&
              !this.isSquareAttacked(homeRank, 3, enemy) &&
              !this.isSquareAttacked(homeRank, 2, enemy)
            ) {
              moves.push({ from: { r, c }, to: { r: homeRank, c: 2 }, piece: p, castling: 'Q' });
            }
          }
        } else {
          const dirs =
            p.type === 'r'
              ? [[-1,0],[1,0],[0,-1],[0,1]]
              : p.type === 'b'
              ? [[-1,-1],[-1,1],[1,-1],[1,1]]
              : [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this.inBounds(nr, nc)) {
              const target = this.board[nr][nc];
              if (!target) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p });
              } else {
                if (target.color === enemy) {
                  moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p, captured: target });
                }
                break;
              }
              nr += dr; nc += dc;
            }
          }
        }
      }
    }
    return moves;
  }

  applyMoveUnchecked(m) {
    const { from, to, piece } = m;
    this.board[to.r][to.c] = m.promotion
      ? { type: m.promotion, color: piece.color }
      : { type: piece.type, color: piece.color };
    this.board[from.r][from.c] = null;

    if (m.enPassant) {
      const capR = piece.color === 'w' ? to.r + 1 : to.r - 1;
      this.board[capR][to.c] = null;
    }
    if (m.castling === 'K') {
      const r = from.r;
      this.board[r][5] = this.board[r][7];
      this.board[r][7] = null;
    } else if (m.castling === 'Q') {
      const r = from.r;
      this.board[r][3] = this.board[r][0];
      this.board[r][0] = null;
    }

    // Update castling rights
    if (piece.type === 'k') {
      if (piece.color === 'w') { this.castling.K = false; this.castling.Q = false; }
      else { this.castling.k = false; this.castling.q = false; }
    }
    if (from.r === 7 && from.c === 0) this.castling.Q = false;
    if (from.r === 7 && from.c === 7) this.castling.K = false;
    if (from.r === 0 && from.c === 0) this.castling.q = false;
    if (from.r === 0 && from.c === 7) this.castling.k = false;
    if (to.r === 7 && to.c === 0) this.castling.Q = false;
    if (to.r === 7 && to.c === 7) this.castling.K = false;
    if (to.r === 0 && to.c === 0) this.castling.q = false;
    if (to.r === 0 && to.c === 7) this.castling.k = false;

    this.epSquare = m.doublePawn
      ? { r: piece.color === 'w' ? from.r - 1 : from.r + 1, c: from.c }
      : null;

    if (piece.type === 'p' || m.captured) this.halfMove = 0;
    else this.halfMove++;

    if (this.turn === 'b') this.fullMove++;
    this.turn = this.turn === 'w' ? 'b' : 'w';
  }

  getLegalMoves() {
    const pseudo = this.generatePseudoMoves(this.turn);
    const legal = [];
    for (const m of pseudo) {
      const copy = this.clone();
      copy.applyMoveUnchecked(m);
      if (!copy.inCheck(this.turn)) {
        legal.push(m);
      }
    }
    // Attach SAN notation to each legal move
    for (const m of legal) {
      m.fromAlg = ChessEngine.coordToAlg(m.from.r, m.from.c);
      m.toAlg = ChessEngine.coordToAlg(m.to.r, m.to.c);
      m.san = this.moveToSan(m, legal);
    }
    return legal;
  }

  moveToSan(m, allLegal) {
    let san = '';
    if (m.castling === 'K') san = 'O-O';
    else if (m.castling === 'Q') san = 'O-O-O';
    else {
      if (m.piece.type !== 'p') {
        san += m.piece.type.toUpperCase();
        const ambiguous = allLegal.filter(
          o =>
            o !== m &&
            o.piece.type === m.piece.type &&
            o.to.r === m.to.r &&
            o.to.c === m.to.c
        );
        if (ambiguous.length > 0) {
          const sameFile = ambiguous.some(o => o.from.c === m.from.c);
          const sameRank = ambiguous.some(o => o.from.r === m.from.r);
          if (!sameFile) san += FILES[m.from.c];
          else if (!sameRank) san += RANKS[m.from.r];
          else san += FILES[m.from.c] + RANKS[m.from.r];
        }
      } else if (m.captured) {
        san += FILES[m.from.c];
      }
      if (m.captured) san += 'x';
      san += ChessEngine.coordToAlg(m.to.r, m.to.c);
      if (m.promotion) san += '=' + m.promotion.toUpperCase();
    }
    const copy = this.clone();
    copy.applyMoveUnchecked(m);
    if (copy.inCheck(copy.turn)) {
      const nextMoves = copy.getLegalMovesWithoutSan();
      san += nextMoves.length === 0 ? '#' : '+';
    }
    return san;
  }

  getLegalMovesWithoutSan() {
    const pseudo = this.generatePseudoMoves(this.turn);
    const legal = [];
    for (const m of pseudo) {
      const copy = this.clone();
      copy.applyMoveUnchecked(m);
      if (!copy.inCheck(this.turn)) legal.push(m);
    }
    return legal;
  }

  makeMoveBySan(sanInput) {
    const clean = sanInput.trim().replace(/[+#!?]+$/g, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
    const legal = this.getLegalMoves();
    for (const m of legal) {
      const mClean = m.san.replace(/[+#!?]+$/g, '');
      if (mClean === clean || m.san === sanInput.trim()) {
        this.applyMoveUnchecked(m);
        return m;
      }
    }
    return null;
  }

  makeMoveByCoords(fromR, fromC, toR, toC, promo = 'q') {
    const legal = this.getLegalMoves();
    const match = legal.find(
      m =>
        m.from.r === fromR &&
        m.from.c === fromC &&
        m.to.r === toR &&
        m.to.c === toC &&
        (!m.promotion || m.promotion === promo)
    );
    if (match) {
      this.applyMoveUnchecked(match);
      return match;
    }
    return null;
  }

  evaluateMaterial() {
    const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        let v = values[p.type] || 0;
        // Center control bonus
        if ((r === 3 || r === 4) && (c === 3 || c === 4)) v += 18;
        else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) v += 8;
        score += p.color === 'w' ? v : -v;
      }
    }
    return score / 100;
  }
}
