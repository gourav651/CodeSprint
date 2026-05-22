"use client";

import { useState, useEffect, useRef } from "react";
import { Problem, Submission } from "@/types";
import { CodeEditor } from "@/components/code-editor/CodeEditor";
import { ProblemDescription } from "./ProblemDescription";
import { SubmissionResults } from "./SubmissionResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  Brain,
  AlertTriangle,
  Play,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";

interface ProblemWithStarterCode extends Problem {
  starter_code_js: string;
  starter_code_py: string;
  starter_code_java: string;
  starter_code_cpp: string;
  test_cases?: any[];
}

interface ProblemSolverProps {
  problem: ProblemWithStarterCode;
  userSubmissions: Submission[];
  user: { id: string | null };
}

// Add a type for test cases if not present
interface TestCase {
  input: string;
  expectedOutput: string;
}

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp?: string;
}

export function ProblemSolver({
  problem,
  userSubmissions,
  user,
}: ProblemSolverProps) {
  const typedProblem = problem as ProblemWithStarterCode;
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(typedProblem.starter_code_js);
  const [testCases, setTestCases] = useState<any[]>(
    typedProblem.test_cases || [],
  );
  const [activeTab, setActiveTab] = useState("testcases");
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const latestCodeRef = useRef(code);
  const latestLanguageRef = useRef(language);
  const latestUserIdRef = useRef(user.id);
  const [submissions, setSubmissions] = useState<Submission[]>(userSubmissions);
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const starterCodeKey =
    `starter_code_${language === "cpp" ? "cpp" : language}` as keyof ProblemWithStarterCode;
  const starterCodeRef = useRef(typedProblem[starterCodeKey] as string);
  const autoSubmittedRef = useRef(false); // Track if auto-submit has already occurred
  const mountTimeRef = useRef(Date.now());
  const [lastSuccessfulRunCode, setLastSuccessfulRunCode] = useState<
    string | null
  >(null);

  // AI Coach States
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Analyzing code syntax and patterns...",
    "Evaluating time complexity algorithms...",
    "Profiling memory efficiency...",
    "Identifying edge-case vulnerabilities...",
    "Formulating guided hints...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCoachLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isCoachLoading]);

  useEffect(() => {
    if (messagesEndRef.current && !isCoachLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isCoachLoading]);

  const handleSendCoachMessage = async (messageText: string) => {
    if (!user.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to chat with the AI Coach.",
        variant: "destructive",
      });
      return;
    }

    setIsCoachLoading(true);
    setCoachError(null);
    setIsQuotaExceeded(false);
    setActiveLeftTab("ai-coach");

    const userMessage: ChatMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput("");

    const sendMessages = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const token = await getToken();
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: sendMessages,
          problemTitle: problem.title,
          problemDescription: problem.description,
          code: code,
          language: language,
          errorMessage: runResult?.stderr || runResult?.error || null,
          runResult: runResult
            ? {
                status: runResult.status,
                time: runResult.time || runResult.runtime,
                memory: runResult.memory,
                passedCases: Array.isArray(runResult?.results)
                  ? runResult.results.filter((r: any) => r.passed).length
                  : null,
                totalCases: Array.isArray(runResult?.results)
                  ? runResult.results.length
                  : null,
              }
            : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.feedback || "The coach did not return a response.",
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
        setCoachFeedback(assistantMessage.content);
      } else {
        setIsQuotaExceeded(data.isQuotaExceeded || false);
        throw new Error(data.error || "Failed to fetch AI feedback");
      }
    } catch (error) {
      console.error("AI Coach error:", error);
      setCoachError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleAskCoach = async () => {
    await handleSendCoachMessage(
      "Please analyze my code and provide guided hints without giving the full corrected solution.",
    );
  };

  const handleSendChat = async () => {
    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage) return;
    await handleSendCoachMessage(trimmedMessage);
  };

  // Keep local submissions in sync if userSubmissions changes (e.g. on problem change)
  useEffect(() => {
    setSubmissions(userSubmissions);
  }, [userSubmissions]);

  useEffect(() => {
    const languageKey =
      `starter_code_${language === "cpp" ? "cpp" : language}` as keyof ProblemWithStarterCode;
    const starter = typedProblem[languageKey] as string;
    setCode(starter);
    starterCodeRef.current = starter;
    latestCodeRef.current = starter;
  }, [problem.id, language, typedProblem]);

  useEffect(() => {
    setTestCases(typedProblem.test_cases || []);
  }, [typedProblem]);

  useEffect(() => {
    setLanguage("javascript"); // Reset language to default when problem changes
  }, [problem.id]);

  useEffect(() => {
    latestCodeRef.current = code;
    latestLanguageRef.current = language;
    latestUserIdRef.current = user.id;
  }, [code, language, user.id]);

  // Reset lastSuccessfulRunCode when problem changes
  useEffect(() => {
    setLastSuccessfulRunCode(null);
  }, [problem.id]);

  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
    setCoachFeedback(null);
  }, [problem.id]);

  // --- Block navigation until submission is successful ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSubmission) {
        e.preventDefault();
        e.returnValue = "";
        toast({
          title: "Submission in progress",
          description:
            "Please wait until your code is submitted before leaving.",
          variant: "default",
        });
        return "";
      }
      // If not pending, allow navigation
      return undefined;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pendingSubmission, toast]);

  // --- Auto-submit on attempted leave if not already submitted ---
  // Move autoSubmit out of useEffect so it can be called from paste handler
  const autoSubmit = async (reason: string) => {
    console.log(`[AutoSubmit] Called with reason: ${reason}`);
    console.log("[AutoSubmit] Checking conditions:", {
      pendingSubmission,
      autoSubmitted: autoSubmittedRef.current,
      userId: latestUserIdRef.current,
      problemId: problem.id,
    });

    // Check if auto-submit has already occurred for this problem session
    if (autoSubmittedRef.current) {
      console.log(
        "[AutoSubmit] Already auto-submitted for this problem, skipping...",
      );
      return;
    }

    // Prevent transient auto-submissions within 2 seconds of mounting (e.g. from transition blurs)
    if (Date.now() - mountTimeRef.current < 2000) {
      console.log(
        "[AutoSubmit] Page recently mounted, skipping transient blur/tab-switch...",
      );
      return;
    }

    // Prevent auto-submission if the user hasn't made any edits to the starter code
    if (latestCodeRef.current === starterCodeRef.current) {
      console.log(
        "[AutoSubmit] Code matches starter template (no changes made), skipping...",
      );
      return;
    }

    // Prevent auto-submission of completely empty code
    if (!latestCodeRef.current || latestCodeRef.current.trim() === "") {
      console.log("[AutoSubmit] Code is empty, skipping...");
      return;
    }

    if (!pendingSubmission && latestUserIdRef.current && problem.id) {
      console.log("[AutoSubmit] Submitting code...");

      // Set the flag immediately to prevent duplicate submissions
      autoSubmittedRef.current = true;
      setPendingSubmission(true);
      toast({
        title: "Auto-submitting",
        description: `Submitting your code... (${reason})`,
        variant: "default",
      });
      try {
        const token = await getToken();
        // Skip run-check for auto-submit to avoid blocking implicit saves/submissions on exit
        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            problemId: problem.id,
            code: latestCodeRef.current || "",
            language: latestLanguageRef.current || "javascript",
            autoSubmitted: true,
            submittedAt: new Date().toISOString(),
          }),
        });
        const result = await response.json();
        if (response.ok) {
          setSubmissionSuccess(true);
          setActiveLeftTab("submissions");
          toast({
            title: "Auto-submitted!",
            description: "Your code was submitted.",
            variant: "default",
          });
        } else {
          // Reset flag on failure so user can try again
          autoSubmittedRef.current = false;
          toast({
            title: "Auto-submission failed",
            description:
              typeof result.error === "string"
                ? result.error
                : JSON.stringify(result.error),
            variant: "destructive",
          });
        }
      } catch (error) {
        // Reset flag on error so user can try again
        autoSubmittedRef.current = false;
        toast({
          title: "Auto-submission error",
          description:
            error instanceof Error ? error.message : JSON.stringify(error),
          variant: "destructive",
        });
      } finally {
        setPendingSubmission(false);
      }
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[Tab Switch] Detected");
        autoSubmit("tab switch").catch((err) => console.error("[Error]:", err));
      }
    };

    const handleBlur = () => {
      console.log("[App Switch] Window blur");
      autoSubmit("app switch").catch((err) => console.error("[Error]:", err));
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      autoSubmit("page close").catch((err) => console.error("[Error]:", err));
      if (pendingSubmission) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      return undefined;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [problem.id, submissionSuccess, pendingSubmission, toast]);

  // Poll for submission updates
  useEffect(() => {
    const pollSubmissions = async () => {
      try {
        const token = await getToken();
        const response = await fetch(
          `/api/submissions?problemId=${problem.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setSubmissions(data.submissions || []);
        }
      } catch (error) {
        console.error("Error polling submissions:", error);
      }
    };

    // Initial load
    pollSubmissions();

    // Set up polling interval (every 2 seconds)
    const interval = setInterval(pollSubmissions, 2000);
    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [problem.id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Reset submissionSuccess when problem or code changes
  useEffect(() => {
    setSubmissionSuccess(false);
    autoSubmittedRef.current = false; // Reset auto-submit flag for new problem
    mountTimeRef.current = Date.now(); // Reset mount time on problem change
  }, [problem.id]);

  const handleRun = async (code: string, language: string) => {
    setLoading(true);
    setRunResult(null);
    // Switch to output tab when execution starts
    setActiveTab("output");

    try {
      let body: any = { code, language, problem_id: problem.id };
      if (Array.isArray(testCases) && testCases.length > 0) {
        body.testCases = testCases;
      } else {
        body.input = problem.sample_input;
      }
      const token = await getToken();
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setRunResult(result);
      if (response.ok) {
        // Mark this code as run
        setLastSuccessfulRunCode(code);

        toast({
          title: "Code executed successfully",
          description: Array.isArray(result.results)
            ? `${result.results.filter((r: any) => r.passed).length} / ${result.results.length} test cases passed.`
            : `Status: ${result.status}`,
        });
      } else {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error),
        );
      }
    } catch (error) {
      toast({
        title: "Execution failed",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    if (!user.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit your solution",
        variant: "destructive",
      });
      return;
    }

    // Enforce Run before Submit
    if (code !== lastSuccessfulRunCode) {
      toast({
        title: "Run Required",
        description: "Please run your code to verify it before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setRunResult(null);
    // Switch to output tab when submission starts
    setActiveTab("output");
    // Switch to submissions tab on the left after submission
    setActiveLeftTab("submissions");

    try {
      const token = await getToken();
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title:
            result.status === "Accepted"
              ? "Solution Accepted!"
              : "Solution Submitted",
          description:
            result.status === "Accepted"
              ? "Congratulations! Your solution passed all test cases."
              : `Status: ${result.status}`,
          variant: result.status === "Accepted" ? "default" : "destructive",
        });

        // Update the result to show submission details
        setRunResult({
          status: result.status,
          runtime: result.runtime,
          memory: result.memory,
          error: result.error,
          isSubmission: true,
        });
        setActiveLeftTab("submissions");

        // Force immediate refresh of submissions
        const refreshToken = await getToken();
        const refreshResponse = await fetch(
          `/api/submissions?problemId=${problem.id}`,
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          },
        );
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newSubmissions = data.submissions || [];
          // Replace all submissions with fresh data from server
          setSubmissions(newSubmissions);
        }
      } else {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error || "Submission failed"),
        );
      }
    } catch (error) {
      toast({
        title: "Submission failed",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    latestCodeRef.current = newCode;
  };

  return (
    <div className="flex-1 overflow-hidden p-4">
      <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
        <ResizablePanel
          defaultSize={35}
          minSize={30}
          className="h-full min-h-0 overflow-hidden"
        >
          <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <Tabs
              value={activeLeftTab}
              onValueChange={setActiveLeftTab}
              className="h-full flex flex-col min-h-0 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0 rounded-none border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger
                  value="description"
                  className="rounded-none data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 text-xs"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="submissions"
                  className="rounded-none data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 text-xs"
                >
                  Submissions
                </TabsTrigger>
                <TabsTrigger
                  value="ai-coach"
                  className="flex items-center gap-1 rounded-none data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700 text-xs"
                >
                  <Sparkles className="h-3 w-3 text-purple-500 animate-pulse animate-duration-1000" />
                  AI Coach
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="description"
                className="flex-1 overflow-y-auto min-h-0 data-[state=inactive]:hidden"
              >
                <div className="h-full">
                  <ProblemDescription problem={problem} />
                </div>
              </TabsContent>

              <TabsContent
                value="submissions"
                className="flex-1 overflow-y-auto min-h-0 data-[state=inactive]:hidden"
              >
                <div className="h-full">
                  <SubmissionResults
                    submissions={submissions}
                    loading={loading}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="ai-coach"
                className="flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden p-6 bg-gray-50/30 dark:bg-gray-900/10"
              >
                <div className="h-full min-h-0 flex flex-col overflow-hidden">
                  {isCoachLoading ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center space-y-6 py-12">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                        <Brain className="h-16 w-16 text-purple-500 animate-bounce relative" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                          Coach is thinking...
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-xs mx-auto animate-pulse">
                          {loadingSteps[loadingStep]}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-h-0 max-h-full overflow-y-auto pr-1 pb-4 space-y-4">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((message, idx) => (
                            <div
                              key={`${message.role}-${idx}`}
                              className={`p-4 rounded-2xl border ${
                                message.role === "assistant"
                                  ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                  : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                              } shadow-sm`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-[11px] font-semibold uppercase ${message.role === "assistant" ? "text-slate-500 dark:text-slate-400" : "text-purple-600 dark:text-purple-300"}`}
                                >
                                  {message.role === "assistant"
                                    ? "Coach"
                                    : "You"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {message.timestamp
                                    ? new Date(
                                        message.timestamp,
                                      ).toLocaleTimeString()
                                    : ""}
                                </span>
                              </div>
                              <ReactMarkdown
                                components={{
                                  h3: ({ node, ...props }) => (
                                    <h3
                                      className="text-sm font-semibold text-slate-900 dark:text-neutral-100 mt-3 mb-2"
                                      {...props}
                                    />
                                  ),
                                  h4: ({ node, ...props }) => (
                                    <h4
                                      className="text-xs font-semibold text-slate-800 dark:text-neutral-200 mt-3 mb-1"
                                      {...props}
                                    />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      className="list-disc pl-5 space-y-2 mt-2"
                                      {...props}
                                    />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol
                                      className="list-decimal pl-5 space-y-2 mt-2"
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li
                                      className="text-xs text-slate-700 dark:text-slate-300"
                                      {...props}
                                    />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p
                                      className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed"
                                      {...props}
                                    />
                                  ),
                                  code: ({
                                    node,
                                    className,
                                    children,
                                    ...props
                                  }) => (
                                    <code
                                      className="bg-gray-150 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px] font-mono text-purple-600 dark:text-purple-400 break-all"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote
                                      className="border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-1.5 rounded-r-lg text-xs italic my-3"
                                      {...props}
                                    />
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ))
                        ) : coachFeedback ? (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                              <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-purple-500" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                                  Coach Feedback
                                </h3>
                              </div>
                              <button
                                onClick={handleAskCoach}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-semibold rounded-lg text-xs transition-colors"
                              >
                                <Sparkles className="h-3 w-3" />
                                Re-Analyze
                              </button>
                            </div>

                            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-neutral-300 leading-relaxed space-y-4">
                              <ReactMarkdown>{coachFeedback}</ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-5 py-12 text-center">
                            <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/10 rounded-full flex items-center justify-center border border-purple-100 dark:border-purple-900/30">
                              <Brain className="h-7 w-7 text-purple-500 animate-pulse" />
                            </div>
                            <div className="space-y-1.5">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                                Consult your AI Coding Coach
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-xs mx-auto">
                                Get encouraging, guided tips and time/space
                                complexity analysis of your solution without
                                spoilers!
                              </p>
                            </div>

                            {coachError && (
                              <div
                                className={`flex items-start gap-2.5 p-3.5 border rounded-xl max-w-sm text-left ${
                                  isQuotaExceeded
                                    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30"
                                    : "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30"
                                }`}
                              >
                                <AlertTriangle
                                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isQuotaExceeded ? "text-orange-600" : "text-red-600"}`}
                                />
                                <div className="flex-1">
                                  <p
                                    className={`text-xs ${isQuotaExceeded ? "text-orange-800 dark:text-orange-400" : "text-red-800 dark:text-red-400"}`}
                                  >
                                    {coachError}
                                  </p>
                                  {isQuotaExceeded && (
                                    <p className="text-xs text-orange-700 dark:text-orange-500 mt-1.5">
                                      The free tier has a daily limit. Try again
                                      later or upgrade your plan at{" "}
                                      <a
                                        href="https://ai.google.dev/gemini-api/docs/rate-limits"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:no-underline"
                                      >
                                        Google AI Studio
                                      </a>
                                      .
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <button
                              onClick={handleAskCoach}
                              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-purple-500/10 transition-all text-xs"
                            >
                              <Sparkles className="h-4 w-4 animate-bounce" />
                              Analyze My Code
                            </button>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="sticky bottom-0 z-10 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gray-50/90 dark:bg-gray-900/90">
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor="coach-chat"
                            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
                          >
                            Chat with your coach
                          </label>
                          <div className="flex gap-2">
                            <input
                              id="coach-chat"
                              value={chatInput}
                              onChange={(event) =>
                                setChatInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  handleSendChat();
                                }
                              }}
                              placeholder="Ask a follow-up question..."
                              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                            />
                            <button
                              onClick={handleSendChat}
                              disabled={!chatInput.trim() || isCoachLoading}
                              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Send
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ask anything about your solution, test failures,
                            runtime, edge cases, or complexity.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Code Editor Section */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full p-4">
                  <div className="h-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <CodeEditor
                      onSubmit={handleSubmit}
                      onRun={handleRun}
                      loading={loading}
                      initialCode={{
                        javascript: typedProblem.starter_code_js,
                        python: typedProblem.starter_code_py,
                        java: typedProblem.starter_code_java,
                        cpp: typedProblem.starter_code_cpp,
                      }}
                      problemId={problem.id}
                      onCodeChange={handleCodeChange}
                      onPasteAutoSubmit={() => autoSubmit("paste")}
                      canSubmit={code === lastSuccessfulRunCode}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Results Section */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full bg-gray-50 dark:bg-gray-800 flex flex-col">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="bg-background border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <TabsList className="grid w-full grid-cols-2 h-10 rounded-none border-b-0 bg-gray-100 dark:bg-gray-800">
                        <TabsTrigger
                          value="testcases"
                          className="rounded-none data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700"
                        >
                          Test Cases
                        </TabsTrigger>
                        <TabsTrigger
                          value="output"
                          className="flex items-center gap-2 rounded-none data-[state=active]:bg-gray-200 dark:data-[state=active]:bg-gray-700"
                        >
                          Output
                          {loading && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent
                      value="testcases"
                      className="flex-1 overflow-y-auto p-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">
                            Available Test Cases:
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {testCases.length} test cases
                          </span>
                        </div>

                        <div className="space-y-2">
                          {testCases.length > 0 ? (
                            testCases.map((testCase: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg text-xs border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">
                                    Test Case {idx + 1}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                    Sample
                                  </span>
                                </div>
                                <div>
                                  <div>
                                    <span className="font-medium">Input:</span>{" "}
                                    <code className="bg-muted px-1 rounded break-all">
                                      {testCase.input || "N/A"}
                                    </code>
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Expected Output:
                                    </span>{" "}
                                    <code className="bg-muted px-1 rounded break-all">
                                      {testCase.expected_output || "N/A"}
                                    </code>
                                  </div>
                                  {testCase.is_hidden && (
                                    <div className="text-orange-600 dark:text-orange-400 text-xs">
                                      ⚠️ Hidden test case
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              {loading
                                ? "Loading test cases..."
                                : "No test cases available"}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="output"
                      className="flex-1 overflow-y-auto p-4"
                    >
                      <div className="space-y-3">
                        {loading ? (
                          <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Executing your code...
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Please wait while we run your solution
                              </p>
                            </div>
                          </div>
                        ) : runResult && Array.isArray(runResult?.results) ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Test Case Results:
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    runResult.results.filter(
                                      (r: any) => r.passed,
                                    ).length === runResult.results.length
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  }`}
                                >
                                  {
                                    runResult.results.filter(
                                      (r: any) => r.passed,
                                    ).length
                                  }{" "}
                                  / {runResult.results.length} passed
                                </span>
                              </div>
                              {runResult.results.filter((r: any) => r.passed)
                                .length < runResult.results.length && (
                                <button
                                  onClick={handleAskCoach}
                                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold rounded border border-purple-200/50 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors"
                                >
                                  <Sparkles className="h-3 w-3 animate-pulse" />
                                  Ask Coach
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              {runResult.results.map(
                                (res: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-lg text-xs border shadow-sm ${
                                      res.passed
                                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">
                                        Test Case {idx + 1}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs ${
                                          res.passed
                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        }`}
                                      >
                                        {res.passed ? "PASSED" : "FAILED"}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1 text-xs">
                                      <div>
                                        <span className="font-medium">
                                          Input:
                                        </span>{" "}
                                        <code className="bg-muted px-1 rounded break-all">
                                          {res.input}
                                        </code>
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Expected:
                                        </span>{" "}
                                        <code className="bg-muted px-1 rounded break-all">
                                          {res.expectedOutput}
                                        </code>
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Actual:
                                        </span>{" "}
                                        <code className="bg-muted px-1 rounded break-all">
                                          {res.actualOutput}
                                        </code>
                                      </div>
                                      {res.stderr && (
                                        <div>
                                          <span className="font-medium">
                                            Error:
                                          </span>{" "}
                                          <code className="bg-red-100 px-1 rounded text-red-800 break-all">
                                            {res.stderr}
                                          </code>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ) : runResult && !Array.isArray(runResult?.results) ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Execution Result:
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    runResult.status === "Accepted"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  }`}
                                >
                                  {runResult.status}
                                </span>
                              </div>
                              {runResult.status !== "Accepted" && (
                                <button
                                  onClick={handleAskCoach}
                                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold rounded border border-purple-200/50 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors"
                                >
                                  <Sparkles className="h-3 w-3 animate-pulse" />
                                  Ask Coach
                                </button>
                              )}
                            </div>
                            <div className="p-3 rounded-lg text-xs border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-medium">Runtime:</span>{" "}
                                  {runResult.time || runResult.runtime}ms
                                </div>
                                <div>
                                  <span className="font-medium">Memory:</span>{" "}
                                  {runResult.memory}KB
                                </div>
                              </div>
                              {runResult.stdout && (
                                <div className="mt-2">
                                  <span className="font-medium">Output:</span>{" "}
                                  <code className="bg-muted px-1 rounded break-all">
                                    {runResult.stdout}
                                  </code>
                                </div>
                              )}
                              {runResult.stderr && (
                                <div className="mt-2">
                                  <span className="font-medium">Error:</span>{" "}
                                  <code className="bg-red-100 px-1 rounded text-red-800 break-all">
                                    {runResult.stderr}
                                  </code>
                                </div>
                              )}
                              {runResult.compile_output && (
                                <div className="mt-2">
                                  <span className="font-medium">
                                    Compiler Output:
                                  </span>{" "}
                                  <code className="bg-muted px-1 rounded break-all">
                                    {runResult.compile_output}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            Run your code to see execution results
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
