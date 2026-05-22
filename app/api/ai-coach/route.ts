import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Missing Groq API Key. Please add GROQ_API_KEY to your .env file. You can get a free key from Groq (https://groq.com/).' 
      }, { status: 500 });
    }

    const { problemTitle, problemDescription, code, language, errorMessage, runResult } = await request.json();

    if (!problemTitle || !code || !language) {
      return NextResponse.json({ error: 'Missing required fields (problemTitle, code, language).' }, { status: 400 });
    }

    const systemPrompt = `You are "Antigravity AI Coding Coach", a world-class computer science mentor and competitive programming coach.
Your job is to help the user debug their code, optimize their algorithms, and think through logical flaws.

IMPORTANT RULES:
1. NEVER output completed or corrected code blocks for the user's solution.
2. DO NOT write the corrected function or correct lines of code.
3. You may use small pseudocode snippets or abstract code examples (e.g. showing how a general hash map works) to explain concepts.
4. Keep your tone encouraging, professional, and educational.

Please structure your response in beautiful, clean Markdown with these sections:
- ### 🔍 Analysis & Bottlenecks
  Explain what is happening in the user's code, why it fails (if there is an error, syntax flaw, runtime error, or Time Limit Exceeded due to high time complexity), and what the time/space complexity of their current solution is.
  
- ### 💡 Guided Hints
  Provide 2 progressive, high-quality hints:
  - **Hint 1:** Focus on the logical flow, missing conditional checks, or syntax flaws.
  - **Hint 2:** Focus on an optimal algorithmic approach (e.g., Two-Pointers, Hash Map, Stack) if they are currently using a brute-force approach.

- ### ⚡ Complexity Goal
  Specify what target Time Complexity and Space Complexity they should aim for to pass all test cases optimally (e.g., Time: O(N), Space: O(N)).`;

    const userPrompt = `
Problem: ${problemTitle}
Description:
${problemDescription}

User's Code (written in ${language}):
\`\`\`${language}
${code}
\`\`\`

${errorMessage ? `Compiler/Runtime Error Message:\n${errorMessage}` : ''}
${runResult ? `Execution Results Summary:\n${JSON.stringify(runResult)}` : ''}

Please analyze my solution, explain the bugs/bottlenecks, and provide guided hints following the system rules.
`;

    // Direct REST API Call to Groq API (using llama-3.3-70b-versatile for code analysis)
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const groqResponse = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API call failed:', errorData);
      return NextResponse.json({ 
        error: `Groq API Call Failed: ${errorData.error?.message || errorData.message || 'Unknown Groq error.'}` 
      }, { status: groqResponse.status });
    }

    const responseData = await groqResponse.json();
    const feedbackText = responseData.choices?.[0]?.message?.content;

    if (!feedbackText) {
      return NextResponse.json({ error: 'Received empty response from Groq API.' }, { status: 502 });
    }

    return NextResponse.json({ feedback: feedbackText });

  } catch (error) {
    console.error('AI Coach API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred.' 
    }, { status: 500 });
  }
}
