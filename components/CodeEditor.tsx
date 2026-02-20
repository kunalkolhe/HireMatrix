"use client"

import { useState, useRef, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Play, RotateCcw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface CodeEditorProps {
  initialCode?: string
  language?: string
  onCodeChange?: (code: string) => void
  onRun?: (code: string, language: string) => void
  onLanguageChange?: (language: string) => void
  testCases?: Array<{
    input: string
    expected: string
  }>
  className?: string
}

interface CompilationResult {
  success: boolean
  status: string
  output: string
  error: string
  time: string
  memory: string
  exitCode: number
  language: string
  testPassed?: boolean
}

export default function CodeEditor({
  initialCode = '',
  language = 'javascript',
  onCodeChange,
  onRun,
  onLanguageChange,
  testCases = [],
  className = ''
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<CompilationResult | null>(null)
  const [testResults, setTestResults] = useState<Array<{
    input: string
    expected: string
    actual: string
    passed: boolean
  }>>([])
  const editorRef = useRef<any>(null)

  const supportedLanguages = [
    { id: 'javascript', name: 'JavaScript', extension: 'js' },
    { id: 'python', name: 'Python', extension: 'py' },
    { id: 'java', name: 'Java', extension: 'java' },
    { id: 'cpp', name: 'C++', extension: 'cpp' },
    { id: 'c', name: 'C', extension: 'c' },
    { id: 'csharp', name: 'C#', extension: 'cs' },
    { id: 'go', name: 'Go', extension: 'go' },
    { id: 'rust', name: 'Rust', extension: 'rs' },
    { id: 'php', name: 'PHP', extension: 'php' },
    { id: 'ruby', name: 'Ruby', extension: 'rb' },
    { id: 'typescript', name: 'TypeScript', extension: 'ts' },
    { id: 'sql', name: 'SQL', extension: 'sql' }
  ]

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  // Keep internal editor state in sync with the latest initialCode / language.
  // This is important when switching between questions so we don't keep
  // showing code and outputs from the previous question.
  useEffect(() => {
    setCode(initialCode)
    setResult(null)
    setTestResults([])
  }, [initialCode, selectedLanguage])

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage)
    onLanguageChange?.(newLanguage)
  }

  const runCode = async () => {
    if (!code.trim()) {
      setResult({
        success: false,
        status: 'Error',
        output: '',
        error: 'No code to run',
        time: '0.000',
        memory: '0',
        exitCode: 1,
        language: selectedLanguage
      })
      return
    }

    setIsRunning(true)
    setResult(null)
    setTestResults([])

    try {
      // Try Judge0 first, fallback to local execution
      let apiEndpoint = '/api/compile'
      let testResults = []
      
      for (const testCase of testCases) {
        let response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            language: selectedLanguage,
            input: testCase.input,
            expectedOutput: testCase.expected
          })
        })

        // If Judge0 fails, try fallback
        if (!response.ok && apiEndpoint === '/api/compile') {
          console.log('Judge0 failed, trying fallback...')
          apiEndpoint = '/api/compile-fallback'
          response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              language: selectedLanguage,
              input: testCase.input,
              expectedOutput: testCase.expected
            })
          })
        }

        if (!response.ok) {
          throw new Error(`Compilation failed: ${response.status}`)
        }

        const compilationResult: CompilationResult = await response.json()
        
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: compilationResult.output.trim(),
          passed: compilationResult.testPassed || false
        })

        // Set the result to the last compilation result
        setResult(compilationResult)
      }

      setTestResults(testResults)
      onRun?.(code, selectedLanguage)

    } catch (error) {
      console.error('Compilation error:', error)
      setResult({
        success: false,
        status: 'Error',
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        time: '0.000',
        memory: '0',
        exitCode: 1,
        language: selectedLanguage
      })
    } finally {
      setIsRunning(false)
    }
  }

  const resetEditor = () => {
    setCode(initialCode)
    setResult(null)
    setTestResults([])
    onCodeChange?.(initialCode)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'compilation error':
        return 'bg-red-100 text-red-800'
      case 'runtime error':
        return 'bg-red-100 text-red-800'
      case 'time limit exceeded':
        return 'bg-orange-100 text-orange-800'
      case 'memory limit exceeded':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Editor Controls */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-gray-800">
              <Play className="w-5 h-5 mr-2 text-red-600" />
              Code Editor
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-40 border-gray-200 focus:border-red-500 focus:ring-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={runCode}
                disabled={isRunning || !code.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isRunning ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Code
                  </>
                )}
              </Button>
              
              <Button
                onClick={resetEditor}
                variant="outline"
                className="border-gray-200 hover:border-red-500 hover:bg-red-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Editor
              height="400px"
              language={selectedLanguage}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compilation Result */}
      {result && (
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-gray-800">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2 text-red-600" />
                )}
                Compilation Result
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  {result.time}s
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Output */}
            {result.output && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Output:</h4>
                <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-sm">
                  {result.output}
                </pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                  Error:
                </h4>
                <pre className="bg-red-50 text-red-800 p-3 rounded-lg overflow-x-auto text-sm border border-red-200">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Test Results:</h4>
                <div className="space-y-2">
                  {testResults.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Input: </span>
                          <code className="text-xs bg-white px-2 py-1 rounded border">
                            {test.input}
                          </code>
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium text-gray-700">Expected: </span>
                          <code className="text-xs bg-white px-2 py-1 rounded border">
                            {test.expected}
                          </code>
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium text-gray-700">Actual: </span>
                          <code className="text-xs bg-white px-2 py-1 rounded border">
                            {test.actual}
                          </code>
                        </div>
                      </div>
                      <div className="ml-4">
                        {test.passed ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
