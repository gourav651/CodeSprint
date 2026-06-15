import axios from "axios";

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

const judge0Client = axios.create({
  baseURL: JUDGE0_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": JUDGE0_API_KEY,
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  },
  timeout: 15000,
});

const LANGUAGE_CONFIG: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

export interface ExecutionResult {
  status: {
    id: number;
    description: string;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
}

const JUDGE0_STATUS_MAP: Record<number, string> = {
  1: "In Queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong Answer",
  5: "Time Limit Exceeded",
  6: "Compilation Error",
  7: "Runtime Error",
  8: "Runtime Error",
  9: "Memory Limit Exceeded",
  10: "Runtime Error",
  11: "Runtime Error",
  12: "Execution Timed Out",
};

async function pollSubmission(token: string): Promise<any> {
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await judge0Client.get(`/submissions/${token}`, {
      params: { base64_encoded: false, fields: "*" },
    });

    const statusId = data.status?.id;
    if (statusId && statusId > 2) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Submission timed out after polling");
}

export async function executeCode(
  code: string,
  language: keyof typeof LANGUAGE_CONFIG,
  input?: string
): Promise<ExecutionResult> {
  const languageId = LANGUAGE_CONFIG[language];

  if (!languageId) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(", ")}`
    );
  }

  try {
    console.log("Submitting to Judge0:", { language, languageId, has_input: !!input });

    const { data: submission } = await judge0Client.post(
      "/submissions",
      {
        source_code: code,
        language_id: languageId,
        stdin: input || "",
        cpu_time_limit: 3,
        memory_limit: 256000,
      },
      {
        params: { base64_encoded: false, fields: "*" },
      }
    );

    const token = submission.token;
    if (!token) {
      throw new Error("No submission token returned from Judge0");
    }

    const result = await pollSubmission(token);

    const statusId = result.status?.id ?? 11;
    const statusDescription = JUDGE0_STATUS_MAP[statusId] || "Unknown Error";

    return {
      status: {
        id: statusId,
        description: statusDescription,
      },
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compile_output: result.compile_output || undefined,
      time: result.time,
      memory: result.memory,
    };
  } catch (error) {
    console.error("Judge0 execution error:", error);

    if (axios.isAxiosError(error)) {
      console.error("STATUS:", error.response?.status);
      console.error("RESPONSE:", error.response?.data);

      if (error.response?.status === 429) {
        throw new Error(
          "Judge0 rate limit reached (50 requests/day on free plan). Try again tomorrow."
        );
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          "Judge0 API key invalid or missing. Check your JUDGE0_API_KEY environment variable."
        );
      }
    }

    throw error;
  }
}