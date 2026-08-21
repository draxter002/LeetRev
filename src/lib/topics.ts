export const TOPICS = [
  "Arrays and Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Heap/Priority Queue",
  "Backtracking",
  "Tries",
  "Graph",
  "Advanced Graph",
  "1D DP",
  "2D DP",
  "Greedy",
  "Intervals",
  "Math and Geometry",
  "Bit Manipulation",
  "LeetCode Fetched",
] as const;

export type Topic = (typeof TOPICS)[number];
