import type { Question } from '../types/game';

// AOU ICPC starter bank: 12 questions per level, ordered from foundations to challenges.
// Answer-key references and calibration notes: docs/question-bank.md.
export const QUESTIONS: Question[] = [
  {
    "id": "beginner-01",
    "difficulty": "beginner",
    "text": "What does ICPC stand for?",
    "options": [
      "International Computer Programming Competition",
      "International Collegiate Programming Contest",
      "Intercollegiate Problem-solving Championship",
      "International Coding Practice Council"
    ],
    "correctIndex": 1,
    "timeLimit": 20,
    "category": "About ICPC",
    "explanation": "ICPC is the International Collegiate Programming Contest, a programming competition for university students."
  },
  {
    "id": "beginner-02",
    "difficulty": "beginner",
    "text": "Which description best matches an algorithm?",
    "options": [
      "A step-by-step method for solving a problem",
      "A specific programming language",
      "An error in a program",
      "A device that stores files"
    ],
    "correctIndex": 0,
    "timeLimit": 20,
    "category": "Problem solving",
    "explanation": "An algorithm describes the steps needed to solve a problem. The same algorithm can be implemented in different programming languages."
  },
  {
    "id": "beginner-03",
    "difficulty": "beginner",
    "text": "Trace the variable update: what does this Python code print?",
    "options": [
      "3",
      "5",
      "6",
      "8"
    ],
    "correctIndex": 3,
    "timeLimit": 25,
    "category": "Variables",
    "explanation": "The assignment updates x from 3 to 3 + 5, so the printed value is 8.",
    "type": "code",
    "code": "x = 3\nx = x + 5\nprint(x)",
    "codeLanguage": "python"
  },
  {
    "id": "beginner-04",
    "difficulty": "beginner",
    "text": "Follow the condition: what does this Python code print?",
    "options": [
      "Pass",
      "Fail",
      "Retry",
      "Nothing"
    ],
    "correctIndex": 2,
    "timeLimit": 25,
    "category": "Conditions",
    "explanation": "The comparison 7 >= 10 is false, so the else branch prints Retry.",
    "type": "code",
    "code": "score = 7\nif score >= 10:\n    print(\"Pass\")\nelse:\n    print(\"Retry\")",
    "codeLanguage": "python"
  },
  {
    "id": "beginner-05",
    "difficulty": "beginner",
    "text": "Trace the loop: what does this Python code print?",
    "options": [
      "3",
      "6",
      "10",
      "15"
    ],
    "correctIndex": 2,
    "timeLimit": 30,
    "category": "Loops",
    "explanation": "range(1, 5) produces 1, 2, 3 and 4. Their sum is 10; the endpoint 5 is excluded.",
    "type": "code",
    "code": "total = 0\nfor number in range(1, 5):\n    total += number\nprint(total)",
    "codeLanguage": "python"
  },
  {
    "id": "beginner-06",
    "difficulty": "beginner",
    "text": "Read the list index: what does this Python code print?",
    "options": [
      "9",
      "4",
      "7",
      "An index error"
    ],
    "correctIndex": 0,
    "timeLimit": 25,
    "category": "Arrays",
    "explanation": "Python lists start at index 0: index 0 contains 4, index 1 contains 9, and index 2 contains 7.",
    "type": "code",
    "code": "values = [4, 9, 7]\nprint(values[1])",
    "codeLanguage": "python"
  },
  {
    "id": "beginner-07",
    "difficulty": "beginner",
    "text": "What is the value of 17 % 5 for positive integers?",
    "options": [
      "2",
      "3",
      "5",
      "12"
    ],
    "correctIndex": 0,
    "timeLimit": 20,
    "category": "Arithmetic",
    "explanation": "The % operator gives the remainder. Since 17 = 3 × 5 + 2, the remainder is 2."
  },
  {
    "id": "beginner-08",
    "difficulty": "beginner",
    "text": "When is the Boolean expression A AND B true?",
    "options": [
      "Whenever A is true",
      "Whenever B is false",
      "When at least one of A or B is true",
      "Only when both A and B are true"
    ],
    "correctIndex": 3,
    "timeLimit": 20,
    "category": "Logic",
    "explanation": "AND requires both conditions to be true. If either condition is false, the whole expression is false."
  },
  {
    "id": "beginner-09",
    "difficulty": "beginner",
    "text": "Which data structure removes the most recently added item first?",
    "options": [
      "Queue",
      "Stack",
      "Sorted set",
      "Graph"
    ],
    "correctIndex": 1,
    "timeLimit": 20,
    "category": "Data structures",
    "explanation": "A stack follows last in, first out (LIFO), like a stack of plates: the last plate placed on top is the first one removed."
  },
  {
    "id": "beginner-10",
    "difficulty": "beginner",
    "text": "A queue receives Ada, then Omar, then Lina. Who leaves first in a FIFO queue?",
    "options": [
      "Lina",
      "Omar",
      "Ada",
      "Whoever has the shortest name"
    ],
    "correctIndex": 2,
    "timeLimit": 20,
    "category": "Data structures",
    "explanation": "FIFO means first in, first out. Ada entered before Omar and Lina, so Ada leaves first."
  },
  {
    "id": "beginner-11",
    "difficulty": "beginner",
    "text": "What is the decimal value of the binary number 101?",
    "options": [
      "3",
      "4",
      "6",
      "5"
    ],
    "correctIndex": 3,
    "timeLimit": 25,
    "category": "Number systems",
    "explanation": "The binary digits represent 4, 2 and 1. Thus 101 in binary is 1 × 4 + 0 × 2 + 1 × 1 = 5."
  },
  {
    "id": "beginner-12",
    "difficulty": "beginner",
    "text": "What is the main purpose of debugging?",
    "options": [
      "To make source code longer",
      "To find and fix errors in a program",
      "To replace every loop with recursion",
      "To translate every program into binary by hand"
    ],
    "correctIndex": 1,
    "timeLimit": 20,
    "category": "Problem solving",
    "explanation": "Debugging means investigating incorrect behavior, finding its cause and correcting it. A useful first step is reproducing the error with a small input."
  },
  {
    "id": "intermediate-01",
    "difficulty": "intermediate",
    "text": "Before standard binary search can reliably find a value in an array, what must be true?",
    "options": [
      "The array has an even length",
      "Every value is positive",
      "The array is sorted using the same comparison as the search",
      "The array has no duplicate values"
    ],
    "correctIndex": 2,
    "timeLimit": 30,
    "category": "Searching",
    "explanation": "Binary search uses the order of the values to discard one half. Duplicates and negative values are allowed; a consistent sorted order is required."
  },
  {
    "id": "intermediate-02",
    "difficulty": "intermediate",
    "text": "What is the tight worst-case time complexity of standard binary search on a sorted array of n elements?",
    "options": [
      "Θ(log n)",
      "Θ(n)",
      "Θ(n log n)",
      "Θ(n²)"
    ],
    "correctIndex": 0,
    "timeLimit": 30,
    "category": "Complexity",
    "explanation": "Each comparison reduces the remaining search interval by about half, so the number of comparisons grows logarithmically. Θ describes a tight asymptotic bound."
  },
  {
    "id": "intermediate-03",
    "difficulty": "intermediate",
    "text": "What is the tight worst-case time complexity of standard merge sort on n elements?",
    "options": [
      "Θ(n²)",
      "Θ(n)",
      "Θ(log n)",
      "Θ(n log n)"
    ],
    "correctIndex": 3,
    "timeLimit": 30,
    "category": "Sorting",
    "explanation": "Merge sort has about log₂ n levels of splitting. Merging processes a total of Θ(n) elements per level, giving Θ(n log n) overall."
  },
  {
    "id": "intermediate-04",
    "difficulty": "intermediate",
    "text": "Count distinct values: what does this Python code print?",
    "options": [
      "2",
      "3",
      "4",
      "5"
    ],
    "correctIndex": 1,
    "timeLimit": 30,
    "category": "Sets",
    "explanation": "A set keeps distinct values. The three different values here are 2, 3 and 5.",
    "type": "code",
    "code": "values = {2, 3, 2, 5, 3}\nprint(len(values))",
    "codeLanguage": "python"
  },
  {
    "id": "intermediate-05",
    "difficulty": "intermediate",
    "text": "Which traversal visits vertices in increasing distance, measured in edges, from a source in an unweighted graph?",
    "options": [
      "Depth-first search (DFS)",
      "In-order traversal",
      "Breadth-first search (BFS)",
      "Post-order traversal"
    ],
    "correctIndex": 2,
    "timeLimit": 35,
    "category": "Graphs",
    "explanation": "BFS explores all vertices one edge away, then two edges away, and so on. It therefore finds shortest paths by number of edges in an unweighted graph."
  },
  {
    "id": "intermediate-06",
    "difficulty": "intermediate",
    "text": "Let prefix[k] be the sum of the first k array elements, with prefix[0] = 0. Which expression gives the sum from zero-based index l through r, inclusive?",
    "options": [
      "prefix[r] - prefix[l]",
      "prefix[r + 1] - prefix[l]",
      "prefix[r + 1] + prefix[l]",
      "prefix[r] - prefix[l + 1]"
    ],
    "correctIndex": 1,
    "timeLimit": 45,
    "category": "Prefix sums",
    "explanation": "prefix[r + 1] includes all elements through r. Subtracting prefix[l] removes exactly the elements before l."
  },
  {
    "id": "intermediate-07",
    "difficulty": "intermediate",
    "text": "What is the greatest common divisor (GCD) of 48 and 18?",
    "options": [
      "3",
      "9",
      "12",
      "6"
    ],
    "correctIndex": 3,
    "timeLimit": 35,
    "category": "Number theory",
    "explanation": "Euclid’s algorithm gives gcd(48, 18) = gcd(18, 12) = gcd(12, 6) = 6."
  },
  {
    "id": "intermediate-08",
    "difficulty": "intermediate",
    "text": "Trace the recursive calls: what does this Python code print?",
    "options": [
      "6",
      "3",
      "4",
      "10"
    ],
    "correctIndex": 0,
    "timeLimit": 45,
    "category": "Recursion",
    "explanation": "sum_to(3) expands to 3 + 2 + 1 + 0, which is 6. The n == 0 branch stops the recursion.",
    "type": "code",
    "code": "def sum_to(n):\n    if n == 0:\n        return 0\n    return n + sum_to(n - 1)\n\nprint(sum_to(3))",
    "codeLanguage": "python"
  },
  {
    "id": "intermediate-09",
    "difficulty": "intermediate",
    "text": "For a graph with V vertices and E edges, how much space does a standard adjacency-list representation use?",
    "options": [
      "Θ(V²)",
      "Θ(E²)",
      "Θ(V + E)",
      "Θ(log V)"
    ],
    "correctIndex": 2,
    "timeLimit": 35,
    "category": "Graphs",
    "explanation": "There is one list per vertex and one stored entry per directed edge, or two per undirected edge. The total space is Θ(V + E)."
  },
  {
    "id": "intermediate-10",
    "difficulty": "intermediate",
    "text": "Which traversal lists the keys of a binary search tree with distinct keys in increasing order?",
    "options": [
      "In-order (left, root, right)",
      "Pre-order (root, left, right)",
      "Post-order (left, right, root)",
      "Level-order"
    ],
    "correctIndex": 0,
    "timeLimit": 35,
    "category": "Trees",
    "explanation": "All keys in the left subtree are smaller than the root and all keys in the right subtree are larger. Visiting left, root, then right produces increasing order."
  },
  {
    "id": "intermediate-11",
    "difficulty": "intermediate",
    "text": "Two pointers start at opposite ends of an ascending sorted array. If their sum is smaller than a target, which move is used to keep searching for a pair with that target sum?",
    "options": [
      "Move the right pointer left",
      "Move both pointers outward",
      "Stop: no pair can exist",
      "Move the left pointer right"
    ],
    "correctIndex": 3,
    "timeLimit": 40,
    "category": "Two pointers",
    "explanation": "Moving the left pointer right can increase the sum. With the current left value, moving the right pointer left can only keep the sum the same or make it smaller."
  },
  {
    "id": "intermediate-12",
    "difficulty": "intermediate",
    "text": "Given F(0) = 0, F(1) = 1 and F(n) = F(n−1) + F(n−2), what is F(6)?",
    "options": [
      "5",
      "8",
      "13",
      "21"
    ],
    "correctIndex": 1,
    "timeLimit": 35,
    "category": "Recurrences",
    "explanation": "The values from F(0) through F(6) are 0, 1, 1, 2, 3, 5, 8."
  },
  {
    "id": "advanced-01",
    "difficulty": "advanced",
    "text": "Which edge-weight condition guarantees the correctness of standard Dijkstra’s algorithm on a general weighted graph?",
    "options": [
      "All weights are distinct",
      "All weights are integers",
      "The graph has at least one negative edge",
      "All edge weights are non-negative"
    ],
    "correctIndex": 3,
    "timeLimit": 45,
    "category": "Shortest paths",
    "explanation": "Non-negative weights ensure that once the unsettled vertex with the smallest tentative distance is chosen, a later path cannot improve it. Negative edges can break that guarantee."
  },
  {
    "id": "advanced-02",
    "difficulty": "advanced",
    "text": "Which algorithm is guaranteed to find single-source shortest paths when edges may be negative but no negative cycle is reachable from the source?",
    "options": [
      "Standard Dijkstra",
      "Breadth-first search",
      "Bellman–Ford",
      "Kruskal"
    ],
    "correctIndex": 2,
    "timeLimit": 45,
    "category": "Shortest paths",
    "explanation": "Bellman–Ford repeatedly relaxes every edge and supports negative weights. Without a reachable negative cycle, V − 1 passes suffice for shortest paths to reachable vertices."
  },
  {
    "id": "advanced-03",
    "difficulty": "advanced",
    "text": "A directed graph has a topological ordering if and only if it has which property?",
    "options": [
      "Every vertex has the same in-degree",
      "It has no directed cycle",
      "It is connected when edge directions are ignored",
      "Every edge has a positive weight"
    ],
    "correctIndex": 1,
    "timeLimit": 45,
    "category": "Graphs",
    "explanation": "A topological order places every edge’s source before its destination. A directed cycle makes this impossible; every directed acyclic graph has such an ordering."
  },
  {
    "id": "advanced-04",
    "difficulty": "advanced",
    "text": "While building a minimum spanning tree with Kruskal’s algorithm, an edge’s endpoints are already in the same disjoint-set component. What should happen?",
    "options": [
      "Skip the edge because it would create a cycle",
      "Always add the edge because it is next in sorted order",
      "Restart the algorithm from the other endpoint",
      "Remove all previously selected edges"
    ],
    "correctIndex": 0,
    "timeLimit": 45,
    "category": "Minimum spanning trees",
    "explanation": "The endpoints are already joined by selected edges. Adding another edge between them would form a cycle, so Kruskal skips it."
  },
  {
    "id": "advanced-05",
    "difficulty": "advanced",
    "text": "In the standard one-dimensional DP for 0/1 knapsack, each positive-weight item may be used once. In what order should capacities be updated for each item?",
    "options": [
      "Ascending, from its weight to capacity",
      "In any order",
      "Only at the full capacity",
      "Descending, from capacity to its weight"
    ],
    "correctIndex": 3,
    "timeLimit": 60,
    "category": "Dynamic programming",
    "explanation": "Descending updates read smaller-capacity states from before the current item was processed. Ascending updates can reuse the same item more than once."
  },
  {
    "id": "advanced-06",
    "difficulty": "advanced",
    "text": "Let T(n) = 2T(n/2) + n for powers of two, with T(1) = 1. What is the tight asymptotic bound?",
    "options": [
      "Θ(n)",
      "Θ(n log n)",
      "Θ(n²)",
      "Θ(log n)"
    ],
    "correctIndex": 1,
    "timeLimit": 60,
    "category": "Complexity",
    "explanation": "There are log₂ n levels with total non-recursive work n per level, plus Θ(n) work at the leaves. Hence T(n) is Θ(n log n)."
  },
  {
    "id": "advanced-07",
    "difficulty": "advanced",
    "text": "A feasibility test is false below a threshold and true at or above it. Over integer candidates 1 through M, with at least one feasible candidate, how many test calls does binary search need in the worst case to find the first feasible candidate?",
    "options": [
      "Θ(M)",
      "Θ(M log M)",
      "Θ(log M)",
      "Θ(M²)"
    ],
    "correctIndex": 2,
    "timeLimit": 50,
    "category": "Binary search on the answer",
    "explanation": "The false-to-true transition is monotone. Binary search keeps the transition inside its search interval and roughly halves that interval on each test."
  },
  {
    "id": "advanced-08",
    "difficulty": "advanced",
    "text": "An undirected forest has 10 vertices and 3 connected components. How many edges does it have?",
    "options": [
      "7",
      "9",
      "10",
      "13"
    ],
    "correctIndex": 0,
    "timeLimit": 45,
    "category": "Trees",
    "explanation": "Each component is a tree with one fewer edge than vertices. Summing over 3 components gives 10 − 3 = 7 edges."
  },
  {
    "id": "advanced-09",
    "difficulty": "advanced",
    "text": "An inversion is a pair i < j with a[i] > a[j]. How many inversions are in [3, 1, 2, 5, 4]?",
    "options": [
      "2",
      "3",
      "4",
      "5"
    ],
    "correctIndex": 1,
    "timeLimit": 60,
    "category": "Sorting",
    "explanation": "The three inverted value pairs are (3, 1), (3, 2) and (5, 4). No other earlier value is larger than a later one."
  },
  {
    "id": "advanced-10",
    "difficulty": "advanced",
    "text": "A binary tree has height h ≥ 0, measured as the number of edges on the longest root-to-leaf path. What is its maximum possible number of nodes?",
    "options": [
      "2^h − 1",
      "2h + 1",
      "2^(h+1) − 1",
      "2^(h+1)"
    ],
    "correctIndex": 2,
    "timeLimit": 50,
    "category": "Trees",
    "explanation": "The levels are numbered 0 through h. Filling every level gives 1 + 2 + 4 + … + 2^h = 2^(h+1) − 1 nodes; height 0 means a single root."
  },
  {
    "id": "advanced-11",
    "difficulty": "advanced",
    "text": "An initially empty dynamic array doubles its capacity whenever full. What is the amortized cost per append over n appends, assuming copying or writing an element costs constant time?",
    "options": [
      "Θ(n)",
      "Θ(log n)",
      "Θ(n log n)",
      "Θ(1)"
    ],
    "correctIndex": 3,
    "timeLimit": 60,
    "category": "Amortized analysis",
    "explanation": "Although a resizing append may copy many elements, the total number copied across all doublings is a geometric sum bounded by Θ(n). Spreading total Θ(n) work over n appends gives Θ(1) per append."
  },
  {
    "id": "advanced-12",
    "difficulty": "advanced",
    "text": "Each of three items can be taken at most once. Their (weight, value) pairs are (2, 3), (3, 4), (4, 5). With capacity 5, what is the maximum total value?",
    "options": [
      "7",
      "8",
      "9",
      "12"
    ],
    "correctIndex": 0,
    "timeLimit": 60,
    "category": "Dynamic programming",
    "explanation": "Taking the items of weights 2 and 3 fills capacity 5 and yields value 3 + 4 = 7. The weight-4 item yields only 5, and it cannot fit with another item."
  }
];

export const MAX_POINTS_PER_QUESTION = 1000;
export const SPEED_BONUS_MAX = 500;
