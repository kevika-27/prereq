# Prereq

An NYU degree planner. It answers two questions: **what is the shortest path to graduate**, and **how many credits are left over for whatever you want**.

No dependencies, no build step, no graph libraries. Every algorithm is written from scratch.

<!-- After deploying, replace the line below with your GitHub Pages URL, and add screenshot.png to the repo root. -->

**Live demo:** _not deployed yet_

## The two numbers

A CAS degree is 128 credits. Your major and the Core account for some of them; the rest is yours. Nobody tells you which number is which, and it changes based on choices you make in your first year.

| Degree | Required | Free | That is |
|---|---|---|---|
| Economics BA | 96 cr | 32 cr | 8 free courses |
| Computer Science BA | 104 cr | 24 cr | 6 free courses |
| Computer Science & Mathematics BA | 108 cr | 20 cr | 5 free courses |
| Economics & Computer Science BA | 128 cr | **0 cr** | nothing |

The joint Economics and Computer Science major consumes the entire degree. Every course for four years is spoken for, unless you place out of the language requirement, which is worth 16 credits and buys back four free courses by itself.

That is what this is for. It is not visible on any bulletin page, and it falls out of the model rather than being asserted anywhere in the code.

The planner does not try to tell you *which* free courses to take. Enumerating every course at NYU is a different problem, and choosing them is the part you actually want to do yourself. It tells you how much room you have.

## Shortest path, and what limits it

The planner reports **why** the path is as long as it is:

- **Sequence-bound**: the dependency chain is the constraint. Taking more per term will not help, you are waiting on prerequisites.
- **Volume-bound**: you have slack in the sequence and the length is just credit count. A heavier term genuinely shortens it.

On every degree modelled here the critical path is 5 courses deep against 8 semesters, so all of them are volume-bound. The deepest chain is `MATH-UA 9 → 131 → 132 → statistics → econometrics`, and everything else schedules around it.

Terms alternate fall and spring, and a course is only placed in a term it is actually offered. That matters: `CSCI-UA 421` is spring-only, so a prerequisite finishing in spring costs a full year rather than a semester.

## The problem underneath

A degree is not a list of courses. It is a tree with three kinds of node: things you must all do, things where you pick one, and things where you pick some number from a pool. Only once every choice is decided does it become a graph you can schedule.

Every planning tool students use flattens that structure away, which hides which courses are unblocked now, which chain sets the real floor on graduation, and what a choice like Calculus versus Math for Economics costs downstream.

Taking Data Structures a semester late does not cost you one semester. It costs you every semester of everything behind it.

## Architecture

Four files, four layers, deliberately separated.

| File | Layer | Knows about |
|---|---|---|
| `data.js` | Catalogue, degree trees, exemption rules | NYU policy only |
| `engine.js` | Resolver and graph algorithms | Structure only, no NYU specifics |
| `index.html` | Interface | Neither, it renders what the engine returns |
| `scrape.py` | Bulletin scraper | Feeds `data.js` from the real catalogue |

Degree policy lives in the tree. Sequencing lives in the graph. The resolver is the only thing that touches both. Adding a degree means adding a tree to `data.js` and changing nothing else.

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

`G` is a group where every child is required. `CH` is an exclusive choice. `SL` is choose-k from a pool, used for major electives. `C` is a course leaf.

That mathematics fork is real policy, not a convenience: NYU explicitly forbids mixing or double counting between the calculus and Math for Economics sequences, and AP calculus credit cannot place you ahead in the latter.

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

### The greedy heuristic and where it fails

The packer sorts ready courses by how many downstream courses they unlock, so bottleneck courses get taken early, then fills the credit budget and keeps scanning past any course that would overflow it in case a lighter one further down still fits. Free electives fill whatever room is left, which is what turns a requirement list into a real schedule.

This is a heuristic, not optimal. Optimal packing under a hard capacity constraint is NP-hard, reducible from bin packing. In practice it lands within one semester of the critical path floor on every degree in the dataset.

## Validation

Economics & Computer Science with default choices resolves to exactly **128 credits**, NYU's stated degree total. That number is not hardcoded; it falls out of the tree.

Every configuration is checked for the same invariants: no course is scheduled before its prerequisites, no semester exceeds its credit cap, no course is placed in a term it is not offered, no choice leaks courses from the branch that was not selected, and required plus free credits always sum to the degree total.

## Data

Requirements transcribed from the [NYU Bulletin](https://bulletins.nyu.edu/courses/csci_ua/), the [Courant course sequence pages](https://cs.nyu.edu/dynamic/undergraduates/cs-major/course-sequence/), and the [CAS Core Curriculum](https://cas.nyu.edu/core/about-the-program/the-five-parts-of-the-core.html). Four degrees are modelled.

Verify against Albert before registering. Core exemption policy in particular varies by advisor and catalogue year; the `EXEMPTIONS` table in `data.js` is deliberately conservative and meant to be edited.

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
