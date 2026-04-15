import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY as string;
const ai = new GoogleGenAI({ apiKey });

export interface KeywordMatch {
  name: string;
  found: boolean;
  frequency: number;
  expectedFrequency: number;
}

export interface FormattingCheck {
  category: string;
  status: 'pass' | 'fail';
  message: string;
}

export interface ResumeAnalysis {
  before: {
    atsScore: number;
    matchRate: number;
    searchabilityScore: number;
    hardSkillsScore: number;
    softSkillsScore: number;
    recruiterTipsScore: number;
    searchabilityIssues: number;
    hardSkillsIssues: number;
    softSkillsIssues: number;
    recruiterTipsIssues: number;
    keywordMatch: number;
    readabilityScore: number;
    impactScore: number;
    scoreBreakdown?: {
      searchability: number;
      hardSkills: number;
      softSkills: number;
      recruiterTips: number;
    };
    missingKeywords: string[];
    keywordAnalysis: {
      hardSkills: KeywordMatch[];
      softSkills: KeywordMatch[];
      otherKeywords: KeywordMatch[];
    };
    formattingCheck: FormattingCheck[];
    recruiterTips: string[];
    weakBulletPoints: { original: string; improved: string; reason: string }[];
    sectionSuggestions: {
      summary: string;
      skills: string;
      projects: string;
      experience: string;
      achievements: string;
    };
    atsTips: { category: string; tip: string; status: 'success' | 'warning' | 'error' }[];
  };
  after: {
    atsScore: number;
    matchRate: number;
    searchabilityScore: number;
    hardSkillsScore: number;
    softSkillsScore: number;
    recruiterTipsScore: number;
    searchabilityIssues: number;
    hardSkillsIssues: number;
    softSkillsIssues: number;
    recruiterTipsIssues: number;
    keywordMatch: number;
    readabilityScore: number;
    impactScore: number;
    scoreBreakdown?: {
      searchability: number;
      hardSkills: number;
      softSkills: number;
      recruiterTips: number;
    };
    addedKeywords: string[];
  };
  optimizedResume: string;
  structuredResume: {
    personalInfo: {
      fullName: string;
      email: string;
      phone: string;
      location: string;
      linkedin?: string;
      website?: string;
      links?: { label: string; url: string }[];
    };
    summary: string;
    experience: {
      company: string;
      position: string;
      location: string;
      startDate: string;
      endDate: string;
      highlights: string[];
    }[];
    education: {
      school: string;
      degree: string;
      location: string;
      graduationDate: string;
    }[];
    skills: {
      category: string;
      items: string[];
    }[];
    projects: {
      name: string;
      description: string;
      technologies: string[];
      link?: string;
    }[];
    certificates?: string[];
    achievements?: string[];
    strengths?: string[];
  };
  changesMade: { section: string; change: string; reason: string }[];
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    before: {
      type: Type.OBJECT,
      properties: {
        atsScore: { type: Type.NUMBER },
        matchRate: { type: Type.NUMBER, description: "Initial Jobscan-style match rate percentage." },
        searchabilityScore: { type: Type.NUMBER },
        hardSkillsScore: { type: Type.NUMBER },
        softSkillsScore: { type: Type.NUMBER },
        recruiterTipsScore: { type: Type.NUMBER },
        searchabilityIssues: { type: Type.NUMBER },
        hardSkillsIssues: { type: Type.NUMBER },
        softSkillsIssues: { type: Type.NUMBER },
        recruiterTipsIssues: { type: Type.NUMBER },
        keywordMatch: { type: Type.NUMBER },
        readabilityScore: { type: Type.NUMBER },
        impactScore: { type: Type.NUMBER },
        scoreBreakdown: {
          type: Type.OBJECT,
          properties: {
            searchability: { type: Type.NUMBER },
            hardSkills: { type: Type.NUMBER },
            softSkills: { type: Type.NUMBER },
            recruiterTips: { type: Type.NUMBER },
          },
          required: ["searchability", "hardSkills", "softSkills", "recruiterTips"],
        },
        missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        keywordAnalysis: {
          type: Type.OBJECT,
          properties: {
            hardSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  found: { type: Type.BOOLEAN },
                  frequency: { type: Type.NUMBER },
                  expectedFrequency: { type: Type.NUMBER },
                },
                required: ["name", "found", "frequency", "expectedFrequency"],
              },
            },
            softSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  found: { type: Type.BOOLEAN },
                  frequency: { type: Type.NUMBER },
                  expectedFrequency: { type: Type.NUMBER },
                },
                required: ["name", "found", "frequency", "expectedFrequency"],
              },
            },
            otherKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  found: { type: Type.BOOLEAN },
                  frequency: { type: Type.NUMBER },
                  expectedFrequency: { type: Type.NUMBER },
                },
                required: ["name", "found", "frequency", "expectedFrequency"],
              },
            },
          },
          required: ["hardSkills", "softSkills", "otherKeywords"],
        },
        formattingCheck: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['pass', 'fail'] },
              message: { type: Type.STRING },
            },
            required: ["category", "status", "message"],
          },
        },
        recruiterTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        weakBulletPoints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              improved: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
          },
        },
        sectionSuggestions: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            skills: { type: Type.STRING },
            projects: { type: Type.STRING },
            experience: { type: Type.STRING },
            achievements: { type: Type.STRING, description: "Suggestions for a new Key Achievements section with quantifiable results." },
          },
        },
        atsTips: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              tip: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['success', 'warning', 'error'] },
            },
            required: ["category", "tip", "status"],
          },
        },
      },
      required: ["atsScore", "matchRate", "searchabilityScore", "hardSkillsScore", "softSkillsScore", "recruiterTipsScore", "searchabilityIssues", "hardSkillsIssues", "softSkillsIssues", "recruiterTipsIssues", "keywordMatch", "readabilityScore", "impactScore", "missingKeywords", "weakBulletPoints", "sectionSuggestions", "atsTips"],
    },
    after: {
      type: Type.OBJECT,
      properties: {
        atsScore: { type: Type.NUMBER, description: "The optimized ATS score, aiming for 95-100." },
        matchRate: { type: Type.NUMBER, description: "Jobscan-style match rate percentage." },
        searchabilityScore: { type: Type.NUMBER },
        hardSkillsScore: { type: Type.NUMBER },
        softSkillsScore: { type: Type.NUMBER },
        recruiterTipsScore: { type: Type.NUMBER },
        searchabilityIssues: { type: Type.NUMBER },
        hardSkillsIssues: { type: Type.NUMBER },
        softSkillsIssues: { type: Type.NUMBER },
        recruiterTipsIssues: { type: Type.NUMBER },
        keywordMatch: { type: Type.NUMBER },
        readabilityScore: { type: Type.NUMBER },
        impactScore: { type: Type.NUMBER },
        scoreBreakdown: {
          type: Type.OBJECT,
          properties: {
            searchability: { type: Type.NUMBER },
            hardSkills: { type: Type.NUMBER },
            softSkills: { type: Type.NUMBER },
            recruiterTips: { type: Type.NUMBER },
          },
          required: ["searchability", "hardSkills", "softSkills", "recruiterTips"],
        },
        addedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["atsScore", "matchRate", "searchabilityScore", "hardSkillsScore", "softSkillsScore", "recruiterTipsScore", "searchabilityIssues", "hardSkillsIssues", "softSkillsIssues", "recruiterTipsIssues", "keywordMatch", "readabilityScore", "impactScore", "scoreBreakdown", "addedKeywords"],
    },
    optimizedResume: { type: Type.STRING },
    structuredResume: {
      type: Type.OBJECT,
      properties: {
        personalInfo: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            location: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            website: { type: Type.STRING },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
                required: ["label", "url"],
              },
            },
          },
          required: ["fullName", "email", "phone", "location"],
        },
        summary: { type: Type.STRING },
        experience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              position: { type: Type.STRING },
              location: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["company", "position", "startDate", "endDate", "highlights"],
          },
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              school: { type: Type.STRING },
              degree: { type: Type.STRING },
              location: { type: Type.STRING },
              graduationDate: { type: Type.STRING },
            },
            required: ["school", "degree", "graduationDate"],
          },
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["category", "items"],
          },
        },
        projects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
              link: { type: Type.STRING },
            },
            required: ["name", "description", "technologies"],
          },
          description: "Minimum 2 projects are required. If the user provided fewer, expand on their existing work or create relevant project entries based on their skills.",
        },
        certificates: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of certifications and licenses.",
        },
        achievements: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of competitions, hackathons, or leadership roles.",
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2-3 professional strengths.",
        },
      },
      required: ["personalInfo", "summary", "experience", "education", "skills", "projects"],
    },
    changesMade: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          change: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
      },
    },
  },
  required: ["before", "after", "optimizedResume", "structuredResume", "changesMade"],
};

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export async function extractTextFromImage(file: File): Promise<string> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  const base64Data = await base64EncodedDataPromise;
  
  const prompt = "Extract all text from this resume image. Maintain the structure as much as possible. Return only the extracted text.";
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]
    }
  });
  
  return response.text || "";
}

export async function analyzeAndOptimizeResume(
  resume: string | FilePart, 
  jobDescription: string | FilePart, 
  additionalInstructions?: string,
  instructionFiles?: FilePart[],
  resumeLength?: string,
  companyName?: string,
  jobUrl?: string
): Promise<ResumeAnalysis> {
  const mainPrompt = `
    TARGET RESUME LENGTH: ${resumeLength || 'Auto-detect'}
    COMPANY NAME: ${companyName || 'Not provided'}
    JOB URL: ${jobUrl || 'Not provided'}

    Analyze and optimize the following resume against the job description to maximize the chances of being shortlisted.
    
    ${additionalInstructions ? `USER SPECIFIC INSTRUCTIONS: ${additionalInstructions}` : ''}

    STRICT REQUIREMENTS FOR 95%+ ATS SCORE & SHORTLISTING:
    1. OPTIMIZATION GOAL: The 'after.atsScore' and 'after.matchRate' MUST be between 95 and 100. This is the primary objective.
    2. KEYWORD INTEGRATION: You MUST identify every core technical skill, tool, and methodology in the JD and weave them naturally into the 'optimizedResume'. If a skill is missing from the original resume, add it to the 'Skills' section and suggest a bullet point in the 'Experience' or 'Projects' section that demonstrates its use (using placeholders like [X%] for metrics).
    3. MEASURABLE RESULTS: Every single bullet point in the 'optimizedResume' should ideally have a quantifiable metric. If the user didn't provide one, suggest a realistic placeholder (e.g., "Increased efficiency by 20% using [Technology]").
    4. DATA INTEGRITY: Maintain the user's actual job titles and companies, but optimize the descriptions for maximum impact.
    5. CONTACT INFO: Ensure Name (bold), Phone, Email, and Location (City, State) are present. If missing, flag it in 'atsTips'.
    6. SECTION HEADINGS: Use standard headings like "Education" and "Work History" or "Professional Experience".
    7. JOB TITLE MATCH: Include the exact job title from the JD (e.g., 'IT Analyst') in the summary or as a target title to ensure searchability.
    8. SKILLS CATEGORIZATION: Use exactly these categories:
       - Programming Languages
       - Web Technologies
       - Tools/Technologies
       - Soft Skills
    9. FORMATTING & LAYOUT:
        - Use standard fonts (Open Sans, Roboto, or Lato).
        - Bold job titles, company names, and candidate name.
        - Left-align all text.
        - NO tables, NO images, NO special characters.

    GENUINE ATS SCORING RUBRIC (100 Points Total - JOBSCAN STYLE):
    
    1. SEARCHABILITY (25 Points):
       - Contact Info (5 pts): Name, Email, Phone, Location.
       - Summary (5 pts): Tailored summary with job title.
       - Section Headings (5 pts): Standard headings used.
       - Job Title Match (5 pts): Exact target title present.
       - Date Formatting (5 pts): Standard MM/YY or Month YYYY.
    
    2. HARD SKILLS (35 Points):
       - Technical Skills Match (25 pts): Presence of core technical skills from JD.
       - Skill Frequency (10 pts): Keywords appear with appropriate density.
    
    3. SOFT SKILLS (15 Points):
       - Interpersonal Skills Match (15 pts): Leadership, Communication, etc.
    
    4. RECRUITER TIPS (25 Points):
       - Measurable Results (15 pts): At least 5 quantifiable achievements.
       - Web Presence (5 pts): LinkedIn/Portfolio links.
       - Professional Tone & Formatting (5 pts): No cliches, standard fonts, no tables.

    MATCH RATE CALCULATION:
    - Calculate 'matchRate' based on the percentage of JD keywords found in the resume. 
    - 100% matchRate means all core skills/technologies from JD are present.
    - The 'after.matchRate' should be 95%+ after your optimization.

    SCORE BREAKDOWN CALCULATION (Map to these fields in 'scoreBreakdown'):
    - searchability: Score out of 25.
    - hardSkills: Score out of 35.
    - softSkills: Score out of 15.
    - recruiterTips: Score out of 25.
    
    The 'atsScore' is the sum of these four categories.

    ATS TIPS CHECKLIST (Provide feedback for each in 'before.atsTips'):
    - Contact Info: Check for Address, Email, Phone.
    - Summary: Check if present and tailored.
    - Section Headings: Check for "Education" and "Work History/Professional Experience".
    - Job Title Match: Check if exact target title is present.
    - Date Formatting: Check for "MM/YY" or "Month YYYY".
    - Education Match: Check if education matches JD requirements.
    - File Type: Assume .pdf is preferred.
    - Skill Match: Check for core technical skills from JD.
    - Job Level Match: Check if experience years match JD.
    - Measurable Results: Check for at least 5 quantifiable metrics.
    - Tone: Check for professional, positive tone.
    - Web Presence: Check for LinkedIn/Portfolio links.
    - Word Count: Check if under 1000 words.
    - Formatting: Check for bolding, font faces, standard fonts, font size.
    - Layout: Check for images, tables, left alignment.
    - Page Setup: Check for headers/footers, margins, page size.

    JOBSCAN-STYLE ANALYSIS (Fill these fields in 'before'):
    1. keywordAnalysis:
       - hardSkills: Identify core technical skills from JD. Check if they exist in the resume. Count frequency in resume vs expected frequency (usually 1-3).
       - softSkills: Identify interpersonal skills from JD (e.g., Leadership, Communication).
       - otherKeywords: Industry-specific terms or buzzwords.
    2. formattingCheck:
       - Check for: Font Size (pass if 10-12pt), Margins (pass if ~1 inch), Section Headings (pass if standard), Contact Info (pass if present), File Type (pass if .pdf/.docx).
    3. ISSUE COUNTS:
       - searchabilityIssues: Count of issues found in Searchability category.
       - hardSkillsIssues: Count of missing hard skills from JD.
       - softSkillsIssues: Count of missing soft skills from JD.
       - recruiterTipsIssues: Count of issues found in Recruiter Tips category.
    4. recruiterTips:
       - Provide 3-5 high-level actionable tips that a human recruiter would give (e.g., "Move your skills section to the top", "Add more metrics to your latest role").

    STRUCTURED OUTPUT: Provide the result in the specified JSON format. Ensure the JSON is complete and not truncated.
  `;

  const parts: any[] = [{ text: mainPrompt }];

  parts.push({ text: "\n\nRESUME CONTENT:" });
  if (typeof resume === 'string') {
    parts.push({ text: resume });
  } else {
    parts.push(resume);
  }

  parts.push({ text: "\n\nJOB DESCRIPTION CONTENT:" });
  if (typeof jobDescription === 'string') {
    parts.push({ text: jobDescription });
  } else {
    parts.push(jobDescription);
  }

  if (instructionFiles && instructionFiles.length > 0) {
    parts.push({ text: "\n\nADDITIONAL INSTRUCTION FILES:" });
    instructionFiles.forEach(file => {
      parts.push(file);
    });
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to generate analysis");
  }

  return JSON.parse(text);
}

export async function generateJDSuggestions(jd: string | FilePart): Promise<string[]> {
  const prompt = `
    Based on the following Job Description, provide 8 short (2-4 words each) actionable suggestions for a candidate to improve their resume.
    Focus on technical skills, specific experience, or keywords mentioned in the JD.
    Return ONLY a JSON array of strings.
  `;

  const parts: any[] = [{ text: prompt }];
  if (typeof jd === 'string') {
    parts.push({ text: jd });
  } else {
    parts.push(jd);
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (err) {
    console.error("Error generating suggestions:", err);
    return [
      "Focus on Python & ML",
      "Add 'Key Achievements' section",
      "Make it more professional",
      "Highlight leadership roles",
      "Improve link visibility",
      "Add a section for certifications",
      "Focus on remote work experience",
      "Make the summary more punchy"
    ];
  }
}
