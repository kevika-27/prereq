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

// Synthetic courses for elective slots, created on demand so that
// "four 400-level electives" becomes four real nodes in the graph.
const SLOT_COURSES = {};

function slotCode(prefix, i){ return `${prefix}-${i}`; }

function makeSlot(prefix, i, after, label){
  const code = slotCode(prefix, i);
  if(!SLOT_COURSES[code]){
    SLOT_COURSES[code] = {
      name: `${label} ${i}`,
      credits: 4,
      prereqs: after ? [after] : [],
      slot: true
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
    case 'slots':
      for(let i = 1; i <= node.n; i++){
        out.push(makeSlot(node.prefix, i, node.after, node.label));
      }
      break;
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
   EXEMPTIONS — applied after resolution, since a Core requirement
   can only be judged covered once you know which major courses
   the choices actually produced.
   ------------------------------------------------------------ */
function applyExemptions(codes){
  const set = new Set(codes);
  const dropped = [];
  for(const rule of EXEMPTIONS){
    if(!set.has(rule.core)) continue;
    const hit = rule.by.find(m => set.has(m));
    if(hit){
      set.delete(rule.core);
      dropped.push({code: rule.core, by: hit, note: rule.note,
                    credits: courseDef(rule.core).credits});
    }
  }
  return {codes: [...set], dropped};
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
function packSemesters(g, cap, completed = new Set()){
  const unlocks = new Map(g.nodes.map(n => [n, reach(g, n, g.outEdges).size]));
  const remaining = new Set(g.nodes.filter(n => !completed.has(n)));
  const have = new Set(completed);
  const semesters = [];

  while(remaining.size){
    const ready = [...remaining].filter(n => g.inEdges.get(n).every(p => have.has(p)));
    if(!ready.length) break;
    ready.sort((a, b) => unlocks.get(b) - unlocks.get(a) || a.localeCompare(b));

    const taking = [];
    let load = 0;
    for(const c of ready){
      if(load + creditsOf(c) > cap) continue;
      taking.push(c);
      load += creditsOf(c);
    }
    if(!taking.length) break;
    semesters.push({courses: taking, credits: load});
    for(const c of taking){ remaining.delete(c); have.add(c); }
  }
  return {semesters, stranded: [...remaining]};
}
