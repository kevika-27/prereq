/* ============================================================
   RESOLUTION — collapsing the AND/OR tree into a course set.

   The requirement tree is not a graph. It becomes one only after
   every choice node is decided. Resolution walks the tree with a
   set of decisions and emits the flat list of courses they imply,
   which is what the scheduling algorithms then operate on.

   Keeping these two layers apart is the whole design. Degree
   policy lives in the tree; sequencing lives in the graph; the
   resolver is the only thing that knows about both.
   ============================================================ */

// An unfilled elective slot still needs to exist in the graph, so it
// gets a synthetic placeholder carrying the pool's typical prerequisite.
const SLOT_COURSES = {};

function poolFloor(poolId){
  // The shallowest prerequisite any course in the pool needs, used as
  // the placeholder's prerequisite so an undecided slot is not treated
  // as free-floating.
  const pool = POOLS[poolId];
  const counts = {};
  for(const c of pool.courses){
    for(const p of (COURSES[c] ? COURSES[c].prereqs : [])) counts[p] = (counts[p]||0) + 1;
  }
  let best = null, bestN = 0;
  for(const [p,n] of Object.entries(counts)) if(n > bestN){ best = p; bestN = n; }
  return best;
}

// Keyed by the slot node's id, not the pool's. Two requirements can draw
// from the same pool (Economics needs two 300-level theory electives plus
// one more elective), and keying by pool would collide their placeholders
// and silently lose credits.
function makeSlot(slotId, poolId, i){
  const code = `${slotId}-open-${i}`;
  if(!SLOT_COURSES[code]){
    const floor = poolFloor(poolId);
    SLOT_COURSES[code] = {
      name: `${POOLS[poolId].label} (not yet chosen)`,
      credits: 4,
      prereqs: floor ? [floor] : [],
      slot: true,
      pool: poolId,
      offered: ['fall','spring']
    };
  }
  return code;
}

function courseDef(code){ return COURSES[code] || SLOT_COURSES[code]; }

/* Walk the tree, emitting course codes. `choices` maps a choice
   node's id to the index of the selected option. */
function resolve(node, choices, out = []){
  switch(node.kind){
    case 'course':
      out.push(node.code);
      break;
    case 'group':
      for(const child of node.children) resolve(child, choices, out);
      break;
    case 'choice': {
      const pick = choices[node.id] ?? 0;
      const option = node.options[pick] || node.options[0];
      for(const child of option.children) resolve(child, choices, out);
      break;
    }
    case 'slots': {
      // picks[node.id] holds the courses the student actually chose.
      // Any shortfall becomes an open placeholder slot.
      const chosen = (choices.picks && choices.picks[node.id]) || [];
      const taken = chosen.slice(0, node.n);
      for(const c of taken) out.push(c);
      for(let i = taken.length + 1; i <= node.n; i++) out.push(makeSlot(node.id, node.pool, i));
      break;
    }
  }
  return out;
}

/* Collect every choice node in a tree, so the interface can render
   one control per decision without knowing the tree's shape. */
function choicePoints(node, found = []){
  if(node.kind === 'choice') found.push(node);
  if(node.kind === 'group') node.children.forEach(c => choicePoints(c, found));
  if(node.kind === 'choice') node.options.forEach(o => o.children.forEach(c => choicePoints(c, found)));
  return found;
}

/* ------------------------------------------------------------
   MINIMUM-CREDIT RESOLUTION
   Bottom-up DP over the tree. A group costs the sum of its
   children; a choice costs the cheapest of its options. One pass,
   no search, because the tree has no shared subproblems across
   siblings.

   The caveat worth knowing: this minimises credits declared by the
   tree, not credits actually taken. Two options can differ in how
   much they share with prerequisites pulled in elsewhere, and the
   DP cannot see that from inside the tree.
   ------------------------------------------------------------ */
function minCreditChoices(node, choices = {}){
  function cost(n){
    switch(n.kind){
      case 'course': return courseDef(n.code) ? courseDef(n.code).credits : 4;
      case 'slots':  return n.n * 4;
      case 'group':  return n.children.reduce((s,c) => s + cost(c), 0);
      case 'choice': {
        let best = Infinity, bestIdx = 0;
        n.options.forEach((opt, i) => {
          const c = opt.children.reduce((s,ch) => s + cost(ch), 0);
          if(c < best){ best = c; bestIdx = i; }
        });
        choices[n.id] = bestIdx;
        return best;
      }
    }
    return 0;
  }
  cost(node);
  return choices;
}

/* ------------------------------------------------------------
   GRAPH CONSTRUCTION — take the resolved course set, pull in any
   transitive prerequisites it implies, and index the edges both
   directions.
   ------------------------------------------------------------ */
function buildGraph(codes, opts = {}){
  // The resolved set is authoritative for anything a choice node decides.
  const resolved = new Set(codes);
  const o = {...opts, resolved};
  const nodes = new Set();
  const stack = [...codes];
  while(stack.length){
    const c = stack.pop();
    if(nodes.has(c) || !courseDef(c)) continue;
    nodes.add(c);
    for(const p of prereqsOf(c, o)) stack.push(p);
  }
  const inEdges = new Map(), outEdges = new Map();
  for(const n of nodes){ inEdges.set(n, []); outEdges.set(n, []); }
  for(const n of nodes){
    for(const p of prereqsOf(n, o)){
      if(!nodes.has(p)) continue;
      inEdges.get(n).push(p);
      outEdges.get(p).push(n);
    }
  }
  return {nodes:[...nodes], inEdges, outEdges};
}

/* A "gated" prerequisite is one a choice node decides: the two maths
   sequences, the two entry points into CS, the two statistics courses,
   the language chain. The catalogue lists every alternative, but only
   the one the tree actually selected is a real edge. Without this, the
   graph quietly reinstates courses the student placed out of. */
function prereqsOf(code, opts = {}){
  const def = courseDef(code);
  if(!def) return [];
  let base = def.prereqs.slice();
  if(opts.resolved){
    base = base.filter(p => {
      const pd = courseDef(p);
      return !pd || !pd.gated || opts.resolved.has(p);
    });
  }
  // Demo hook: makes 101 -> 102 -> 201 -> 101, an impossible loop.
  if(opts.injectCycle && code === 'CSCI-UA 101') base.push('CSCI-UA 201');
  return base;
}

function creditsOf(code){
  const d = courseDef(code);
  return d ? d.credits : 4;
}

/* ------------------------------------------------------------
   CYCLE DETECTION — iterative DFS, three-colour marking.
   White unvisited, grey on the current path, black finished.
   An edge into a grey node is a back edge, so there is a cycle.
   ------------------------------------------------------------ */
function findCycle(g){
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map(g.nodes.map(n => [n, WHITE]));
  const parent = new Map();

  for(const root of g.nodes){
    if(colour.get(root) !== WHITE) continue;
    const stack = [[root, false]];
    while(stack.length){
      const [node, done] = stack.pop();
      if(done){ colour.set(node, BLACK); continue; }
      if(colour.get(node) !== WHITE) continue;
      colour.set(node, GREY);
      stack.push([node, true]);
      for(const next of g.outEdges.get(node)){
        if(colour.get(next) === GREY){
          const cycle = [next];
          let cur = node;
          while(cur !== next && cur !== undefined){ cycle.push(cur); cur = parent.get(cur); }
          cycle.push(next);
          return cycle.reverse();
        }
        if(colour.get(next) === WHITE){
          parent.set(next, node);
          stack.push([next, false]);
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------
   TOPOLOGICAL SORT — Kahn's algorithm. The wave a course comes
   off the queue in is its depth, which is the earliest semester
   it could possibly be taken.
   ------------------------------------------------------------ */
function kahn(g){
  const indeg = new Map(g.nodes.map(n => [n, g.inEdges.get(n).length]));
  const level = new Map(g.nodes.map(n => [n, 0]));
  const queue = g.nodes.filter(n => indeg.get(n) === 0);
  const order = [];

  while(queue.length){
    const n = queue.shift();
    order.push(n);
    for(const next of g.outEdges.get(n)){
      level.set(next, Math.max(level.get(next), level.get(n) + 1));
      indeg.set(next, indeg.get(next) - 1);
      if(indeg.get(next) === 0) queue.push(next);
    }
  }
  return {order, level, complete: order.length === g.nodes.length};
}

/* ------------------------------------------------------------
   CRITICAL PATH — longest path in a DAG. Relax edges in
   topological order so a single pass is final.
   ------------------------------------------------------------ */
function criticalPath(g, order){
  const dist = new Map(g.nodes.map(n => [n, 1]));
  const from = new Map();
  for(const n of order){
    for(const next of g.outEdges.get(n)){
      if(dist.get(n) + 1 > dist.get(next)){
        dist.set(next, dist.get(n) + 1);
        from.set(next, n);
      }
    }
  }
  let end = null, best = 0;
  for(const [n, d] of dist) if(d > best){ best = d; end = n; }
  const path = [];
  let cur = end;
  while(cur !== undefined){ path.push(cur); cur = from.get(cur); }
  return {path: path.reverse(), length: best};
}

/* ------------------------------------------------------------
   REACHABILITY — BFS up the prerequisite edges, or down the
   unlock edges. Same routine, opposite index.
   ------------------------------------------------------------ */
function reach(g, start, edgeMap){
  const seen = new Set();
  const queue = [start];
  while(queue.length){
    const n = queue.shift();
    for(const next of edgeMap.get(n) || []){
      if(!seen.has(next)){ seen.add(next); queue.push(next); }
    }
  }
  return seen;
}

/* ------------------------------------------------------------
   SEMESTER PACKING — greedy over ready courses, ordered by how
   much each unlocks, filled to a credit budget.
   ------------------------------------------------------------ */
function offeredIn(code, term){
  const d = courseDef(code);
  if(!d || !d.offered) return true;
  return d.offered.includes(term);
}

/* ------------------------------------------------------------
   SEMESTER PACKING — greedy over ready courses, ordered by how
   much each unlocks, filled to a credit budget.

   Terms alternate fall/spring, and a course can only be taken in
   a term it is actually offered. This turns a pure ordering
   problem into a constrained one: a fall-only course whose
   prerequisites finish in the fall costs you a full year, not a
   semester, and the planner has to skip it and come back.
   ------------------------------------------------------------ */
function packSemesters(g, cap, completed = new Set(), startTerm = 'fall', startYear = 2026, freeCredits = 0){
  const unlocks = new Map(g.nodes.map(n => [n, reach(g, n, g.outEdges).size]));
  const remaining = new Set(g.nodes.filter(n => !completed.has(n)));
  const have = new Set(completed);
  const semesters = [];

  let term = startTerm, year = startYear;
  let free = freeCredits;   // unrestricted credits still to be filled
  let idle = 0;

  while((remaining.size || free > 0) && idle < 2){
    const eligible = [...remaining].filter(n =>
      g.inEdges.get(n).every(p => have.has(p)) && offeredIn(n, term));
    eligible.sort((a, b) => unlocks.get(b) - unlocks.get(a) || a.localeCompare(b));

    // Required work first: it is what the prerequisite chain constrains.
    const taking = [];
    let load = 0;
    for(const c of eligible){
      if(load + creditsOf(c) > cap) continue;
      taking.push(c);
      load += creditsOf(c);
    }

    // Then spend leftover room on free electives. This is what makes the
    // plan a real schedule rather than a list of requirements: every term
    // fills to the credit minimum, and the free credits land wherever the
    // required chain leaves a gap.
    let freeHere = 0;
    while(free > 0 && load + 4 <= cap){
      freeHere += 4; load += 4; free -= 4;
    }

    const waiting = [...remaining].filter(n =>
      g.inEdges.get(n).every(p => have.has(p)) && !offeredIn(n, term));

    if(taking.length || freeHere){
      semesters.push({courses: taking, freeCredits: freeHere, credits: load, term, year, waiting});
      for(const c of taking){ remaining.delete(c); have.add(c); }
      idle = 0;
    } else {
      idle++;
      if(remaining.size) semesters.push({courses: [], freeCredits: 0, credits: 0, term, year, waiting});
    }

    if(term === 'fall'){ term = 'spring'; year++; } else { term = 'fall'; }
  }
  return {semesters, stranded: [...remaining], freeUnplaced: free};
}

/* ------------------------------------------------------------
   THE HEADLINE NUMBERS
   Required credits come from the resolved requirement tree.
   Free credits are whatever the degree total leaves over, which
   is the number students actually want: how much room is there
   for anything at all.
   ------------------------------------------------------------ */
function creditBudget(g, degree){
  const required = g.nodes.reduce((s, c) => s + creditsOf(c), 0);
  const free = Math.max(0, degree.totalCredits - required);
  return {
    required,
    free,
    freeCourses: Math.floor(free / 4),
    total: degree.totalCredits,
    over: Math.max(0, required - degree.totalCredits)
  };
}

function termLabel(s){ return (s.term === 'fall' ? 'Fall ' : 'Spring ') + s.year; }
