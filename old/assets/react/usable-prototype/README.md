# Totally Football: Matchday Madness - Playable Prototype

## How to Play

### Starting the Game
1. Open `index.html` in a web browser
2. Or run a local server: `python3 -m http.server 8000` and navigate to `http://localhost:8000`

### Game Phases

#### 1. Draft Phase
- **16 random players** from groups 4 & 5 are displayed
- Players alternate selecting (snake draft)
- **Player 1** picks first, then **Player 2**, continuing until each has **16 players**
- New sets of 16 players appear as needed
- Click the **"Start Match"** button when draft is complete

#### 2. Gameplay Phase

**Setup:**
- Each player has 10 action cards
- Player 1 starts with possession in the Build Up zone
- The match ends when all 20 action cards (10 per player) are used

**Turn Structure:**
1. **Attacker** places a player card face-up in the current zone
2. **Attacker** selects an action: Pass, Dribble, or Shoot (only available in Final Third)
3. **Defender** places their player to combat:
   - vs Pass → uses Intercepting stat
   - vs Dribble → uses Tackling stat
   - vs Shoot → Goalkeeper automatically placed, uses Saving stat
4. **Both players** simultaneously select an action card from their hand
5. **Resolution:**
   - Attacker Total = Player Stat + Action Card Value
   - Defender Total = Player Stat + Action Card Value
   - **Higher total wins**

**If Attacker Wins:**
- **Shoot:** ⚽ GOAL! Possession returns to opponent in Build Up
- **Dribble:** Advance one zone, same player continues
- **Pass:** Advance one zone, must select new player next turn

**If Defender Wins:**
- Defender gains possession in the current zone

**Zones:**
- Build Up → Progression → Final Third → GOAL!

#### 3. End Game
- Game ends after all action cards are used
- Player with most goals wins!
- Click **"New Game"** to restart

### Game Features
- ✅ Full snake draft system
- ✅ Player cards showing stats and positions
- ✅ Visual pitch with 3 zones per side
- ✅ Action cards with positive/negative values
- ✅ Stat + card calculation for duels
- ✅ Score tracking
- ✅ Turn-by-turn gameplay
- ✅ Win/draw detection

### Controls
- **Click** player cards to select during draft
- **Click** your players to place them on the pitch
- **Click** action buttons to choose Pass/Dribble/Shoot
- **Click** action cards to play them
- **Click** "Continue" to proceed after each duel

## File Structure
```
usable-prototype/
├── index.html           # Main game HTML
├── styles.css           # All styling
├── game.js              # Game logic
├── Player Data Jan 27.csv    # Player database
└── ActionCardData 2.csv      # Action card database
```

## Notes
- Only players from groups 4 & 5 are used (premium players)
- No card drawing - fixed 10 cards per player
- Goalkeeper automatically placed when shooting
- Game is fully functional for 2-player hot-seat play

Enjoy the match! ⚽
