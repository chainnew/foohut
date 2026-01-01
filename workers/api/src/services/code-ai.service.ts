/**
 * Code AI Service
 * AI-powered code assistance using Workers AI (Llama 3.1 70B Instruct)
 */

import { ChatMessage } from '../types';

/**
 * AI binding type (Cloudflare Workers AI)
 * Using a simplified interface to avoid complex overloaded signatures
 * from the Cloudflare Ai type which has 50+ model-specific return types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AI = any;

/**
 * Code context for AI operations
 */
export interface CodeContext {
  projectName?: string;
  fileName?: string;
  filePath?: string;
  language?: string;
  techStack?: string;
  relatedFiles?: Array<{ path: string; content: string }>;
  readme?: string;
}

/**
 * AI response with metadata
 */
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

/**
 * Code review result
 */
export interface CodeReviewResult {
  summary: string;
  issues: Array<{
    severity: 'error' | 'warning' | 'info' | 'suggestion';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
  score: number; // 0-100
}

/**
 * Model to use for code operations
 */
const CODE_MODEL = '@cf/meta/llama-3.1-70b-instruct';

/**
 * Build a system prompt for code assistance
 */
function buildSystemPrompt(context?: CodeContext): string {
  let prompt = `You are an expert software developer and code assistant. You provide helpful, accurate, and well-structured code assistance.

Guidelines:
- Provide clear, concise explanations
- Write clean, maintainable code following best practices
- Include code comments when helpful
- Consider security, performance, and error handling
- Use modern language features and patterns`;

  if (context) {
    if (context.language) {
      prompt += `\n\nProgramming Language: ${context.language}`;
    }
    if (context.techStack) {
      prompt += `\nTech Stack: ${context.techStack}`;
    }
    if (context.projectName) {
      prompt += `\nProject: ${context.projectName}`;
    }
    if (context.fileName) {
      prompt += `\nCurrent File: ${context.fileName}`;
    }
    if (context.readme) {
      prompt += `\n\nProject README:\n${context.readme.slice(0, 2000)}`;
    }
  }

  return prompt;
}

/**
 * Run AI inference
 */
async function runAI(
  ai: AI,
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const { maxTokens = 2048, temperature = 0.7 } = options;

  const result = await ai.run(CODE_MODEL, {
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  return result.response || '';
}

/**
 * Chat about code with context
 */
export async function chat(
  ai: AI,
  messages: ChatMessage[],
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(context);

  // Build messages with context
  const aiMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Add related files as context if available
  if (context?.relatedFiles && context.relatedFiles.length > 0) {
    const filesContext = context.relatedFiles
      .slice(0, 3) // Limit to 3 files
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 3000)}`)
      .join('\n\n');

    const lastUserMsgIndex = aiMessages.findIndex(
      (m, i) => m.role === 'user' && i === aiMessages.length - 1
    );
    if (lastUserMsgIndex > 0) {
      aiMessages[lastUserMsgIndex].content = `Related code:\n${filesContext}\n\n${aiMessages[lastUserMsgIndex].content}`;
    }
  }

  const response = await runAI(ai, aiMessages);

  return {
    content: response,
  };
}

/**
 * Generate code from a prompt
 */
export async function generateCode(
  ai: AI,
  prompt: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

When generating code:
- Write complete, runnable code
- Include necessary imports
- Add helpful comments
- Follow the project's coding style if context is provided
- Handle errors appropriately`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate code for the following requirement:\n\n${prompt}`,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.5 });

  return {
    content: response,
  };
}

/**
 * Explain code
 */
export async function explainCode(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

When explaining code:
- Start with a high-level overview
- Explain the purpose and functionality
- Describe key functions/classes
- Highlight important patterns or techniques
- Note any potential issues or improvements
- Use clear, accessible language`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Please explain the following code:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.3 });

  return {
    content: response,
  };
}

/**
 * Fix a bug in code
 */
export async function fixBug(
  ai: AI,
  code: string,
  error: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

When fixing bugs:
- Identify the root cause of the issue
- Provide a corrected version of the code
- Explain what was wrong and why the fix works
- Suggest preventive measures if applicable`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Please fix the bug in this code.

Code:
\`\`\`${context?.language || ''}
${code}
\`\`\`

Error/Issue:
${error}`,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.3 });

  return {
    content: response,
  };
}

/**
 * Refactor code based on instructions
 */
export async function refactor(
  ai: AI,
  code: string,
  instruction: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

When refactoring code:
- Preserve the original functionality
- Apply the requested changes cleanly
- Improve code quality where possible
- Explain significant changes made`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Refactor the following code according to these instructions: "${instruction}"

Code:
\`\`\`${context?.language || ''}
${code}
\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.4 });

  return {
    content: response,
  };
}

/**
 * Write tests for code
 */
export async function writeTests(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

When writing tests:
- Create comprehensive test cases covering edge cases
- Use appropriate testing frameworks for the language
- Write clear test descriptions
- Include both positive and negative test cases
- Mock external dependencies appropriately`;

  // Detect testing framework based on language
  let testingHint = '';
  if (context?.language) {
    const frameworkHints: Record<string, string> = {
      javascript: 'Use Jest or Vitest for testing',
      typescript: 'Use Jest or Vitest with TypeScript support',
      python: 'Use pytest for testing',
      go: 'Use the standard testing package',
      rust: 'Use the built-in testing framework',
      java: 'Use JUnit for testing',
    };
    testingHint = frameworkHints[context.language] || '';
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Write unit tests for the following code.${testingHint ? ` ${testingHint}.` : ''}

Code:
\`\`\`${context?.language || ''}
${code}
\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.4, maxTokens: 3000 });

  return {
    content: response,
  };
}

/**
 * Review code and provide feedback
 */
export async function reviewCode(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<CodeReviewResult> {
  const systemPrompt = `${buildSystemPrompt(context)}

You are conducting a code review. Provide feedback in a structured JSON format.

Analyze the code for:
- Bugs and potential errors
- Security vulnerabilities
- Performance issues
- Code style and best practices
- Maintainability and readability

Return a JSON object with:
{
  "summary": "Brief overview of the code quality",
  "issues": [
    {
      "severity": "error|warning|info|suggestion",
      "line": number or null,
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)"
    }
  ],
  "score": 0-100
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Review the following code and return your analysis as JSON:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.2 });

  // Parse JSON response
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Code review completed',
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 70,
      };
    }
  } catch {
    // If parsing fails, return a default response
  }

  return {
    summary: response,
    issues: [],
    score: 70,
  };
}

/**
 * Code completion (autocomplete)
 */
export async function complete(
  ai: AI,
  code: string,
  position: { line: number; column: number },
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

You are providing code completion suggestions. Given the code and cursor position, suggest the most likely code completion.

Rules:
- Provide only the completion text, not the full code
- Keep suggestions concise and relevant
- Consider the context and patterns in the existing code
- Return just the code to insert, no explanations`;

  // Split code at cursor position
  const lines = code.split('\n');
  const beforeCursor = lines.slice(0, position.line - 1).join('\n') +
    (lines[position.line - 1]?.slice(0, position.column - 1) || '');
  const afterCursor = (lines[position.line - 1]?.slice(position.column - 1) || '') +
    '\n' + lines.slice(position.line).join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Complete the code at the cursor position (marked with |):

${beforeCursor}|${afterCursor}`,
    },
  ];

  const response = await runAI(ai, messages, {
    temperature: 0.2,
    maxTokens: 256,
  });

  return {
    content: response.trim(),
  };
}

/**
 * Generate documentation for code
 */
export async function generateDocs(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

Generate documentation for the provided code:
- Add appropriate doc comments (JSDoc, docstrings, etc.)
- Document function parameters and return types
- Explain the purpose and behavior
- Include usage examples where helpful`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Add documentation to this code:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.3 });

  return {
    content: response,
  };
}

/**
 * Optimize code for performance
 */
export async function optimizeCode(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

Optimize the code for better performance:
- Identify performance bottlenecks
- Suggest algorithmic improvements
- Reduce time and space complexity where possible
- Apply language-specific optimizations
- Maintain code readability`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Optimize this code for performance:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.4 });

  return {
    content: response,
  };
}

/**
 * Translate code to another language
 */
export async function translateCode(
  ai: AI,
  code: string,
  targetLanguage: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

Translate code from one programming language to another:
- Preserve the functionality exactly
- Use idiomatic patterns in the target language
- Include necessary imports/dependencies
- Handle language-specific differences appropriately`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Translate the following code to ${targetLanguage}:

\`\`\`${context?.language || ''}
${code}
\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.3 });

  return {
    content: response,
  };
}

/**
 * Find and explain security vulnerabilities
 */
export async function securityAudit(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

Conduct a security audit of the code:
- Identify potential security vulnerabilities
- Check for common security issues (injection, XSS, etc.)
- Analyze authentication and authorization logic
- Review data validation and sanitization
- Suggest specific fixes for each issue`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Perform a security audit on this code:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.2 });

  return {
    content: response,
  };
}

/**
 * Suggest variable/function names
 */
export async function suggestNames(
  ai: AI,
  code: string,
  context?: CodeContext
): Promise<AIResponse> {
  const systemPrompt = `${buildSystemPrompt(context)}

Suggest better variable, function, and class names:
- Use clear, descriptive names
- Follow naming conventions for the language
- Consider the context and purpose
- Provide multiple alternatives when helpful`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Suggest better names for identifiers in this code:\n\n\`\`\`${context?.language || ''}\n${code}\n\`\`\``,
    },
  ];

  const response = await runAI(ai, messages, { temperature: 0.5 });

  return {
    content: response,
  };
}
