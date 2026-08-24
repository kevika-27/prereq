# Prereq

An NYU degree planner. Models a degree as an AND/OR requirement tree, resolves it into a directed acyclic graph of courses, then computes the shortest valid path to graduation.

No dependencies, no build step, no graph libraries. Every algorithm is implemented from scratch.

<!-- Once deployed, replace the line below with your GitHub Pages URL, and add screenshot.png to the repo root to make the image appear. -->

**Live demo:** _not deployed yet_

## The problem

A degree is not a list of courses. It is a tree with three kinds of node: things you must all do, things where you pick one, and things where you pick some number from a pool. Only once every choice is decided does it become a graph you can actually schedule.

Every planning tool students use flattens that structure away, which hides the three things that matter: which courses are unblocked right now, which chain of dependencies sets the real floor on how fast you can graduate, and what a choice like Calculus versus Math for Economics actually costs you downstream.

Taking Data Structures a semester late doesn't cost you one semester. It costs you every semester of everything behind it.

## Architecture

Three files, three layers, deliberately separated.

| File | Layer | Knows about |
|---|---|---|
| `data.js` | Catalog, degree trees, exemption rules | NYU policy only |
| `engine.js` | Resolver and graph algorithms | Structure only, no NYU specifics |
| `index.html` | Interface | Neither, it just renders what the engine returns |

Degree policy lives in the tree. Sequencing lives in the graph. The resolver is the only thing that touches both. Adding a new degree means adding a tree to `data.js` and changing nothing else.

## The AND/OR tree

```js
G('Economics & Computer Science (BA)',
  CAS_CORE,
  G('Mathematics',
    C('MATH-UA 9'), C('MATH-UA 120'),
    CH('mathseq', 'Mathematics sequence', note, [
      OPT('Mathematics for Economics I–III', C('MATH-UA 131'), C('MATH-UA 132'), C('MATH-UA 133')),
      OPT('Calculus I–III',                  C('MATH-UA 121'), C('MATH-UA 122'), C('MATH-UA 123'))
    ])),
  ...)
```

`G` is a group where every child is required. `CH` is an exclusive choice. `SL` is choose-k from a pool, used for elective slots. `C` is a course leaf.

That mathematics fork is real policy, not a convenience: NYU explicitly forbids mixing or double counting between the calculus and Math for Economics sequences, and AP calculus credit cannot place you ahead in the latter.

### Gated prerequisites

The subtle bug this design has to avoid: the catalog lists every alternative prerequisite, so a naive graph build reinstates courses the student placed out of. Choosing "AP Computer Science credit" would still drag in CSCI-UA 2, because CSCI-UA 101's prerequisite list names it.

Courses controlled by a choice node are marked `gated`. When building the graph, a gated prerequisite is only a real edge if the resolved set actually contains it. That one filter is what keeps the tree authoritative over the catalog.

## What it does

- **Marks what's available now.** Tick off completed courses and the graph recolors to show exactly which courses have all prerequisites satisfied.
- **Generates a semester plan.** Greedy scheduling over the topological order, packed against a real credit budget. NYU requires 16 credits per semester and caps at 18 without an overload petition, and most CSCI-UA and MATH-UA courses are 4 credits.
- **Finds the critical path.** The longest dependency chain in the graph, which is the true minimum number of semesters regardless of how many courses you take at once.
- **Traces impact both directions.** Click any course to see every prerequisite behind it and everything it unlocks.
- **Detects circular prerequisites.** There's a button to inject an impossible loop into the catalog so you can watch the cycle detector find and report it.

## Algorithms

| | Implementation | Complexity |
|---|---|---|
| Tree resolution | Recursive walk of the AND/OR tree against a set of decisions, emitting a flat course list | O(nodes) |
| Minimum-credit resolution | Bottom-up DP: a group costs the sum of its children, a choice costs the cheapest option | O(nodes) |
| Topological sort | Kahn's algorithm with in-degree counting; depth of each node gives its earliest possible semester | O(V + E) |
| Cycle detection | Iterative DFS with three-color marking; a back edge into a grey node reconstructs the loop via parent pointers | O(V + E) |
| Critical path | Longest path in a DAG via DP, relaxing edges in topological order so one pass suffices | O(V + E) |
| Reachability | BFS run in both directions over the same adjacency lists | O(V + E) |
| Semester packing | Greedy over ready courses, prioritized by downstream unlock count, filled to a credit budget | O(V·E) worst case |

### Why Kahn's rather than DFS

DFS-based topological sort gives you a valid order but not depth. Kahn's algorithm processes courses in waves of satisfied prerequisites, and that wave number is exactly the earliest semester a course can be taken. The layout of the graph view falls straight out of the algorithm rather than needing a separate pass.

### Why the critical path matters more than the credit total

The Economics & Computer Science track is 88 credits, which at 16 credits per semester divides cleanly into 6. The planner also returns 6. But the longest dependency chain is only 5 courses deep, so 5 semesters is the hard floor and the sixth semester exists purely because of volume, not sequencing.

That distinction is the point. If the critical path equals your semester count you are sequence-bound and taking a heavier load will not help you. If it is shorter, you are volume-bound and it will. Raising the cap to 20 credits drops the plan to 5 semesters, which is exactly where the critical path stops it.

### The greedy heuristic and where it fails

The packer sorts ready courses by how many downstream courses they unlock, so bottleneck courses get taken early, then fills the credit budget and keeps scanning past any course that would overflow it in case a lighter one further down still fits. This is a heuristic, not optimal. Optimal packing under a hard capacity constraint is NP-hard, reducible from bin packing. In practice it lands within one semester of the critical path floor for every track in the dataset, though it produces uneven loads: the sample plan runs 16, 12, 16, 16, 16, 12 rather than balancing at a flat 15.

## Validation

Economics & Computer Science with default choices resolves to exactly **128 credits**, which is NYU's stated degree total. That number is not hardcoded anywhere; it falls out of the tree.

Every configuration is checked for the same invariants: no course is ever scheduled before its prerequisites, no semester exceeds its credit cap, and no choice leaks courses from the branch that was not selected.

## Data

Requirements transcribed from the [NYU Bulletin](https://bulletins.nyu.edu/courses/csci_ua/), the [Courant course sequence pages](https://cs.nyu.edu/dynamic/undergraduates/cs-major/course-sequence/), and the [CAS Core Curriculum](https://cas.nyu.edu/core/about-the-program/the-five-parts-of-the-core.html). Four degrees are modeled: Computer Science BA, Computer Science & Mathematics, Economics BA, and Economics & Computer Science.

Verify against Albert before registering. Core exemption policy in particular varies by advisor and catalogue year; the `EXEMPTIONS` table in `data.js` is deliberately conservative and meant to be edited.

## Running it

```
git clone https://github.com/<you>/prereq.git
cd prereq
open index.html
```

That's it. No build step, no server, no dependencies.

## Extending the catalog

Courses live in `COURSES` at the top of `data.js`:

```js
'CSCI-UA 310': {name:'Basic Algorithms', credits:4, prereqs:['CSCI-UA 102','MATH-UA 120']},
```

Degrees are trees in `DEGREES`. Add a course, reference it from a tree, and the graph rebuilds itself including any transitive prerequisites you did not list explicitly. If the course is one of several alternatives a student picks between, mark it `gated:true`.
