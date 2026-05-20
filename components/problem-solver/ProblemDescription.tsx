import { Problem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MemoryStick } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProblemDescriptionProps {
  problem: Problem;
}

export function ProblemDescription({ problem }: ProblemDescriptionProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <Badge className={getDifficultyColor(problem.difficulty)}>
            {problem.difficulty}
          </Badge>
          <Badge variant="outline">{problem.category}</Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Time Limit: {problem.time_limit}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <MemoryStick className="w-4 h-4" />
            <span>Memory Limit: {problem.memory_limit}MB</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const isInline = !className?.includes('language-');
                  return (
                    <code
                      className={`${className} ${isInline ? 'bg-muted px-1 py-0.5 rounded text-sm' : 'block bg-muted p-3 rounded text-sm overflow-x-auto'}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre({ node, children, ...props }) {
                  return (
                    <pre
                      className="bg-muted p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap"
                      {...props}
                    >
                      {children}
                    </pre>
                  );
                },
                table({ node, children, ...props }) {
                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ node, children, ...props }) {
                  return (
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left" {...props}>
                      {children}
                    </th>
                  );
                },
                td({ node, children, ...props }) {
                  return (
                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props}>
                      {children}
                    </td>
                  );
                },
                blockquote({ node, children, ...props }) {
                  return (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400" {...props}>
                      {children}
                    </blockquote>
                  );
                },
                ul({ node, children, ...props }) {
                  return (
                    <ul className="list-disc list-inside space-y-1" {...props}>
                      {children}
                    </ul>
                  );
                },
                ol({ node, children, ...props }) {
                  return (
                    <ol className="list-decimal list-inside space-y-1" {...props}>
                      {children}
                    </ol>
                  );
                },
                li({ node, children, ...props }) {
                  return (
                    <li className="mb-1" {...props}>
                      {children}
                    </li>
                  );
                },
                h1({ node, children, ...props }) {
                  return (
                    <h1 className="text-2xl font-bold mb-4 mt-6" {...props}>
                      {children}
                    </h1>
                  );
                },
                h2({ node, children, ...props }) {
                  return (
                    <h2 className="text-xl font-semibold mb-3 mt-5" {...props}>
                      {children}
                    </h2>
                  );
                },
                h3({ node, children, ...props }) {
                  return (
                    <h3 className="text-lg font-medium mb-2 mt-4" {...props}>
                      {children}
                    </h3>
                  );
                },
                p({ node, children, ...props }) {
                  return (
                    <p className="mb-4 last:mb-0" {...props}>
                      {children}
              </p>
                  );
                },
              }}
            >
              {problem.description}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {problem.constraints && (
        <Card>
          <CardHeader>
            <CardTitle>Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ul className="list-disc list-inside space-y-2">
                {problem.constraints.split('\n').filter(constraint => constraint.trim()).map((constraint, index) => (
                  <li key={index} className="text-sm">
                    {constraint.trim()}
                  </li>
              ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problem.sample_input.split('\n').map((line, index) => (
                <div key={index} className="bg-muted p-2 rounded text-sm font-mono">
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problem.sample_output.split('\n').map((line, index) => (
                <div key={index} className="bg-muted p-2 rounded text-sm font-mono">
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}