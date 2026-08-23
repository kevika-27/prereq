# Prereq

A course planner that models the NYU Courant catalog as a directed acyclic graph, then computes the shortest valid path to a degree.

No dependencies, no build step, no graph libraries. Every algorithm is implemented from scratch.

<!-- Once deployed, replace the line below with your GitHub Pages URL, and add screenshot.png to the repo root to make the image appear. -->

**Live demo:** _not deployed yet_

## The problem

Course prerequisites form a dependency graph, but every tool students actually use presents them as a flat list. That hides the two things that matter: which courses are unblocked right now, and which chain of dependencies sets the real floor on how fast you can graduate.

Taking Data Structures a semester late doesn't cost you one semester. It costs you every semester of everything downstream of it.

## What it does

- **Marks what's available now.** Tick off completed courses and the graph recolors to show exactly which courses have all prerequisites satisfied.
- **Generates a semester plan.** Greedy scheduling over the topological order, packed against a real credit budget. NYU requires 16 credits per semester and caps at 18 without an overload petition, and most CSCI-UA and MATH-UA courses are 4 credits.
- **Finds the critical path.** The longest dependency chain in the graph, which is the true minimum number of semesters regardless of how many courses you take at once.
- **Traces impact both directions.** Click any course to see every prerequisite behind it and everything it unlocks.
- **Detects circular prerequisites.** There's a button to inject an impossible loop into the catalog so you can watch the cycle detector find and report it.

## Algorithms

| | Implementation | Complexity |
|---|---|---|
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

## Data

Prerequisites transcribed from the [NYU Bulletin](https://bulletins.nyu.edu/courses/csci_ua/) and the [Courant course sequence pages](https://cs.nyu.edu/dynamic/undergraduates/cs-major/course-sequence/). Three tracks are modeled: Computer Science BA, Computer Science & Mathematics, and Economics & Computer Science.

Verify against Albert before registering. Some 400-level elective prerequisites vary by term and instructor.

## Running it

```
git clone https://github.com/<you>/prereq.git
cd prereq
open index.html
```

That's it. Single file, no server needed.

## Extending the catalog

Courses live in the `CATALOG` object at the top of the script:

```js
'CSCI-UA 310': {name:'Basic Algorithms', prereqs:['CSCI-UA 102','MATH-UA 120'], credits:4},
```

`credits` defaults to 4 if you leave it off.

Add an entry, list its prerequisites, and add the code to a track's `required` array. The graph rebuilds itself, including pulling in any transitive prerequisites you didn't explicitly list.
