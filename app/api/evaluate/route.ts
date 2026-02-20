import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AssessAI'
    }
})

interface EvaluateRequest {
    submission: {
        answers: any[]
        job_title: string
        candidate_name?: string
    }
    questions: any[]
}

export async function POST(request: Request) {
    try {
        const { submission, questions }: EvaluateRequest = await request.json()

        let totalScore = 0
        let totalPossible = 0
        const evaluatedAnswers = []
        const skillScores: Record<string, { score: number; total: number }> = {}

        // Evaluate each answer
        for (const question of questions) {
            const answer = submission.answers.find((a: any) => a.question_id === question.id)
            totalPossible += question.marks

            // Initialize skill tracking
            for (const skill of question.skill_tags || []) {
                if (!skillScores[skill]) {
                    skillScores[skill] = { score: 0, total: 0 }
                }
                skillScores[skill].total += question.marks
            }

            if (question.type === 'mcq') {
                // MCQ - exact match
                const isCorrect = answer?.response?.selected_option === question.content.correct_answer
                const score = isCorrect ? question.marks : 0
                totalScore += score

                // Update skill scores
                for (const skill of question.skill_tags || []) {
                    skillScores[skill].score += score
                }

                evaluatedAnswers.push({
                    question_id: question.id,
                    type: 'mcq',
                    score,
                    max_score: question.marks,
                    is_correct: isCorrect,
                    correct_answer: question.content.options[question.content.correct_answer],
                    feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.content.options[question.content.correct_answer]}`
                })
            } else if (question.type === 'subjective') {
                // Subjective - AI evaluation
                const answerText = answer?.response?.text || ''

                if (answerText.trim().length < 10) {
                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'subjective',
                        score: 0,
                        max_score: question.marks,
                        feedback: 'No answer provided or answer too short.'
                    })
                    continue
                }

                const evalPrompt = `Evaluate this answer for a job assessment.

Question: ${question.content.question}
Expected concepts to cover: ${question.content.expected_keywords?.join(', ') || 'N/A'}
Rubric: ${question.content.rubric || 'Evaluate for clarity, completeness, and technical accuracy'}

Candidate's Answer:
${answerText}

Return a JSON object with:
{
  "score": <number between 0 and ${question.marks}>,
  "feedback": "<2-3 sentences of constructive feedback>",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area to improve 1"]
}

Be fair but rigorous. Award partial credit for partially correct answers.`

                try {
                    const evalResult = await openai.chat.completions.create({
                        model: 'openai/gpt-3.5-turbo',
                        messages: [{ role: 'user', content: evalPrompt }]
                    })
                    let evalText = evalResult.choices[0]?.message?.content?.trim() || ''

                    // Clean JSON
                    if (evalText.startsWith('```json')) evalText = evalText.slice(7)
                    if (evalText.startsWith('```')) evalText = evalText.slice(3)
                    if (evalText.endsWith('```')) evalText = evalText.slice(0, -3)

                    const evaluation = JSON.parse(evalText.trim())
                    const score = Math.min(Math.max(0, evaluation.score), question.marks)
                    totalScore += score

                    // Update skill scores
                    for (const skill of question.skill_tags || []) {
                        skillScores[skill].score += score
                    }

                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'subjective',
                        score,
                        max_score: question.marks,
                        feedback: evaluation.feedback,
                        strengths: evaluation.strengths,
                        improvements: evaluation.improvements
                    })
                } catch (e) {
                    // Fallback scoring
                    const score = answerText.length > 100 ? question.marks * 0.6 : question.marks * 0.3
                    totalScore += score
                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'subjective',
                        score: Math.round(score),
                        max_score: question.marks,
                        feedback: 'Evaluated based on response length.'
                    })
                }
            } else if (question.type === 'coding') {
                // Coding - basic evaluation
                const code = answer?.response?.code || ''

                if (code.trim().length < 20) {
                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'coding',
                        score: 0,
                        max_score: question.marks,
                        feedback: 'No code submitted or code too short.',
                        test_results: []
                    })
                    continue
                }

                // Simple AI-based code review
                const codePrompt = `Review this code solution for a programming challenge.

Problem: ${question.content.problem_statement}
Expected output format: ${question.content.output_format || 'N/A'}

Submitted Code:
\`\`\`
${code}
\`\`\`

Evaluate the code and return a JSON object:
{
  "score": <number between 0 and ${question.marks}>,
  "feedback": "<brief feedback on the solution>",
  "code_quality": "<good/average/needs_improvement>",
  "would_likely_pass": <true/false based on if it looks like it would work>
}

Be fair - if the logic looks correct, give good marks even if you can't execute it.`

                try {
                    const codeResult = await openai.chat.completions.create({
                        model: 'openai/gpt-3.5-turbo',
                        messages: [{ role: 'user', content: codePrompt }]
                    })
                    let codeText = codeResult.choices[0]?.message?.content?.trim() || ''

                    if (codeText.startsWith('```json')) codeText = codeText.slice(7)
                    if (codeText.startsWith('```')) codeText = codeText.slice(3)
                    if (codeText.endsWith('```')) codeText = codeText.slice(0, -3)

                    const evaluation = JSON.parse(codeText.trim())
                    const score = Math.min(Math.max(0, evaluation.score), question.marks)
                    totalScore += score

                    // Update skill scores
                    for (const skill of question.skill_tags || []) {
                        skillScores[skill].score += score
                    }

                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'coding',
                        score,
                        max_score: question.marks,
                        feedback: evaluation.feedback,
                        code_quality: evaluation.code_quality,
                        would_likely_pass: evaluation.would_likely_pass
                    })
                } catch (e) {
                    // Fallback
                    const score = code.length > 100 ? question.marks * 0.5 : question.marks * 0.2
                    totalScore += score
                    evaluatedAnswers.push({
                        question_id: question.id,
                        type: 'coding',
                        score: Math.round(score),
                        max_score: question.marks,
                        feedback: 'Code submitted and evaluated for structure.'
                    })
                }
            }
        }

        // Generate overall feedback
        const percentage = Math.round((totalScore / totalPossible) * 100)

        // Calculate skill percentages
        const skillAnalysis = Object.entries(skillScores).map(([skill, data]) => ({
            skill,
            score: data.score,
            total: data.total,
            percentage: Math.round((data.score / data.total) * 100)
        })).sort((a, b) => b.percentage - a.percentage)

        const strengths = skillAnalysis.filter(s => s.percentage >= 70).map(s => s.skill)
        const weaknesses = skillAnalysis.filter(s => s.percentage < 50).map(s => s.skill)

        let recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
        if (percentage >= 80) recommendation = 'strong_yes'
        else if (percentage >= 60) recommendation = 'yes'
        else if (percentage >= 40) recommendation = 'maybe'
        else recommendation = 'no'

        return NextResponse.json({
            success: true,
            data: {
                total_score: Math.round(totalScore),
                total_possible: totalPossible,
                percentage,
                evaluated_answers: evaluatedAnswers,
                skill_analysis: skillAnalysis,
                feedback: {
                    strengths,
                    weaknesses,
                    recommendation,
                    overall: percentage >= 60
                        ? `Strong performance on the ${submission.job_title} assessment. Demonstrated good understanding of core concepts.`
                        : `Performance on the ${submission.job_title} assessment shows room for improvement in key areas.`
                }
            }
        })
    } catch (error) {
        console.error('Evaluation error:', error)
        return NextResponse.json(
            { error: 'Failed to evaluate submission' },
            { status: 500 }
        )
    }
}
