// PSYCHO SYBER: the six stages. The first is built from segments laid side by side: a segment is a block of
// rows, bottom-aligned, and the builder pads the top. The others are plotted (see grid). Characters are listed in sim.js.
//
// What each form can clear, measured by test/probe.mjs:
//   SYBER (the weaver)  ledge up 2 tiles · gap 3 tiles · cord reach 9 tiles (stone, beams, rings; never metal)
//   PSYCHO (the jaguar) ledge up 3 tiles · gap 5 tiles · 10 with a pounce · climbs stone · fits 1-tile tunnels
const R = (ch, n) => ch.repeat(n);
function wide(H, segs) {
  const rows = Array.from({ length: H }, () => '');
  segs.forEach((s, i) => {
    const w = s[0].length;
    s.forEach((r, j) => { if (r.length !== w) throw new Error(`segment ${i} row ${j} is ${r.length} wide, expected ${w}: "${r}"`); });
    if (s.length > H) throw new Error(`segment ${i} is ${s.length} rows, stage is ${H}`);
    for (let y = 0; y < H; y++) rows[y] += y < H - s.length ? R(' ', w) : s[y - (H - s.length)];
  });
  return rows;
}
const base = (w, n = 4) => Array.from({ length: n }, () => R('#', w));
const rep = (row, n) => Array.from({ length: n }, () => row);

// ------------------------------------------------------------------ 1 · THE STEPS (Attest)
const steps = wide(24, [
  [ // A · the shore, and the great carved head
    '           A      ',
    R(' ', 18),
    R(' ', 18),
    '   @    ?  J  t   ',
    ...base(18),
  ],
  [ // B · first hops and a shallow pit
    '              t         ',
    '             ###        ',
    '     ##      ###        ',
    '##################   ###',
    '##################   ###',
    R('#', 24),
    R('#', 24),
  ],
  [ // C · a wall the cord gets you over
    '           o              ',
    R(' ', 26),
    R(' ', 26),
    '               t          ',
    ...rep('          ##########      ', 4),
    '   ?      ##########      ',
    ...base(26),
  ],
  [ // D · swing across the thorns
    '             o                ',
    ...rep(R(' ', 30), 5),
    '    ?        t          C     ',
    '##########        ############',
    '##########        ############',
    '###########^^^^^^#############',
    R('#', 30),
  ],
  [ // E · the first warden
    '           A                      ',
    '   ?       ##          w   t  ##  ',
    ...base(34),
  ],
  [ // F · the Visitors' wall and a cliff beyond. The jaguar goes under the wall and climbs. The weaver checks
    //     the terminal, which opens the row of doors above the tunnel, and takes the steps cut beside the cliff.
    ...rep('        MMMMMM                ', 8),
    ...rep('        MMMMMM      ##########', 2),
    '        MMMMMM    ==##########',
    '        MMMMMM      ##########',
    '        MMMMMM    ==##########',
    '        MMMMMM      ##########',
    '        DDDDDD    ==##########',
    ' C?  T        t  ?  ##########',
    ...base(30),
  ],
  [ // G · the spirit bridge, then down the terraces
    '  ?                               ',
    '####%%%%%%%%%%%%######            ',
    '####            ######            ',
    '####          ==##########        ',
    '####            ##########        ',
    '####          ==##############    ',
    '####            ##############    ',
    '####          ==##################',
    '####     t  A   ##################',
    ...base(34),
  ],
  [ // H · a warden for the jaguar
    R(' ', 22),
    '  ?       w       C ##',
    ...base(22),
  ],
  [ // I · the steps: twelve treads, and not all of them are there
    R(' ', 34) + R('#', 10),
    ...rep(R(' ', 38) + 'D    #', 2),
    R(' ', 31) + '?   T  D  X #',
    R(' ', 30) + R('#', 14),
    R(' ', 28) + '11M' + R('#', 13),
    R(' ', 26) + '11  M' + R('#', 13),
    R(' ', 24) + '11    M' + R('#', 13),
    R(' ', 22) + '33      M' + R('#', 13),
    R(' ', 20) + '11        M' + R('#', 13),
    R(' ', 18) + '22          M' + R('#', 13),
    R(' ', 16) + '11            M' + R('#', 13),
    R(' ', 14) + '33              M' + R('#', 13),
    R(' ', 12) + '11                M' + R('#', 13),
    R(' ', 10) + '22                  M' + R('#', 13),
    R(' ', 8) + '11                    M' + R('#', 13),
    R(' ', 6) + '11                      M' + R('#', 13),
    '  ?' + R(' ', 17) + 't' + R(' ', 9) + 'M' + R('#', 13),
    ...base(44),
  ],
]);


// The other stages are drawn with a small plotter, so every thing has a known tile position. put() places
// characters from (x, y) rightward; col() places one character down a column. Settings given with either are
// stored by position and read by parseLevel (def.at).
function grid(w, h) {
  const a = Array.from({ length: h }, () => Array(w).fill(' ')), at = {};
  const m = {
    box(x0, y0, x1, y1, ch = '#') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y][x] = ch; return m; },
    put(x, y, s, props) { for (let i = 0; i < s.length; i++) a[y][x + i] = s[i]; if (props) at[x + ',' + y] = props; return m; },
    col(x, y0, y1, ch, props) { for (let y = y0; y <= y1; y++) a[y][x] = ch; if (props) at[x + ',' + y0] = props; return m; },
    hint(x, y, text) { return m.put(x, y, '?', { text }); },
    done() { return { map: a.map(r => r.join('')), at }; },
  };
  return m;
}

// ------------------------------------------------------------------ 2 · MACHU PICCHU (RISE)
// A climb through Inca ruins, 56 x 44, in three parts. Each part has a way on words and a way on stone.
// A: seven words light in turn, two tiles apart. Or: the stair inside the wall.
// B: four words flash together, too briefly to cross. The jaguar's roar slows them. Or: the weaver checks the
//    pace setter in the ravine (E), which slows every word until it is checked again, and climbs back out.
// C: five words three tiles apart, which only the jaguar clears. Or: the stone stair on the right.
function machu() {
  const m = grid(56, 44);
  m.box(0, 41, 55, 43);                                  // the lowest terrace
  m.box(16, 25, 24, 40).col(16, 26, 40, 'M');            // the wall under the first terrace; its face cannot be climbed
  m.box(16, 39, 17, 40, ' ').box(18, 26, 20, 40, ' ');   // a doorway at its foot, and the stairwell behind it
  for (let y = 39; y >= 25; y -= 2) m.put(18, y, '===');
  m.box(25, 34, 40, 40);                                 // the ravine under part B
  for (const y of [32, 30, 28, 26]) m.put(25, y, '==');  // the way back out of it
  m.box(41, 26, 55, 40).col(41, 26, 33, 'M');            // the far terrace
  for (let y = 24; y >= 10; y -= 2) m.put(53, y, '==='); // the stone stair
  m.box(49, 9, 55, 9, '=');                              // the top: a beam, so a jump from below passes through it
  m.put(3, 40, '@').hint(6, 39, 'Words light one at a time. Jump to the next while it is lit. Or take the stair inside the wall.');
  for (let k = 0; k < 7; k++) m.put(k % 2 ? 8 : 12, 39 - k * 2, 'WWWW');
  m.put(22, 24, 'C').hint(21, 23, 'These four flash too fast to cross. As the jaguar, roar (E) while they are lit and run. As the weaver, check the pace setter in the ravine.');
  ['TOO', 'FAST', 'TO', 'READ'].forEach((text, k) => m.put(25 + k * 4, 25, 'WWWW', { i: 0, n: 6, beat: 0.6, text, w: 4 }));
  m.put(32, 33, 'P').hint(30, 33, 'E sets the pace of every word: fast or slow. It stays until you check it again.');
  m.put(43, 25, 'C').hint(44, 24, 'The jaguar jumps three tiles from word to word. The stone stair on the right takes longer.');
  ['ONE', 'WORD', 'AT', 'A', 'TIME'].forEach((text, k) => m.put(k % 2 ? 49 : 45, 23 - k * 3, 'WWWW', { i: k, n: 5, beat: 0.7, text }));
  m.put(53, 8, 'X');
  for (const [x, y] of [[13, 37], [9, 35], [14, 29], [32, 29], [35, 33], [46, 21], [50, 12], [54, 17]]) m.put(x, y, 't');
  m.put(5, 37, 'A', mark('sacsay')).put(38, 33, 'A', mark('tiwanaku')).put(51, 7, 'A', mark('nazca'));
  return m.done();
}

// ------------------------------------------------------------------ 3 · THE LINES (FLYSPACE)
// The desert floor, 150 x 24. Each gate is fed by a source somewhere else, and the jaguar sees the line between
// them. A source with no line is watched: checking it raises the alarm.
function lines() {
  const m = grid(150, 24), wall = (x, src) => { m.box(x - 1, 0, x + 1, 15, 'M').col(x, 16, 19, 'f', { src }); };
  m.box(0, 20, 149, 23);
  // A · one gate, one source, on a column the cord reaches
  m.put(3, 19, '@').hint(6, 18, 'A gate burns while its source is alive.');
  m.box(16, 15, 21, 19).put(17, 11, 'o').put(20, 14, 'S', { id: 'a' });
  m.hint(11, 18, 'Shift: the jaguar sees the line from each gate to its source. Reach the source, then press E as the weaver.');
  wall(30, 'a');
  // B · the village
  m.hint(37, 18, 'Visitors walk among the people. The jaguar sees which are which.');
  m.put(44, 19, '##').put(64, 19, '##').put(47, 17, '=====').put(58, 17, '=====');
  m.put(56, 19, 'w', { mimic: true });
  for (const x of [40, 50, 53, 60, 68]) m.put(x, 19, 'v');
  // C · the source is on the tower; a watched source stands by the gate
  m.put(70, 19, 'C').hint(73, 18, 'Follow the line. Stone is the jaguar\'s to climb. The steps beside it are the weaver\'s.');
  for (const y of [18, 16, 14, 12, 10]) m.put(76, y, '==');
  m.box(78, 8, 82, 19).put(83, 8, '==').put(81, 7, 'S', { id: 'b' });   // the beam is a perch to throw from
  m.hint(80, 6, 'From up here your glass reaches the Visitor below. A source with no line is watched: leave it.');
  m.put(92, 19, 'w').put(96, 19, 'S', { trap: true });
  wall(100, 'b');
  // D · three sources, two gates, crossed lines
  m.put(104, 19, 'C').hint(108, 18, 'Three sources, two gates. Check only the sources that have a line. The jaguar can break a source with a pounce, and that is loud.');
  m.put(112, 19, 'S', { id: 'c' }).put(116, 19, '##').put(116, 18, 'S', { trap: true }).put(121, 19, 'S', { id: 'd' });
  wall(126, 'd'); wall(134, 'c');
  m.put(143, 19, 'X');
  for (const [x, y] of [[8, 16], [24, 17], [49, 16], [60, 16], [79, 6], [90, 16], [114, 15], [130, 17]]) m.put(x, y, 't');
  m.put(33, 17, 'A', mark('sahel')).put(80, 4, 'A', mark('richat')).put(139, 17, 'A', mark('mohenjo'));
  return m.done();
}

// ------------------------------------------------------------------ 4 · THE WORKS (SyberWork)
// The Visitors' factory, 166 x 24: five stations named as SyberWork names its own. A blinking intake, a
// sentinel that can be turned, an eye that raises the alarm, then the Approver, fed by three sources.
function works() {
  const m = grid(166, 24), bulk = (x, y1 = 15) => m.box(x - 1, 0, x + 1, y1, 'M');
  m.box(0, 20, 165, 23);
  // PROPOSE · two gates that blink in turn
  m.put(3, 19, '@').put(4, 12, 'L', { text: 'PROPOSE' }).hint(6, 18, 'A gate that blinks can be passed while it is dark.');
  bulk(14); m.col(14, 16, 19, '!', { period: 2.4, duty: 0.5, ph: 0 });
  bulk(22); m.col(22, 16, 19, '!', { period: 2.4, duty: 0.5, ph: 1.2 });
  // CHECK · a sentinel over the hall, a Visitor on the floor
  m.put(26, 19, 'C').put(30, 12, 'L', { text: 'CHECK' }).hint(30, 18, 'E on a sentinel turns it. For twelve seconds it shoots for you.');
  m.put(40, 15, 's', { dx: 12, speed: 36 }).put(44, 19, '##').put(60, 19, '##').put(54, 19, 'w');
  // REVIEW · the eye, the gate it lights, and a bulkhead only the jaguar fits under
  m.put(64, 19, 'C').put(66, 12, 'L', { text: 'REVIEW' });
  m.hint(67, 18, 'An eye that sees you raises the alarm and lights the gate ahead. Glass breaks an eye. E switches it off.');
  m.box(72, 8, 90, 9, 'M').put(81, 10, 'e', { base: 90, sweep: 50, period: 4, range: 150, fov: 20 });
  bulk(92); m.col(92, 16, 19, 'i');
  m.hint(94, 18, 'Shift: the jaguar fits under the bulkhead. Or check the terminal behind you, which opens the duct above the tunnel.');
  m.box(96, 0, 103, 18, 'M').put(88, 19, 'T', { opens: 'duct' });
  for (let x = 96; x <= 103; x++) m.put(x, 18, 'D', { id: 'duct' });
  // APPROVE · three sources feed the Approver: one on the floor, one on a block, one under the dais
  m.put(105, 19, 'C').put(106, 12, 'L', { text: 'APPROVE' }).hint(107, 18, 'Three sources feed the Approver. The jaguar sees the lines. Cut all three.');
  m.put(110, 19, 'S', { core: true });
  m.box(116, 15, 121, 19).put(117, 11, 'o').put(120, 14, 'S', { core: true });
  m.hint(124, 18, 'One source is under the floor. Go in as the jaguar and stand up as the weaver. Or check it through the grate on the dais.');
  m.box(132, 18, 143, 19, 'M').box(128, 20, 131, 20, 'M');                    // the dais, and a lip the jaguar cannot cling to
  m.box(126, 20, 127, 21, ' ').box(128, 21, 135, 21, ' ').box(136, 20, 139, 21, ' ');   // the way under it
  m.box(137, 18, 138, 19, '=');                                               // a grate in the dais
  m.put(138, 21, 'S', { core: true }).put(137, 12, 'K');
  m.hint(130, 17, 'When all three are cut the Approver opens. Glass or a pounce breaks it.');
  m.box(146, 0, 146, 15, 'M').col(146, 16, 19, 'D', { id: 'core' });
  m.hint(148, 18, 'E at the terminal. Now a person approves.').put(150, 19, 'T', { opens: 'pub' });
  m.box(154, 0, 154, 15, 'M').col(154, 16, 19, 'D', { id: 'pub' });
  // PUBLISH
  m.put(156, 12, 'L', { text: 'PUBLISH' }).put(160, 19, 'X').put(163, 19, 'R', { far: 240, line: 'The Patron: "You put a person where my machine stood. I own the Works that built it. Come to my sale."' });
  for (const [x, y] of [[18, 17], [36, 16], [52, 16], [76, 16], [99, 19], [118, 12], [131, 21], [141, 16]]) m.put(x, y, 't');
  m.put(10, 17, 'A', mark('antikythera')).put(70, 17, 'A', mark('baghdad')).put(158, 17, 'A', mark('gobekli'));
  return m.done();
}

// ------------------------------------------------------------------ 5 · THE RECORD (Lacuna Institute)
// A viewing hall before a sale, 176 x 24. Nothing here is taken and nothing is fought. Seven lots stand on
// plinths. E reads a lot's record; five of the records have a gap. The far door takes the evidence only when
// all five are found, and the sale closes when the timer runs out. The 21 marks are the 21 sites of the
// Lacuna Atlas (src/lacuna/atlas/sites.js); test/run.mjs fails if this list and that file disagree.
export const ATLAS = [
  ['paracas', 'Paracas'], ['rapanui', 'Rapa Nui'], ['baghdad', 'The Baghdad battery'], ['sahel', 'The Green Sahara'],
  ['richat', 'The Eye of the Sahara'], ['canyon', 'The Grand Canyon'], ['sedona', 'Secret Mountain'],
  ['amazon', 'The Amazon earthworks'], ['mosquitia', 'La Mosquitia'], ['longview', 'Mount Coffin'],
  ['rushmore', 'Mount Rushmore'], ['gobekli', 'Göbekli Tepe'], ['antikythera', 'The Antikythera mechanism'],
  ['nanmadol', 'Nan Madol'], ['sacsay', 'Sacsayhuamán'], ['tiwanaku', 'Tiwanaku & Puma Punku'],
  ['padang', 'Gunung Padang'], ['nazca', 'The Nazca lines'], ['mohenjo', 'Mohenjo-daro'], ['dogger', 'Doggerland'],
  ['vostok', 'Lake Vostok'],
].map(([id, name]) => ({ id, name }));
const mark = id => ({ id, name: ATLAS.find(a => a.id === id).name });
function record() {
  const m = grid(176, 24), lot = (x, y, name, note) => m.put(x, y, note ? 'G' : 'O', { name, note });
  m.box(0, 20, 175, 23);
  // A · two lots on the floor: one record complete, one with a gap
  m.put(3, 19, '@').hint(6, 18, 'The sale closes when the timer runs out. E reads the record of a lot.');
  lot(12, 19, 'Lot 1, a gourd bowl');
  m.hint(17, 18, 'A record with a gap is evidence. Find all five, then go to the far door.');
  lot(22, 19, 'Lot 2, a feather fan', 'The record does not say where it was found');
  // B · a lot on a wall the cord reaches
  m.put(34, 19, 'C').box(40, 15, 49, 19).put(41, 11, 'o').put(55, 17, '====');
  lot(45, 14, 'Lot 3, a shell collar', 'Forty years have no owner listed');
  // C · a lot past a wall the jaguar goes under, and one on a cliff it climbs
  m.hint(62, 18, 'The jaguar goes under this wall, up the cliff and over the bridge it alone can see. The weaver checks the terminal and takes the steps. The jaguar also sees each record as a line: a broken line is a gap.');
  m.box(70, 4, 75, 18, 'M').put(77, 19, 'C').put(66, 19, 'T', { opens: 'low' });
  for (let x = 70; x <= 75; x++) m.put(x, 18, 'D', { id: 'low' });
  for (const y of [18, 16, 14]) m.put(84, y, '==').put(106, y, '==');
  lot(80, 19, 'Lot 4, a bone flute');
  m.box(86, 12, 95, 19);
  lot(90, 11, 'Lot 5, an obsidian knife', 'The record starts at a sale and nothing comes before it');
  // D · a spirit bridge to the last gallery, then terraces down
  m.box(96, 12, 107, 12, '%').box(108, 12, 113, 19).box(114, 14, 117, 19).box(118, 16, 121, 19).box(122, 18, 125, 19);
  m.put(112, 11, 'C');
  lot(110, 11, 'Lot 6, a painted jar', 'Two owners are listed for the same year');
  // E · the last lot and the far door
  lot(140, 19, 'Lot 7, a woven band', 'The line for its export is blank');
  m.put(146, 17, '====').put(152, 15, '====');
  m.hint(160, 18, 'The far door. It takes the evidence when all five gaps are found.').put(168, 19, 'X').put(172, 19, 'R', { far: 330, line: 'The Patron: "Five gaps. Keep them. My machine has no gaps, and it has watched you since the shore."' });
  for (const [x, y] of [[17, 16], [48, 14], [53, 17], [72, 19], [88, 10], [99, 11], [101, 19], [116, 13], [134, 17], [147, 16], [153, 14], [163, 17]]) m.put(x, y, 't');
  [[8, 17, 'canyon'], [27, 17, 'sedona'], [43, 12, 'amazon'], [56, 16, 'mosquitia'], [83, 16, 'longview'], [93, 10, 'rushmore'], [104, 11, 'padang'], [124, 17, 'dogger'], [158, 17, 'vostok']].forEach(([x, y, id]) => m.put(x, y, 'A', mark(id)));
  return m.done();
}

// ------------------------------------------------------------------ 6 · THE REAL BATTLE
// One room the size of the screen, 30 x 17, and no exit. The Thousand Eyes cannot be hurt, turned or outrun
// (stepReal in sim.js). Three tiers of beams, each within a jump of the last. The floor and walls are metal: no
// cord, no climbing. The Patron stands in the gallery, and only the jaguar can get up there to find out why.
function real() {
  const m = grid(30, 17);
  m.box(0, 15, 29, 16, 'M').box(0, 0, 0, 14, 'M').box(29, 0, 29, 14, 'M');
  m.put(3, 13, '=====').put(22, 13, '=====').put(8, 11, '====').put(18, 11, '====').put(12, 9, '======');
  m.box(24, 6, 28, 6, 'M');
  m.put(4, 14, '@').put(15, 3, 'Z').put(26, 5, 'R');
  return m.done();
}

// ------------------------------------------------------------------ the command ship (not a stage: see main.js)
// Reached only by the ritual at the great carved head. Three hooded figures stand on the deck.
function ship() {
  const m = grid(32, 17);
  m.box(0, 13, 31, 16, 'M').box(0, 0, 0, 12, 'M').box(31, 0, 31, 12, 'M');
  m.put(3, 12, '@').hint(5, 11, 'The command ship. Walk up to each of the three.');
  m.put(11, 12, 'H', { name: 'Martian Mat', role: 'founder', lines: ['You found the command ship.', 'Nothing leaves this deck until a person approves it.', 'That is SyberWork.'] });
  m.put(16, 12, 'H', { name: 'Seth', role: 'lead engineer', lines: ['I run every step before I trust it.', 'Attest does that to your docs.', 'FLYSPACE shows which sources fed an answer.'] });
  m.put(21, 12, 'H', { name: 'Ezel', role: 'creative director', lines: ['RISE shows you words at the pace you set.', 'Lacuna keeps the Atlas of what is missing.', 'Take a fifth life down with you.'] });
  m.put(28, 12, 'X');
  return m.done();
}
export const SHIP = { id: 'ship', name: 'THE COMMAND SHIP', project: 'SyberLabs', href: '/', line: 'The command ship, in another star system.', intro: [], bg: 'ship', persona: 'syber', ...ship() };

export const STAGES = [
  {
    id: 'steps', name: 'THE STEPS', project: 'Attest', href: '/projects/attest/',
    line: 'Runs every step in your docs and marks the ones that fail.',
    intro: ['You are a weaver of a noble house.', 'You drank what the old ones drank, and a jaguar came with you.', 'The Visitors built a stair to their gate.', 'They say every step holds.', 'Run each one.'],
    bg: 'shore', persona: 'syber', map: steps,
    props: { A: [mark('paracas'), mark('rapanui'), mark('nanmadol')], D: [...Array.from({ length: 6 }, () => ({ id: 'wall' })), { id: 'top' }], T: [{ opens: 'wall' }, { opens: 'top' }] },
    hints: [
      'A and D walk. W or Space jumps.',
      'Hold the mouse button on a ring or on stone to throw the cord. W reels in. Let go to drop.',
      'Cord the ring and swing across. Space lets go with a kick.',
      'Click throws glass. Two hits drop a warden. Hold S to hide.',
      'Shift changes you into the jaguar. Q does the same. It fits under the wall. Or stay the weaver: E at the terminal opens the doors above the tunnel.',
      'As the jaguar, push into stone and hold W to climb. Space leaps off. The weaver takes the steps cut beside the cliff.',
      'The jaguar walks on what the weaver cannot see. The weaver goes down, and up the steps on the far side.',
      'Click to pounce. One pounce drops a warden.',
      'Shift back. E runs the check: proven steps hold, stale steps fall, broken steps are not there.',
      'E beside a terminal opens its door.',
    ],
  },
  {
    id: 'machu', name: 'MACHU PICCHU', project: 'RISE', href: '/projects/rise/',
    line: 'Shows text at a pace you set, with sound and moving visuals.',
    intro: ['The road climbs to Machu Picchu.', 'The Visitors keep their words in the ruins.', 'One word shows at a time.', 'Climb at the pace you set.'],
    bg: 'ruins', persona: 'syber', order: 'up', words: { text: 'WORDS RISE AT THE PACE YOU SET', beat: 0.9 }, ...machu(),
  },
  {
    id: 'lines', name: 'THE LINES', project: 'FLYSPACE', href: '/projects/flyspace/',
    line: 'Shows which data sources fed each AI answer.',
    intro: ['Lines cross the desert floor.', 'Each gate is fed by a source somewhere else.', 'Find which one.'],
    bg: 'desert', persona: 'syber', ...lines(),
  },
  {
    id: 'works', name: 'THE WORKS', project: 'SyberWork', href: '/projects/syberwork/',
    line: 'Tests every AI-written code change before a person approves it.',
    intro: ['Here the Visitors decide who is born.', 'The Patron owns the Works.', 'Each birth is proposed, checked and reviewed.', 'A machine approves.', 'Put a person there.'],
    bg: 'works', persona: 'syber', ...works(),
  },
  {
    id: 'record', name: 'THE RECORD', project: 'Lacuna Institute', href: '/lacuna/',
    line: 'An atlas of places where the historical record goes quiet.',
    intro: ['The Patron is selling what the Visitors collected.', 'The viewing is open.', 'Each lot has a record.', 'Find what the records leave out before the sale closes.'],
    bg: 'vault', persona: 'syber', timer: 240, needs: 'evidence', ...record(),
  },
  {
    id: 'real', name: 'THE REAL BATTLE', project: 'SyberLabs', href: '/#products',
    line: 'Makes software for checking AI\'s work.',
    intro: ['The Patron owns the Works, the sale and the machine.', 'The machine is called the Thousand Eyes.', 'It has every camera and every record.', 'It saw you coming.'],   // what it says in the room is in render.js
    bg: 'eyes', persona: 'syber', real: true, ...real(),
  },
];
