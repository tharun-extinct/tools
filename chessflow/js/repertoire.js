/*************************************************************************
 * 3. DEFAULT OPENING & GAMBIT REPERTOIRE LIBRARY
 *************************************************************************/
const DEFAULT_REPERTOIRE = [
  {
    id: 'italian-gambit-main',
    title: 'Italian Gambit (Main Tactical Line)',
    eco: 'C50 • Sharp Center Sacrifice',
    category: 'Gambit',
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd4', 'exd4', 'c3', 'dxc3', 'Bxf7+', 'Kxf7', 'Qd5+', 'Kf8', 'Qxc5+'],
    notes: {
      0: '1. e4 claims central space and opens diagonals for both the Queen and King\'s Bishop.',
      2: '2. Nf3 develops with tempo, attacking Black\'s e5 pawn.',
      4: '3. Bc4 enters the Italian Game, eyeing the vulnerable f7 square.',
      6: '4. d4! The Italian Gambit — immediately challenging the center before Black castles.',
      8: '5. c3 offers a second pawn to rip open lines and accelerate White\'s development.',
      10: '6. Bxf7+! Decoying the Black King onto an exposed square so Qd5+ forks King and Bishop.',
      12: '7. Qd5+! Double attack on the King on f7 and the undefended Bishop on c5.',
      14: '8. Qxc5+ recovers the piece with a dominant initiative and ruined Black King safety!'
    }
  },
  {
    id: 'evans-gambit',
    title: 'Evans Gambit (Romantic Attack)',
    eco: 'C51 • Queen\'s Wing Sacrifice',
    category: 'Gambit',
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O'],
    notes: {
      0: 'Open with 1. e4 to seize central control.',
      4: '3. Bc4 establishes the Italian Bishop targeting f7.',
      6: '4. b4! The signature Evans Gambit move — deflecting Black\'s bishop from the a7-g1 diagonal.',
      8: '5. c3 gains a free tempo on the bishop to prepare the d4 central strike.',
      10: '6. d4 blasts open the center while Black\'s bishop is side-lined on a5.',
      12: '7. O-O tucks the King away and activates the Rook for a crushing attack down the e-file.'
    }
  },
  {
    id: 'fried-liver-attack',
    title: 'Italian: Fried Liver Attack',
    eco: 'C57 • Knight Sacrifice on f7',
    category: 'Gambit',
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'],
    notes: {
      4: '3. Bc4 sets up the Italian structure.',
      6: '4. Ng5! Immediately teams up with the c4-bishop against f7.',
      8: '5. exd5 opens the e-file and intercepts the d5 block.',
      10: '6. Nxf7!! The Fried Liver sacrifice — forcing the Black King out into the center.',
      12: '7. Qf3+ forces Black\'s King to e6 to defend the pinned d5 knight.',
      14: '8. Nc3 piles maximum pressure onto the pinned d5 knight.'
    }
  },
  {
    id: 'giuoco-piano-main',
    title: 'Italian Game: Giuoco Piano',
    eco: 'C53 • Classical Positional Build-Up',
    category: 'White',
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a6'],
    notes: {
      6: '4. c3 prepares a supported d4 or a flexible d3 structure.',
      8: '5. d3 solidifies e4 and keeps the position strategic and maneuvering.',
      10: '6. O-O secures King safety and prepares Re1 + Nbd2-f1-g3.'
    }
  },
  {
    id: 'kings-gambit-accepted',
    title: 'King\'s Gambit Accepted (Kieseritzky)',
    eco: 'C39 • Ultra-Sharp f-File Opening',
    category: 'Gambit',
    side: 'w',
    moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'Bc4', 'd5', 'exd5'],
    notes: {
      2: '2. f4! The historic King\'s Gambit — trading the f-pawn to dominate the center and open the f-file.',
      4: '3. Nf3 prevents Qh4+ and develops rapidly.',
      6: '4. h4 undermines Black\'s g5 pawn chain.',
      8: '5. Ne5 centralizes the Knight on an aggressive outpost attacking g4 and f7.'
    }
  },
  {
    id: 'queens-gambit-trap',
    title: 'Queen\'s Gambit Accepted Trap',
    eco: 'D20 • Early b5 Refutation',
    category: 'Gambit',
    side: 'w',
    moves: ['d4', 'd5', 'c4', 'dxc4', 'e3', 'b5', 'a4', 'c6', 'axb5', 'cxb5', 'Qf3'],
    notes: {
      2: '2. c4! The Queen\'s Gambit — offering a wing pawn to tear down Black\'s d5 center.',
      4: '3. e3 prepares to recapture on c4 while tempting Black into greedily defending c4 with ...b5?',
      6: '4. a4! Immediately undermines the b5-c4 pawn chain.',
      8: '5. axb5 opens the long a8-h1 diagonal.',
      10: '6. Qf3! Wins a full Rook or minor piece on a8/b8 along the weakened diagonal!'
    }
  },
  {
    id: 'sicilian-najdorf',
    title: 'Sicilian Defense: Najdorf Counterattack',
    eco: 'B90 • Dynamic Black Counterplay',
    category: 'Black',
    side: 'b',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6'],
    notes: {
      1: '1...c5 fights for d4 asymmetrically without creating a symmetrical game.',
      5: '3...cxd4 trades a flank c-pawn for White\'s central d-pawn.',
      9: '5...a6! The Najdorf trademark — denies Bb5/Nb5 and prepares queenside expansion with ...b5.',
      11: '6...e5 kicks the centralized Knight from d4 and fights for d5.'
    }
  },
  {
    id: 'caro-kann-classical',
    title: 'Caro-Kann Defense: Classical Line',
    eco: 'B18 • Solid Light-Square Control',
    category: 'Black',
    side: 'b',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7'],
    notes: {
      1: '1...c6 prepares ...d5 while keeping the c8-bishop\'s diagonal open.',
      7: '4...Bf5! Develops the light-squared bishop outside the pawn chain with tempo.',
      11: '6...h6! Essential prophylaxis giving the g6-bishop an escape square on h7.'
    }
  },
  {
    id: 'stafford-gambit',
    title: 'Stafford Gambit (Black Tactical Trap)',
    eco: 'C42 • Venomous Petrov Sacrifice',
    category: 'Gambit',
    side: 'b',
    moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Bg5', 'Nxe4', 'Bxd8', 'Bxf2+', 'Ke2', 'Bg4#'],
    notes: {
      5: '3...Nc6!? The Stafford Gambit — sacrificing a pawn for rapid open diagonals and deadly traps.',
      9: '5...Bc5 targets f2 immediately.',
      11: '6...Nxe4!! Queen sacrifice! If White greedily captures 7. Bxd8?, Black has forced mate in two!',
      13: '7...Bxf2+ forces the White King to e2.',
      15: '8...Bg4# Checkmate in the middle of the board!'
    }
  }
];
