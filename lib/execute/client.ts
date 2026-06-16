/**
 * Unified Code Execution Client
 *
 * Supports three backends selectable via EXECUTION_BACKEND env var:
 *   - "onlinecompiler" (RECOMMENDED): OnlineCompiler.io - free, no self-hosting needed
 *   - "piston": Self-hosted Piston via Docker (requires local Docker or compatible server)
 *   - "judge0": Judge0 CE (self-hosted or cloud)
 *
 * Environment variables:
 *   EXECUTION_BACKEND     = onlinecompiler | piston | judge0  (default: onlinecompiler)
 *   ONLINECOMPILER_API_KEY = <key>         (for onlinecompiler backend - get free at onlinecompiler.io)
 *   PISTON_API_URL        = http://<host>:2000                (for piston backend)
 *   JUDGE0_API_URL        = http://<host>:2358                (for judge0 backend)
 *   JUDGE0_API_KEY        = <key>                             (for judge0 backend)
 */
import axios, { AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

type Backend = "onlinecompiler" | "piston" | "judge0";

const BACKEND: Backend = (process.env.EXECUTION_BACKEND as Backend) || "onlinecompiler";

const ONLINECOMPILER_API_URL = "https://api.onlinecompiler.io";
const ONLINECOMPILER_API_KEY = process.env.ONLINECOMPILER_API_KEY || "";

const PISTON_API_URL =
  process.env.PISTON_API_URL || "http://127.0.0.1:2000";

const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "http://127.0.0.1:2358";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Language configs
// ---------------------------------------------------------------------------

const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
};

const JUDGE0_LANGUAGES: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

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

// OnlineCompiler.io language mappings
const ONLINECOMPILER_LANGUAGES: Record<string, string> = {
  javascript: "typescript-deno", // Deno runs both JS and TS
  python: "python-3.14",
  java: "openjdk-25",
  cpp: "g++-15",
};

// ---------------------------------------------------------------------------
// HTTP clients
// ---------------------------------------------------------------------------

function createOnlineCompilerClient(): AxiosInstance {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (ONLINECOMPILER_API_KEY) {
    headers["Authorization"] = ONLINECOMPILER_API_KEY;
  }
  return axios.create({
    baseURL: ONLINECOMPILER_API_URL,
    headers,
    timeout: 35000, // 35s to allow for 30s execution timeout
  });
}

function createPistonClient(): AxiosInstance {
  return axios.create({
    baseURL: PISTON_API_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });
}

function createJudge0Client(): AxiosInstance {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
    headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
  }
  return axios.create({
    baseURL: JUDGE0_API_URL,
    headers,
    timeout: 15000,
  });
}

// ---------------------------------------------------------------------------
// OnlineCompiler.io implementation
// ---------------------------------------------------------------------------

async function executeCodeOnlineCompiler(
  code: string,
  language: string,
  input?: string
): Promise<ExecutionResult> {
  const compiler = ONLINECOMPILER_LANGUAGES[language];
  if (!compiler) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(ONLINECOMPILER_LANGUAGES).join(", ")}`
    );
  }

  if (!ONLINECOMPILER_API_KEY) {
    throw new Error(
      "ONLINECOMPILER_API_KEY is not set. Get a free API key at https://onlinecompiler.io"
    );
  }

  const client = createOnlineCompilerClient();

  try {
    console.log("[OnlineCompiler] Submitting:", { language, compiler });

    const { data } = await client.post("/api/run-code-sync/", {
      compiler,
      code,
      input: input || "",
    });

    // Map OnlineCompiler response to our ExecutionResult format
    let statusId: number;
    let statusDescription: string;

    if (data.status === "success" && data.exit_code === 0) {
      statusId = 3;
      statusDescription = "Accepted";
    } else if (data.exit_code === 124) {
      statusId = 5;
      statusDescription = "Time Limit Exceeded";
    } else if (data.exit_code === 137) {
      // SIGKILL - could be memory or timeout
      statusId = 9;
      statusDescription = "Memory Limit Exceeded";
    } else if (data.exit_code === 139) {
      // SIGSEGV
      statusId = 11;
      statusDescription = "Runtime Error";
    } else if (data.error && (data.error.includes("error:") || data.error.includes("Error:"))) {
      // Compilation error detected
      statusId = 6;
      statusDescription = "Compilation Error";
    } else {
      statusId = 11;
      statusDescription = "Runtime Error";
    }

    return {
      status: { id: statusId, description: statusDescription },
      stdout: data.output || "",
      stderr: data.error || "",
      compile_output: undefined,
      time: data.time || data.total,
      memory: data.memory ? parseInt(data.memory, 10) : undefined,
    };
  } catch (error) {
    console.error("[OnlineCompiler] Error:", error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          "OnlineCompiler API key invalid. Check ONLINECOMPILER_API_KEY or get one at onlinecompiler.io"
        );
      }
      if (error.response?.status === 429) {
        throw new Error(
          "OnlineCompiler rate limit reached (1M requests/month). Try again later."
        );
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Piston implementation
// ---------------------------------------------------------------------------

async function executeCodePiston(
  code: string,
  language: string,
  input?: string
): Promise<ExecutionResult> {
  const config = PISTON_LANGUAGES[language];
  if (!config) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(PISTON_LANGUAGES).join(", ")}`
    );
  }

  const client = createPistonClient();
  const executePath = PISTON_API_URL.includes("emkc.org")
    ? "/api/v2/piston/execute"
    : "/api/v2/execute";

  try {
    console.log("[Piston] Submitting:", { language, pistonLang: config.language });

    const payload = {
      language: config.language,
      version: config.version,
      files: [{ content: code }],
      stdin: input || "",
      compile_timeout: 3000,
      run_timeout: 3000,
    };

    const { data } = await client.post(executePath, payload);

    const compileOutput = data.compile?.stderr || data.compile?.output || "";
    const runStdout = data.run?.stdout || "";
    const runStderr = data.run?.stderr || "";
    const exitCode = data.run?.code ?? 0;

    let statusId: number;
    let statusDescription: string;

    if (data.compile && data.compile.code !== 0) {
      statusId = 6;
      statusDescription = "Compilation Error";
    } else if (
      data.run?.signal === "SIGKILL" ||
      data.run?.signal === "SIGXCPU"
    ) {
      statusId = 5;
      statusDescription = "Time Limit Exceeded";
    } else if (exitCode !== 0) {
      statusId = 11;
      statusDescription = "Runtime Error";
    } else {
      statusId = 3;
      statusDescription = "Accepted";
    }

    return {
      status: { id: statusId, description: statusDescription },
      stdout: runStdout,
      stderr: runStderr,
      compile_output: compileOutput || undefined,
      time: undefined,
      memory: undefined,
    };
  } catch (error) {
    console.error("[Piston] Error:", error);
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to Piston at ${PISTON_API_URL}. Ensure the Piston container is running.`
        );
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Judge0 implementation
// ---------------------------------------------------------------------------

async function pollJudge0(
  client: AxiosInstance,
  token: string
): Promise<any> {
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await client.get(`/submissions/${token}`, {
      params: { base64_encoded: false, fields: "*" },
    });
    const statusId = data.status?.id;
    if (statusId && statusId > 2) return data;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Judge0 submission timed out after polling");
}

async function executeCodeJudge0(
  code: string,
  language: string,
  input?: string
): Promise<ExecutionResult> {
  const languageId = JUDGE0_LANGUAGES[language];
  if (!languageId) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(JUDGE0_LANGUAGES).join(", ")}`
    );
  }

  const client = createJudge0Client();

  try {
    console.log("[Judge0] Submitting:", { language, languageId });

    const { data: submission } = await client.post(
      "/submissions",
      {
        source_code: code,
        language_id: languageId,
        stdin: input || "",
        cpu_time_limit: 3,
        memory_limit: 256000,
      },
      { params: { base64_encoded: false, fields: "*" } }
    );

    if (!submission.token) {
      throw new Error("No submission token returned from Judge0");
    }

    const result = await pollJudge0(client, submission.token);
    const statusId = result.status?.id ?? 11;
    const statusDescription = JUDGE0_STATUS_MAP[statusId] || "Unknown Error";

    return {
      status: { id: statusId, description: statusDescription },
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compile_output: result.compile_output || undefined,
      time: result.time,
      memory: result.memory,
    };
  } catch (error) {
    console.error("[Judge0] Error:", error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error("Judge0 rate limit reached. Try again later.");
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          "Judge0 API key invalid or missing. Check JUDGE0_API_KEY."
        );
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function executeCode(
  code: string,
  language: string,
  input?: string
): Promise<ExecutionResult> {
  switch (BACKEND) {
    case "onlinecompiler":
      return executeCodeOnlineCompiler(code, language, input);
    case "judge0":
      return executeCodeJudge0(code, language, input);
    case "piston":
    default:
      return executeCodePiston(code, language, input);
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: "ok" | "error";
  backend: Backend;
  url: string;
  message?: string;
  runtimes?: string[];
}

export async function healthCheck(): Promise<HealthStatus> {
  try {
    if (BACKEND === "onlinecompiler") {
      // OnlineCompiler has a public /api/compilers/ endpoint (no auth required)
      const { data } = await axios.get(`${ONLINECOMPILER_API_URL}/api/compilers/`, {
        timeout: 5000,
      });
      const runtimes = Array.isArray(data)
        ? data
            .filter((c: any) => {
              const supported = Object.values(ONLINECOMPILER_LANGUAGES);
              return supported.includes(c.id || c);
            })
            .map((c: any) => c.name || c.id || c)
        : Object.values(ONLINECOMPILER_LANGUAGES);
      return {
        status: "ok",
        backend: "onlinecompiler",
        url: ONLINECOMPILER_API_URL,
        runtimes: runtimes.length > 0 ? runtimes : Object.values(ONLINECOMPILER_LANGUAGES),
      };
    }

    if (BACKEND === "judge0") {
      const client = createJudge0Client();
      const { data } = await client.get("/languages", {
        params: { base64_encoded: false },
      });
      const runtimes = Array.isArray(data)
        ? data
            .filter((l: any) =>
              Object.values(JUDGE0_LANGUAGES).includes(l.id)
            )
            .map((l: any) => l.name)
        : [];
      return {
        status: "ok",
        backend: "judge0",
        url: JUDGE0_API_URL,
        runtimes,
      };
    }

    // Piston health check
    const client = createPistonClient();
    const runtimesPath = PISTON_API_URL.includes("emkc.org")
      ? "/api/v2/piston/runtimes"
      : "/api/v2/runtimes";
    const { data } = await client.get(runtimesPath);
    const runtimes = Array.isArray(data)
      ? data
          .filter((r: any) =>
            Object.values(PISTON_LANGUAGES).some(
              (l) => l.language === r.language
            )
          )
          .map((r: any) => `${r.language} ${r.version}`)
      : [];
    return {
      status: "ok",
      backend: "piston",
      url: PISTON_API_URL,
      runtimes,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const urls: Record<Backend, string> = {
      onlinecompiler: ONLINECOMPILER_API_URL,
      piston: PISTON_API_URL,
      judge0: JUDGE0_API_URL,
    };
    return {
      status: "error",
      backend: BACKEND,
      url: urls[BACKEND],
      message,
    };
  }
}
