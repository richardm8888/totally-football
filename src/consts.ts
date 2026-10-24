// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Totally Football: Tactical Football Board Game | Kickstarter';
export const SITE_DESCRIPTION = 'A fast tactical football board game for 2–4 players. Draft your squad, win 1v1 duels and survive the chaos. Play the free demo and follow us on Kickstarter.';

// Kickstarter reports visits by `ref`, so each link on the site carries its own.
export const KICKSTARTER_URL = 'https://www.kickstarter.com/projects/double-time-games/totally-football-football-board-game-with-chaotic-moments';
export const kickstarterLink = (ref: string) => `${KICKSTARTER_URL}?ref=${ref}`;

export const FAQS = [
    {
        question: 'What type of game is Totally Football?',
        answer: 'Totally Football is a tactical football board game built around player duels, squad building and strategic card play. Every match combines fast-paced gameplay with meaningful decisions inspired by real football tactics.'
    },
    {
        question: 'How many players can play?',
        answer: 'The game is designed for 2–4 players, making it perfect for head-to-head rivalries, casual game nights and competitive sessions with friends.'
    },
    {
        question: 'Is Totally Football easy to learn?',
        answer: 'Yes. The core mechanics are quick to pick up, even for players who are new to tabletop games. At the same time, strategic squad building, duel selection and wildcard timing create plenty of depth for competitive players.'
    },
    {
        question: 'How long does a match take?',
        answer: 'Most matches are designed to be fast-paced and replayable, making the game ideal for short competitive sessions or longer football game nights with friends.'
    },
    {
        question: 'Do I need to be a hardcore football fan to enjoy it?',
        answer: 'Not at all. Football fans will appreciate the tactical inspiration and player matchups, but the gameplay is designed to be accessible and enjoyable even for more casual players.'
    },
    {
        question: 'When does the Kickstarter launch?',
        answer: 'We\'re preparing for launch later in 2026. Join the mailing list to get early access updates, launch announcements and exclusive Kickstarter rewards.'
    }   
];
