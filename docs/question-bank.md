# AOU ICPC starter question bank

36 questions, with 12 at each knowledge level. Each has four choices, one correct answer, an explanation and a suggested time. There are six runnable Python code traces. Each level has three correct answers in each position A–D.

| Level | Intended audience | Focus | Time |
| --- | --- | --- | --- |
| Beginner | New programmers | Variables, conditions, loops, basic data structures and logic | 20–30 seconds |
| Intermediate | Students familiar with programming basics | Searching, sorting, recursion, graphs, prefix sums and two pointers | 30–45 seconds |
| Advanced | Students with algorithm practice | Correctness conditions, dynamic programming, complexity and multi-step reasoning | 45–60 seconds |

These levels and timers are editorial starting points, not empirically calibrated ratings. Hosts can adjust them for their audience. Advanced is relative to an orientation quiz, not ICPC World Finals difficulty.

The default bank replaces the old placeholders, unverified community trivia and ambiguous questions. Saved custom banks are preserved: **Add starter questions** appends missing starter IDs. Existing questions without a level appear as **Unrated**. Existing contests retain their question snapshots. Use the level filter in Questions or contest setup; selection actions apply to shown questions and retain selections outside the filter. The setup summary reports the selected count at every level.

## Answer-key references

Inspected on 2026-10-31. Questions and explanations are original wording; the references below support the relevant concepts. Numerical examples and the recurrence derivations were worked through independently; all six Python snippets were executed against their configured answers.

- [ICPC](https://icpc.global/): official contest name (beginner 1).
- [Python tutorial: introduction](https://docs.python.org/3/tutorial/introduction.html): assignment, numeric operations, indexing and Fibonacci basics (beginner 3, 6, 7; intermediate 12).
- [Python tutorial: control flow](https://docs.python.org/3/tutorial/controlflow.html): conditions, ranges and functions (beginner 4–5; intermediate 8).
- [Python tutorial: data structures](https://docs.python.org/3/tutorial/datastructures.html): stacks, queues and sets (beginner 9–10; intermediate 4).
- [Binary search](https://cp-algorithms.com/num_methods/binary_search.html): sorted search, logarithmic steps and monotone predicates (intermediate 1–2; advanced 7).
- [Breadth-first search](https://cp-algorithms.com/graph/breadth-first-search.html): shortest paths by edge count and adjacency-list traversal (intermediate 5, 9).
- [Dijkstra](https://cp-algorithms.com/graph/dijkstra.html) and [Bellman–Ford](https://cp-algorithms.com/graph/bellman_ford.html): precise weight and cycle assumptions (advanced 1–2).
- [Topological ordering](https://cp-algorithms.com/graph/topological-sort.html): existence exactly for directed acyclic graphs (advanced 3).
- [Kruskal with disjoint sets](https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html): component/cycle check (advanced 4).
- [0/1 knapsack](https://cp-algorithms.com/dynamic_programming/knapsack.html): descending capacity updates for one-use items (advanced 5, 12).

## Question and answer index

The editable source is `src/data/questions.ts`. Full prompts, choices, snippets and explanations can be previewed in the admin question bank.

### Beginner

- **beginner-01 · 20s · About ICPC** — What does ICPC stand for? Answer: **B. International Collegiate Programming Contest**
- **beginner-02 · 20s · Problem solving** — Which description best matches an algorithm? Answer: **A. A step-by-step method for solving a problem**
- **beginner-03 · 25s · Variables** — Trace the variable update: what does this Python code print? Answer: **D. 8**
- **beginner-04 · 25s · Conditions** — Follow the condition: what does this Python code print? Answer: **C. Retry**
- **beginner-05 · 30s · Loops** — Trace the loop: what does this Python code print? Answer: **C. 10**
- **beginner-06 · 25s · Arrays** — Read the list index: what does this Python code print? Answer: **A. 9**
- **beginner-07 · 20s · Arithmetic** — What is the value of 17 % 5 for positive integers? Answer: **A. 2**
- **beginner-08 · 20s · Logic** — When is the Boolean expression A AND B true? Answer: **D. Only when both A and B are true**
- **beginner-09 · 20s · Data structures** — Which data structure removes the most recently added item first? Answer: **B. Stack**
- **beginner-10 · 20s · Data structures** — A queue receives Ada, then Omar, then Lina. Who leaves first in a FIFO queue? Answer: **C. Ada**
- **beginner-11 · 25s · Number systems** — What is the decimal value of the binary number 101? Answer: **D. 5**
- **beginner-12 · 20s · Problem solving** — What is the main purpose of debugging? Answer: **B. To find and fix errors in a program**

### Intermediate

- **intermediate-01 · 30s · Searching** — Before standard binary search can reliably find a value in an array, what must be true? Answer: **C. The array is sorted using the same comparison as the search**
- **intermediate-02 · 30s · Complexity** — What is the tight worst-case time complexity of standard binary search on a sorted array of n elements? Answer: **A. Θ(log n)**
- **intermediate-03 · 30s · Sorting** — What is the tight worst-case time complexity of standard merge sort on n elements? Answer: **D. Θ(n log n)**
- **intermediate-04 · 30s · Sets** — Count distinct values: what does this Python code print? Answer: **B. 3**
- **intermediate-05 · 35s · Graphs** — Which traversal visits vertices in increasing distance, measured in edges, from a source in an unweighted graph? Answer: **C. Breadth-first search (BFS)**
- **intermediate-06 · 45s · Prefix sums** — Let prefix[k] be the sum of the first k array elements, with prefix[0] = 0. Which expression gives the sum from zero-based index l through r, inclusive? Answer: **B. prefix[r + 1] - prefix[l]**
- **intermediate-07 · 35s · Number theory** — What is the greatest common divisor (GCD) of 48 and 18? Answer: **D. 6**
- **intermediate-08 · 45s · Recursion** — Trace the recursive calls: what does this Python code print? Answer: **A. 6**
- **intermediate-09 · 35s · Graphs** — For a graph with V vertices and E edges, how much space does a standard adjacency-list representation use? Answer: **C. Θ(V + E)**
- **intermediate-10 · 35s · Trees** — Which traversal lists the keys of a binary search tree with distinct keys in increasing order? Answer: **A. In-order (left, root, right)**
- **intermediate-11 · 40s · Two pointers** — Two pointers start at opposite ends of an ascending sorted array. If their sum is smaller than a target, which move is used to keep searching for a pair with that target sum? Answer: **D. Move the left pointer right**
- **intermediate-12 · 35s · Recurrences** — Given F(0) = 0, F(1) = 1 and F(n) = F(n−1) + F(n−2), what is F(6)? Answer: **B. 8**

### Advanced

- **advanced-01 · 45s · Shortest paths** — Which edge-weight condition guarantees the correctness of standard Dijkstra’s algorithm on a general weighted graph? Answer: **D. All edge weights are non-negative**
- **advanced-02 · 45s · Shortest paths** — Which algorithm is guaranteed to find single-source shortest paths when edges may be negative but no negative cycle is reachable from the source? Answer: **C. Bellman–Ford**
- **advanced-03 · 45s · Graphs** — A directed graph has a topological ordering if and only if it has which property? Answer: **B. It has no directed cycle**
- **advanced-04 · 45s · Minimum spanning trees** — While building a minimum spanning tree with Kruskal’s algorithm, an edge’s endpoints are already in the same disjoint-set component. What should happen? Answer: **A. Skip the edge because it would create a cycle**
- **advanced-05 · 60s · Dynamic programming** — In the standard one-dimensional DP for 0/1 knapsack, each positive-weight item may be used once. In what order should capacities be updated for each item? Answer: **D. Descending, from capacity to its weight**
- **advanced-06 · 60s · Complexity** — Let T(n) = 2T(n/2) + n for powers of two, with T(1) = 1. What is the tight asymptotic bound? Answer: **B. Θ(n log n)**
- **advanced-07 · 50s · Binary search on the answer** — A feasibility test is false below a threshold and true at or above it. Over integer candidates 1 through M, with at least one feasible candidate, how many test calls does binary search need in the worst case to find the first feasible candidate? Answer: **C. Θ(log M)**
- **advanced-08 · 45s · Trees** — An undirected forest has 10 vertices and 3 connected components. How many edges does it have? Answer: **A. 7**
- **advanced-09 · 60s · Sorting** — An inversion is a pair i < j with a[i] > a[j]. How many inversions are in [3, 1, 2, 5, 4]? Answer: **B. 3**
- **advanced-10 · 50s · Trees** — A binary tree has height h ≥ 0, measured as the number of edges on the longest root-to-leaf path. What is its maximum possible number of nodes? Answer: **C. 2^(h+1) − 1**
- **advanced-11 · 60s · Amortized analysis** — An initially empty dynamic array doubles its capacity whenever full. What is the amortized cost per append over n appends, assuming copying or writing an element costs constant time? Answer: **D. Θ(1)**
- **advanced-12 · 60s · Dynamic programming** — Each of three items can be taken at most once. Their (weight, value) pairs are (2, 3), (3, 4), (4, 5). With capacity 5, what is the maximum total value? Answer: **A. 7**
