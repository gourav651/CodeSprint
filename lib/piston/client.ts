import axios from "axios";

// Use env variable if set, otherwise fall back to the public Piston API
const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org";

// The execute endpoint differs between self-hosted (/api/v2/execute) and public API (/api/v2/piston/execute)
const IS_PUBLIC_API = PISTON_API_URL.includes("emkc.org");
const EXECUTE_PATH = IS_PUBLIC_API
  ? "/api/v2/piston/execute"
  : "/api/v2/execute";
const RUNTIMES_PATH = IS_PUBLIC_API
  ? "/api/v2/piston/runtimes"
  : "/api/v2/runtimes";

const pistonClient = axios.create({
  baseURL: PISTON_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout for code execution
});

// Map our language keys to Piston language names and versions
const LANGUAGE_CONFIG: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
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

/**
 * Execute code using the Piston API.
 * Unlike Judge0, Piston returns results synchronously — no polling needed.
 */
export async function executeCode(
  code: string,
  language: keyof typeof LANGUAGE_CONFIG,
  input?: string,
): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(", ")}`,
    );
  }

  try {
    console.log("Submitting to Piston:", {
      language,
      pistonLang: config.language,
      version: config.version,
      has_input: !!input,
    });

    const payload = {
      language: config.language,
      version: config.version,
      files: [
        {
          content: code,
        },
      ],
      stdin: input || "",
      compile_timeout: 3000, // Max limit is 3000ms by default
      run_timeout: 3000, // Max limit is 3000ms by default
    };

    console.log("PISTON_API_URL:", PISTON_API_URL);
    console.log("EXECUTE_PATH:", EXECUTE_PATH);
    console.log("FULL_URL:", `${PISTON_API_URL}${EXECUTE_PATH}`);
    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await pistonClient.post(EXECUTE_PATH, payload);
    const data = response.data;

    console.log("Piston raw response:", JSON.stringify(data, null, 2));

    // Map Piston response to our ExecutionResult format
    // Piston response shape: { language, version, run: { stdout, stderr, code, signal, output }, compile?: { ... } }
    const compileOutput = data.compile?.stderr || data.compile?.output || "";
    const runStdout = data.run?.stdout || "";
    const runStderr = data.run?.stderr || "";
    const exitCode = data.run?.code ?? 0;

    // Determine status
    let statusId: number;
    let statusDescription: string;

    if (data.compile && data.compile.code !== 0) {
      // Compilation error
      statusId = 6;
      statusDescription = "Compilation Error";
    } else if (
      data.run?.signal === "SIGKILL" ||
      data.run?.signal === "SIGXCPU"
    ) {
      // Time limit exceeded
      statusId = 5;
      statusDescription = "Time Limit Exceeded";
    } else if (exitCode !== 0) {
      // Runtime error
      statusId = 11;
      statusDescription = "Runtime Error";
    } else {
      // Accepted (ran successfully)
      statusId = 3;
      statusDescription = "Accepted";
    }

    return {
      status: {
        id: statusId,
        description: statusDescription,
      },
      stdout: runStdout,
      stderr: runStderr,
      compile_output: compileOutput || undefined,
      // Piston doesn't provide execution time/memory natively, but we can estimate
      time: undefined,
      memory: undefined,
    };
  } catch (error) {
    console.error("Piston execution error:", error);

    if (axios.isAxiosError(error)) {
      console.error("STATUS:", error.response?.status);
      console.error("RESPONSE:", error.response?.data);
      console.error("REQUEST URL:", error.config?.url);

      console.error("Piston error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Piston. Make sure Docker is running and the Piston container is started: docker start piston",
        );
      }
    }

    throw error;
  }
}

/**
 * List available runtimes in Piston.
 * Useful for debugging which languages are installed.
 */
export async function listRuntimes(): Promise<
  Array<{ language: string; version: string; aliases: string[] }>
> {
  const response = await pistonClient.get(RUNTIMES_PATH);
  return response.data;
}
