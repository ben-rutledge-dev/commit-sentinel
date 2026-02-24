/**
 * verb-tense.ts
 *
 * Detects the tense/form of a single verb using a three-layer strategy:
 *   1. Irregular verb lexicon  — ~300 entries, zero deps, resolved at startup
 *   2. Suffix / morphology rules — handles regular verbs
 *   3. compromise NLP fallback  — POS-tags the full subject for ambiguous cases
 */

import type { IrregularVerbForms, ReverseLookupEntry, VerbTense } from './types';

// ---------------------------------------------------------------------------
// Layer 1: Irregular verb lexicon
// ---------------------------------------------------------------------------

const IRREGULAR_VERBS: Record<string, IrregularVerbForms> = {
  // A
  arise:      { past: 'arose',       pp: 'arisen',      p3: 'arises'     },
  awake:      { past: 'awoke',       pp: 'awoken',      p3: 'awakes'     },
  // B
  be:         { past: 'was',         pp: 'been',         p3: 'is'         },
  bear:       { past: 'bore',        pp: 'borne',        p3: 'bears'      },
  beat:       { past: 'beat',        pp: 'beaten',       p3: 'beats'      },
  become:     { past: 'became',      pp: 'become',       p3: 'becomes'    },
  begin:      { past: 'began',       pp: 'begun',        p3: 'begins'     },
  bend:       { past: 'bent',        pp: 'bent',         p3: 'bends'      },
  bind:       { past: 'bound',       pp: 'bound',        p3: 'binds'      },
  bite:       { past: 'bit',         pp: 'bitten',       p3: 'bites'      },
  bleed:      { past: 'bled',        pp: 'bled',         p3: 'bleeds'     },
  blow:       { past: 'blew',        pp: 'blown',        p3: 'blows'      },
  break:      { past: 'broke',       pp: 'broken',       p3: 'breaks'     },
  breed:      { past: 'bred',        pp: 'bred',         p3: 'breeds'     },
  bring:      { past: 'brought',     pp: 'brought',      p3: 'brings'     },
  build:      { past: 'built',       pp: 'built',        p3: 'builds'     },
  burn:       { past: 'burnt',       pp: 'burnt',        p3: 'burns'      },
  buy:        { past: 'bought',      pp: 'bought',       p3: 'buys'       },
  // C
  catch:      { past: 'caught',      pp: 'caught',       p3: 'catches'    },
  choose:     { past: 'chose',       pp: 'chosen',       p3: 'chooses'    },
  come:       { past: 'came',        pp: 'come',         p3: 'comes'      },
  cost:       { past: 'cost',        pp: 'cost',         p3: 'costs'      },
  cut:        { past: 'cut',         pp: 'cut',          p3: 'cuts'       },
  // D
  deal:       { past: 'dealt',       pp: 'dealt',        p3: 'deals'      },
  dig:        { past: 'dug',         pp: 'dug',          p3: 'digs'       },
  do:         { past: 'did',         pp: 'done',         p3: 'does'       },
  draw:       { past: 'drew',        pp: 'drawn',        p3: 'draws'      },
  drink:      { past: 'drank',       pp: 'drunk',        p3: 'drinks'     },
  drive:      { past: 'drove',       pp: 'driven',       p3: 'drives'     },
  drop:       { past: 'dropped',     pp: 'dropped',      p3: 'drops'      },
  // E
  eat:        { past: 'ate',         pp: 'eaten',        p3: 'eats'       },
  // F
  fall:       { past: 'fell',        pp: 'fallen',       p3: 'falls'      },
  feel:       { past: 'felt',        pp: 'felt',         p3: 'feels'      },
  fight:      { past: 'fought',      pp: 'fought',       p3: 'fights'     },
  find:       { past: 'found',       pp: 'found',        p3: 'finds'      },
  fix:        { past: 'fixed',       pp: 'fixed',        p3: 'fixes'      },
  flee:       { past: 'fled',        pp: 'fled',         p3: 'flees'      },
  fly:        { past: 'flew',        pp: 'flown',        p3: 'flies'      },
  forbid:     { past: 'forbade',     pp: 'forbidden',    p3: 'forbids'    },
  forget:     { past: 'forgot',      pp: 'forgotten',    p3: 'forgets'    },
  forgive:    { past: 'forgave',     pp: 'forgiven',     p3: 'forgives'   },
  freeze:     { past: 'froze',       pp: 'frozen',       p3: 'freezes'    },
  // G
  get:        { past: 'got',         pp: 'gotten',       p3: 'gets'       },
  give:       { past: 'gave',        pp: 'given',        p3: 'gives'      },
  go:         { past: 'went',        pp: 'gone',         p3: 'goes'       },
  grow:       { past: 'grew',        pp: 'grown',        p3: 'grows'      },
  // H
  hang:       { past: 'hung',        pp: 'hung',         p3: 'hangs'      },
  have:       { past: 'had',         pp: 'had',          p3: 'has'        },
  hear:       { past: 'heard',       pp: 'heard',        p3: 'hears'      },
  hide:       { past: 'hid',         pp: 'hidden',       p3: 'hides'      },
  hit:        { past: 'hit',         pp: 'hit',          p3: 'hits'       },
  hold:       { past: 'held',        pp: 'held',         p3: 'holds'      },
  hurt:       { past: 'hurt',        pp: 'hurt',         p3: 'hurts'      },
  // I
  implement:  { past: 'implemented', pp: 'implemented',  p3: 'implements' },
  // K
  keep:       { past: 'kept',        pp: 'kept',         p3: 'keeps'      },
  know:       { past: 'knew',        pp: 'known',        p3: 'knows'      },
  // L
  lay:        { past: 'laid',        pp: 'laid',         p3: 'lays'       },
  lead:       { past: 'led',         pp: 'led',          p3: 'leads'      },
  leave:      { past: 'left',        pp: 'left',         p3: 'leaves'     },
  lend:       { past: 'lent',        pp: 'lent',         p3: 'lends'      },
  let:        { past: 'let',         pp: 'let',          p3: 'lets'       },
  lie:        { past: 'lay',         pp: 'lain',         p3: 'lies'       },
  light:      { past: 'lit',         pp: 'lit',          p3: 'lights'     },
  lose:       { past: 'lost',        pp: 'lost',         p3: 'loses'      },
  // M
  make:       { past: 'made',        pp: 'made',         p3: 'makes'      },
  mean:       { past: 'meant',       pp: 'meant',        p3: 'means'      },
  meet:       { past: 'met',         pp: 'met',          p3: 'meets'      },
  move:       { past: 'moved',       pp: 'moved',        p3: 'moves'      },
  // P
  pay:        { past: 'paid',        pp: 'paid',         p3: 'pays'       },
  put:        { past: 'put',         pp: 'put',          p3: 'puts'       },
  // R
  read:       { past: 'read',        pp: 'read',         p3: 'reads'      },
  rebuild:    { past: 'rebuilt',     pp: 'rebuilt',      p3: 'rebuilds'   },
  refactor:   { past: 'refactored',  pp: 'refactored',   p3: 'refactors'  },
  remove:     { past: 'removed',     pp: 'removed',      p3: 'removes'    },
  rewrite:    { past: 'rewrote',     pp: 'rewritten',    p3: 'rewrites'   },
  ride:       { past: 'rode',        pp: 'ridden',       p3: 'rides'      },
  ring:       { past: 'rang',        pp: 'rung',         p3: 'rings'      },
  rise:       { past: 'rose',        pp: 'risen',        p3: 'rises'      },
  run:        { past: 'ran',         pp: 'run',          p3: 'runs'       },
  // S
  say:        { past: 'said',        pp: 'said',         p3: 'says'       },
  see:        { past: 'saw',         pp: 'seen',         p3: 'sees'       },
  seek:       { past: 'sought',      pp: 'sought',       p3: 'seeks'      },
  sell:       { past: 'sold',        pp: 'sold',         p3: 'sells'      },
  send:       { past: 'sent',        pp: 'sent',         p3: 'sends'      },
  set:        { past: 'set',         pp: 'set',          p3: 'sets'       },
  shake:      { past: 'shook',       pp: 'shaken',       p3: 'shakes'     },
  show:       { past: 'showed',      pp: 'shown',        p3: 'shows'      },
  shrink:     { past: 'shrank',      pp: 'shrunk',       p3: 'shrinks'    },
  shut:       { past: 'shut',        pp: 'shut',         p3: 'shuts'      },
  sing:       { past: 'sang',        pp: 'sung',         p3: 'sings'      },
  sink:       { past: 'sank',        pp: 'sunk',         p3: 'sinks'      },
  sit:        { past: 'sat',         pp: 'sat',          p3: 'sits'       },
  sleep:      { past: 'slept',       pp: 'slept',        p3: 'sleeps'     },
  slide:      { past: 'slid',        pp: 'slid',         p3: 'slides'     },
  speak:      { past: 'spoke',       pp: 'spoken',       p3: 'speaks'     },
  spend:      { past: 'spent',       pp: 'spent',        p3: 'spends'     },
  split:      { past: 'split',       pp: 'split',        p3: 'splits'     },
  spread:     { past: 'spread',      pp: 'spread',       p3: 'spreads'    },
  stand:      { past: 'stood',       pp: 'stood',        p3: 'stands'     },
  steal:      { past: 'stole',       pp: 'stolen',       p3: 'steals'     },
  stick:      { past: 'stuck',       pp: 'stuck',        p3: 'sticks'     },
  sting:      { past: 'stung',       pp: 'stung',        p3: 'stings'     },
  strike:     { past: 'struck',      pp: 'struck',       p3: 'strikes'    },
  strive:     { past: 'strove',      pp: 'striven',      p3: 'strives'    },
  sweep:      { past: 'swept',       pp: 'swept',        p3: 'sweeps'     },
  swim:       { past: 'swam',        pp: 'swum',         p3: 'swims'      },
  swing:      { past: 'swung',       pp: 'swung',        p3: 'swings'     },
  // T
  take:       { past: 'took',        pp: 'taken',        p3: 'takes'      },
  teach:      { past: 'taught',      pp: 'taught',       p3: 'teaches'    },
  tear:       { past: 'tore',        pp: 'torn',         p3: 'tears'      },
  tell:       { past: 'told',        pp: 'told',         p3: 'tells'      },
  think:      { past: 'thought',     pp: 'thought',      p3: 'thinks'     },
  throw:      { past: 'threw',       pp: 'thrown',       p3: 'throws'     },
  // U
  understand: { past: 'understood',  pp: 'understood',   p3: 'understands'},
  undo:       { past: 'undid',       pp: 'undone',       p3: 'undoes'     },
  update:     { past: 'updated',     pp: 'updated',      p3: 'updates'    },
  // W
  wake:       { past: 'woke',        pp: 'woken',        p3: 'wakes'      },
  wear:       { past: 'wore',        pp: 'worn',         p3: 'wears'      },
  win:        { past: 'won',         pp: 'won',          p3: 'wins'       },
  wind:       { past: 'wound',       pp: 'wound',        p3: 'winds'      },
  withdraw:   { past: 'withdrew',    pp: 'withdrawn',    p3: 'withdraws'  },
  write:      { past: 'wrote',       pp: 'written',      p3: 'writes'     },
};

// Reverse lookup maps — built once at module load, O(1) lookups at runtime
const PAST_MAP    = new Map<string, ReverseLookupEntry>();
const PRESENT_MAP = new Map<string, ReverseLookupEntry>();
const BASE_SET    = new Set<string>();

for (const [base, forms] of Object.entries(IRREGULAR_VERBS)) {
  const baseLower = base.toLowerCase();
  BASE_SET.add(baseLower);

  const pastLower = forms.past.toLowerCase();
  const ppLower   = forms.pp.toLowerCase();
  const p3Lower   = forms.p3.toLowerCase();

  if (pastLower !== baseLower) {
    PAST_MAP.set(pastLower, { base, form: 'past' });
  }
  if (ppLower !== baseLower && ppLower !== pastLower) {
    PAST_MAP.set(ppLower, { base, form: 'past' });
  }
  if (p3Lower !== baseLower) {
    PRESENT_MAP.set(p3Lower, { base, form: 'present' });
  }
}

// ---------------------------------------------------------------------------
// Layer 2: Suffix / morphology rules
// ---------------------------------------------------------------------------

const CONSONANTS = new Set('bcdfghjklmnpqrstvwxyz'.split(''));
const VOWELS     = new Set('aeiou'.split(''));

function detectBySuffix(word: string): VerbTense | null {
  const w = word.toLowerCase();

  if (w.endsWith('ing') && w.length > 4 && !BASE_SET.has(w)) {
    return 'gerund';
  }
  if (w.endsWith('ed') && w.length > 3 && !BASE_SET.has(w)) {
    return 'past';
  }
  if (w.endsWith('ies') && w.length > 4)                          return 'present';
  if (w.endsWith('es')  && w.length > 3 && !BASE_SET.has(w))     return 'present';
  if (w.endsWith('s')   && w.length > 3
      && !w.endsWith('ss') && !BASE_SET.has(w))                   return 'present';

  return null;
}

// ---------------------------------------------------------------------------
// Layer 3: compromise NLP fallback (lazy-loaded)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _compromise: any = undefined;

function loadCompromise(): unknown {
  if (_compromise !== undefined) return _compromise;
  try {
    // Dynamic require so the import doesn't hard-fail when compromise is absent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _compromise = require('compromise');
  } catch {
    _compromise = null;
  }
  return _compromise;
}

function detectWithCompromise(word: string, fullSubject?: string): VerbTense | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nlp = loadCompromise() as any;
  if (!nlp) return null;

  try {
    const text = fullSubject ?? word;
    const doc  = nlp(text);
    const verb = doc.verbs().eq(0);

    if (verb.has('#PastTense'))                                   return 'past';
    if (verb.has('#Gerund'))                                      return 'gerund';
    if (verb.has('#Infinitive') || verb.has('#Imperative'))       return 'imperative';
    if (verb.has('#PresentTense'))                                return 'present';

    // Narrow to the single word if sentence-level tagging was inconclusive
    const wordDoc = nlp(word);
    if (wordDoc.has('#PastTense'))    return 'past';
    if (wordDoc.has('#Gerund'))       return 'gerund';
    if (wordDoc.has('#Infinitive'))   return 'imperative';
    if (wordDoc.has('#PresentTense')) return 'present';
  } catch {
    // compromise present but threw — degrade gracefully
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the tense/form of `word` (the first verb of a commit subject).
 * Optionally supply `fullSubject` to improve compromise context accuracy.
 */
export function detectTense(word: string, fullSubject?: string): VerbTense {
  const lower = word.toLowerCase();

  // Layer 1 — irregular lexicon
  if (PAST_MAP.has(lower))    return 'past';
  if (PRESENT_MAP.has(lower)) return 'present';
  if (BASE_SET.has(lower))    return 'imperative';

  // Layer 2 — suffix rules
  const suffixResult = detectBySuffix(lower);
  if (suffixResult !== null) return suffixResult;

  // Layer 3 — compromise NLP
  const nlpResult = detectWithCompromise(word, fullSubject);
  if (nlpResult !== null) return nlpResult;

  // Final heuristic: plain alphabetic word with no inflection signal → imperative
  if (/^[a-zA-Z]+$/.test(word) && !word.toLowerCase().endsWith('s')) {
    return 'imperative';
  }

  return 'unknown';
}

/**
 * Convert a word to its imperative (base) form, preserving original capitalisation.
 */
export function toImperative(word: string): string {
  const lower = word.toLowerCase();
  const preserve = (base: string): string =>
    /^[A-Z]/.test(word) ? base.charAt(0).toUpperCase() + base.slice(1) : base;

  // Lexicon lookups
  if (PAST_MAP.has(lower))    return preserve(PAST_MAP.get(lower)!.base);
  if (PRESENT_MAP.has(lower)) return preserve(PRESENT_MAP.get(lower)!.base);
  if (BASE_SET.has(lower))    return word;

  // -ing  (running→run, writing→writ [best-effort])
  if (lower.endsWith('ing') && lower.length > 4) {
    const stem = lower.slice(0, -3);
    const lastChar = stem[stem.length - 1];
    const penult   = stem[stem.length - 2];
    if (stem.length >= 2 && lastChar === penult && CONSONANTS.has(lastChar)) {
      return preserve(stem.slice(0, -1));
    }
    return preserve(stem);
  }

  // -ied  (applied→apply)
  if (lower.endsWith('ied') && lower.length > 4) {
    return preserve(lower.slice(0, -3) + 'y');
  }

  // -ed  (added→add, patted→pat)
  if (lower.endsWith('ed') && lower.length > 3) {
    const stem     = lower.slice(0, -2);
    const lastChar = stem[stem.length - 1];
    const penult   = stem[stem.length - 2];
    if (
      stem.length >= 4
      && lastChar === penult
      && CONSONANTS.has(lastChar)
      && stem.slice(0, -1).length >= 3
    ) {
      return preserve(stem.slice(0, -1));
    }
    return preserve(stem);
  }

  // -ies  (flies→fly)
  if (lower.endsWith('ies') && lower.length > 4) return preserve(lower.slice(0, -3) + 'y');
  // -es
  if (lower.endsWith('es')  && lower.length > 3)  return preserve(lower.slice(0, -2));
  // -s
  if (lower.endsWith('s')   && lower.length > 3)  return preserve(lower.slice(0, -1));

  return word;
}

/**
 * Convert a word to its third-person singular present form.
 */
export function toPresent(word: string): string {
  const lower = word.toLowerCase();
  const preserve = (w: string): string =>
    /^[A-Z]/.test(word) ? w.charAt(0).toUpperCase() + w.slice(1) : w;

  if (IRREGULAR_VERBS[lower]) return preserve(IRREGULAR_VERBS[lower].p3);

  if (lower.endsWith('y') && lower.length > 2 && !VOWELS.has(lower[lower.length - 2]!)) {
    return preserve(lower.slice(0, -1) + 'ies');
  }
  if (/[sxz]$/.test(lower) || lower.endsWith('ch') || lower.endsWith('sh')) {
    return preserve(lower + 'es');
  }
  return preserve(lower + 's');
}

/**
 * Convert a word to its simple past form.
 */
export function toPast(word: string): string {
  const lower = word.toLowerCase();
  const preserve = (w: string): string =>
    /^[A-Z]/.test(word) ? w.charAt(0).toUpperCase() + w.slice(1) : w;

  if (IRREGULAR_VERBS[lower]) return preserve(IRREGULAR_VERBS[lower].past);
  if (lower.endsWith('e'))   return preserve(lower + 'd');

  if (lower.endsWith('y') && lower.length > 2 && !VOWELS.has(lower[lower.length - 2]!)) {
    return preserve(lower.slice(0, -1) + 'ied');
  }

  // Consonant doubling heuristic: CVC pattern
  const last3 = lower.slice(-3);
  if (
    lower.length >= 3
    && CONSONANTS.has(last3[0]!)
    && VOWELS.has(last3[1]!)
    && CONSONANTS.has(last3[2]!)
    && !['w', 'x', 'y'].includes(last3[2]!)
  ) {
    return preserve(lower + last3[2] + 'ed');
  }

  return preserve(lower + 'ed');
}
