# Prereq

An NYU degree planner. It answers two questions: **what is the shortest path to graduate**, and **how many credits are left over for whatever you want**.

No dependencies, no build step, no graph libraries. Every algorithm is written from scratch.

<!-- After deploying, replace the line below with your GitHub Pages URL, and add screenshot.png to the repo root. -->

**Live demo:** _not deployed yet_

## The two numbers

A CAS degree is 128 credits. Your major and General Education account for some of them; the rest is yours. The Bulletin publishes each degree as a credit table, but the leftover is easy to miss, and it changes based on choices made in the first year.

| Degree | Required | Free | That is |
|---|---|---|---|
| Computer Science BA | 100 cr | 28 cr | 7 free courses |
| Economics and Computer Science BA | 128 cr | **0 cr** | nothing |

The joint major consumes the entire degree. The Bulletin's own table for Economics and Computer Science has no "Other Elective Credits" row at all, where the Computer Science table budgets 28. Four years of coursework are spoken for before you choose anything.

Two documented things move that number:

- **AP credit for introductory economics.** The Bulletin's 128-credit plan assumes you have it. Without AP or equivalent credit for Macroeconomics or Microeconomics, the degree takes **132 credits**. The planner reproduces this: choose "no AP credit" and the total shifts to 132 and the plan grows to nine semesters.
- **Language placement.** 16 credits at stake. Placing into intermediate buys back 8, testing out entirely buys back 16, which is the difference between zero free courses and four.

Neither number is stated anywhere as a number. Both fall out of the model rather than being asserted in the code.

The planner does not try to tell you *which* free courses to take. Enumerating every course at NYU is a different problem, and choosing them is the part you actually want to do yourself. It tells you how much room you have.

### Scope

Only degrees whose full Bulletin credit table has been transcribed are included. Adding another means copying its table, not estimating from a department page. Two degrees modelled completely is more useful than four modelled approximately, and a planner that is quietly wrong about credits is worse than one that covers less.

## Shortest path, and what limits it

The planner reports **why** the path is as long as it is:

- **Sequence-bound**: the dependency chain is the constraint. Taking more per term will not help, you are waiting on prerequisites.
- **Volume-bound**: you have slack in the sequence and the length is just credit count. A heavier term genuinely shortens it.

Both degrees here are volume-bound. On Economics and Computer Science the deepest chain is `CSCI-UA 101 → 102 → 310 → a 400-level elective`, four courses against eight semesters. The bottleneck is credit volume, not sequencing, which means a heavier term genuinely shortens the degree.

Which electives you pick changes this. Choosing Compiler Construction and Computer Networks pushes the critical path from 4 to 5, since they sit behind Computer Systems Organization and Operating Systems. The machine learning cluster leaves it at 4.

Terms alternate fall and spring, and a course is only placed in a term it is actually offered. `CSCI-UA 421` Numerical Computing is spring-only, and including it in the Computer Science major pushes the critical path to 6.

## The problem underneath

A degree is not a list of courses. It is a tree with three kinds of node: things you must all do, things where you pick one, and things where you pick some number from a pool. Only once every choice is decided does it become a graph you can schedule.

Every planning tool students use flattens that structure away, which hides which courses are unblocked now, which chain sets the real floor on graduation, and what a choice like Calculus versus Math for Economics costs downstream.

Taking Data Structures a semester late does not cost you one semester. It costs you every semester of everything behind it.

## Architecture

Four files, four layers, deliberately separated.

| File | Layer | Knows about |
|---|---|---|
| `data.js` | Catalogue and degree trees | NYU policy only |
| `engine.js` | Resolver and graph algorithms | Structure only, no NYU specifics |
| `index.html` | Interface | Neither, it renders what the engine returns |
| `scrape.py` | Bulletin scraper | Feeds `data.js` from the real catalogue |

Degree policy lives in the tree. Sequencing lives in the graph. The resolver is the only thing that touches both. Adding a degree means adding a tree to `data.js` and changing nothing else.

## The AND/OR tree

```js
G('Economics and Computer Science (BA)',
  GENED_ECONCS,
  G('Economics (32 credits)',
    CH('introecon', 'Introductory Economics', note, [
      OPT('AP credit for one, take the other',           C('ECON-UA 2')),
      OPT('No AP credit, take both (132-credit degree)', C('ECON-UA 1'), C('ECON-UA 2'))
    ]),
    C('ECON-UA 11'), C('ECON-UA 13'), C('ECON-UA 266'),
    CH('stats', 'Statistics requirement', note, [
      OPT('ECON-UA 20 Analytical Statistics',    C('ECON-UA 20')),
      OPT('MATH-UA 334 Mathematical Statistics', C('MATH-UA 334'))
    ]),
    SL('econ300', 'ECON300', 2),
    SL('econextra', 'ECON300', 1)),
  ...)
```

`G` is a group where every child is required. `CH` is an exclusive choice. `SL` is choose-k from a pool, used for major electives. `C` is a course leaf.

Every choice node is real policy, not a convenience. The Bulletin states plainly that the Calculus and Mathematics for Economics sequences are mutually exclusive and cannot be mixed. The statistics fork carries a consequence: taking `MATH-UA 334` instead of `ECON-UA 20` requires one additional economics elective. And General Education differs per degree, transcribed rather than inferred: Economics and Computer Science omits Societies and the Social Sciences because the economics requirement covers it, while Computer Science includes it.

### Scraping the Bulletin

`scrape.py` pulls the real catalogue off `bulletins.nyu.edu`, which runs on CourseLeaf and puts every course in a predictable block:

```
CSCI-UA 421  Numerical Computing  (4 Credits)
Typically offered Spring
Prerequisites: (CSCI-UA 102 with a Minimum Grade of C AND
                MATH-UA 120 with a Minimum Grade of C AND
                MATH-UA 121 OR MATH-UA 131)
```

```
python3 scrape.py              # the departments a CAS degree needs
python3 scrape.py --all        # every department at NYU
```

The interesting part is the prerequisite parser. `A AND B AND (C OR D)` becomes `[['A'], ['B'], ['C','D']]`, an AND of ORs, which is the general form of the gating described below. Deeply nested expressions get flattened, erring toward listing more alternatives rather than fewer: an extra alternative surfaces as a visible choice, a missing one produces a silently wrong plan.

Courses whose Bulletin entry omits a term come back as `offered: null`, recorded as unknown rather than guessed.

### Gated prerequisites

The subtle bug this design has to avoid: the catalogue lists every alternative prerequisite, so a naive graph build reinstates courses the student placed out of. Choosing "AP Computer Science credit" would still drag in CSCI-UA 2, because CSCI-UA 101's prerequisite list names it.

Courses controlled by a choice node are marked `gated`. When building the graph, a gated prerequisite is only a real edge if the resolved set actually contains it. That one filter keeps the tree authoritative over the catalogue.

## Algorithms

| | Implementation | Complexity |
|---|---|---|
| Tree resolution | Recursive walk of the AND/OR tree against a set of decisions, emitting a flat course list | O(nodes) |
| Minimum-credit resolution | Bottom-up DP: a group costs the sum of its children, a choice costs the cheapest option | O(nodes) |
| Topological sort | Kahn's algorithm with in-degree counting; depth gives each course its earliest possible semester | O(V + E) |
| Cycle detection | Iterative DFS with three-colour marking; a back edge into a grey node reconstructs the loop via parent pointers | O(V + E) |
| Critical path | Longest path in a DAG via DP, relaxing edges in topological order so one pass suffices | O(V + E) |
| Reachability | BFS run in both directions over the same adjacency lists | O(V + E) |
| Semester packing | Greedy over ready courses, prioritised by downstream unlock count, filled to a credit budget under a term-offering constraint | O(V·E) worst case |

### Why Kahn's rather than DFS

DFS-based topological sort gives a valid order but not depth. Kahn's algorithm processes courses in waves of satisfied prerequisites, and that wave number is exactly the earliest semester a course can be taken. The layout of the graph view falls straight out of the algorithm rather than needing a separate pass.

### A bug worth recording

Two requirements in the Economics major draw from the same elective pool: two 300-level theory electives, plus one additional economics elective. Unfilled slots were keyed by pool, so both generated a placeholder called `ECON300-open-1`, the set deduplicated them, and the degree came out 4 credits short of the Bulletin's 128.

Keying placeholders by the requirement's own id rather than the pool's fixes it. The bug was invisible in the interface and surfaced only because the total was being checked against a published number.

### The greedy heuristic and where it fails

The packer sorts ready courses by how many downstream courses they unlock, so bottleneck courses get taken early, then fills the credit budget and keeps scanning past any course that would overflow it in case a lighter one further down still fits. Free electives fill whatever room is left, which is what turns a requirement list into a real schedule.

This is a heuristic, not optimal. Optimal packing under a hard capacity constraint is NP-hard, reducible from bin packing. In practice it lands within one semester of the critical path floor on every degree in the dataset.

## Validation

The model is checked against the Bulletin's published totals rather than against itself:

| Check | Bulletin | Model |
|---|---|---|
| Economics and Computer Science | 44 gen ed + 84 major = 128, no free electives | 128 required, 0 free |
| Computer Science | 48 gen ed + 52 major + 28 other elective credits = 128 | 100 required, 28 free |
| Econ and CS without AP econ credit | 132 credits | 132 credits |

Every configuration is additionally checked for the same invariants: no course is scheduled before its prerequisites, no semester exceeds its credit cap, no course is placed in a term it is not offered, no choice leaks courses from the branch that was not selected, and required plus free credits always sum to the degree total.

## Data

Degree requirements transcribed from the 2026-2027 NYU Bulletin program pages for [Economics and Computer Science (BA)](https://bulletins.nyu.edu/undergraduate/arts-science/programs/economics-computer-science-ba/) and [Computer Science (BA)](https://bulletins.nyu.edu/undergraduate/arts-science/programs/computer-science-ba/). Course prerequisites and term offerings for CSCI-UA come from the [Bulletin course pages](https://bulletins.nyu.edu/courses/csci_ua/).

MATH-UA and ECON-UA sequencing follows each degree's published Sample Plan of Study, which is the ordering NYU itself recommends. Running `scrape.py` replaces these with exact catalogue prerequisites.

Verify against Albert before registering. Requirements change between catalogue years, and elective substitutions are subject to advisor approval.

## Running it

```
git clone https://github.com/<you>/prereq.git
cd prereq
open index.html
```

No build step, no server, no dependencies.

## Extending the catalogue

Courses live in `COURSES` at the top of `data.js`:

```js
'CSCI-UA 310': {name:'Basic Algorithms', credits:4, offered:['fall','spring'],
                prereqs:['CSCI-UA 102','MATH-UA 120','MATH-UA 121','MATH-UA 131']},
```

Degrees are trees in `DEGREES`. Add a course, reference it from a tree, and the graph rebuilds itself including any transitive prerequisites you did not list. If the course is one of several alternatives a student picks between, mark it `gated:true`.

To add a degree, copy its Bulletin credit table into a tree and set `totalCredits`. If the model's required-plus-free figure does not match the table's total, the transcription is wrong somewhere.
