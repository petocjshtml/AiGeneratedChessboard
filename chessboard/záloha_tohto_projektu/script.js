// Globálne premenné
const boardElement = document.getElementById('chessboard');
const board = {};
let selectedPiece = null;
let currentPlayer = 'white'; // farba na ťahu
let enPassantTarget = null;  // Pre sledovanie políčka en passant

// Vytvorenie šachovnice
function createBoard() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let rank = 8; rank >= 1; rank--) {
        for (let file = 0; file < 8; file++) {
            const squareId = files[file] + rank;
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((file + rank) % 2 === 0 ? 'light' : 'dark');
            square.dataset.position = squareId;
            boardElement.appendChild(square);
            board[squareId] = {
                element: square,
                piece: null
            };
        }
    }
}

// Vytvorenie figúrok
function createPieces() {
    const initialPositions = {
        'a8': 'black_rook', 'b8': 'black_knight', 'c8': 'black_bishop', 'd8': 'black_queen',
        'e8': 'black_king', 'f8': 'black_bishop', 'g8': 'black_knight', 'h8': 'black_rook',
        'a7': 'black_pawn', 'b7': 'black_pawn', 'c7': 'black_pawn', 'd7': 'black_pawn',
        'e7': 'black_pawn', 'f7': 'black_pawn', 'g7': 'black_pawn', 'h7': 'black_pawn',
        'a2': 'white_pawn', 'b2': 'white_pawn', 'c2': 'white_pawn', 'd2': 'white_pawn',
        'e2': 'white_pawn', 'f2': 'white_pawn', 'g2': 'white_pawn', 'h2': 'white_pawn',
        'a1': 'white_rook', 'b1': 'white_knight', 'c1': 'white_bishop', 'd1': 'white_queen',
        'e1': 'white_king', 'f1': 'white_bishop', 'g1': 'white_knight', 'h1': 'white_rook',
    };

    for (const position in initialPositions) {
        const pieceName = initialPositions[position];
        const piece = document.createElement('img');
        piece.src = getPieceSVG(pieceName);
        piece.classList.add('piece');
        piece.draggable = true;
        piece.dataset.piece = pieceName;
        piece.dataset.position = position;
        piece.addEventListener('dragstart', dragStart);
        piece.addEventListener('dragend', dragEnd);

        board[position].piece = {
            name: pieceName,
            element: piece,
            color: pieceName.split('_')[0],
            type: pieceName.split('_')[1],
            hasMoved: false
        };

        board[position].element.appendChild(piece);
    }

    // Pridanie eventov na políčka
    for (const position in board) {
        const square = board[position];
        square.element.addEventListener('dragover', dragOver);
        square.element.addEventListener('drop', drop);
    }
}

// Získanie cesty k SVG figúrke
function getPieceSVG(pieceName) {
    return 'pieces/' + pieceName + '.svg';
}

// Drag and Drop funkcie
function dragStart(e) {
    const piece = e.target;
    if (!isPlayerTurn(piece)) {
        e.preventDefault();
        return;
    }
    selectedPiece = piece;
    highlightValidMoves(piece);
    setTimeout(() => piece.style.display = 'none', 0);
}

function dragEnd(e) {
    e.target.style.display = 'block';
    removeHighlights();
    selectedPiece = null;
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const targetSquareElement = e.target.classList.contains('square') ? e.target : e.target.parentElement;
    const targetPosition = targetSquareElement.dataset.position;

    if (isValidMove(selectedPiece, targetPosition, currentPlayer)) {
        movePiece(selectedPiece, targetPosition);

        const opponent = currentPlayer === 'white' ? 'black' : 'white';

        if (isKingInCheck(opponent)) {
            if (isCheckmate(opponent)) {
                //šach mat
                let message = `${currentPlayer} wins!`;
                document.getElementById("chess_mate_msg").innerHTML=message;
                document.getElementById("new_game_activator").innerHTML="New Game";
            } else {
               // alert('Šach!');
            }
        } else if (isStalemate(opponent)) {
         //   alert('Pat! Hra skončila remízou.');
        }

        switchPlayer();
    } else {
      //  alert('Neplatný ťah');
    }
}

// Kontrola, či je na rade správny hráč
function isPlayerTurn(piece) {
    return piece.dataset.piece.startsWith(currentPlayer);
}

// Kontrola platnosti ťahu
function isValidMove(piece, targetPosition, playerColor) {
    if(!piece)
    {
        return false;
    }
    
    const fromPosition = piece.dataset.position;
    const pieceData = board[fromPosition].piece;
    const targetSquare = board[targetPosition];
    const deltaFile = targetPosition.charCodeAt(0) - fromPosition.charCodeAt(0);
    const deltaRank = parseInt(targetPosition[1]) - parseInt(fromPosition[1]);

    if (targetSquare.piece && targetSquare.piece.color === playerColor) {
        return false;
    }

    let valid = false;
    switch (pieceData.type) {
        case 'pawn':
            valid = isValidPawnMove(pieceData, deltaFile, deltaRank, targetSquare, playerColor, targetPosition);
            break;
        case 'rook':
            valid = isValidRookMove(pieceData, deltaFile, deltaRank, targetSquare);
            break;
        case 'knight':
            valid = isValidKnightMove(deltaFile, deltaRank);
            break;
        case 'bishop':
            valid = isValidBishopMove(pieceData, deltaFile, deltaRank, targetSquare);
            break;
        case 'queen':
            valid = isValidQueenMove(pieceData, deltaFile, deltaRank, targetSquare);
            break;
        case 'king':
            valid = isValidKingMove(pieceData, deltaFile, deltaRank, targetSquare, playerColor);
            break;
        default:
            valid = false;
    }

    if (!valid) {
        return false;
    }

    const originalFromPiece = board[fromPosition].piece;
    const originalToPiece = board[targetPosition].piece;

    board[targetPosition].piece = pieceData;
    board[fromPosition].piece = null;

    const kingInCheck = isKingInCheck(playerColor);

    board[fromPosition].piece = originalFromPiece;
    board[targetPosition].piece = originalToPiece;

    return !kingInCheck;
}

// Validácia ťahov pre jednotlivé figúrky
function isValidPawnMove(pieceData, deltaFile, deltaRank, targetSquare, playerColor, targetPosition) {
    const direction = pieceData.color === 'white' ? 1 : -1;
    const startRank = pieceData.color === 'white' ? 2 : 7;

    // Pohyb dopredu
    if (deltaFile === 0 && !targetSquare.piece) {
        if (deltaRank === direction) {
            return true;
        }
        // Dvojkrok z počiatočnej pozície
        if (deltaRank === 2 * direction && parseInt(pieceData.element.dataset.position[1]) === startRank) {
            const intermediatePosition = pieceData.element.dataset.position[0] + (parseInt(pieceData.element.dataset.position[1]) + direction);
            if (!board[intermediatePosition].piece) {
                return true;
            }
        }
    }

    // Branie diagonálne
    if (Math.abs(deltaFile) === 1 && deltaRank === direction) {
        if (targetSquare.piece && targetSquare.piece.color !== playerColor) {
            return true;
        }
        // Branie en passant
        if (targetPosition === enPassantTarget) {
            return true;
        }
    }

    return false;
}

function isValidRookMove(pieceData, deltaFile, deltaRank, targetSquare) {
    if (deltaFile !== 0 && deltaRank !== 0) {
        return false;
    }
    return isPathClear(pieceData.element.dataset.position, targetSquare.element.dataset.position);
}

function isValidKnightMove(deltaFile, deltaRank) {
    const fileMove = Math.abs(deltaFile);
    const rankMove = Math.abs(deltaRank);
    return (fileMove === 2 && rankMove === 1) || (fileMove === 1 && rankMove === 2);
}

function isValidBishopMove(pieceData, deltaFile, deltaRank, targetSquare) {
    if (Math.abs(deltaFile) !== Math.abs(deltaRank)) {
        return false;
    }
    return isPathClear(pieceData.element.dataset.position, targetSquare.element.dataset.position);
}

function isValidQueenMove(pieceData, deltaFile, deltaRank, targetSquare) {
    if (deltaFile === 0 || deltaRank === 0 || Math.abs(deltaFile) === Math.abs(deltaRank)) {
        return isPathClear(pieceData.element.dataset.position, targetSquare.element.dataset.position);
    }
    return false;
}

function isValidKingMove(pieceData, deltaFile, deltaRank, targetSquare, playerColor) {
    // Bežný pohyb kráľa o jedno políčko
    if (Math.abs(deltaFile) <= 1 && Math.abs(deltaRank) <= 1) {
        return true;
    }

    // Rošáda
    if (deltaRank === 0 && Math.abs(deltaFile) === 2) {
        return canCastle(kingData = pieceData, deltaFile, playerColor);
    }

    return false;
}

// Funkcia pre kontrolu rošády
function canCastle(kingData, deltaFile, playerColor) {
    if (kingData.hasMoved) {
        return false;
    }

    const rank = playerColor === 'white' ? '1' : '8';
    const rookFile = deltaFile === 2 ? 'h' : 'a';
    const rookPosition = rookFile + rank;
    const rookData = board[rookPosition].piece;

    // Skontrolujeme, či veža existuje a či sa nepohla
    if (!rookData || rookData.type !== 'rook' || rookData.hasMoved) {
        return false;
    }

    // Skontrolujeme, či sú medzi kráľom a vežou voľné políčka
    const step = deltaFile > 0 ? 1 : -1;
    const startFileCode = kingData.element.dataset.position.charCodeAt(0);
    for (let i = 1; i < Math.abs(deltaFile); i++) {
        const fileCode = startFileCode + i * step;
        const position = String.fromCharCode(fileCode) + rank;
        if (board[position].piece) {
            return false;
        }
    }

    // Skontrolujeme, či kráľ nie je v šachu v aktuálnej pozícii
    if (isKingInCheck(playerColor)) {
        return false;
    }

    // Simulujeme kráľove políčka počas rošády a skontrolujeme, či nie sú napadnuté
    const originalKingPosition = kingData.element.dataset.position;
    for (let i = 1; i <= Math.abs(deltaFile); i++) {
        const fileCode = startFileCode + i * step;
        const position = String.fromCharCode(fileCode) + rank;

        // Dočasne odstránime kráľa z pôvodnej pozície
        board[originalKingPosition].piece = null;

        // Simulujeme kráľa na tomto políčku
        const originalPiece = board[position].piece;
        board[position].piece = kingData;

        const inCheck = isKingInCheck(playerColor);

        // Vrátime pôvodný stav
        board[position].piece = originalPiece;
        board[originalKingPosition].piece = kingData;

        if (inCheck) {
            return false;
        }
    }

    return true;
}

// Kontrola, či je cesta medzi dvoma políčkami voľná
function isPathClear(startPos, endPos) {
    const deltaFile = endPos.charCodeAt(0) - startPos.charCodeAt(0);
    const deltaRank = parseInt(endPos[1]) - parseInt(startPos[1]);
    const stepFile = deltaFile === 0 ? 0 : deltaFile / Math.abs(deltaFile);
    const stepRank = deltaRank === 0 ? 0 : deltaRank / Math.abs(deltaRank);

    let currentFile = startPos.charCodeAt(0) + stepFile;
    let currentRank = parseInt(startPos[1]) + stepRank;

    while ((currentFile !== endPos.charCodeAt(0)) || (currentRank !== parseInt(endPos[1]))) {
        const position = String.fromCharCode(currentFile) + currentRank;
        if (board[position].piece) {
            return false;
        }
        currentFile += stepFile;
        currentRank += stepRank;
    }
    return true;
}





// Presunutie figúrky
function movePiece(piece, targetPosition) {
    const fromPosition = piece.dataset.position;
    const targetSquare = board[targetPosition];
    const pieceData = board[fromPosition].piece;

    board[fromPosition].piece = null;

    // Ak sa jedná o pešiaka, skontrolujeme, či dosiahol posledný rad
    if (pieceData.type === 'pawn') {
        const rank = parseInt(targetPosition[1]);
        if ((pieceData.color === 'white' && rank === 8) || (pieceData.color === 'black' && rank === 1)) {
            showPromotionUI(pieceData,targetPosition);
            return; // Dočasne zastavíme pohyb, aby používateľ mohol vybrať figúrku
        }
    }

    // Rošáda
    if (pieceData.type === 'king' && Math.abs(targetPosition.charCodeAt(0) - fromPosition.charCodeAt(0)) === 2) {
        const playerColor = pieceData.color;
        const rank = playerColor === 'white' ? '1' : '8';
        const rookFromFile = targetPosition.charAt(0) === 'g' ? 'h' : 'a';
        const rookToFile = targetPosition.charAt(0) === 'g' ? 'f' : 'd';
        const rookFromPosition = rookFromFile + rank;
        const rookToPosition = rookToFile + rank;

        const rookPiece = board[rookFromPosition].piece;
        const rookElement = rookPiece.element;

        // Aktualizácia dát pre vežu
        board[rookFromPosition].piece = null;
        board[rookToPosition].piece = rookPiece;

        // Aktualizácia DOM pre vežu
        rookPiece.element.dataset.position = rookToPosition;
        board[rookToPosition].element.appendChild(rookElement);

        rookPiece.hasMoved = true;
    }

    // En passant branie
    if (pieceData.type === 'pawn' && targetPosition === enPassantTarget) {
        const capturedPawnPosition = targetPosition[0] + (pieceData.color === 'white' ? '5' : '4');
        const capturedPawn = board[capturedPawnPosition].piece;
        if (capturedPawn) {
            board[capturedPawnPosition].element.removeChild(capturedPawn.element);
            board[capturedPawnPosition].piece = null;
        }
    }

    // Nastavenie en passant
    if (pieceData.type === 'pawn' && Math.abs(targetPosition[1] - fromPosition[1]) === 2) {
        enPassantTarget = pieceData.element.dataset.position[0] + (pieceData.color === 'white' ? '3' : '6');
    } else {
        enPassantTarget = null;
    }

    if (targetSquare.piece) {
        targetSquare.element.removeChild(targetSquare.piece.element);
    }

    board[targetPosition].piece = {
        name: piece.dataset.piece,
        element: piece,
        color: pieceData.color,
        type: pieceData.type,
        hasMoved: true
    };

    piece.dataset.position = targetPosition;
    piece.style.display = 'block';
    targetSquare.element.appendChild(piece);
}

// Zvýraznenie možných ťahov
function highlightValidMoves(piece) {
    for (const position in board) {
        if (isValidMove(piece, position, currentPlayer)) {
            board[position].element.classList.add('highlight');
        }
    }
}

// Odstránenie zvýraznení
function removeHighlights() {
    for (const position in board) {
        board[position].element.classList.remove('highlight');
    }
}

// Globálne premenné
let originalSquareContent = {}; // Globálna premená na uloženie obsahu políčok pod UI
let cancelledPromotionPawn = null; // Na uloženie pešiaka, ak sa povýšenie zruší
let promotionInProgress = false; // Na sledovanie, či prebieha povýšenie pešiaka

// Zobrazenie UI pre povýšenie pešiaka
function showPromotionUI(pawn, targetPosition) {
    const fromPosition = pawn.element.dataset.position; // Pôvodná pozícia pešiaka (napr. 'e7')
    const file = targetPosition[0]; // Stĺpec (napr. 'e')

    // Pešiak zmizne zo 7. rady
    const fromSquare = board[fromPosition].element;
    fromSquare.removeChild(pawn.element);

    // Uložíme pešiaka pre prípad zrušenia
    cancelledPromotionPawn = { ...pawn, originalPosition: fromPosition };

    // Nastavíme, že povýšenie je v procese
    promotionInProgress = true;

    // Vytvoríme kontajner pre možnosti povýšenia
    const promotionContainer = document.createElement('div');
    promotionContainer.classList.add('promotion-container');

    // Možné figúrky na povýšenie (získané pomocou SVG)
    const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];

    // Dynamické generovanie UI pre bielu a čiernu farbu
    const direction = pawn.color === 'white' ? -1 : 1; // -1 pre bielych, 1 pre čiernych
    const startRank = pawn.color === 'white' ? 8 : 1; // 8 pre bielych, 1 pre čiernych

    // Uložíme pôvodný obsah políčok pod UI a zobrazíme UI
    promotionPieces.forEach((piece, index) => {
        const rank = startRank + (index * direction); // Posuneme sa o jednu pozíciu hore alebo dole
        const promotionPosition = file + rank;

        // Uložíme pôvodný obsah políčka (môže tam byť figúrka)
        const squareElement = board[promotionPosition].element;
        originalSquareContent[promotionPosition] = squareElement.innerHTML;

        // Vymažeme obsah políčka a zobrazíme SVG figúrky
        squareElement.innerHTML = '';
        const promotionSquare = document.createElement('div');
        promotionSquare.classList.add('promotion-square');

        // Pridáme SVG obrázok figúrky namiesto písmen
        const pieceImage = document.createElement('img');
        pieceImage.src = getPieceSVG(`${pawn.color}_${piece}`);
        pieceImage.classList.add('promotion-piece-svg');
        promotionSquare.appendChild(pieceImage);

        squareElement.appendChild(promotionSquare); // Pridáme možnosť povýšenia

        // Po kliknutí na možnosť povýšenia zavoláme funkciu promotePawn
        promotionSquare.addEventListener('click', () => {
            promotePawn(pawn, targetPosition, piece);
        });
    });

    // Ak hráč klikne mimo UI, zrušíme povýšenie a obnovíme pešiaka
    document.addEventListener('click', (e) => {
        if (!promotionContainer.contains(e.target)) {
            undoPromotionMove(); // Zatvorí UI, obnoví pešiaka
        }
    }, { once: true });

    document.body.appendChild(promotionContainer); // Pridáme UI na stránku

    // Dynamicky pridáme CSS pre povýšenie
    const style = document.createElement('style');
    style.innerHTML = `
        .promotion-container {
            position: absolute;
            z-index: 1000;
        }

        .promotion-square {
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f0d9b5;
            border: 1px solid #b58863;
            cursor: pointer;
            width: 100%;
            aspect-ratio: 1 / 1;
        }

        .promotion-square:hover {
            background-color: #b58863;
        }

        .promotion-piece-svg {
            width: 100%;
            height: 100%;
        }
    `;
    document.head.appendChild(style);
}

// Funkcia na povýšenie pešiaka na vybranú figúrku
function promotePawn(pawn, targetPosition, selectedPiece) {
    const color = pawn.color;

    // Vytvoríme novú figúrku
    const newPiece = document.createElement('img');
    newPiece.src = getPieceSVG(`${color}_${selectedPiece}`);
    newPiece.classList.add('piece');
    newPiece.draggable = true;
    newPiece.dataset.piece = `${color}_${selectedPiece}`;
    newPiece.dataset.position = targetPosition;
    newPiece.addEventListener('dragstart', dragStart);
    newPiece.addEventListener('dragend', dragEnd);

    // Umiestnime figúrku na finálnu pozíciu
    const finalSquare = board[targetPosition].element;
    finalSquare.innerHTML = ''; // Vyčistíme obsah cieľového políčka
    finalSquare.appendChild(newPiece);

    board[targetPosition].piece = {
        name: `${color}_${selectedPiece}`,
        element: newPiece,
        color: color,
        type: selectedPiece,
        hasMoved: true
    };

    cancelledPromotionPawn = null; // Povýšenie prebehlo, resetujeme pešiaka
    removePromotionUI();
    promotionInProgress = false; // Ukončíme povýšenie
    switchPlayer(); // Prepnutie hráča po povýšení
}

// Funkcia na skrytie UI povýšenia a obnovenie pôvodných figúrok
function removePromotionUI() {
    const promotionChoices = document.querySelectorAll('.promotion-square');
    promotionChoices.forEach(square => {
        const parentSquare = square.parentElement;
        const position = parentSquare.dataset.position;

        // Obnovíme pôvodný obsah políčok, ktoré pokrývalo UI
        parentSquare.innerHTML = originalSquareContent[position];

        // Získame figúrku, ak nejaká na tomto políčku je, a priradíme jej eventy
        const restoredPiece = parentSquare.querySelector('img');
        if (restoredPiece) {
            restoredPiece.addEventListener('dragstart', dragStart);
            restoredPiece.addEventListener('dragend', dragEnd);
        }
    });

    // Vymažeme uložené pôvodné obsahy políčok
    originalSquareContent = {};
}

// Funkcia na zrušenie povýšenia a vrátenie pešiaka na pôvodnú pozíciu
// Funkcia na zrušenie povýšenia a vrátenie pešiaka na pôvodnú pozíciu
function undoPromotionMove() {
    if (cancelledPromotionPawn) {
        const pawnPosition = cancelledPromotionPawn.originalPosition;
        const square = board[pawnPosition].element;

        // Obnovíme pešiaka na pôvodnej pozícii
        square.appendChild(cancelledPromotionPawn.element);

        // Priradíme pešiaka späť do objektu board
        board[pawnPosition].piece = {
            name: cancelledPromotionPawn.name,
            element: cancelledPromotionPawn.element,
            color: cancelledPromotionPawn.color,
            type: cancelledPromotionPawn.type,
            hasMoved: cancelledPromotionPawn.hasMoved
        };

        // Priradíme eventy na ťahanie pešiaka
        cancelledPromotionPawn.element.addEventListener('dragstart', dragStart);
        cancelledPromotionPawn.element.addEventListener('dragend', dragEnd);

        // Resetujeme pešiaka
        cancelledPromotionPawn = null;
    }

    removePromotionUI(); // Skryjeme UI
    promotionInProgress = false; // Ukončíme povýšenie bez prepnutia hráča
}


// Prepnutie hráča
function switchPlayer() {
    if (!promotionInProgress) {
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    }
}


// Kontrola, či je kráľ v šachu
function isKingInCheck(color) {
    let kingPosition = null;
    for (const position in board) {
        const piece = board[position].piece;
        if (piece && piece.type === 'king' && piece.color === color) {
            kingPosition = position;
            break;
        }
    }
    if (!kingPosition) {
        return false;
    }

    for (const position in board) {
        const piece = board[position].piece;
        if (piece && piece.color !== color) {
            if (canPieceAttackSquare(piece, position, kingPosition)) {
                return true;
            }
        }
    }
    return false;
}

// Kontrola, či figúrka môže napadnúť dané políčko
function canPieceAttackSquare(pieceData, fromPosition, toPosition) {
    const deltaFile = toPosition.charCodeAt(0) - fromPosition.charCodeAt(0);
    const deltaRank = parseInt(toPosition[1]) - parseInt(fromPosition[1]);
    const targetSquare = board[toPosition];

    switch (pieceData.type) {
        case 'pawn':
            const direction = pieceData.color === 'white' ? 1 : -1;
            if (Math.abs(deltaFile) === 1 && deltaRank === direction) {
                return true;
            }
            break;
        case 'rook':
            return isValidRookMove(pieceData, deltaFile, deltaRank, targetSquare);
        case 'knight':
            return isValidKnightMove(deltaFile, deltaRank);
        case 'bishop':
            return isValidBishopMove(pieceData, deltaFile, deltaRank, targetSquare);
        case 'queen':
            return isValidQueenMove(pieceData, deltaFile, deltaRank, targetSquare);
        case 'king':
            if (Math.abs(deltaFile) <= 1 && Math.abs(deltaRank) <= 1) {
                return true;
            }
            break;
    }
    return false;
}

// Kontrola, či je mat
function isCheckmate(color) {
    if (!isKingInCheck(color)) {
        return false;
    }
    return !hasLegalMoves(color);
}

// Kontrola, či je pat
function isStalemate(color) {
    if (isKingInCheck(color)) {
        return false;
    }
    return !hasLegalMoves(color);
}

// Kontrola, či hráč má nejaké legálne ťahy
function hasLegalMoves(color) {
    for (const fromPosition in board) {
        const pieceData = board[fromPosition].piece;
        if (pieceData && pieceData.color === color) {
            const pieceElement = pieceData.element;
            for (const toPosition in board) {
                if (isValidMove(pieceElement, toPosition, color)) {
                    return true;
                }
            }
        }
    }
    return false;
}



// Inicializácia hry
createBoard();
createPieces();
