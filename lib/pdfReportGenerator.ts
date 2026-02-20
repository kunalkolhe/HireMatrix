/**
 * PDF Report Generator Service
 * Generates downloadable PDF reports for candidate submissions
 */

import { CandidateSubmission } from './submissionService'

export interface PDFReportOptions {
    includeAnswers?: boolean
    includeCharts?: boolean
    includeBenchmark?: boolean
}

/**
 * Generate PDF report content (HTML format for conversion)
 * In production, this would use a library like jsPDF or puppeteer
 */
export function generatePDFReportHTML(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string; content?: any }>,
    options: PDFReportOptions = {}
): string {
    const candidateName = submission.candidateInfo?.name || 'Unknown Candidate'
    const candidateEmail = submission.candidateInfo?.email || 'N/A'
    const jobTitle = submission.jobTitle || 'N/A'
    const company = submission.company || 'N/A'
    const submittedAt = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'
    const percentage = submission.scores?.percentage || 0
    const totalScore = submission.scores?.totalScore || 0
    const totalPossible = submission.scores?.totalPossible || 0
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Assessment Report - ${candidateName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-item {
            padding: 10px;
            background: #f3f4f6;
            border-radius: 5px;
        }
        .info-label {
            font-weight: bold;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
        }
        .info-value {
            font-size: 16px;
            color: #111827;
            margin-top: 5px;
        }
        .score-section {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 30px 0;
        }
        .score-large {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .section {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .skill-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            margin: 5px 0;
            background: #f9fafb;
            border-radius: 5px;
        }
        .skill-name {
            font-weight: 500;
        }
        .skill-score {
            color: #3b82f6;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge-pass {
            background: #d1fae5;
            color: #065f46;
        }
        .badge-fail {
            background: #fee2e2;
            color: #991b1b;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Assessment Report</h1>
        <p style="color: #6b7280;">Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="info-grid">
        <div class="info-item">
            <div class="info-label">Candidate Name</div>
            <div class="info-value">${candidateName}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${candidateEmail}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Job Position</div>
            <div class="info-value">${jobTitle}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Company</div>
            <div class="info-value">${company}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Submitted At</div>
            <div class="info-value">${submittedAt}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
                <span class="badge ${percentage >= 50 ? 'badge-pass' : 'badge-fail'}">
                    ${(submission.status || 'pending').toUpperCase()}
                </span>
            </div>
        </div>
    </div>
    
    <div class="score-section">
        <div style="font-size: 18px; opacity: 0.9;">Overall Score</div>
        <div class="score-large">${percentage}%</div>
        <div style="font-size: 14px; opacity: 0.8;">${totalScore} / ${totalPossible} points</div>
    </div>
    
    ${submission.scores?.sectionScores ? `
    <div class="section">
        <div class="section-title">Section-wise Performance</div>
        <table>
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Score</th>
                    <th>Total</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>MCQ</td>
                    <td>${submission.scores.sectionScores.mcq?.score || 0}</td>
                    <td>${submission.scores.sectionScores.mcq?.total || 0}</td>
                    <td>${submission.scores.sectionScores.mcq?.total > 0 
                        ? Math.round(((submission.scores.sectionScores.mcq?.score || 0) / submission.scores.sectionScores.mcq.total) * 100) 
                        : 0}%</td>
                </tr>
                <tr>
                    <td>Subjective</td>
                    <td>${submission.scores.sectionScores.subjective?.score || 0}</td>
                    <td>${submission.scores.sectionScores.subjective?.total || 0}</td>
                    <td>${submission.scores.sectionScores.subjective?.total > 0 
                        ? Math.round(((submission.scores.sectionScores.subjective?.score || 0) / submission.scores.sectionScores.subjective.total) * 100) 
                        : 0}%</td>
                </tr>
                <tr>
                    <td>Coding</td>
                    <td>${submission.scores.sectionScores.coding?.score || 0}</td>
                    <td>${submission.scores.sectionScores.coding?.total || 0}</td>
                    <td>${submission.scores.sectionScores.coding?.total > 0 
                        ? Math.round(((submission.scores.sectionScores.coding?.score || 0) / submission.scores.sectionScores.coding.total) * 100) 
                        : 0}%</td>
                </tr>
            </tbody>
        </table>
    </div>
    ` : ''}
    
    ${submission.scores?.skillScores && Object.keys(submission.scores.skillScores).length > 0 ? `
    <div class="section">
        <div class="section-title">Skill-wise Performance</div>
        ${Object.entries(submission.scores.skillScores)
            .sort(([, a], [, b]) => b.percentage - a.percentage)
            .map(([skill, data]) => `
            <div class="skill-item">
                <span class="skill-name">${skill}</span>
                <span class="skill-score">${data.percentage}%</span>
            </div>
            `).join('')}
    </div>
    ` : ''}
    
    ${options.includeAnswers ? `
    <div class="section">
        <div class="section-title">Answer Details</div>
        ${questions.map((q, idx) => {
            const answer = submission.answers?.[q.id]
            if (!answer) return ''
            
            let answerText = ''
            if (q.type === 'mcq') {
                const selected = answer.response?.selected_option
                const options = q.content?.options || []
                answerText = options[selected] || 'Not answered'
            } else if (q.type === 'subjective') {
                answerText = answer.response?.text || 'No answer'
            } else if (q.type === 'coding') {
                answerText = answer.response?.code || 'No code submitted'
            }
            
            return `
            <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 5px;">
                <strong>Question ${idx + 1} (${q.type.toUpperCase()})</strong>
                <p style="margin: 10px 0; color: #374151;">${q.content?.question || q.content?.problem_statement || 'N/A'}</p>
                <div style="margin-top: 10px; padding: 10px; background: white; border-left: 3px solid #3b82f6;">
                    <strong>Answer:</strong>
                    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${answerText}</pre>
                </div>
            </div>
            `
        }).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
        <p>This report was generated by HireMatrix Assessment Platform</p>
        <p>Confidential - For internal use only</p>
    </div>
</body>
</html>
    `
    
    return html.trim()
}

/**
 * Download PDF report (client-side)
 * Uses browser's print-to-PDF functionality
 */
export function downloadPDFReport(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string; content?: any }>,
    options: PDFReportOptions = {}
): void {
    const html = generatePDFReportHTML(submission, questions, options)
    
    // Create a new window with the HTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Please allow popups to download PDF report')
        return
    }
    
    printWindow.document.write(html)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
        printWindow.print()
    }, 250)
}

/**
 * Alternative: Generate PDF using jsPDF (requires library)
 * This is a placeholder - in production, install jsPDF and html2canvas
 */
export async function generatePDFWithLibrary(
    submission: CandidateSubmission,
    questions: Array<{ id: string; type: string; content?: any }>,
    options: PDFReportOptions = {}
): Promise<Blob | null> {
    // This would require jsPDF and html2canvas libraries
    // For now, return null and use downloadPDFReport instead
    console.warn('PDF library not available. Use downloadPDFReport() for browser print-to-PDF.')
    return null
}
