// ── Types ──────────────────────────────────────────────────────────────────

export interface SquadCard {
  id: string;
  name: string;
  src: string;
  pas?: number;
  dri?: number;
  sho?: number;
  int?: number;
  tac?: number;
  sav?: number;
}

export type Action = 'pass' | 'dribble' | 'shoot';
export type CardStat = Action | 'intercept' | 'tackle' | 'save';

export interface ActionCard {
  id: string;
  stat: CardStat;
  value: number;
  name: string;
  src: string;
}

export type ChaosEffect = 'noCards' | 'autoWin' | 'refresh' | 'homeTied' | 'reverseCards' | 'spaghettiFingers' | 'gegenpress';

export interface ChaosCard {
  id: string;
  name: string;
  desc: string;
  effect: ChaosEffect;
  src: string;
}

export interface DemoGameData {
  humanPlayers: SquadCard[];
  cpuDefenders: SquadCard[];
  cpuGK: SquadCard;
  actionCards: ActionCard[];
  chaosCards: ChaosCard[];
  playerBack: string;
  actionBack: string;
  chaosBack: string;
}

type Step = 'pick-player' | 'pick-action' | 'pick-card' | 'cpu-thinking';

interface DuelEffect {
  att: number;
  def: number;
}

interface DuelResult {
  attBase: number;
  defBase: number;
  hEff: DuelEffect;
  cEff: DuelEffect;
  attTotal: number;
  defTotal: number;
  winner: 'attacker' | 'defender';
}

interface PendingResult {
  won: boolean;
  isGoal: boolean;
  cpuCardForDuel: ActionCard | null;
  attLine: string;
  defLine: string;
}

interface GameState {
  zone: number;
  humanPlayers: SquadCard[];
  humanUsed: Set<string>;
  cpuDefenders: SquadCard[];
  cpuUsed: Set<string>;
  humanCards: ActionCard[];
  cpuCards: ActionCard[];
  humanUsedCards: Set<string>;
  cpuUsedCards: Set<string>;
  humanChaosCards: ChaosCard[];
  humanUsedChaos: Set<string>;
  chaosCard: ChaosCard | null;
  duelNoCards: boolean;
  duelAutoWin: boolean;
  homeTied: boolean;
  reverseCards: boolean;
  attacker: SquadCard | null;
  defender: SquadCard | null;
  action: Action | null;
  zoneMod: number;
  humanCard: ActionCard | null;
  cpuCard: ActionCard | null;
  step: Step;
  pendingResult: PendingResult | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ZONES = ['buildup', 'progression', 'final-third'] as const;
const ZONE_LABELS: Record<number, string> = { 0: 'Build-Up Zone', 1: 'Progression Zone', 2: 'Final Third' };

type NumericSquadKey = 'pas' | 'dri' | 'sho' | 'int' | 'tac' | 'sav';

// What stat does the attacker use for this action?
const ATT_STAT: Record<Action, NumericSquadKey> = { pass: 'pas', dribble: 'dri', shoot: 'sho' };
// What stat does the defender use vs this action?
const DEF_STAT: Record<Action, NumericSquadKey> = { pass: 'int', dribble: 'tac', shoot: 'sav' };
// Which card stat goes to the attacker pool?
const ATT_CARD_STATS = new Set<CardStat>(['pass', 'dribble', 'shoot']);
// Which card stat goes to the defender pool?
const DEF_CARD_STATS = new Set<CardStat>(['intercept', 'tackle', 'save']);
// Map card stat name → which action it applies to
const CARD_STAT_ACTION: Record<CardStat, Action> = {
  pass: 'pass', dribble: 'dribble', shoot: 'shoot',
  intercept: 'pass', tackle: 'dribble', save: 'shoot',
};

// Chaos cards playable pre-duel (shown in the chaos modal during pick-card step)
const PRE_DUEL_CHAOS_EFFECTS = new Set<ChaosEffect>(['autoWin']);
// Chaos cards playable post-duel (shown on the duel reveal screen after a loss)
const POST_DUEL_CHAOS_EFFECTS = new Set<ChaosEffect>(['spaghettiFingers', 'gegenpress']);

// ── DOM helpers ────────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function $img(id: string): HTMLImageElement {
  return $(id) as HTMLImageElement;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Cookies ────────────────────────────────────────────────────────────────

const COOKIE_PLAYS  = 'tf_plays';
const COOKIE_MEMBER = 'tf_member';
const MAX_FREE_PLAYS = 2;

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

// ── Game ───────────────────────────────────────────────────────────────────

export class DemoGame {
  private data: DemoGameData;
  private state!: GameState;

  private readonly actions: Record<string, (id: string | undefined, e: Event) => void> = {
    'start-demo': () => this.startDemo(),
    'open-player-modal': () => this.openPlayerModal(),
    'close-player-modal': () => this.closePlayerModal(),
    'open-chaos-modal': () => this.openChaosModal(),
    'close-chaos-modal': () => this.closeChaosModal(),
    'open-action-modal': () => this.openActionModal(),
    'close-action-modal': () => this.closeActionModal(),
    'pick-player': (id) => id && this.pickPlayer(id),
    'pick-action': (id) => id && this.pickAction(id as Action),
    'pick-card': (id) => id && this.pickCard(id),
    'play-chaos': (id) => id && this.playChaos(id),
    'play-spaghetti': (id) => id && this.playSpaghettiFingers(id),
    'play-gegenpress': (id) => id && this.playGegenpress(id),
    'play-duel': () => this.playDuel(),
    'duel-continue': () => this.duelContinue(),
    'play-again': () => this.playAgain(),
  };

  constructor(data: DemoGameData) {
    this.data = data;
    this.bindEvents();
  }

  init() {
    this.reset();
    this.watchSignup();
  }

  private bindEvents() {
    document.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!el?.dataset.action) return;
      this.actions[el.dataset.action]?.(el.dataset.id, e);
    });
  }

  // ── State ────────────────────────────────────────────────────────────────

  private reset() {
    const shuffled = shuffle(this.data.actionCards);
    this.state = {
      zone: 0,
      humanPlayers: [...this.data.humanPlayers],
      humanUsed: new Set(),
      cpuDefenders: [...this.data.cpuDefenders],
      cpuUsed: new Set(),
      humanCards: shuffled.slice(0, 4),
      cpuCards: shuffled.slice(4),
      humanUsedCards: new Set(),
      cpuUsedCards: new Set(),
      humanChaosCards: this.data.chaosCards.filter((c) => PRE_DUEL_CHAOS_EFFECTS.has(c.effect) || POST_DUEL_CHAOS_EFFECTS.has(c.effect)),
      humanUsedChaos: new Set(),
      chaosCard: null,
      duelNoCards: false,
      duelAutoWin: false,
      homeTied: false,
      reverseCards: false,
      attacker: null,
      defender: null,
      action: null,
      zoneMod: 0,
      humanCard: null,
      cpuCard: null,
      step: 'pick-player',
      pendingResult: null,
    };

    this.renderZone();
    this.renderBoard();
    this.showStep('pick-player');
    this.setStatus('Choose a player to start the attack');
    this.renderPlayerHand();
  }

  // ── Rules ────────────────────────────────────────────────────────────────

  private cardEffect(card: ActionCard | null, action: Action | null): DuelEffect {
    if (!card || !action || this.state.duelNoCards) return { att: 0, def: 0 };
    if (CARD_STAT_ACTION[card.stat] !== action) return { att: 0, def: 0 };
    const mul = this.state.reverseCards ? -1 : 1;
    if (ATT_CARD_STATS.has(card.stat)) return { att: card.value * mul, def: 0 };
    if (DEF_CARD_STATS.has(card.stat)) return { att: 0, def: card.value * mul };
    return { att: 0, def: 0 };
  }

  private resolveDuel(
    attacker: SquadCard,
    defender: SquadCard,
    action: Action,
    humanCard: ActionCard | null,
    cpuCard: ActionCard | null,
  ): DuelResult {
    const attBase = (attacker[ATT_STAT[action]] ?? 0) + this.state.zoneMod;
    const defBase = defender[DEF_STAT[action]] ?? 0;

    const hEff = this.cardEffect(humanCard, action);
    const cEff = this.cardEffect(cpuCard, action);

    const attTotal = attBase + hEff.att + cEff.att;
    const defTotal = defBase + hEff.def + cEff.def;

    // CARD HAPPY: attacker auto-wins
    if (this.state.duelAutoWin) {
      return { attBase, defBase, hEff, cEff, attTotal, defTotal, winner: 'attacker' };
    }
    // HOME ADVANTAGE: attacker wins ties
    const winner = this.state.homeTied
      ? (attTotal >= defTotal ? 'attacker' : 'defender')
      : (attTotal > defTotal ? 'attacker' : 'defender');
    return { attBase, defBase, hEff, cEff, attTotal, defTotal, winner };
  }

  // CPU picks the card that most benefits its defense:
  // positive def = good (boosts defender), negative att = good (reduces attacker)
  private cpuPickCard(cards: ActionCard[], used: Set<string>, action: Action): ActionCard | null {
    const avail = cards.filter((c) => !used.has(c.id));
    if (!avail.length) return null;
    const scored = avail.map((c) => {
      const eff = this.cardEffect(c, action);
      return { c, score: eff.def - eff.att };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].c;
  }

  // CPU picks its best available defender for the action
  private cpuPickDefender(defenders: SquadCard[], used: Set<string>, action: Action): SquadCard | null {
    const avail = defenders.filter((d) => !used.has(d.id));
    const key = DEF_STAT[action];
    return avail.reduce<SquadCard | null>(
      (best, d) => ((d[key] ?? 0) > (best ? (best[key] ?? 0) : -1) ? d : best),
      null,
    );
  }

  private buildCalcStr(statKey: NumericSquadKey, baseStat: number, eff1: DuelEffect, eff2: DuelEffect, side: 'att' | 'def') {
    let s = `${String(statKey).toUpperCase()} ${baseStat}`;
    if (side === 'att') {
      if (this.state.zoneMod) s += ` ${this.state.zoneMod < 0 ? '' : '+'}${this.state.zoneMod}`;
      if (eff1.att) s += ` +${eff1.att}`;
      if (eff2.att) s += ` ${eff2.att > 0 ? '+' : ''}${eff2.att}`;
    } else {
      if (eff1.def) s += ` ${eff1.def > 0 ? '+' : ''}${eff1.def}`;
      if (eff2.def) s += ` ${eff2.def > 0 ? '+' : ''}${eff2.def}`;
    }
    return s;
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private renderZone() {
    $('zone-text').textContent = ZONE_LABELS[this.state.zone];
    ZONES.forEach((_, i) => {
      const pip = $('zpip-' + i);
      pip.className = 'zpip' + (i < this.state.zone ? ' done' : i === this.state.zone ? ' active' : '');
    });
    $('pitch-track').style.transform = `translateX(${-this.state.zone * 340}px)`;
  }

  private renderBoard() {
    const attSrc = this.state.attacker?.src ?? '';
    const defSrc = this.state.defender?.src ?? '';
    document.querySelectorAll<HTMLImageElement>('.att-img').forEach((el) => {
      el.src = attSrc;
      el.style.display = attSrc ? '' : 'none';
    });
    document.querySelectorAll<HTMLImageElement>('.def-img').forEach((el) => {
      el.src = defSrc;
      el.style.display = defSrc ? '' : 'none';
    });
  }

  private showStep(step: Step) {
    const divMap: Record<Step, string> = {
      'pick-player':  'step-player',
      'pick-action':  'step-action',
      'pick-card':    'step-card',
      'cpu-thinking': 'sec-cpu-thinking',
    };
    (Object.keys(divMap) as Step[]).forEach((s) => {
      document.getElementById(divMap[s])?.classList.toggle('show', s === step);
    });
    $('play-btn').classList.remove('show');
    document.getElementById('btn-chaos-card')?.classList.remove('show');
    document.getElementById('btn-action-card')?.classList.remove('hide');
    $('selected-card-preview').classList.remove('show');
    $('cpu-onboard-card').classList.toggle('show', step === 'pick-card');
  }

  private setStatus(msg: string) {
    $('status-bar').textContent = msg;
  }

  private renderPlayerHand() {
    const avail = this.state.humanPlayers.filter((p) => !this.state.humanUsed.has(p.id));
    const hand = document.getElementById('player-modal-hand');
    if (!hand) return;
    hand.innerHTML = avail.map((p) => `
      <div class="hand-player" data-action="pick-player" data-id="${p.id}">
        <img src="${p.src}" alt="${p.name}">
      </div>
    `).join('');
  }

  private renderActionButtons() {
    const zm = this.state.zone === 0 ? -2 : this.state.zone === 1 ? -1 : 0;
    const p = this.state.attacker;
    const pasStat = p ? `PAS ${p.pas}` : '';
    const driStat = p ? `DRI ${p.dri}` : '';
    const shoBase = p?.sho ?? 0;
    const shoStat = p ? (zm ? `SHO ${shoBase}${zm} = ${shoBase + zm}` : `SHO ${shoBase}`) : '';
    const shootNote = zm ? `Long shot (${zm})` : '';
    $('action-btns').innerHTML = [
      { a: 'pass', icon: '↗', label: 'Pass', stat: pasStat, note: '' },
      { a: 'dribble', icon: '⚡', label: 'Dribble', stat: driStat, note: '' },
      { a: 'shoot', icon: '⚽', label: 'Shoot', stat: shoStat, note: shootNote },
    ].map(({ a, icon, label, stat, note }) => `
      <button class="act-btn" data-action="pick-action" data-id="${a}">
        <span class="ab-icon">${icon}</span>
        <span class="ab-name">${label}</span>
        <span class="ab-stat">${stat}</span>
        <span class="ab-note">${note}</span>
      </button>
    `).join('');
  }

  private renderCardHand() {
    const avail = this.state.humanCards.filter((c) => !this.state.humanUsedCards.has(c.id));
    $('action-modal-hand').innerHTML = avail.map((c) => {
      const eff = this.cardEffect(c, this.state.action);
      // dim if neutral (no effect) or actively bad for the attacker (neg att or pos def)
      const goodForAtt = eff.att > 0 || eff.def < 0;
      return `
        <div class="hand-card${this.state.humanCard?.id === c.id ? ' sel' : ''}${!goodForAtt ? ' dim' : ''}"
             data-action="pick-card" data-id="${c.id}">
          <img src="${c.src}" alt="">
        </div>
      `;
    }).join('');
  }

  private renderSelectedCardPreview() {
    const card = this.state.humanCard;
    $('selected-card-preview').classList.toggle('show', !!card);
    if (card) {
      $img('selected-card-img').src = card.src;
      $('selected-card-name').textContent = `${card.stat}: ${card.value}`;
    }
  }

  private renderChaosHand() {
    const hand = document.getElementById('chaos-modal-hand');
    if (!hand) return;
    const avail = this.state.humanChaosCards.filter(
      (c) => !this.state.humanUsedChaos.has(c.id) && PRE_DUEL_CHAOS_EFFECTS.has(c.effect),
    );
    hand.innerHTML = avail.map((c) => `
      <div class="chaos-card${this.state.chaosCard?.id === c.id ? ' sel' : ''}" data-action="play-chaos" data-id="${c.id}">
        <img src="${c.src}" alt="${c.name}">
      </div>
    `).join('');
  }


  private updateDuelReveal(result: DuelResult, cpuCardForDuel: ActionCard | null) {
    const { attacker, defender, action } = this.state;
    if (!attacker || !defender || !action) return;

    const won = result.winner === 'attacker';
    const isGoal = won && action === 'shoot';

    $img('dr-cpu-card').src = cpuCardForDuel ? cpuCardForDuel.src : this.data.actionBack;

    const attScoreEl = $('dr-att-score');
    attScoreEl.textContent = String(result.attTotal);
    attScoreEl.className = 'dr-slot-score ' + (won ? 'high' : 'low');

    const defScoreEl = $('dr-def-score');
    defScoreEl.textContent = String(result.defTotal);
    defScoreEl.className = 'dr-slot-score ' + (!won ? 'high' : 'low');

    $('dr-verdict').textContent = isGoal ? '⚽ GOAL! You scored!' : won ? '✅ Duel won!' : '❌ Duel lost!';

    const attStatKey = ATT_STAT[action];
    const defStatKey = DEF_STAT[action];
    const attCalc = this.buildCalcStr(attStatKey, attacker[attStatKey] ?? 0, result.hEff, result.cEff, 'att');
    const defCalc = this.buildCalcStr(defStatKey, result.defBase, result.hEff, result.cEff, 'def');

    $('dr-breakdown').innerHTML =
      `${attacker.name}: ${attCalc} = ${result.attTotal}<br>` +
      `${defender.name}: ${defCalc} = ${result.defTotal}`;

    this.state.pendingResult = {
      won, isGoal, cpuCardForDuel,
      attLine: `${attacker.name}: ${attCalc} = ${result.attTotal}`,
      defLine: `${defender.name}: ${defCalc} = ${result.defTotal}`,
    };

    this.renderPostDuelChaosCards(won);
  }

  private renderPostDuelChaosCards(won: boolean) {
    const section = document.getElementById('dr-post-chaos-section');
    const hand = document.getElementById('dr-post-chaos-hand');
    if (!section || !hand) return;
    if (won) { section.classList.remove('show'); return; }

    const applicable = this.state.humanChaosCards.filter((c) => {
      if (this.state.humanUsedChaos.has(c.id)) return false;
      if (c.effect === 'spaghettiFingers') return this.state.action === 'shoot';
      if (c.effect === 'gegenpress') return this.state.zone !== 2;
      return false;
    });

    if (!applicable.length) { section.classList.remove('show'); return; }
    section.classList.add('show');
    hand.innerHTML = applicable.map((c) => {
      const actionName = c.effect === 'spaghettiFingers' ? 'play-spaghetti' : 'play-gegenpress';
      return `
        <div class="chaos-card" data-action="${actionName}" data-id="${c.id}">
          <img src="${c.src}" alt="${c.name}">
        </div>
      `;
    }).join('');
  }

  private showResult(result: DuelResult, cpuCardForDuel: ActionCard | null) {
    const won = result.winner === 'attacker';
    const isGoal = won && this.state.action === 'shoot';
    const flash = $('result-flash');
    flash.textContent = isGoal ? '⚽ GOAL!' : won ? '✅' : '❌';
    flash.className = 'result-flash show ' + (won ? 'win' : 'lose');
    setTimeout(() => flash.classList.remove('show'), 500);

    this.state.duelNoCards = false;
    this.state.duelAutoWin = false;

    if (this.state.humanCard) {
      $img('dr-human-card').src = this.state.humanCard.src;
    } else {
      $img('dr-human-card').src = this.data.actionBack;
    }
    this.updateDuelReveal(result, cpuCardForDuel);

    $('cpu-onboard-card').classList.remove('show');
    setTimeout(() => $('duel-reveal').classList.add('show'), 500);
  }

  private showEmailOverlay(isWin: boolean, attLine: string, defLine: string) {
    $('email-headline').textContent = isWin ? '⚽ You scored!' : '😤 So close!';
    $('email-sub').textContent = isWin
      ? 'Back of the net! The full game has even more chaos — be the first to know when it launches.'
      : 'The full game gives you a whole squad to work with. Sign up for launch updates and try again.';

    $('email-result-summary').innerHTML =
      `<strong>${isWin ? 'Goal!' : 'Duel lost'}</strong><br>${attLine}<br>${defLine}`;

    const plays = parseInt(getCookie(COOKIE_PLAYS) ?? '0') + 1;
    setCookie(COOKIE_PLAYS, String(plays));
    const isMember = !!getCookie(COOKIE_MEMBER);

    $('email-thanks').style.display = 'none';
    $('email-form').style.display = isMember ? 'none' : 'flex';
    document.getElementById('play-again-gate')?.classList.toggle('show', isMember || plays < MAX_FREE_PLAYS);

    $('email-overlay').classList.add('show');
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private startDemo() {
    const screen = $('start-screen');
    screen.classList.add('fade-out');
    setTimeout(() => { screen.style.display = 'none'; }, 420);
  }

  private openPlayerModal() {
    this.renderPlayerHand();
    $('player-modal').classList.add('show');
  }

  private closePlayerModal() {
    $('player-modal').classList.remove('show');
  }

  private openChaosModal() {
    this.renderChaosHand();
    $('chaos-modal').classList.add('show');
  }

  private closeChaosModal() {
    $('chaos-modal').classList.remove('show');
  }

  private openActionModal() {
    this.renderCardHand();
    $('action-modal').classList.add('show');
  }

  private closeActionModal() {
    $('action-modal').classList.remove('show');
  }

  private pickPlayer(id: string) {
    const p = this.state.humanPlayers.find((x) => x.id === id);
    if (!p || this.state.humanUsed.has(id)) return;
    this.state.attacker = p;
    $('player-modal').classList.remove('show');
    this.renderBoard();

    if (this.state.zone === 2) {
      this.state.action = 'shoot';
      this.state.zoneMod = 0;
      this.proceedAfterAction();
    } else {
      this.state.step = 'pick-action';
      this.showStep('pick-action');
      this.renderActionButtons();
      this.setStatus(`${p.name} is on the ball — what's the move?`);

    }
  }

  private pickAction(action: Action) {
    this.state.action = action;
    this.state.zoneMod = action === 'shoot' ? (this.state.zone === 0 ? -2 : this.state.zone === 1 ? -1 : 0) : 0;
    this.proceedAfterAction();
  }

  private proceedAfterAction() {
    const { action } = this.state;
    if (!action) return;

    if (action === 'shoot') {
      this.state.defender = this.data.cpuGK;
    } else {
      this.state.defender = this.cpuPickDefender(this.state.cpuDefenders, this.state.cpuUsed, action);
      if (this.state.defender) this.state.cpuUsed.add(this.state.defender.id);
    }
    this.state.cpuCard = this.cpuPickCard(this.state.cpuCards, this.state.cpuUsedCards, action);

    this.renderBoard();
    this.state.step = 'pick-card';
    this.showStep('pick-card');
    const defName = this.state.defender?.name || 'keeper';
    const modStr = this.state.zoneMod ? ` (${this.state.zoneMod} shot modifier)` : '';
    this.setStatus(`${defName} is defending${modStr} — play an action card`);
    $img('cpu-onboard-img').src = this.data.actionBack;

    this.state.chaosCard = null;
    this.state.duelNoCards = false;
    this.state.duelAutoWin = false;
    $('chaos-effect-bar').classList.remove('show');
  }

  private pickCard(id: string) {
    const c = this.state.humanCards.find((x) => x.id === id);
    if (!c || this.state.humanUsedCards.has(id)) return;
    this.state.humanCard = c;
    this.renderCardHand();
    this.renderSelectedCardPreview();
    this.closeActionModal();
    document.getElementById('btn-action-card')?.classList.add('hide');
    const hasChaos = this.state.humanChaosCards.some(
      (c) => !this.state.humanUsedChaos.has(c.id) && PRE_DUEL_CHAOS_EFFECTS.has(c.effect),
    );
    if (hasChaos) document.getElementById('btn-chaos-card')?.classList.add('show');
    $('play-btn').classList.add('show');
  }

  private playChaos(id: string) {
    const c = this.state.humanChaosCards.find((x) => x.id === id);
    if (!c || this.state.humanUsedChaos.has(id)) return;

    const bar = $('chaos-effect-bar');

    if (this.state.chaosCard?.id === id) {
      this.state.chaosCard = null;
      this.renderChaosHand();
      bar.classList.remove('show');
      return;
    }

    this.state.chaosCard = c;
    this.renderChaosHand();
    bar.textContent = '🟥 Card Happy — you automatically win this duel!';
    bar.classList.add('show');
    this.closeChaosModal();
  }

  private playDuel() {
    const { attacker, defender, action, humanCard } = this.state;

    if (this.state.chaosCard) {
      this.state.humanUsedChaos.add(this.state.chaosCard.id);
      if (this.state.chaosCard.effect === 'noCards') this.state.duelNoCards = true;
      if (this.state.chaosCard.effect === 'autoWin') this.state.duelAutoWin = true;
      this.state.chaosCard = null;
    }

    const skipActionCards = this.state.duelNoCards || this.state.duelAutoWin;
    if (!humanCard && !skipActionCards) { this.setStatus('Select an action card first!'); return; }
    if (!attacker || !defender || !action) return;

    if (humanCard) {
      this.state.humanUsedCards.add(humanCard.id);
    }
    if (this.state.cpuCard) this.state.cpuUsedCards.add(this.state.cpuCard.id);
    this.state.humanUsed.add(attacker.id);

    const cpuCardForDuel = this.state.duelNoCards || this.state.duelAutoWin ? null : this.state.cpuCard;
    const result = this.resolveDuel(attacker, defender, action, humanCard, cpuCardForDuel);

    this.showResult(result, cpuCardForDuel);
  }

  private playSpaghettiFingers(id: string) {
    const c = this.state.humanChaosCards.find((x) => x.id === id);
    if (!c || this.state.humanUsedChaos.has(id)) return;
    this.state.humanUsedChaos.add(id);
    $('duel-reveal').classList.remove('show');

    this.state.zone = 2;
    this.state.attacker = null;
    this.state.defender = null;
    this.state.action = null;
    this.state.humanCard = null;
    this.state.cpuCard = null;
    this.state.chaosCard = null;
    this.state.duelNoCards = false;
    this.state.duelAutoWin = false;
    this.state.pendingResult = null;
    this.state.step = 'pick-player';

    this.renderZone();
    this.renderBoard();
    this.showStep('pick-player');
    this.renderPlayerHand();
    this.setStatus('Rebound! Pick a different player for the follow-up shot');
  }

  private playGegenpress(id: string) {
    const c = this.state.humanChaosCards.find((x) => x.id === id);
    if (!c || this.state.humanUsedChaos.has(id)) return;
    this.state.humanUsedChaos.add(id);
    $('duel-reveal').classList.remove('show');

    const { action } = this.state;
    if (!action) return;

    // Undo the action cards used in the failed duel so they can be replayed
    if (this.state.humanCard) this.state.humanUsedCards.delete(this.state.humanCard.id);
    const cpuCardUsed = this.state.pendingResult?.cpuCardForDuel;
    if (cpuCardUsed) this.state.cpuUsedCards.delete(cpuCardUsed.id);

    this.state.humanCard = null;
    this.state.cpuCard = this.cpuPickCard(this.state.cpuCards, this.state.cpuUsedCards, action);
    this.state.chaosCard = null;
    this.state.duelNoCards = false;
    this.state.duelAutoWin = false;
    this.state.pendingResult = null;
    this.state.step = 'pick-card';

    this.renderBoard();
    this.showStep('pick-card');
    $img('cpu-onboard-img').src = this.data.actionBack;
    this.setStatus('Gegenpress! Same players — pick a new action card');
    $('chaos-effect-bar').classList.remove('show');
  }

  private duelContinue() {
    $('duel-reveal').classList.remove('show');
    const result = this.state.pendingResult;
    if (!result) return;

    if (result.won && !result.isGoal) {
      this.advanceZone();
    } else {
      this.showEmailOverlay(result.isGoal, result.attLine, result.defLine);
    }
  }

  private advanceZone() {
    this.state.zone++;
    this.state.attacker = null;
    this.state.defender = null;
    this.state.action = null;
    this.state.humanCard = null;
    this.state.cpuCard = null;
    this.state.chaosCard = null;
    this.state.duelNoCards = false;
    this.state.duelAutoWin = false;
    this.state.step = 'pick-player';

    this.renderZone();
    this.renderBoard();
    this.showStep('pick-player');
    this.renderPlayerHand();

    this.setStatus(this.state.zone === 2 ? 'Final Third! Pick your shooter' : 'Great ball! Choose your next player');
  }

  private playAgain() {
    $('email-overlay').classList.remove('show');
    this.reset();
  }

  private watchSignup() {
    const form = document.getElementById('email-form');
    if (!form) return;
    const observer = new MutationObserver(() => {
      const success = form.querySelector('.ml-form-successBody');
      if (success && getComputedStyle(success).display !== 'none') {
        setCookie(COOKIE_MEMBER, '1');
        document.getElementById('play-again-gate')?.classList.add('show');
        observer.disconnect();
      }
    });
    observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }
}
