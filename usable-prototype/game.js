// Game State
const gameState = {
    phase: 'deck-selection', // 'deck-selection', 'draft', 'gameplay', 'endgame', 'simulation'
    players: {
        1: { squad: [], actionCards: [], score: 0, cardsUsed: 0, shots: 0 },
        2: { squad: [], actionCards: [], score: 0, cardsUsed: 0, shots: 0 }
    },
    deckSelection: {
        playerDeck: 'all',
        actionDeck: 'standard'
    },
    draft: {
        currentPlayer: 1,
        pickNumber: 0,
        direction: 1, // 1 for forward, -1 for backward (snake)
        availablePlayers: []
    },
    gameplay: {
        possession: 1,
        ballZone: 'build-up', // 'build-up', 'progression', 'final-third'
        currentAction: null, // 'pass', 'dribble', 'shoot'
        attackingPlayer: null,
        defendingPlayer: null,
        attackingCard: null,
        defendingCard: null,
        waitingForDefender: false,
        waitingForAttackerCard: false,
        waitingForDefenderCard: false,
        usedPlayers: { 1: [], 2: [] },
        keepSamePlayer: false
    },
    simulation: {
        isSimulating: false,
        results: []
    },
    allPlayers: [],
    actionCardDeck: []
};

// Load CSV Data
async function loadCSVData() {
    try {
        // Load player data
        const playerResponse = await fetch('Player Data Jan 27.csv');
        const playerText = await playerResponse.text();
        parsePlayerData(playerText);
        
        // Load action card data
        const actionResponse = await fetch('ActionCardData 2.csv');
        const actionText = await actionResponse.text();
        parseActionCardData(actionText);
        
        console.log('Data loaded successfully');
        console.log('Players:', gameState.allPlayers.length);
        console.log('Action cards:', gameState.actionCardDeck.length);
    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

function parsePlayerData(csvText) {
    const lines = csvText.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV properly handling commas in quoted values
        const values = parseCSVLine(line);
        if (values.length < 15) continue;
        
        const name = values[0];
        const age = parseInt(values[2]) || 0;
        const position = values[4];
        const passing = parseInt(values[5]) || 0;
        const dribbling = parseInt(values[6]) || 0;
        const shooting = parseInt(values[7]) || 0;
        const tackling = parseInt(values[9]) || 0;
        const intercepting = parseInt(values[10]) || 0;
        const saving = parseInt(values[11]) || 0;
        const valuation = values[13];
        const group = parseInt(values[15]) || 0;
        
        // Only include groups 4 and 5
        if (group === 4 || group === 5) {
            gameState.allPlayers.push({
                name,
                age,
                position,
                passing,
                dribbling,
                shooting,
                tackling,
                intercepting,
                saving,
                valuation,
                group
            });
        }
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

function parseActionCardData(csvText) {
    const lines = csvText.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        if (values.length < 3) continue;
        
        const type = values[0].toUpperCase();
        const value = parseInt(values[1]) || 0;
        const description = values[2];
        
        gameState.actionCardDeck.push({
            type,
            value,
            description
        });
    }
}

// Initialize Game
async function initGame() {
    console.log('Initializing game...');
    await loadCSVData();
    console.log('Players loaded:', gameState.allPlayers.length);
    console.log('Action cards loaded:', gameState.actionCardDeck.length);
    
    // Show deck selection
    setupDeckSelection();
}

// ============= DECK SELECTION =============
function setupDeckSelection() {
    document.getElementById('confirm-decks-btn').addEventListener('click', () => {
        const playerDeck = document.querySelector('input[name="player-deck"]:checked').value;
        const actionDeck = document.querySelector('input[name="action-deck"]:checked').value;
        
        gameState.deckSelection.playerDeck = playerDeck;
        gameState.deckSelection.actionDeck = actionDeck;
        
        // Apply deck filters
        applyDeckFilters();
        
        // Move to draft phase
        document.getElementById('deck-selection-phase').classList.remove('active');
        document.getElementById('draft-phase').classList.add('active');
        gameState.phase = 'draft';
        
        startDraftPhase();
    });
}

function applyDeckFilters() {
    // Filter players based on selected deck
    const allPlayersBackup = [...gameState.allPlayers];
    
    switch (gameState.deckSelection.playerDeck) {
        case 'balanced-scoring':
            // Elite players with reduced GK stats - target 1.5-2 goals/game
            gameState.allPlayers = allPlayersBackup
                .filter(p => p.group === 5)
                .map(p => {
                    if (p.position === 'gk') {
                        return {
                            ...p,
                            saving: Math.max(2, Math.floor(p.saving * 0.7)),
                            intercepting: Math.max(2, Math.floor(p.intercepting * 0.8))
                        };
                    }
                    // Boost shooting
                    return {
                        ...p,
                        shooting: Math.min(7, p.shooting + 1)
                    };
                });
            break;
        case 'high-action':
            // Elite players with weakened GKs - target 2.5-3 goals/game
            gameState.allPlayers = allPlayersBackup
                .filter(p => p.group === 5)
                .map(p => {
                    if (p.position === 'gk') {
                        return {
                            ...p,
                            saving: Math.max(2, Math.floor(p.saving * 0.65)),
                            intercepting: Math.max(2, Math.floor(p.intercepting * 0.75))
                        };
                    }
                    return {
                        ...p,
                        shooting: Math.min(7, p.shooting + 1),
                        dribbling: Math.min(7, p.dribbling + 1)
                    };
                });
            break;
        case 'elite':
            gameState.allPlayers = allPlayersBackup.filter(p => p.group === 5);
            break;
        default:
            // All players - no modifications
            break;
    }
    
    // Filter action cards based on selected deck
    const allCardsBackup = [...gameState.actionCardDeck];
    
    switch (gameState.deckSelection.actionDeck) {
        case 'attack-boosted':
            // Favor attacking cards but keep some defensive strength
            gameState.actionCardDeck = allCardsBackup.filter(c => {
                const isAttacking = c.type === 'PASSING' || c.type === 'DRIBBLING' || c.type === 'SHOOTING';
                const isDefensive = c.type === 'TACKLING' || c.type === 'INTERCEPTING' || c.type === 'SAVING';
                
                if (isAttacking) {
                    // Keep all positive attack cards
                    if (c.value > 0) return true;
                    // Keep 50% of negative attack cards
                    return Math.random() > 0.5;
                }
                
                if (isDefensive) {
                    // Keep positive defense at 70% rate (increased from 60%)
                    if (c.value > 0) return Math.random() > 0.3;
                    // Keep negative defense
                    return true;
                }
                
                return true;
            });
            break;
        case 'offensive':
            // More attacking bias
            gameState.actionCardDeck = allCardsBackup.filter(c => {
                const isAttacking = c.type === 'PASSING' || c.type === 'DRIBBLING' || c.type === 'SHOOTING';
                const isDefensive = c.type === 'TACKLING' || c.type === 'INTERCEPTING' || c.type === 'SAVING';
                
                if (c.value === -3) return Math.random() > 0.5; // Reduce -3
                if (isAttacking && c.value > 0) return true; // All positive attack
                if (isDefensive && c.value > 1) return Math.random() > 0.3; // 70% of +2,+3 defense
                return Math.random() > 0.2; // 80% of remaining
            });
            break;
        case 'positive':
            // Keep all positive cards, only some negative cards
            gameState.actionCardDeck = allCardsBackup.filter(c => c.value >= 0 || Math.random() > 0.5);
            break;
        default:
            // Standard - all cards
            break;
    }
    
    // Apply global filter: limit defensive cards to ±2 max
    gameState.actionCardDeck = gameState.actionCardDeck.filter(c => {
        const isDefensive = c.type === 'TACKLING' || c.type === 'INTERCEPTING' || c.type === 'SAVING';
        if (isDefensive && Math.abs(c.value) > 2) {
            return false;
        }
        return true;
    });
    
    // Apply global filter: limit defensive cards to ±2 max
    gameState.actionCardDeck = gameState.actionCardDeck.filter(c => {
        const isDefensive = c.type === 'TACKLING' || c.type === 'INTERCEPTING' || c.type === 'SAVING';
        if (isDefensive && Math.abs(c.value) > 2) {
            return false;
        }
        return true;
    });
    
    console.log('Filtered players:', gameState.allPlayers.length);
    console.log('Filtered action cards:', gameState.actionCardDeck.length);
}

// ============= DRAFT PHASE =============
function startDraftPhase() {
    console.log('Starting draft phase...');
    console.log('Total players available:', gameState.allPlayers.length);
    
    // Shuffle and deal 16 players for draft
    const shuffled = [...gameState.allPlayers].sort(() => Math.random() - 0.5);
    gameState.draft.availablePlayers = shuffled.slice(0, 16);
    
    console.log('Draft pool:', gameState.draft.availablePlayers.length);
    
    renderDraftPool();
    updateDraftInfo();
}

function renderDraftPool() {
    const pool = document.getElementById('draft-pool');
    pool.innerHTML = '';
    
    gameState.draft.availablePlayers.forEach((player, index) => {
        const card = createPlayerCard(player, () => selectPlayerInDraft(index));
        pool.appendChild(card);
    });
}

function createPlayerCard(player, onClick, small = false) {
    const card = document.createElement('div');
    card.className = `player-card ${small ? 'small' : ''}`;
    
    let stats = '';
    if (player.position === 'gk') {
        stats = `
            <div><span>Saving:</span> <span>${player.saving}</span></div>
            <div><span>Penalty:</span> <span>${player.shooting}</span></div>
        `;
    } else if (player.position === 'def') {
        stats = `
            <div><span>Tackling:</span> <span>${player.tackling}</span></div>
            <div><span>Intercept:</span> <span>${player.intercepting}</span></div>
            <div><span>Passing:</span> <span>${player.passing}</span></div>
        `;
    } else if (player.position === 'mid') {
        stats = `
            <div><span>Passing:</span> <span>${player.passing}</span></div>
            <div><span>Dribbling:</span> <span>${player.dribbling}</span></div>
            <div><span>Shooting:</span> <span>${player.shooting}</span></div>
        `;
    } else if (player.position === 'for') {
        stats = `
            <div><span>Shooting:</span> <span>${player.shooting}</span></div>
            <div><span>Dribbling:</span> <span>${player.dribbling}</span></div>
            <div><span>Passing:</span> <span>${player.passing}</span></div>
        `;
    }
    
    card.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="player-position">${player.position.toUpperCase()}</div>
        <div class="player-stats">${stats}</div>
        <div class="player-value">${player.valuation}</div>
    `;
    
    if (onClick) {
        card.addEventListener('click', onClick);
    }
    
    return card;
}

function selectPlayerInDraft(index) {
    const player = gameState.draft.availablePlayers[index];
    const currentPlayer = gameState.draft.currentPlayer;
    
    // Add to player's squad
    gameState.players[currentPlayer].squad.push(player);
    
    // Remove from available
    gameState.draft.availablePlayers.splice(index, 1);
    
    // Update display
    renderDraftedTeams();
    
    // Move to next pick
    gameState.draft.pickNumber++;
    
    if (gameState.draft.pickNumber >= 32) {
        // Draft complete
        finishDraft();
        return;
    }
    
    // Check if we need to refresh the pool
    if (gameState.draft.availablePlayers.length === 0) {
        // Get next 16 players
        const remaining = gameState.allPlayers.filter(p => 
            !gameState.players[1].squad.includes(p) && 
            !gameState.players[2].squad.includes(p)
        );
        const shuffled = remaining.sort(() => Math.random() - 0.5);
        gameState.draft.availablePlayers = shuffled.slice(0, 16);
        renderDraftPool();
    } else {
        renderDraftPool();
    }
    
    // Snake draft logic
    if (gameState.draft.pickNumber % 2 === 0) {
        gameState.draft.direction *= -1;
    }
    
    gameState.draft.currentPlayer = gameState.draft.currentPlayer === 1 ? 2 : 1;
    updateDraftInfo();
}

function renderDraftedTeams() {
    // Player 1
    const p1Container = document.getElementById('p1-drafted');
    p1Container.innerHTML = '';
    gameState.players[1].squad.forEach(player => {
        const card = createPlayerCard(player, null, true);
        p1Container.appendChild(card);
    });
    document.getElementById('p1-count').textContent = gameState.players[1].squad.length;
    
    // Player 2
    const p2Container = document.getElementById('p2-drafted');
    p2Container.innerHTML = '';
    gameState.players[2].squad.forEach(player => {
        const card = createPlayerCard(player, null, true);
        p2Container.appendChild(card);
    });
    document.getElementById('p2-count').textContent = gameState.players[2].squad.length;
}

function updateDraftInfo() {
    document.getElementById('current-drafter').textContent = 
        `Player ${gameState.draft.currentPlayer}'s Pick`;
    document.getElementById('draft-progress').textContent = 
        `Pick ${gameState.draft.pickNumber + 1} of 32`;
}

function finishDraft() {
    // Deal action cards to each player
    const shuffledDeck = [...gameState.actionCardDeck].sort(() => Math.random() - 0.5);
    gameState.players[1].actionCards = shuffledDeck.slice(0, 10);
    gameState.players[2].actionCards = shuffledDeck.slice(10, 20);
    
    // Show start button, hide auto-draft
    document.getElementById('start-game-btn').style.display = 'inline-block';
    document.getElementById('simulate-btn').style.display = 'inline-block';
    document.getElementById('auto-draft-btn').style.display = 'none';
    document.getElementById('start-game-btn').addEventListener('click', startGameplay, { once: true });
    document.getElementById('simulate-btn').addEventListener('click', showSimulationMode, { once: true });
}

// ============= GAMEPLAY PHASE =============
function startGameplay() {
    gameState.phase = 'gameplay';
    
    // Hide draft phase
    document.getElementById('draft-phase').classList.remove('active');
    document.getElementById('gameplay-phase').classList.add('active');
    
    // Initialize gameplay
    gameState.gameplay.possession = 1;
    gameState.gameplay.ballZone = 'build-up';
    
    // Place goalkeepers permanently
    placeGoalkeepers();
    
    updateGameDisplay();
    startTurn();
}

function placeGoalkeepers() {
    // Place Player 1's goalkeeper in Player 2's goalkeeper zone
    const p1Goalkeeper = gameState.players[1].squad.find(p => p.position === 'gk');
    if (p1Goalkeeper) {
        const zone = document.getElementById('p2-goalkeeper');
        zone.innerHTML = '';
        const card = createPlayerCard(p1Goalkeeper, null, true);
        zone.appendChild(card);
    }
    
    // Place Player 2's goalkeeper in Player 1's goalkeeper zone
    const p2Goalkeeper = gameState.players[2].squad.find(p => p.position === 'gk');
    if (p2Goalkeeper) {
        const zone = document.getElementById('p1-goalkeeper');
        zone.innerHTML = '';
        const card = createPlayerCard(p2Goalkeeper, null, true);
        zone.appendChild(card);
    }
}

function startTurn() {
    const possession = gameState.gameplay.possession;
    
    // Check if we should keep the same player (after successful dribble)
    if (gameState.gameplay.keepSamePlayer && gameState.gameplay.attackingPlayer) {
        // Reset turn state but keep the player
        const continuingPlayer = gameState.gameplay.attackingPlayer;
        gameState.gameplay.currentAction = null;
        gameState.gameplay.defendingPlayer = null;
        gameState.gameplay.attackingCard = null;
        gameState.gameplay.defendingCard = null;
        gameState.gameplay.waitingForDefender = false;
        gameState.gameplay.waitingForAttackerCard = false;
        gameState.gameplay.waitingForDefenderCard = false;
        
        // Clear pitch
        clearPitch();
        
        // Place the same player in new zone
        gameState.gameplay.attackingPlayer = continuingPlayer;
        const zone = possession === 1 ? 'p1-' + gameState.gameplay.ballZone : 'p2-' + gameState.gameplay.ballZone;
        const zoneEl = document.getElementById(zone);
        const card = createPlayerCard(continuingPlayer, null, true);
        zoneEl.appendChild(card);
        
        // Go straight to action selection
        showActionSelection();
    } else {
        // Reset turn state
        gameState.gameplay.currentAction = null;
        gameState.gameplay.attackingPlayer = null;
        gameState.gameplay.defendingPlayer = null;
        gameState.gameplay.attackingCard = null;
        gameState.gameplay.defendingCard = null;
        gameState.gameplay.waitingForDefender = false;
        gameState.gameplay.waitingForAttackerCard = false;
        gameState.gameplay.waitingForDefenderCard = false;
        
        // Clear pitch
        clearPitch();
        
        // Show player selection for attacker
        showPlayerSelection(possession, 'Select a player to place:');
    }
}

function clearPitch() {
    const zones = ['p1-build-up', 'p1-progression', 'p1-final-third',
                   'p2-build-up', 'p2-progression', 'p2-final-third'];
    zones.forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    // Keep goalkeepers visible
}

function showPlayerSelection(player, prompt) {
    console.log('Showing player selection for player', player, 'with prompt:', prompt);
    document.getElementById('selection-prompt').textContent = prompt;
    const hand = document.getElementById('player-hand');
    hand.innerHTML = '';
    
    gameState.players[player].squad.forEach((p, index) => {
        const isUsed = gameState.gameplay.usedPlayers[player].includes(p);
        const card = createPlayerCard(p, isUsed ? null : () => selectPlayer(player, index));
        if (isUsed) {
            card.classList.add('drafted');
            card.style.cursor = 'not-allowed';
        }
        hand.appendChild(card);
    });
    
    document.getElementById('player-selection').style.display = 'block';
    document.getElementById('action-selection').style.display = 'none';
    document.getElementById('action-card-selection').style.display = 'none';
    document.getElementById('resolution-display').style.display = 'none';
}

function selectPlayer(player, index) {
    const selectedPlayer = gameState.players[player].squad[index];
    console.log('Player', player, 'selected:', selectedPlayer.name, 'waitingForDefender:', gameState.gameplay.waitingForDefender);
    
    if (!gameState.gameplay.waitingForDefender) {
        // Attacker selected their player
        gameState.gameplay.attackingPlayer = selectedPlayer;
        
        // Mark as used (unless it's a dribble continuation)
        if (!gameState.gameplay.keepSamePlayer) {
            gameState.gameplay.usedPlayers[player].push(selectedPlayer);
        }
        gameState.gameplay.keepSamePlayer = false;
        
        // Place on pitch
        const zone = player === 1 ? 'p1-' + gameState.gameplay.ballZone : 'p2-' + gameState.gameplay.ballZone;
        const zoneEl = document.getElementById(zone);
        zoneEl.innerHTML = '';
        const card = createPlayerCard(selectedPlayer, null, true);
        zoneEl.appendChild(card);
        
        // Show action selection
        document.getElementById('player-selection').style.display = 'none';
        showActionSelection();
    } else {
        // Defender selected their player
        gameState.gameplay.defendingPlayer = selectedPlayer;
        gameState.gameplay.waitingForDefender = false; // Reset flag
        
        // Determine defending zone (opposite zone)
        let defendingZone;
        if (gameState.gameplay.ballZone === 'build-up') {
            defendingZone = 'build-up'; // Defender in their own build-up
        } else if (gameState.gameplay.ballZone === 'progression') {
            defendingZone = 'build-up'; // Defender in their own build-up
        } else if (gameState.gameplay.ballZone === 'final-third') {
            defendingZone = 'goalkeeper'; // Defender is goalkeeper
        }
        
        // Place on pitch in corresponding zone
        const defender = gameState.gameplay.possession === 1 ? 2 : 1;
        const zone = defender === 1 ? 'p1-' + defendingZone : 'p2-' + defendingZone;
        const zoneEl = document.getElementById(zone);
        zoneEl.innerHTML = '';
        const card = createPlayerCard(selectedPlayer, null, true);
        zoneEl.appendChild(card);
        
        // Now both players select action cards
        document.getElementById('player-selection').style.display = 'none';
        gameState.gameplay.waitingForAttackerCard = true;
        showActionCardSelection(gameState.gameplay.possession, 'Attacker: Select your action card');
    }
}

function showActionSelection() {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.onclick = () => selectAction(btn.dataset.action);
    });
    
    // In final third: only shooting allowed
    if (gameState.gameplay.ballZone === 'final-third') {
        document.querySelector('[data-action="pass"]').disabled = true;
        document.querySelector('[data-action="dribble"]').disabled = true;
    }
    // Shooting available from progression (with penalty) and final third
    
    document.getElementById('action-selection').style.display = 'block';
}

function selectAction(action) {
    gameState.gameplay.currentAction = action;
    document.getElementById('action-selection').style.display = 'none';
    
    // Track shots
    if (action === 'shoot') {
        gameState.players[gameState.gameplay.possession].shots++;
    }
    
    // If shooting, defender is automatically goalkeeper
    if (action === 'shoot') {
        const defender = gameState.gameplay.possession === 1 ? 2 : 1;
        const goalkeeper = gameState.players[defender].squad.find(p => p.position === 'gk');
        
        if (goalkeeper) {
            gameState.gameplay.defendingPlayer = goalkeeper;
            // Goalkeeper is already visible in their zone
            
            // Skip defender selection, go straight to card selection
            gameState.gameplay.waitingForAttackerCard = true;
            showActionCardSelection(gameState.gameplay.possession, 'Attacker: Select your action card');
        }
    } else {
        // Defender selects player
        gameState.gameplay.waitingForDefender = true;
        const defender = gameState.gameplay.possession === 1 ? 2 : 1;
        showPlayerSelection(defender, 'Defender: Select a player to combat:');
    }
}

function showActionCardSelection(player, prompt) {
    document.getElementById('card-prompt').textContent = prompt;
    const hand = document.getElementById('action-card-hand');
    hand.innerHTML = '';
    
    gameState.players[player].actionCards.forEach((card, index) => {
        const cardEl = createActionCard(card, () => selectActionCard(player, index));
        hand.appendChild(cardEl);
    });
    
    document.getElementById('action-card-selection').style.display = 'block';
}

function createActionCard(card, onClick) {
    const cardEl = document.createElement('div');
    const positiveClass = card.value > 0 ? 'positive' : card.value < 0 ? 'negative' : '';
    cardEl.className = `action-card ${positiveClass}`;
    
    cardEl.innerHTML = `
        <div class="card-type">${card.type}</div>
        <div class="card-value">${card.value > 0 ? '+' : ''}${card.value}</div>
        <div class="card-description">${card.description}</div>
    `;
    
    if (onClick) {
        cardEl.addEventListener('click', onClick);
    }
    
    return cardEl;
}

function selectActionCard(player, index) {
    const card = gameState.players[player].actionCards[index];
    
    if (gameState.gameplay.waitingForAttackerCard) {
        gameState.gameplay.attackingCard = card;
        gameState.players[player].actionCards.splice(index, 1);
        gameState.players[player].cardsUsed++;
        
        document.getElementById('action-card-selection').style.display = 'none';
        
        // Now defender selects
        gameState.gameplay.waitingForAttackerCard = false;
        gameState.gameplay.waitingForDefenderCard = true;
        const defender = gameState.gameplay.possession === 1 ? 2 : 1;
        showActionCardSelection(defender, 'Defender: Select your action card');
    } else if (gameState.gameplay.waitingForDefenderCard) {
        gameState.gameplay.defendingCard = card;
        gameState.players[player].actionCards.splice(index, 1);
        gameState.players[player].cardsUsed++;
        
        document.getElementById('action-card-selection').style.display = 'none';
        
        // Resolve duel
        resolveDuel();
    }
}

function resolveDuel() {
    const action = gameState.gameplay.currentAction;
    const attacker = gameState.gameplay.attackingPlayer;
    const defender = gameState.gameplay.defendingPlayer;
    const attackCard = gameState.gameplay.attackingCard;
    const defendCard = gameState.gameplay.defendingCard;
    
    // Determine stats to use
    let attackStat, defendStat, attackStatName, defendStatName;
    let shootingPenalty = 0;
    
    if (action === 'shoot') {
        attackStat = attacker.shooting;
        defendStat = defender.saving;
        attackStatName = 'Shooting';
        defendStatName = 'Saving';
        // -1 penalty if shooting from progression
        if (gameState.gameplay.ballZone === 'progression') {
            shootingPenalty = -1;
        }
    } else if (action === 'pass') {
        attackStat = attacker.passing;
        defendStat = defender.intercepting;
        attackStatName = 'Passing';
        defendStatName = 'Intercepting';
    } else if (action === 'dribble') {
        attackStat = attacker.dribbling;
        defendStat = defender.tackling;
        attackStatName = 'Dribbling';
        defendStatName = 'Tackling';
    }
    
    // Calculate card effects (only if card matches action/defense stat)
    let attackCardBonus = 0;
    let defendCardBonus = 0;
    
    // Attacker's card affects their stat if it matches their action
    if (attackCard.type === attackStatName.toUpperCase()) {
        attackCardBonus = attackCard.value;
    }
    // Or it affects defender's stat if it matches defender's stat
    else if (attackCard.type === defendStatName.toUpperCase()) {
        defendCardBonus += attackCard.value; // Apply card value directly to defender
    }
    
    // Defender's card affects their stat if it matches their defense
    if (defendCard.type === defendStatName.toUpperCase()) {
        defendCardBonus += defendCard.value;
    }
    // Or it affects attacker's stat if it matches attacker's stat
    else if (defendCard.type === attackStatName.toUpperCase()) {
        attackCardBonus += defendCard.value; // Apply card value directly to attacker
    }
    
    // Calculate totals
    const attackTotal = attackStat + attackCardBonus + shootingPenalty;
    const defendTotal = defendStat + defendCardBonus;
    
    // Display resolution
    const attackerName = gameState.gameplay.possession === 1 ? 'Player 1' : 'Player 2';
    const defenderName = gameState.gameplay.possession === 1 ? 'Player 2' : 'Player 1';
    
    let attackDetails = `${attacker.name} (${attackStatName}: ${attackStat})`;
    if (attackCardBonus !== 0) {
        attackDetails += ` + ${attackCard.type} card (${attackCardBonus > 0 ? '+' : ''}${attackCardBonus})`;
    }
    if (shootingPenalty !== 0) {
        attackDetails += ` + Range penalty (${shootingPenalty})`;
    }
    attackDetails += ` = ${attackTotal}`;
    
    let defendDetails = `${defender.name} (${defendStatName}: ${defendStat})`;
    if (defendCardBonus !== 0) {
        defendDetails += ` + Card effects (${defendCardBonus > 0 ? '+' : ''}${defendCardBonus})`;
    }
    defendDetails += ` = ${defendTotal}`;
    
    document.getElementById('attacker-name').textContent = attackerName;
    document.getElementById('attacker-details').textContent = attackDetails;
    
    document.getElementById('defender-name').textContent = defenderName;
    document.getElementById('defender-details').textContent = defendDetails;
    
    let resultText = '';
    
    if (attackTotal > defendTotal) {
        // Attacker wins
        if (action === 'shoot') {
            // GOAL!
            gameState.players[gameState.gameplay.possession].score++;
            resultText = `⚽ GOAL! ${attackerName} scores!`;
            
            // Reset possession to other team
            gameState.gameplay.possession = gameState.gameplay.possession === 1 ? 2 : 1;
            gameState.gameplay.ballZone = 'build-up';
        } else if (action === 'dribble') {
            // Advance zone with same player
            resultText = `${attackerName} successfully dribbles forward!`;
            advanceZone();
            // Keep the same player for next turn
            gameState.gameplay.keepSamePlayer = true;
        } else if (action === 'pass') {
            // Advance zone, must replace player
            resultText = `${attackerName} completes the pass!`;
            advanceZone();
            // Player will be replaced in next turn
        }
    } else {
        // Defender wins - possession changes
        resultText = `${defenderName} wins the duel! Possession changes.`;
        gameState.gameplay.possession = gameState.gameplay.possession === 1 ? 2 : 1;
        // If goalkeeper won, reset to build-up
        if (action === 'shoot') {
            gameState.gameplay.ballZone = 'build-up';
        }
        // Otherwise ball stays in same zone (opposite side)
    }
    
    document.getElementById('resolution-result').textContent = resultText;
    document.getElementById('resolution-display').style.display = 'block';
    
    // Update score
    updateGameDisplay();
}

function advanceZone() {
    if (gameState.gameplay.ballZone === 'build-up') {
        gameState.gameplay.ballZone = 'progression';
    } else if (gameState.gameplay.ballZone === 'progression') {
        gameState.gameplay.ballZone = 'final-third';
    }
    // If already in final-third, stay there
}

function updateGameDisplay() {
    document.getElementById('p1-score').textContent = gameState.players[1].score;
    document.getElementById('p2-score').textContent = gameState.players[2].score;
    
    const possessionText = `Player ${gameState.gameplay.possession} in Possession (${gameState.gameplay.ballZone.replace('-', ' ')})`;
    document.getElementById('current-turn').textContent = possessionText;
    
    const p1Cards = 10 - gameState.players[1].cardsUsed;
    const p2Cards = 10 - gameState.players[2].cardsUsed;
    document.getElementById('cards-remaining').textContent = 
        `Actions Remaining: P1: ${p1Cards} | P2: ${p2Cards}`;
}

document.getElementById('continue-btn').addEventListener('click', () => {
    document.getElementById('resolution-display').style.display = 'none';
    
    // Check if game should end
    if (gameState.players[1].cardsUsed >= 10 && gameState.players[2].cardsUsed >= 10) {
        endGame();
    } else {
        startTurn();
    }
});

// ============= END GAME =============
function endGame() {
    gameState.phase = 'endgame';
    
    document.getElementById('gameplay-phase').classList.remove('active');
    document.getElementById('endgame-phase').classList.add('active');
    
    const p1Score = gameState.players[1].score;
    const p2Score = gameState.players[2].score;
    
    document.getElementById('final-p1-score').textContent = p1Score;
    document.getElementById('final-p2-score').textContent = p2Score;
    
    let winner = '';
    if (p1Score > p2Score) {
        winner = 'Player 1 Wins!';
    } else if (p2Score > p1Score) {
        winner = 'Player 2 Wins!';
    } else {
        winner = "It's a Draw!";
    }
    
    document.getElementById('winner-announcement').textContent = winner;
}

document.getElementById('new-game-btn').addEventListener('click', () => {
    location.reload();
});

// Auto-draft functionality
document.getElementById('auto-draft-btn').addEventListener('click', () => {
    if (gameState.players[1].squad.length > 0 || gameState.players[2].squad.length > 0) {
        if (!confirm('This will reset the current draft. Continue?')) {
            return;
        }
        gameState.players[1].squad = [];
        gameState.players[2].squad = [];
    }
    
    // Shuffle all players
    const shuffled = [...gameState.allPlayers].sort(() => Math.random() - 0.5);
    
    // Give 16 to each player
    gameState.players[1].squad = shuffled.slice(0, 16);
    gameState.players[2].squad = shuffled.slice(16, 32);
    
    // Update display
    renderDraftedTeams();
    
    // Deal action cards
    const shuffledDeck = [...gameState.actionCardDeck].sort(() => Math.random() - 0.5);
    gameState.players[1].actionCards = shuffledDeck.slice(0, 10);
    gameState.players[2].actionCards = shuffledDeck.slice(10, 20);
    
    console.log('Auto-draft complete. P1 cards:', gameState.players[1].actionCards.length, 'P2 cards:', gameState.players[2].actionCards.length);
    
    // Show start button
    document.getElementById('start-game-btn').style.display = 'inline-block';
    document.getElementById('simulate-btn').style.display = 'inline-block';
    document.getElementById('auto-draft-btn').style.display = 'none';
    
    // Clear draft pool
    document.getElementById('draft-pool').innerHTML = '<p style="text-align: center; grid-column: 1/-1; font-size: 20px;">Auto-draft complete! Click "Start Match" to play or "Simulate Match" to run simulations.</p>';
    
    // Add event listener for start button
    const startBtn = document.getElementById('start-game-btn');
    startBtn.onclick = startGameplay;
    
    const simBtn = document.getElementById('simulate-btn');
    simBtn.onclick = showSimulationMode;
});

// ============= SIMULATION MODE =============
function showSimulationMode() {
    document.getElementById('draft-phase').classList.remove('active');
    document.getElementById('simulation-phase').classList.add('active');
    gameState.phase = 'simulation';
}

document.getElementById('back-to-draft-btn').addEventListener('click', () => {
    document.getElementById('simulation-phase').classList.remove('active');
    document.getElementById('draft-phase').classList.add('active');
    gameState.phase = 'draft';
});

document.getElementById('run-simulations-btn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('sim-count').value);
    runSimulations(count);
});

function runSimulations(count) {
    gameState.simulation.results = [];
    const resultsDiv = document.getElementById('simulation-results');
    resultsDiv.innerHTML = '<p>Running simulations...</p>';
    
    // Run simulations
    for (let i = 0; i < count; i++) {
        const result = simulateMatch();
        gameState.simulation.results.push(result);
    }
    
    // Calculate statistics
    const stats = calculateStats(gameState.simulation.results);
    displayStats(stats);
}

function draftRandomTeams() {
    // Get available players (excluding goalkeepers for now)
    const availablePlayers = gameState.allPlayers.filter(p => p.position !== 'gk');
    const goalkeepers = gameState.allPlayers.filter(p => p.position === 'gk');
    
    // Shuffle players
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    
    // Draft 7 outfield players per team + 1 GK
    const team1 = shuffled.slice(0, 7);
    const team2 = shuffled.slice(7, 14);
    
    // Add random goalkeeper to each team
    const shuffledGKs = [...goalkeepers].sort(() => Math.random() - 0.5);
    team1.push(shuffledGKs[0]);
    team2.push(shuffledGKs[1]);
    
    // Deal action cards (10 per team, shuffled)
    const shuffledCards1 = [...gameState.actionCardDeck].sort(() => Math.random() - 0.5).slice(0, 10);
    const shuffledCards2 = [...gameState.actionCardDeck].sort(() => Math.random() - 0.5).slice(0, 10);
    
    return {
        team1,
        team2,
        cards1: shuffledCards1,
        cards2: shuffledCards2
    };
}

function simulateMatch() {
    // Draft new random teams for this simulation
    const draft = draftRandomTeams();
    
    // Create a deep copy of game state for simulation
    const simState = {
        possession: 1,
        ballZone: 'build-up',
        usedPlayers: { 1: [], 2: [] },
        keepSamePlayer: false,
        scores: { 1: 0, 2: 0 },
        shots: { 1: 0, 2: 0 },
        cardsUsed: { 1: 0, 2: 0 },
        actionStats: {
            pass: { attempts: 0, successes: 0 },
            dribble: { attempts: 0, successes: 0 },
            shoot: { attempts: 0, successes: 0 }
        },
        squads: {
            1: draft.team1,
            2: draft.team2
        },
        actionCards: {
            1: [...draft.cards1],
            2: [...draft.cards2]
        }
    };
    
    // Play until all cards are used
    while (simState.cardsUsed[1] < 10 && simState.cardsUsed[2] < 10) {
        simulateTurn(simState);
    }
    
    return {
        p1Score: simState.scores[1],
        p2Score: simState.scores[2],
        p1Shots: simState.shots[1],
        p2Shots: simState.shots[2],
        winner: simState.scores[1] > simState.scores[2] ? 1 : simState.scores[2] > simState.scores[1] ? 2 : 0,
        actionStats: simState.actionStats
    };
}

function simulateTurn(simState) {
    const attacker = simState.possession;
    const defender = attacker === 1 ? 2 : 1;
    
    // Select attacking player (best available for current zone)
    let attackingPlayer;
    if (simState.keepSamePlayer && simState.lastAttackingPlayer) {
        attackingPlayer = simState.lastAttackingPlayer;
    } else {
        attackingPlayer = selectBestPlayer(attacker, simState);
        simState.usedPlayers[attacker].push(attackingPlayer);
    }
    
    // Select action
    const action = selectBestAction(simState.ballZone);
    
    // Track shots
    if (action === 'shoot') {
        simState.shots[attacker]++;
    }
    
    // Select defending player
    const defendingPlayer = action === 'shoot' 
        ? simState.squads[defender].find(p => p.position === 'gk')
        : selectBestDefender(defender, action, simState);
    
    // Select action cards
    const attackCard = selectBestActionCard(simState.actionCards[attacker], action, true);
    const defendCard = selectBestActionCard(simState.actionCards[defender], action, false);
    
    // Remove used cards
    const attackCardIndex = simState.actionCards[attacker].indexOf(attackCard);
    simState.actionCards[attacker].splice(attackCardIndex, 1);
    simState.cardsUsed[attacker]++;
    
    const defendCardIndex = simState.actionCards[defender].indexOf(defendCard);
    simState.actionCards[defender].splice(defendCardIndex, 1);
    simState.cardsUsed[defender]++;
    
    // Resolve duel
    const result = resolveDuelSimulation(attackingPlayer, defendingPlayer, attackCard, defendCard, action, simState.ballZone);
    
    // Track action stats
    simState.actionStats[action].attempts++;
    if (result.attackerWins) {
        simState.actionStats[action].successes++;
    }
    
    // Update state based on result
    if (result.attackerWins) {
        if (action === 'shoot') {
            // Goal scored!
            simState.scores[attacker]++;
            // Possession changes, restart from build-up
            simState.possession = defender;
            simState.ballZone = 'build-up';
            simState.keepSamePlayer = false;
            simState.usedPlayers[1] = [];
            simState.usedPlayers[2] = [];
        } else if (action === 'dribble') {
            advanceZoneSimulation(simState);
            simState.keepSamePlayer = true;
            simState.lastAttackingPlayer = attackingPlayer;
        } else {
            // Successful pass
            advanceZoneSimulation(simState);
            simState.keepSamePlayer = false;
        }
    } else {
        // Defender wins - possession changes
        simState.possession = defender;
        simState.ballZone = 'build-up';
        simState.keepSamePlayer = false;
        simState.usedPlayers[1] = [];
        simState.usedPlayers[2] = [];
    }
}

function selectBestPlayer(player, simState) {
    const availablePlayers = simState.squads[player].filter(
        p => !simState.usedPlayers[player].includes(p) && p.position !== 'gk'
    );
    
    if (availablePlayers.length === 0) return simState.squads[player][0];
    
    // Select based on zone
    const zone = simState.ballZone;
    if (zone === 'final-third') {
        // Prioritize shooting
        return availablePlayers.sort((a, b) => b.shooting - a.shooting)[0];
    } else if (zone === 'progression') {
        // Prioritize dribbling or shooting
        return availablePlayers.sort((a, b) => (b.dribbling + b.shooting) - (a.dribbling + a.shooting))[0];
    } else {
        // Prioritize passing
        return availablePlayers.sort((a, b) => b.passing - a.passing)[0];
    }
}

function selectBestAction(zone) {
    if (zone === 'final-third') {
        // Can only shoot in final third
        return 'shoot';
    }
    if (zone === 'progression') {
        // 50% shoot (with -1 penalty), 40% dribble, 10% pass
        const rand = Math.random();
        if (rand > 0.5) return 'shoot';
        if (rand > 0.1) return 'dribble';
        return 'pass';
    }
    // Build-up: 40% pass, 60% dribble to advance faster
    return Math.random() > 0.6 ? 'pass' : 'dribble';
}

function selectBestDefender(player, action, simState) {
    const availablePlayers = simState.squads[player].filter(p => p.position !== 'gk');
    if (availablePlayers.length === 0) return simState.squads[player][0];
    
    if (action === 'pass') {
        return availablePlayers.sort((a, b) => b.intercepting - a.intercepting)[0];
    } else if (action === 'dribble') {
        return availablePlayers.sort((a, b) => b.tackling - a.tackling)[0];
    }
    return availablePlayers[0];
}

function selectBestActionCard(cards, action, isAttacker) {
    if (cards.length === 0) return null;
    
    let targetType;
    if (action === 'shoot') {
        targetType = isAttacker ? 'SHOOTING' : 'SAVING';
    } else if (action === 'pass') {
        targetType = isAttacker ? 'PASSING' : 'INTERCEPTING';
    } else if (action === 'dribble') {
        targetType = isAttacker ? 'DRIBBLING' : 'TACKLING';
    }
    
    // Find matching cards
    const matchingCards = cards.filter(c => c.type === targetType);
    if (matchingCards.length > 0) {
        // 70% chance to pick best card, 30% chance for random matching card
        if (Math.random() > 0.3) {
            return matchingCards.sort((a, b) => b.value - a.value)[0];
        } else {
            return matchingCards[Math.floor(Math.random() * matchingCards.length)];
        }
    }
    
    // Try to hurt opponent
    const opponentType = action === 'shoot' ? (isAttacker ? 'SAVING' : 'SHOOTING') :
                        action === 'pass' ? (isAttacker ? 'INTERCEPTING' : 'PASSING') :
                        (isAttacker ? 'TACKLING' : 'DRIBBLING');
    const opponentCards = cards.filter(c => c.type === opponentType);
    if (opponentCards.length > 0) {
        // 70% chance to pick most negative, 30% random
        if (Math.random() > 0.3) {
            return opponentCards.sort((a, b) => a.value - b.value)[0]; // Most negative
        } else {
            return opponentCards[Math.floor(Math.random() * opponentCards.length)];
        }
    }
    
    // Return random card
    return cards[Math.floor(Math.random() * cards.length)];
}

function resolveDuelSimulation(attacker, defender, attackCard, defendCard, action, zone) {
    let attackStat, defendStat, attackStatName, defendStatName;
    let shootingPenalty = 0;
    
    if (action === 'shoot') {
        attackStat = attacker.shooting;
        defendStat = defender.saving;
        attackStatName = 'SHOOTING';
        defendStatName = 'SAVING';
        if (zone === 'progression') shootingPenalty = -1;
    } else if (action === 'pass') {
        attackStat = attacker.passing;
        defendStat = defender.intercepting;
        attackStatName = 'PASSING';
        defendStatName = 'INTERCEPTING';
    } else {
        attackStat = attacker.dribbling;
        defendStat = defender.tackling;
        attackStatName = 'DRIBBLING';
        defendStatName = 'TACKLING';
    }
    
    let attackCardBonus = 0;
    let defendCardBonus = 0;
    
    // Handle attack card
    if (attackCard) {
        if (attackCard.type === attackStatName) {
            attackCardBonus = attackCard.value;
        } else if (attackCard.type === defendStatName) {
            defendCardBonus += attackCard.value;
        }
    }
    
    // Handle defend card
    if (defendCard) {
        if (defendCard.type === defendStatName) {
            defendCardBonus += defendCard.value;
        } else if (defendCard.type === attackStatName) {
            attackCardBonus += defendCard.value;
        }
    }
    
    const attackTotal = attackStat + attackCardBonus + shootingPenalty;
    const defendTotal = defendStat + defendCardBonus;
    
    // Attacker must beat defender (ties go to defender)
    return {
        attackerWins: attackTotal > defendTotal,
        attackTotal,
        defendTotal
    };
}

function advanceZoneSimulation(simState) {
    if (simState.ballZone === 'build-up') {
        simState.ballZone = 'progression';
    } else if (simState.ballZone === 'progression') {
        simState.ballZone = 'final-third';
    }
}

function calculateStats(results) {
    const totalGames = results.length;
    const p1Wins = results.filter(r => r.winner === 1).length;
    const p2Wins = results.filter(r => r.winner === 2).length;
    const draws = results.filter(r => r.winner === 0).length;
    
    const totalP1Goals = results.reduce((sum, r) => sum + r.p1Score, 0);
    const totalP2Goals = results.reduce((sum, r) => sum + r.p2Score, 0);
    const totalGoals = totalP1Goals + totalP2Goals;
    
    const totalP1Shots = results.reduce((sum, r) => sum + r.p1Shots, 0);
    const totalP2Shots = results.reduce((sum, r) => sum + r.p2Shots, 0);
    const totalShots = totalP1Shots + totalP2Shots;
    
    // Aggregate action stats
    const actionStats = {
        pass: { attempts: 0, successes: 0 },
        dribble: { attempts: 0, successes: 0 },
        shoot: { attempts: 0, successes: 0 }
    };
    
    results.forEach(r => {
        actionStats.pass.attempts += r.actionStats.pass.attempts;
        actionStats.pass.successes += r.actionStats.pass.successes;
        actionStats.dribble.attempts += r.actionStats.dribble.attempts;
        actionStats.dribble.successes += r.actionStats.dribble.successes;
        actionStats.shoot.attempts += r.actionStats.shoot.attempts;
        actionStats.shoot.successes += r.actionStats.shoot.successes;
    });
    
    return {
        totalGames,
        p1Wins,
        p2Wins,
        draws,
        totalP1Goals,
        totalP2Goals,
        totalGoals,
        totalP1Shots,
        totalP2Shots,
        totalShots,
        avgP1Goals: (totalP1Goals / totalGames).toFixed(2),
        avgP2Goals: (totalP2Goals / totalGames).toFixed(2),
        avgGoalsPerGame: (totalGoals / totalGames).toFixed(2),
        avgP1Shots: (totalP1Shots / totalGames).toFixed(2),
        avgP2Shots: (totalP2Shots / totalGames).toFixed(2),
        avgShotsPerGame: (totalShots / totalGames).toFixed(2),
        p1Conversion: totalP1Shots > 0 ? ((totalP1Goals / totalP1Shots) * 100).toFixed(1) : '0.0',
        p2Conversion: totalP2Shots > 0 ? ((totalP2Goals / totalP2Shots) * 100).toFixed(1) : '0.0',
        actionStats: {
            pass: {
                attempts: actionStats.pass.attempts,
                successes: actionStats.pass.successes,
                avgPerGame: (actionStats.pass.attempts / totalGames).toFixed(2),
                successRate: actionStats.pass.attempts > 0 ? ((actionStats.pass.successes / actionStats.pass.attempts) * 100).toFixed(1) : '0.0'
            },
            dribble: {
                attempts: actionStats.dribble.attempts,
                successes: actionStats.dribble.successes,
                avgPerGame: (actionStats.dribble.attempts / totalGames).toFixed(2),
                successRate: actionStats.dribble.attempts > 0 ? ((actionStats.dribble.successes / actionStats.dribble.attempts) * 100).toFixed(1) : '0.0'
            },
            shoot: {
                attempts: actionStats.shoot.attempts,
                successes: actionStats.shoot.successes,
                avgPerGame: (actionStats.shoot.attempts / totalGames).toFixed(2),
                successRate: actionStats.shoot.attempts > 0 ? ((actionStats.shoot.successes / actionStats.shoot.attempts) * 100).toFixed(1) : '0.0'
            }
        }
    };
}

function displayStats(stats) {
    const resultsDiv = document.getElementById('simulation-results');
    resultsDiv.innerHTML = `
        <h4>Simulation Results (${stats.totalGames} matches)</h4>
        <div class="stats-grid">
            <div class="stat-box">
                <h5>Wins</h5>
                <p>Player 1: ${stats.p1Wins} (${(stats.p1Wins/stats.totalGames*100).toFixed(1)}%)</p>
                <p>Player 2: ${stats.p2Wins} (${(stats.p2Wins/stats.totalGames*100).toFixed(1)}%)</p>
                <p>Draws: ${stats.draws} (${(stats.draws/stats.totalGames*100).toFixed(1)}%)</p>
            </div>
            <div class="stat-box">
                <h5>Goals</h5>
                <p>Total: ${stats.totalGoals}</p>
                <p>Avg per game: ${stats.avgGoalsPerGame}</p>
                <p>P1 avg: ${stats.avgP1Goals}</p>
                <p>P2 avg: ${stats.avgP2Goals}</p>
            </div>
            <div class="stat-box">
                <h5>Shots</h5>
                <p>Total: ${stats.totalShots}</p>
                <p>Avg per game: ${stats.avgShotsPerGame}</p>
                <p>P1 avg: ${stats.avgP1Shots}</p>
                <p>P2 avg: ${stats.avgP2Shots}</p>
            </div>
            <div class="stat-box">
                <h5>Conversion Rate</h5>
                <p>Player 1: ${stats.p1Conversion}%</p>
                <p>Player 2: ${stats.p2Conversion}%</p>
                <p>Overall: ${stats.totalShots > 0 ? ((stats.totalGoals / stats.totalShots) * 100).toFixed(1) : '0.0'}%</p>
            </div>
        </div>
        <div class="stats-grid" style="margin-top: 20px;">
            <div class="stat-box">
                <h5>Passing</h5>
                <p>Total: ${stats.actionStats.pass.attempts}</p>
                <p>Avg per game: ${stats.actionStats.pass.avgPerGame}</p>
                <p>Success rate: ${stats.actionStats.pass.successRate}%</p>
            </div>
            <div class="stat-box">
                <h5>Dribbling</h5>
                <p>Total: ${stats.actionStats.dribble.attempts}</p>
                <p>Avg per game: ${stats.actionStats.dribble.avgPerGame}</p>
                <p>Success rate: ${stats.actionStats.dribble.successRate}%</p>
            </div>
            <div class="stat-box">
                <h5>Shooting</h5>
                <p>Total: ${stats.actionStats.shoot.attempts}</p>
                <p>Avg per game: ${stats.actionStats.shoot.avgPerGame}</p>
                <p>Success rate: ${stats.actionStats.shoot.successRate}%</p>
            </div>
        </div>
    `;
}

// Start the game when page loads
window.addEventListener('DOMContentLoaded', initGame);
