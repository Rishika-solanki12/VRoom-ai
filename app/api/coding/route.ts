import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

type TestCase = {
  input: string;
  expectedOutput: string;
};

type CodingProblem = {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  exampleInput: string;
  exampleOutput: string;
  constraints: string[];
  testCases: TestCase[];
};

type CodingRequest = {
  action?: string;
  language?: string;
  topic?: string;
  difficulty?: string;
  userRequest?: string;
  previousProblem?: string;

  problem?: {
    title?: string;
    statement?: string;
    inputFormat?: string;
    outputFormat?: string;
    exampleInput?: string;
    exampleOutput?: string;
    constraints?: string[];
    testCases?: TestCase[];
  };

  code?: string;
};

/*
==================================================
CODING PROBLEM VARIETY ENGINE
==================================================

The UI has broad topics, but each topic can contain
many different interview patterns.

This bank gives Gemini a concrete direction for each
generation instead of asking for a generic "problem".
The selected pattern changes on every generation.

The AI is still responsible for creating the actual
problem, input/output format and test cases.
*/

const VARIETY_BANK: Record<string, string[]> = {
  Basics: [
    "conditional decision making with multiple cases",
    "loop-based simulation",
    "digit or number property",
    "mathematical pattern with an input range",
    "validation with several conditions",
    "small state-tracking problem",
    "frequency/counting using basic loops",
    "real-world calculation with edge cases",
  ],

  Arrays: [
    "frequency counting in an array",
    "first duplicate or repeated value",
    "two-value target/pair search",
    "two-pointer array transformation",
    "prefix-sum based range or subarray query",
    "sliding-window based subarray problem",
    "in-place array transformation",
    "array rotation or rearrangement",
    "merge or compare two arrays",
    "missing or extra value detection",
    "majority/frequent element reasoning",
    "best contiguous segment or subarray",
    "stock-style buy/sell optimization",
    "deduplication while preserving an order rule",
    "real-world array data processing",
  ],

  Strings: [
    "character frequency analysis",
    "first unique or repeated character",
    "anagram-style comparison",
    "palindrome with a meaningful constraint",
    "longest valid substring",
    "two-pointer string processing",
    "string compression or encoding",
    "word-level parsing",
    "reordering words or tokens",
    "pattern matching with simple rules",
    "case/character normalization with edge cases",
    "real-world text processing",
  ],

  Functions: [
    "function-based numeric transformation",
    "function composition",
    "validation helper function",
    "recursive function",
    "array-processing helper functions",
    "string-processing helper functions",
    "pure-function design problem",
    "small reusable utility with edge cases",
  ],

  OOP: [
    "class representing a real-world entity",
    "encapsulation with state updates",
    "class with validation rules",
    "multiple objects and aggregation",
    "method behavior driven by commands",
    "simple inheritance or polymorphism",
    "object state simulation",
    "small interview-style class design",
  ],

  Searching: [
    "binary search for a target",
    "first occurrence in sorted data",
    "last occurrence in sorted data",
    "search insertion position",
    "search in rotated sorted data",
    "search for a boundary/threshold",
    "minimum valid value using binary search",
    "search over a monotonic condition",
    "real-world lookup problem",
  ],

  Sorting: [
    "sort records by a custom key",
    "sort by frequency then tie-break",
    "merge sorted data",
    "interval sorting and merging",
    "sort and detect duplicates",
    "sort to construct a required arrangement",
    "custom comparator problem",
    "sorting-based greedy decision",
    "order records under multiple rules",
    "real-world ranking/report generation",
  ],

  "Linked List": [
    "reverse a linked list",
    "find middle node",
    "detect a cycle",
    "merge two sorted linked lists",
    "remove a node under a position rule",
    "find intersection of linked lists",
    "rearrange nodes by a condition",
    "palindrome linked list",
  ],

  "Stack & Queue": [
    "balanced delimiters",
    "next greater element",
    "monotonic stack problem",
    "minimum/maximum tracking stack",
    "queue-based simulation",
    "queue using two stacks",
    "stack-based expression processing",
    "real-world task queue simulation",
  ],

  Trees: [
    "tree traversal",
    "tree depth or height",
    "level-order processing",
    "validate binary search tree",
    "find a path or ancestor",
    "count nodes satisfying a property",
    "tree serialization-style processing",
    "real-world hierarchy processing",
  ],

  Graphs: [
    "BFS shortest path in an unweighted graph",
    "DFS connected components",
    "grid island/region traversal",
    "reachability",
    "cycle detection",
    "dependency ordering",
    "multi-source BFS",
    "real-world network connectivity",
  ],

  "Dynamic Programming": [
    "one-dimensional state DP",
    "choose-or-skip optimization",
    "minimum-cost path",
    "count number of valid ways",
    "knapsack-style selection",
    "subsequence optimization",
    "grid path DP",
    "state transition with constraints",
  ],

  Hashing: [
    "frequency map",
    "two-sum style lookup",
    "group equivalent values",
    "duplicate detection",
    "prefix-state lookup",
    "longest range using a hash set",
    "record matching between datasets",
    "real-world ID/log processing",
  ],

  "Recursion & Backtracking": [
    "generate valid combinations",
    "generate permutations",
    "subset exploration",
    "constraint-based search",
    "recursive tree traversal",
    "small maze/path exploration",
    "partitioning problem",
  ],

  "Two Pointers": [
    "pair search in sorted data",
    "remove duplicates in place",
    "partition values by a condition",
    "compare from both ends",
    "container/interval style optimization",
    "merge two ordered sequences",
  ],

  "Sliding Window": [
    "longest valid window",
    "minimum window satisfying a condition",
    "fixed-size window aggregation",
    "distinct-element window",
    "maximum/minimum window score",
    "real-world stream window",
  ],

  "Prefix Sum": [
    "range sum queries",
    "subarray target sum",
    "balance point/pivot index",
    "difference-array style updates",
    "count ranges satisfying a condition",
  ],

  Greedy: [
    "interval scheduling",
    "minimum number of resources",
    "maximize value under a local choice rule",
    "activity selection",
    "reachability with greedy choices",
    "cost minimization",
  ],

  "Heap / Priority Queue": [
    "top K elements",
    "Kth largest/smallest",
    "merge multiple sorted sequences",
    "priority-based simulation",
    "running median style problem",
    "resource scheduling",
  ],

  Matrix: [
    "matrix traversal",
    "spiral traversal",
    "row/column transformation",
    "grid region processing",
    "shortest path in a grid",
    "matrix prefix sums",
    "real-world grid data processing",
  ],

  Intervals: [
    "merge overlapping intervals",
    "insert an interval",
    "find overlapping intervals",
    "minimum resources for intervals",
    "interval scheduling",
    "timeline conflict detection",
  ],

  "Bit Manipulation": [
    "single/missing value using XOR",
    "bit counting",
    "set-bit based property",
    "bit mask filtering",
    "power-of-two reasoning",
  ],

  Tries: [
    "prefix lookup",
    "word insertion/search",
    "autocomplete-style prefix counting",
    "longest matching prefix",
  ],

  "Union Find": [
    "connected components",
    "dynamic connectivity",
    "cycle detection",
    "group merging",
  ],
};

const INTERVIEW_SCENARIOS = [
  "no scenario; ask the algorithm directly",
  "a simple array or string task",
  "a small input-processing task",
  "a concise interview-style data problem",
  "a small practical example only if it makes the requirement clearer",
];

const INTERVIEW_STYLES = [
  "direct standard coding interview question",
  "classic algorithm/data-structure question",
  "short reasoning-focused interview question",
  "implementation-focused interview question",
  "edge-case-focused interview question",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getVarietyPlan(topic: string) {
  const patterns =
    VARIETY_BANK[topic] ||
    VARIETY_BANK["Arrays"];

  return {
    pattern: pick(patterns),
    scenario: pick(INTERVIEW_SCENARIOS),
    style: pick(INTERVIEW_STYLES),
  };
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");

      if (start !== -1 && end !== -1) {
        try {
          return JSON.parse(
            cleaned.slice(start, end + 1)
          );
        } catch {
          throw new Error(
            "AI returned invalid JSON."
          );
        }
      }

      throw new Error(
        "AI returned an invalid JSON response."
      );
    }
  }
}

function validateTestCases(
  testCases: unknown
): testCases is TestCase[] {
  if (!Array.isArray(testCases)) {
    return false;
  }

  if (testCases.length < 3 || testCases.length > 5) {
    return false;
  }

  return testCases.every(
    (testCase) =>
      testCase &&
      typeof testCase === "object" &&
      typeof (testCase as TestCase).input ===
        "string" &&
      typeof (testCase as TestCase)
        .expectedOutput === "string" &&
      (testCase as TestCase).input.trim().length > 0 &&
      (testCase as TestCase)
        .expectedOutput.trim().length > 0
  );
}

function validateProblem(
  problem: any
): problem is CodingProblem {
  if (!problem || typeof problem !== "object") {
    return false;
  }

  if (
    typeof problem.title !== "string" ||
    !problem.title.trim()
  ) {
    return false;
  }

  if (
    typeof problem.statement !== "string" ||
    !problem.statement.trim()
  ) {
    return false;
  }

  if (
    typeof problem.inputFormat !== "string" ||
    !problem.inputFormat.trim()
  ) {
    return false;
  }

  if (
    typeof problem.outputFormat !== "string" ||
    !problem.outputFormat.trim()
  ) {
    return false;
  }

  if (
    typeof problem.exampleInput !== "string" ||
    !problem.exampleInput.trim()
  ) {
    return false;
  }

  if (
    typeof problem.exampleOutput !== "string" ||
    !problem.exampleOutput.trim()
  ) {
    return false;
  }

  if (
    !Array.isArray(problem.constraints) ||
    problem.constraints.length === 0
  ) {
    return false;
  }

  if (!validateTestCases(problem.testCases)) {
    return false;
  }

  return true;
}

async function generateCodingProblem(
  ai: GoogleGenAI,
  language: string,
  topic: string,
  difficulty: string,
  userRequest: string,
  previousProblem: string
): Promise<CodingProblem> {
  const varietyPlan = getVarietyPlan(topic);

  const prompt = `
You are VRoom AI, an expert coding-interview practice engine.

Your job is to create EXACTLY ONE high-quality coding
problem for the student.

==================================================
STUDENT SETTINGS
==================================================

Programming language:
${language}

Selected topic:
${topic}

Difficulty:
${difficulty}

Student request:
${userRequest || "Give me a coding problem to practice."}

Previous problem:
${previousProblem || "None"}

==================================================
PROBLEM VARIETY ENGINE
==================================================

For this generation, use this internal target:

Core algorithmic pattern:
${varietyPlan.pattern}

Possible interview scenario:
${varietyPlan.scenario}

Question style:
${varietyPlan.style}

These are generation directions, NOT text that must
appear literally in the final problem.

For most generations, produce a DIRECT algorithmic question
with little or no story. Use a practical scenario only when it
adds genuine value.

IMPORTANT:

- Use the selected pattern as the main idea.
- If the student's explicit request clearly asks for
  another concept, follow the student's request.
- Never force a pattern that conflicts with the topic.
- Do not reveal this internal variety plan to the student.

==================================================
ANTI-REPETITION RULE
==================================================

The previous problem is provided above.

Do NOT repeat:

- the same exact question
- the same title with different numbers
- the same story with different names
- the same algorithmic pattern
- the same core solution approach
- the same input/output template
- the same sequence of steps
- a trivial rewording of the previous problem

If the previous problem used a common pattern such as
Two Sum, do not make another Two Sum variant.

If the previous problem was "find maximum", do not simply
change it to "find minimum".

If the previous problem used frequency counting, choose
a meaningfully different approach.

The student wants a LARGE VARIETY of interview practice.

==================================================
INTERVIEW-QUALITY RULES
==================================================

This must feel like a real coding interview question,
not a random school exercise.

Easy:
- suitable for a beginner interview round
- usually solvable in about 10-15 minutes
- requires actual reasoning, not only one arithmetic
  operation
- include at least one meaningful edge case

Medium:
- common interview pattern
- usually requires multiple reasoning steps
- approximately 15-30 minutes
- correctness and complexity matter

Hard:
- advanced interview problem
- optimization or deeper reasoning required
- meaningful edge cases
- approximately 30-45 minutes

Do not make every question advanced just for variety.
Classic beginner interview questions ARE allowed when they
match the selected difficulty and topic. For example, palindrome,
Fibonacci, prime checking, reverse string, second largest,
frequency counting, binary search and basic sorting are valid
practice questions.

However, do not generate the exact same classic question repeatedly.
Vary the concept, constraints, required output, edge cases and
algorithmic pattern.

Do not make a problem artificially complicated with a business story.
The difficulty must come from the coding/algorithmic reasoning.

==================================================
QUESTION STYLE / STORY RULE
==================================================

PRIORITY: Prefer a clean, direct coding-interview question.

The student wants the kind of questions commonly used for
programming practice and entry-level/intermediate interviews:

- palindrome
- anagram
- Fibonacci
- factorial
- prime number
- reverse string/number
- character frequency
- arrays and subarrays
- duplicate/missing values
- two sum / pair search
- searching and binary search
- sorting and custom ordering
- two pointers
- sliding window
- stack and queue
- linked list
- trees and graphs
- recursion/backtracking
- dynamic programming
- other standard DSA patterns

A real-world context is OPTIONAL, not required.

Do NOT invent an industrial/corporate story merely to make
a basic algorithm look sophisticated. Avoid unnecessary phrases
such as industrial IoT monitoring system, enterprise analytics
pipeline, network latency, distributed infrastructure, or
corporate workflow unless the scenario is genuinely necessary
to understand the algorithm.

For example, prefer:

"Given an array of integers, find the first duplicate value."

over:

"An industrial IoT monitoring platform receives a distributed
stream of sensor events and must identify the first repeated
sensor identifier..."

The algorithmic task must be obvious within the first sentence
or two. Keep the statement concise and natural.

==================================================
PROBLEM STATEMENT QUALITY
==================================================

- The title should describe the coding task, not a fictional
  company or system.
- The first sentence should state exactly what the programmer
  must calculate, find, check, count, transform or return.
- Keep story/context to 0-2 short sentences when it is useful.
- Never use a story to disguise a simple standard algorithm.
- Do not use unnecessarily technical corporate vocabulary.
- The question should look natural on a coding-practice platform.

==================================================
INPUT / OUTPUT RULES
==================================================

1. The problem must be completely self-contained.

2. Clearly define INPUT FORMAT.

3. Clearly define OUTPUT FORMAT.

4. Give clear constraints.

5. Give one valid example input and matching output.

6. Create exactly 3 to 5 independent test cases.

7. Every test case MUST follow the exact input format.

8. Every expectedOutput MUST be independently correct
   for its own input.

9. Include normal cases and useful edge cases.

10. Do NOT use JSON/list notation as input unless the
    problem explicitly defines that format.

11. If the input format says:

    First line contains n.
    Second line contains n integers.

    then a valid test case must look like:

    5
    3 7 2 9 4


==================================================
JUDGE0 / STANDARD INPUT RULE
==================================================

The VRoom AI editor executes programs using Judge0 with
standard input (stdin). Therefore every generated solution
and every solution shown by Get Hint MUST use standard input
only.

NEVER write interactive input prompts such as:

input("Enter your name: ")
input("Enter a number: ")
input("Enter the array: ")

NEVER print prompts such as:

print("Enter your name:")
print("Enter a number:")

The program must read only the raw values supplied through
the Test Input box, using forms such as:

input()
sys.stdin.readline()
sys.stdin.read()

The program output MUST contain only the answer required by
the Output Format. Do not add labels, prompts, greetings,
extra explanations, or decorative text to stdout.

Example:
If Test Input is:
abcde
edcba

then the program should directly read those two lines and
print only the required result, such as:
True

Do not make the program ask the user to type the values.

12. Never create a test case that contradicts
    the problem statement.

13. Never create expected output for a different input.

14. Make the problem solvable using only the statement,
    input format, output format, constraints and examples.

15. Keep the input practical for stdin execution.

==================================================
CODE EDITOR RULE
==================================================

DO NOT generate starter code.

DO NOT generate partial code.

DO NOT generate solution code.

The student writes the COMPLETE solution from
an empty editor.

==================================================
SELF-CHECK BEFORE RETURNING
==================================================

Verify all of the following:

A. Statement matches inputFormat.

B. exampleInput follows inputFormat.

C. exampleOutput matches exampleInput.

D. Every testCases[i].input follows inputFormat.

E. Every expectedOutput is correct for its own input.

F. Test cases are independent.

G. No test case contradicts the statement.

H. The problem matches the selected topic.

I. The problem matches the selected difficulty.

J. The problem is meaningfully different from the
   previous problem.

K. The problem is interview-relevant.

L. The problem is not merely a renamed/reworded
   version of a common previous question.

==================================================
RETURN ONLY VALID JSON
==================================================

Use exactly this structure:

{
  "title": "Problem title",
  "statement": "Complete problem statement",
  "inputFormat": "Exact input format",
  "outputFormat": "Exact output format",
  "exampleInput": "Example input",
  "exampleOutput": "Example output",
  "constraints": [
    "Constraint 1",
    "Constraint 2"
  ],
  "testCases": [
    {
      "input": "Test input 1",
      "expectedOutput": "Expected output 1"
    },
    {
      "input": "Test input 2",
      "expectedOutput": "Expected output 2"
    },
    {
      "input": "Test input 3",
      "expectedOutput": "Expected output 3"
    }
  ]
}

Return JSON only. No markdown. No explanation outside JSON.
`;

  const response =
    await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

  const text = response.text;

  if (!text) {
    throw new Error(
      "AI returned an empty response."
    );
  }

  const generatedProblem =
    extractJson(text);

  if (!validateProblem(generatedProblem)) {
    throw new Error(
      "AI generated an invalid coding problem."
    );
  }

  return generatedProblem;
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body =
      (await request.json()) as CodingRequest;

    const {
      action,
      language = "Python",
      topic = "Arrays",
      difficulty = "Easy",
      userRequest = "",
      previousProblem = "",
      problem,
      code = "",
    } = body;

    if (!action) {
      return NextResponse.json(
        {
          error:
            "AI action is required.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    // ==================================================
    // GENERATE / NEXT PROBLEM
    // ==================================================

    if (
      action === "generate" ||
      action === "next_problem"
    ) {
      let generatedProblem:
        | CodingProblem
        | null = null;

      let lastError = "";

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          generatedProblem =
            await generateCodingProblem(
              ai,
              language,
              topic,
              difficulty,
              userRequest,
              previousProblem
            );

          if (generatedProblem) {
            break;
          }
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Unknown generation error.";

          console.error(
            `Problem generation attempt ${attempt} failed:`,
            error
          );
        }
      }

      if (!generatedProblem) {
        return NextResponse.json(
          {
            error:
              "AI could not generate a consistent coding problem after multiple attempts.",
            details: lastError,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,

        problem: {
          ...generatedProblem,

          // The student writes the complete solution.
          starterCode: "",
        },
      });
    }

    // ==================================================
    // CURRENT PROBLEM INFORMATION
    // ==================================================

    const problemText = `
Problem Title:
${problem?.title || "Coding Problem"}

Problem:
${problem?.statement || ""}

Input Format:
${problem?.inputFormat || "Not provided"}

Output Format:
${problem?.outputFormat || "Not provided"}

Example Input:
${problem?.exampleInput || ""}

Example Output:
${problem?.exampleOutput || ""}

Constraints:
${
  problem?.constraints?.length
    ? problem.constraints.join("\n")
    : "Not provided"
}
`;

    // ==================================================
    // CALCULATE EXPECTED OUTPUT FOR A USER TEST INPUT
    // ==================================================

    if (action === "expected_output") {
      const testInput =
        typeof userRequest === "string"
          ? userRequest.trim()
          : "";

      if (!problem?.statement || !testInput) {
        return NextResponse.json(
          {
            error:
              "A complete problem and test input are required to calculate the expected output.",
          },
          { status: 400 }
        );
      }

      const matchingTestCase =
        Array.isArray(problem.testCases)
          ? problem.testCases.find(
              (testCase) =>
                typeof testCase?.input === "string" &&
                testCase.input.trim() === testInput &&
                typeof testCase?.expectedOutput === "string" &&
                testCase.expectedOutput.trim().length > 0
            )
          : null;

      if (matchingTestCase) {
        return NextResponse.json({
          success: true,
          expectedOutput:
            matchingTestCase.expectedOutput.trim(),
        });
      }

      const expectedOutputPrompt = `
You are the deterministic answer calculator for VRoom AI Coding Practice.

Your ONLY task is to calculate the correct output for the CURRENT coding problem
for the EXACT TEST INPUT provided below.

Programming language:
${language}

Topic:
${topic}

Difficulty:
${difficulty}

CURRENT PROBLEM
====================
Title:
${problem.title || ""}

Statement:
${problem.statement || ""}

Input Format:
${problem.inputFormat || ""}

Output Format:
${problem.outputFormat || ""}

Constraints:
${
  Array.isArray(problem.constraints)
    ? problem.constraints.join("\n")
    : ""
}

EXACT TEST INPUT
====================
${testInput}

STRICT RULES
====================
1. Solve the problem yourself. Do NOT assume the student's output is correct.
2. Follow the problem statement and input format exactly.
3. Calculate the output for ONLY the exact test input above.
4. Do not modify, reinterpret, or invent the input.
5. Do not provide code.
6. Do not provide an explanation.
7. Do not include labels such as "Output:", "Answer:", or "Result:".
8. Return ONLY the exact stdout that a correct program should print.
9. Preserve required line breaks and output ordering.
10. Do not add markdown fences.
11. Do not add quotes around plain output unless the problem itself requires quotes.
12. Never print interactive prompts or extra text.
13. If the output contains multiple lines, return all required lines exactly.
`;

      const expectedResponse =
        await ai.models.generateContent({
          model: MODEL,
          contents: expectedOutputPrompt,
        });

      const expectedOutput =
        expectedResponse.text?.trim();

      if (!expectedOutput) {
        return NextResponse.json(
          {
            error:
              "AI could not calculate the expected output for this input.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        expectedOutput,
      });
    }

    let instruction = "";

    // ==================================================
    // GET HINT
    // ==================================================

    switch (action) {
      case "hint":
        instruction = `
You are VRoom AI's coding coach.

The student clicked "Get Hint" for the CURRENT problem.

STRICT HINT MODE — THIS IS NOT A SOLUTION REQUEST:
- Give ONLY a short conceptual hint.
- Never provide executable code.
- Never provide a complete function or complete program.
- Never provide a complete pseudocode solution.
- Never reveal the final answer directly.
- Do not rewrite the student's code into a solution.
- Help the student identify the NEXT logical step.
- If the student already has code, point toward the relevant part or concept without fixing it for them.
- Keep the hint beginner-friendly and specific to the CURRENT problem.
- Prefer 2–4 short sentences.
- If a second hint is requested later, reveal one additional conceptual clue, but still do not provide code or the complete algorithm.
- Only provide code when the student explicitly asks for a solution/full code through an appropriate request.

Programming language: ${language}

CURRENT PROBLEM:
${problemText}

STUDENT CODE (may be empty):
${code || "No code written yet."}

Return ONLY the hint text.
`;
        break;

      // ==================================================
      // EXPLAIN
      // ==================================================

      case "explain":
        instruction = `
You are VRoom AI's coding teacher.

Explain the CURRENT problem clearly.

Explain:

1. What the problem asks.
2. What the input means.
3. What output is expected.
4. How to think about the problem.
5. A simple approach.
6. Important edge cases.
7. Useful programming concepts.

If student code is provided, also explain what
their code is doing.

Do not unnecessarily provide the complete solution
unless the student explicitly asks for it.
`;
        break;

      // ==================================================
      // REVIEW
      // ==================================================

      case "review":
        instruction = `
You are VRoom AI's coding reviewer.

Review the student's CURRENT code carefully.

Check:

1. Correctness
2. Bugs
3. Logic mistakes
4. Input handling
5. Output handling
6. Edge cases
7. Code quality
8. Time complexity
9. Space complexity
10. Possible improvements

Important:

- Do not say the code is wrong unless there is
  a real issue.
- Do not invent bugs.
- If the code is correct, clearly say what is correct.
- If the code is incomplete, explain exactly what
  is missing.
- If multiple valid approaches exist, acknowledge that.
- Do not falsely reject valid built-in functions.
`;
        break;

      // ==================================================
      // COMPLEXITY
      // ==================================================

      case "complexity":
        instruction = `
You are VRoom AI's computer science teacher.

Analyze the student's CURRENT code.

Explain:

1. Time complexity
2. Space complexity
3. Why that complexity occurs
4. Whether the approach can be improved

Use simple language.

Do not invent complexity information when the
code is incomplete.
`;
        break;

      // ==================================================
      // ASK AI
      // ==================================================

      case "ask":
        instruction = `
You are VRoom AI's personal coding teacher.

The student asked:

"${userRequest}"

Answer their coding-learning request naturally.

Keep your answer connected to the CURRENT problem
whenever relevant.

The student may ask things such as:

- "Fibonacci ka code sikhao"
- "Armstrong number samjhao"
- "Mujhe arrays practice karni hai"
- "Palindrome kaise banate hain?"
- "Recursion explain karo"
- "Mujhe easy question do"

If the student asks to LEARN a topic:

- Explain the concept simply.
- Give a small example.
- Give one practice problem if useful.
- Do not reveal a complete solution unless
  explicitly requested.

If the student asks about their CURRENT code:

- Analyze the provided code.
- Explain the relevant issue or concept.
- Do not invent problems.

Keep the teaching conversational and beginner-friendly.
`;
        break;

      default:
        return NextResponse.json(
          {
            error:
              `Unsupported AI action: ${action}`,
          },
          { status: 400 }
        );
    }

    // ==================================================
    // AI RESPONSE
    // ==================================================

    const prompt = `
${instruction}

Programming Language:
${language}

Topic:
${topic}

Difficulty:
${difficulty}

${problemText}

Student's Current Code:

\`\`\`${language}
${code || "(No code written yet)"}
\`\`\`

Respond directly to the student.
`;

    const response =
      await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

    const result = response.text;

    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI returned an empty response.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Coding API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while connecting to the coding AI.",
      },
      { status: 500 }
    );
  }
}
