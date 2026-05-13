const fs = require('fs');

// Generate Optimized Player Deck
function generatePlayerDeck() {
  const playerData = fs.readFileSync('Player Data Jan 27.csv', 'utf8');
  const lines = playerData.split('\n');
  const header = lines[0];
  const outputLines = [header];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    
    // Group is at position 20 (0-indexed: 19)
    const group = parseInt(parts[19]);
    
    // Only include group 5 players (elite)
    if (group !== 5) continue;
    
    const position = parts[4];
    
    if (position === 'gk') {
      // GK: reduce saving to 85%, minimum 4
      // Saving is at position 12 (0-indexed: 11)
      const saving = parseInt(parts[11]);
      if (!isNaN(saving)) {
        const newSaving = Math.max(4, Math.floor(saving * 0.85));
        parts[11] = newSaving.toString();
      }
    } else if (position !== '') {
      // Outfield: increase dribbling by 1, max 7
      // Dribbling is at position 7 (0-indexed: 6)
      const dribbling = parseInt(parts[6]);
      if (!isNaN(dribbling)) {
        const newDribbling = Math.min(7, dribbling + 1);
        parts[6] = newDribbling.toString();
      }
    }
    
    outputLines.push(parts.join(','));
  }

  fs.writeFileSync('Optimized_Player_Data.csv', outputLines.join('\n'));
  console.log(`✓ Created Optimized_Player_Data.csv with ${outputLines.length - 1} elite players`);
  console.log('  - GK: Saving reduced to 85% (min 4)');
  console.log('  - Outfield: Dribbling +1 (max 7)');
}

// Generate Optimized Action Card Deck
function generateActionCardDeck() {
  const actionData = fs.readFileSync('ActionCardData 2.csv', 'utf8');
  const lines = actionData.split('\n');
  const header = lines[0];
  const outputLines = [header];

  // Attack Boosted deck: 85% defensive cards, 60% negative attack cards removed
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    const name = parts[0];
    const value = parseInt(parts[1]);

    const isDefensive = name === 'TACKLING' || name === 'INTERCEPTING' || name === 'SAVING';
    const isAttacking = name === 'PASSING' || name === 'DRIBBLING' || name === 'SHOOTING';
    const isNegative = value < 0;

    // Apply probabilistic filtering deterministically
    // Keep 85% of defensive cards
    if (isDefensive) {
      // Remove 15% of defensive cards (keep indices 0,1,2,3,5,6,8,9,11,12,14,15...)
      const defensiveIndex = i % 7;
      if (defensiveIndex === 4) continue; // Remove ~15%
    }

    // Remove 60% of negative attack cards, keep 40%
    if (isAttacking && isNegative) {
      // Keep 40% of negative attacking cards (indices 0,2,5,7,10,12...)
      const negAttackIndex = i % 5;
      if (negAttackIndex === 1 || negAttackIndex === 3 || negAttackIndex === 4) continue; // Remove ~60%
    }

    outputLines.push(line);
  }

  fs.writeFileSync('Optimized_Action_Card_Data.csv', outputLines.join('\n'));
  console.log(`✓ Created Optimized_Action_Card_Data.csv with ${outputLines.length - 1} cards`);
  console.log('  - Defensive cards: 85% kept');
  console.log('  - Negative attack cards: 40% kept (60% removed)');
}

// Run both generators
console.log('Generating Optimized Deck Files...\n');
generatePlayerDeck();
console.log('');
generateActionCardDeck();
console.log('\nDone! Files created in usable-prototype folder.');
