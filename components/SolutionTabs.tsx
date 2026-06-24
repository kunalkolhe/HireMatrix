"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'

interface SolutionTabsProps {
  solutions: {
    [language: string]: string
  }
  selectedLanguage?: string
  className?: string
}

const languageNames: { [key: string]: string } = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  typescript: 'TypeScript',
  sql: 'SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL'
}

const languageExtensions: { [key: string]: string } = {
  javascript: 'js',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  php: 'php',
  ruby: 'rb',
  typescript: 'ts',
  sql: 'sql',
  mysql: 'sql',
  postgresql: 'sql'
}

export default function SolutionTabs({ solutions, selectedLanguage = 'javascript', className = '' }: SolutionTabsProps) {
  const [showSolutions, setShowSolutions] = useState(false)
  const [copiedLanguage, setCopiedLanguage] = useState<string | null>(null)

  // Use the selected language from the editor
  const activeLanguage = selectedLanguage
  const availableLanguages = Object.keys(solutions).filter(lang => solutions[lang]?.trim())
  
  // Update active language when selectedLanguage changes
  useEffect(() => {
    if (selectedLanguage && solutions[selectedLanguage]) {
      // Language is available, use it
    } else {
      // Fallback to first available language
      const firstAvailable = availableLanguages[0]
      if (firstAvailable) {
        // This will be handled by the parent component
      }
    }
  }, [selectedLanguage, solutions, availableLanguages])

  const copyToClipboard = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedLanguage(language)
      setTimeout(() => setCopiedLanguage(null), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const getLanguageIcon = (language: string) => {
    // You can add language-specific icons here
    return '💻'
  }

  if (!solutions || Object.keys(solutions).length === 0) {
    return null
  }

  // Check if the selected language has a solution
  const hasSolution = activeLanguage && solutions[activeLanguage]?.trim()
  
  if (!hasSolution) {
    return (
      <Card className={`bg-background border-border shadow-lg ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Eye className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20" />
            Solutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No solution available for {languageNames[activeLanguage] || activeLanguage}</p>
            <p className="text-sm text-muted-foreground">Solutions are available for: {availableLanguages.map(lang => languageNames[lang] || lang).join(', ')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-background border-border shadow-lg ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-foreground">
            <Eye className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20" />
            Solution ({languageNames[activeLanguage] || activeLanguage})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSolutions(!showSolutions)}
            className="flex items-center"
          >
            {showSolutions ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Solution
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Solution
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {showSolutions && (
        <CardContent className="space-y-4">
          {/* Solution Code */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {languageNames[activeLanguage] || activeLanguage}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  .{languageExtensions[activeLanguage] || 'txt'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(solutions[activeLanguage], activeLanguage)}
                className="flex items-center"
              >
                {copiedLanguage === activeLanguage ? (
                  <>
                    <Check className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden">
              <pre className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <code>{solutions[activeLanguage]}</code>
              </pre>
            </div>
          </div>

        </CardContent>
      )}
    </Card>
  )
}

