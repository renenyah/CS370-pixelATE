import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are analyzing a Fall 2025 course syllabus for MATH 315.

CRITICAL DATE PARSING RULES:
1. The course schedule is in a table with TWO columns: Tuesday (left) and Thursday (right)
2. When an assignment says "(due)" - use the EXACT date from that cell
3. When an assignment says "(out)" on one day and "(due)" on another - use the "(due)" date
4. The syllabus states: "Homework is due on Thursdays at 5:59 p.m."
5. Most assignments are DUE on THURSDAYS, not Tuesdays
6. Look at the column headers carefully - dates in the Thursday column are 2 days after Tuesday dates
7. Examples from the schedule:
   - Sep 9th is a Tuesday, Sep 11th is a Thursday
   - Problem Set 1 says "(due)" on Sep 11th (Thursday)
   - Problem Set 2 says "(due)" on Sep 18th (Thursday)

Extract all assignments with their correct due dates. The year is 2025.

Return ONLY a JSON array:
[
  {
    "name": "Assignment name",
    "dueDate": "YYYY-MM-DD",
    "description": "Brief description",
    "type": "homework/exam/activity"
  }
]

No other text, just the JSON array.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    let assignments;
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      assignments = JSON.parse(cleanText);
    } catch (e) {
      return NextResponse.json({
        success: true,
        rawText: text,
        parseError: 'Could not parse as JSON'
      });
    }

    return NextResponse.json({
      success: true,
      assignments: assignments,
      count: assignments.length
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF: ' + error.message },
      { status: 500 }
    );
  }
}
