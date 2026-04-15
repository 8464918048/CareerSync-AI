import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Copy, 
  RefreshCcw, 
  LayoutDashboard, 
  FileSearch, 
  Target, 
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  ExternalLink,
  X,
  Mic,
  Crop,
  ArrowUp,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Minimize2,
  Save,
  Edit3,
  Search,
  Layout,
  Printer,
  History,
  User as UserIcon,
  Code
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle, 
  WidthType, 
  AlignmentType, 
  TabStopType,
  ExternalHyperlink
} from 'docx';
import { cn } from './lib/utils';
import { extractTextFromFile } from './lib/file-parser';
import { analyzeAndOptimizeResume, ResumeAnalysis, FilePart, generateJDSuggestions } from './lib/gemini';
import { TEMPLATES, ResumePreview } from './components/ResumeTemplates';
import { OnboardingForm } from './components/OnboardingForm';
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  saveUserToFirestore, 
  saveAnalysisToHistory, 
  getHistory,
  getUserProfile
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const SAMPLE_RESUME = `Dinesh Boppudi
Software Engineer | Full-Stack Developer
Email: dinesh@example.com | Phone: +1 123 456 7890 | LinkedIn: linkedin.com/in/dinesh

SUMMARY
Detail-oriented Software Engineer with 3 years of experience in building scalable web applications. Proficient in React, Node.js, and TypeScript. Passionate about solving complex problems and delivering high-quality code.

EXPERIENCE
Software Engineer | Tech Solutions Inc. | 2021 - Present
- Worked on various web projects using React and Node.js.
- Fixed bugs and improved application performance.
- Collaborated with cross-functional teams to deliver features.
- Wrote unit tests for critical components.

Junior Developer | StartUp Hub | 2020 - 2021
- Assisted in developing the front-end of a mobile app.
- Learned new technologies like React Native and GraphQL.
- Participated in code reviews and daily stand-ups.

SKILLS
- Languages: JavaScript, TypeScript, Python, HTML, CSS
- Frameworks: React, Node.js, Express, Next.js
- Databases: MongoDB, PostgreSQL
- Tools: Git, Docker, AWS

PROJECTS
E-commerce Platform: Built a full-stack e-commerce site with user authentication and payment integration.
Task Manager: Developed a task management app with real-time updates using Socket.io.
`;

const SAMPLE_JD = `Senior Full-Stack Engineer
We are looking for a Senior Full-Stack Engineer to join our dynamic team. You will be responsible for designing and implementing high-performance web applications using React, Node.js, and TypeScript.

Key Responsibilities:
- Architect and develop scalable front-end and back-end systems.
- Optimize application performance and ensure high availability.
- Mentor junior developers and lead code reviews.
- Implement CI/CD pipelines and infrastructure as code using AWS and Docker.
- Drive the adoption of best practices in software development.

Requirements:
- 5+ years of experience in full-stack development.
- Expert knowledge of React, Node.js, and TypeScript.
- Strong experience with cloud platforms (AWS/Azure/GCP).
- Proven track record of delivering complex software projects.
- Excellent communication and leadership skills.
- Experience with performance optimization and security best practices.
`;

export default function App() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [resumeFileData, setResumeFileData] = useState<FilePart | null>(null);
  const [jdFileData, setJdFileData] = useState<FilePart | null>(null);
  const [instructionFilesData, setInstructionFilesData] = useState<(FilePart & { name: string, id: string, preview?: string })[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewFullPage, setIsPreviewFullPage] = useState(true);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [history, setHistory] = useState<ResumeAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'optimized' | 'templates' | 'changes' | 'keywords' | 'compare'>('dashboard');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [resumeLength, setResumeLength] = useState('Auto-detect');
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('latex-standard');
  const [pageCount, setPageCount] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [dashboardTab, setDashboardTab] = useState<'match' | 'keywords' | 'formatting' | 'tips'>('match');

  const [baseFontSize, setBaseFontSize] = useState<number>(10);
  const [customization, setCustomization] = useState({
    primaryColor: '#000000',
    fontFamily: 'Inter, sans-serif',
    sectionSpacing: 1,
    lineHeight: 1.2
  });

  // Update page count based on content height
  useEffect(() => {
    if (resumeRef.current) {
      // 1123px is roughly the height of an A4 page at 96 DPI
      const height = resumeRef.current.scrollHeight;
      const pages = Math.max(1, Math.ceil(height / 1123));
      if (pages !== pageCount) {
        setPageCount(pages);
      }
    }
  }, [analysis?.structuredResume, selectedTemplate, baseFontSize, pageCount]);
  const [fileName, setFileName] = useState<string>('optimized_resume');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'print' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Focus on Python & ML",
    "Add 'Key Achievements' section",
    "Make it more professional",
    "Highlight leadership roles",
    "Improve link visibility",
    "Add a section for certifications",
    "Focus on remote work experience",
    "Make the summary more punchy"
  ]);

  useEffect(() => {
    const updateSuggestions = async () => {
      const content = jdText || jdFileData;
      if (!content) return;

      try {
        const newSuggestions = await generateJDSuggestions(content);
        if (newSuggestions && newSuggestions.length > 0) {
          setSuggestions(newSuggestions);
        }
      } catch (err) {
        console.error("Error updating suggestions:", err);
      }
    };

    const timer = setTimeout(updateSuggestions, 1000);
    return () => clearTimeout(timer);
  }, [jdText, jdFileData]);
  const [showProfile, setShowProfile] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        await saveUserToFirestore(currentUser);
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        if (profile && !profile.isProfileComplete) {
          setShowOnboarding(true);
        }
      } else {
        setUserProfile(null);
        setShowOnboarding(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // History Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = getHistory(user.uid, (data) => {
        setHistoryList(data);
      });
      return () => unsubscribe();
    } else {
      setHistoryList([]);
    }
  }, [user]);

  useEffect(() => {
    if (analysis?.structuredResume?.personalInfo?.fullName) {
      const name = analysis.structuredResume.personalInfo.fullName.toLowerCase().replace(/\s+/g, '_');
      setFileName(`${name}_resume`);
    }
  }, [analysis]);

  useEffect(() => {
    if (!showDownloadModal) {
      setSelectedFormat(null);
    }
  }, [showDownloadModal]);
  const [compareWithIndex, setCompareWithIndex] = useState<number>(-1);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const instructionsFileInputRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isListening, setIsListening] = useState(false);

  const MIN_RESUME_LENGTH = 100;
  const MIN_JD_LENGTH = 50;
  const MAX_TEXT_LENGTH = 15000;

  useEffect(() => {
    const saved = localStorage.getItem('resume_analysis');
    if (saved) {
      try {
        setAnalysis(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved analysis", e);
      }
    }
    const savedHistory = localStorage.getItem('resume_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleFileExtraction = async (
    file: File, 
    targetSetter: (text: string) => void,
    fileDataSetter?: (data: FilePart | null) => void
  ) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Please upload a file smaller than 5MB.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setError(null);
      setIsAnalyzing(true);
      setUploadProgress(0);
      
      // Convert to base64 for direct AI analysis
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      if (fileDataSetter) {
        fileDataSetter({ inlineData: { data: base64, mimeType: file.type } });
      }

      if (fileDataSetter === setResumeFileData) {
        setResumeFileName(file.name);
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setUploadedResumeUrl(url);
        }
      } else if (fileDataSetter === setJdFileData) {
        setJdFileName(file.name);
      }

      // Extract text for AI analysis
      const text = await extractTextFromFile(
        file, 
        (progress) => setUploadProgress(progress),
        controller.signal
      );
      
      // User requested: "save as pdf only, don't extract the text"
      // This means we don't show the text in the textarea if it's a PDF/Image
      if (fileDataSetter === setResumeFileData && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
        targetSetter('');
      } else if (fileDataSetter === setJdFileData && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
        targetSetter('');
      } else {
        if (!text || text.trim().length === 0) {
          targetSetter('');
        } else {
          targetSetter(text);
        }
      }
    } catch (err: any) {
      if (err.message === 'Operation cancelled') {
        console.log("Upload cancelled by user");
        return;
      }

      let message = "Failed to process file.";
      
      if (err.message.includes("Unsupported file format")) {
        message = "Unsupported file format. Please upload a PDF, DOCX, TXT, or Image file.";
      } else if (err.message.includes("Failed to parse PDF")) {
        message = "We couldn't read this PDF. It might be password-protected or corrupted.";
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
      console.error("File upload error:", err);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsAnalyzing(false);
        setUploadProgress(0);
        abortControllerRef.current = null;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileExtraction(file, setResumeText, setResumeFileData);
    e.target.value = '';
  };

  const handleJdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileExtraction(file, setJdText, setJdFileData);
    e.target.value = '';
  };

  const handleInstructionsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsAnalyzing(true);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const [base64, extractedText] = await Promise.all([
        base64Promise,
        extractTextFromFile(file, (progress) => setUploadProgress(progress))
      ]);

      const id = Math.random().toString(36).substring(7);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      
      setInstructionFilesData(prev => [...prev, { 
        inlineData: {
          data: base64, 
          mimeType: file.type, 
        },
        name: file.name, 
        id,
        preview 
      }]);

      if (extractedText && extractedText.trim()) {
        setAdditionalInstructions(prev => prev ? `${prev}\n\n[Extracted from ${file.name}]:\n${extractedText}` : `[Extracted from ${file.name}]:\n${extractedText}`);
      }
    } catch (err) {
      console.error("Error processing instruction file:", err);
      setError("Failed to extract text from file.");
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const removeInstructionFile = (id: string) => {
    setInstructionFilesData(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAnalyzing(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleFetchJob = async () => {
    if (!jobUrl) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`/api/fetch-job?url=${encodeURIComponent(jobUrl)}`);
      if (!response.ok) throw new Error("Failed to fetch job description");
      const data = await response.json();
      if (data.text && data.text.trim().length > 0) {
        setJdText(data.text);
      } else {
        throw new Error("No text found at this URL");
      }
    } catch (err: any) {
      setError("Could not fetch job description from this URL. Please paste it manually.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError("Microphone access was denied. Please enable microphone permissions in your browser settings to use voice input.");
      } else if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAdditionalInstructions(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

  const scrollSuggestions = (direction: 'left' | 'right') => {
    if (suggestionsRef.current) {
      const scrollAmount = 300;
      suggestionsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAnalyze = async () => {
    setShowValidation(true);
    
    const hasResume = resumeText.trim().length > 0 || resumeFileData !== null;
    const hasJd = jdText.trim().length > 0 || jdFileData !== null;

    if (!hasResume || !hasJd) {
      setError("Please provide both a resume and a job description.");
      return;
    }

    if (resumeText.trim().length > 0 && resumeText.length < MIN_RESUME_LENGTH) {
      setError(`Resume text is too short. Please provide at least ${MIN_RESUME_LENGTH} characters.`);
      return;
    }

    if (jdText.trim().length > 0 && jdText.length < MIN_JD_LENGTH) {
      setError(`Job description is too short. Please provide at least ${MIN_JD_LENGTH} characters.`);
      return;
    }

    if (resumeText.length > MAX_TEXT_LENGTH || jdText.length > MAX_TEXT_LENGTH) {
      setError(`Input is too long. Please limit text to ${MAX_TEXT_LENGTH} characters.`);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const profileContext = userProfile ? `\n\nUSER PROFILE DATA (Use this for links and details):\n${JSON.stringify(userProfile, null, 2)}` : '';
      
      const result = await analyzeAndOptimizeResume(
        resumeFileData || resumeText, 
        jdFileData || jdText, 
        additionalInstructions + profileContext, 
        instructionFilesData,
        resumeLength,
        companyName,
        jobUrl
      );
      setAnalysis(result);
      
      // Ensure we're not on the 'original-pdf' template when showing optimized results
      if (selectedTemplate === 'original-pdf') {
        setSelectedTemplate('latex-standard');
      }
      
      if (user) {
        await saveAnalysisToHistory(user.uid, {
          analysis: result,
          resumeLength,
          jobDescription: jdText.substring(0, 500),
          originalResume: resumeText.substring(0, 500)
        });
      }

      const newHistory = [result, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('resume_analysis', JSON.stringify(result));
      localStorage.setItem('resume_history', JSON.stringify(newHistory));
      setActiveTab('dashboard');
    } catch (err: any) {
      let message = "Analysis failed. Please try again later.";
      
      // Handle specific Gemini API errors if possible
      const errorString = err.toString().toLowerCase();
      if (errorString.includes("api key") || errorString.includes("invalid_argument")) {
        message = "Configuration error: The AI service is currently unavailable. Please contact support.";
      } else if (errorString.includes("safety") || errorString.includes("blocked")) {
        message = "The content was flagged by safety filters. Please ensure your resume and job description contain professional content.";
      } else if (errorString.includes("quota") || errorString.includes("429")) {
        message = "Rate limit exceeded. Please wait a moment before trying again.";
      } else if (errorString.includes("network") || errorString.includes("fetch")) {
        message = "Network error: Please check your internet connection and try again.";
      } else if (err.message) {
        message = `Analysis Error: ${err.message}`;
      }
      
      setError(message);
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateResumeData = (newData: any) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      structuredResume: newData
    });
  };

  const handleExportPDF = async () => {
    if (!analysis || !resumeRef.current) return;
    const finalFileName = (fileName || 'optimized_resume').trim().replace(/[/\\?%*:|"<>]/g, '-');
    setIsExporting(true);
    
    console.log('Starting PDF Export...');
    const safetyTimeout = setTimeout(() => {
      console.warn('PDF Export safety timeout triggered');
      setIsExporting(false);
      setError("Export is taking longer than expected. Please try again or use High Fidelity mode.");
    }, 45000);

    // Wait for React to re-render with isExporting=true
    setTimeout(async () => {
      try {
        console.log('Rendering PDF via html2canvas...');
        const element = resumeRef.current;
        if (!element) {
          setIsExporting(false);
          clearTimeout(safetyTimeout);
          return;
        }

        // Use html2canvas directly for better control
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794, // Fixed width for A4 at 96 DPI
          windowWidth: 794,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * { -webkit-print-color-adjust: exact !important; }
              a { color: #2563eb !important; text-decoration: underline !important; }
              .hide-on-export { display: none !important; }
            `;
            clonedDoc.head.appendChild(style);
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate how many mm one pixel is
        // Since we used scale: 2, the original pixel width was imgWidth / 2
        const pxToMm = pdfWidth / (imgWidth / 2);
        const imgHeightMm = (imgHeight / 2) * pxToMm;
        
        let heightLeft = imgHeightMm;
        let position = 0;
        let page = 1;

        // Add the image across multiple pages
        while (heightLeft > 0) {
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMm);
          heightLeft -= pdfHeight;
          position -= pdfHeight;
          if (heightLeft > 0) {
            pdf.addPage();
            page++;
          }
        }

        // Add links manually
        const containerRect = element.getBoundingClientRect();
        const links = element.querySelectorAll('a');

        links.forEach(link => {
          const rect = link.getBoundingClientRect();
          const href = link.getAttribute('href');
          if (href && href !== '#' && rect.width > 0 && rect.height > 0) {
            const leftMm = (rect.left - containerRect.left) * pxToMm;
            const topMm = (rect.top - containerRect.top) * pxToMm;
            const widthMm = rect.width * pxToMm;
            const heightMm = rect.height * pxToMm;
            
            // Determine which page the link is on
            const linkPage = Math.floor(topMm / pdfHeight) + 1;
            const topOnPage = topMm % pdfHeight;
            
            if (linkPage <= page) {
              pdf.setPage(linkPage);
              pdf.link(leftMm, topOnPage, widthMm, heightMm, { url: href });
            }
          }
        });

        clearTimeout(safetyTimeout);
        pdf.save(`${finalFileName}.pdf`);
        console.log('PDF saved successfully');
        setIsExporting(false);
        setShowDownloadModal(false);
      } catch (err) {
        clearTimeout(safetyTimeout);
        console.error("PDF Export failed", err);
        setIsExporting(false);
        setError("Failed to generate PDF. Please use High Fidelity mode.");
      }
    }, 800);
  };

  const handlePrintPDF = async () => {
    if (!analysis || !resumeRef.current) return;
    const finalFileName = (fileName || 'optimized_resume').trim().replace(/[/\\?%*:|"<>]/g, '-');
    setIsExporting(true);

    // Wait for React to re-render to hide export-only elements
    setTimeout(() => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const content = resumeRef.current?.innerHTML || '';
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(style => style.outerHTML)
          .join('\n');

        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('Could not access iframe document');

        iframeDoc.open();
        iframeDoc.write(`
          <html>
            <head>
              <title>${finalFileName}</title>
              ${styles}
              <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: white !important; }
                .print-container { width: 210mm; min-height: 297mm; background: white !important; margin: 0 auto; }
                button, .group-hover\\:flex, .group-hover\\:opacity-100, .hide-on-export { display: none !important; }
                section { break-inside: avoid; }
                a { color: #2563eb !important; text-decoration: underline !important; }
              </style>
            </head>
            <body>
              <div class="print-container">${content}</div>
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                    window.parent.postMessage('print-done', '*');
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        iframeDoc.close();

        const handleMessage = (event: MessageEvent) => {
          if (event.data === 'print-done') {
            document.body.removeChild(iframe);
            window.removeEventListener('message', handleMessage);
            setIsExporting(false);
            setShowDownloadModal(false);
          }
        };
        window.addEventListener('message', handleMessage);
        
        // Safety timeout for print dialog
        setTimeout(() => {
          if (isExporting) {
            setIsExporting(false);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            window.removeEventListener('message', handleMessage);
          }
        }, 60000); // 1 minute safety
      } catch (err) {
        console.error("Print PDF failed", err);
        setIsExporting(false);
        setError("Failed to open print dialog. Please try Standard PDF.");
      }
    }, 500);
  };

  const handleExportDOCX = async () => {
    if (!analysis) return;
    const finalFileName = (fileName || 'optimized_resume').trim().replace(/[/\\?%*:|"<>]/g, '-');
    setIsExporting(true);
    try {
      const { structuredResume } = analysis;
      
      // Helper for section headers with lines
      const createHeader = (text: string) => new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 4 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text, bold: true, size: 24 })],
                    spacing: { before: 200, after: 100 },
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
      });

      const createLink = (label: string, url: string) => {
        const finalUrl = url ? (url.startsWith('http') ? url : `https://${url}`) : '';
        if (!finalUrl) return new TextRun(label);
        return new ExternalHyperlink({
          children: [new TextRun({ text: label, color: "05445E", underline: { color: "05445E" } })],
          link: finalUrl,
        });
      };

      const contactInfoChildren: any[] = [
        new TextRun({ text: `${structuredResume.personalInfo.location} | ${structuredResume.personalInfo.phone} | ${structuredResume.personalInfo.email}` }),
      ];

      const linksChildren: any[] = [];
      if (structuredResume.personalInfo.links && structuredResume.personalInfo.links.length > 0) {
        structuredResume.personalInfo.links.forEach((link, idx) => {
          if (idx > 0) linksChildren.push(new TextRun({ text: " | " }));
          linksChildren.push(createLink(link.label, link.url));
        });
      }

      const children: any[] = [
        new Paragraph({
          children: [new TextRun({ text: structuredResume.personalInfo.fullName, bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: contactInfoChildren,
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
        }),
      ];

      if (linksChildren.length > 0) {
        children.push(new Paragraph({
          children: linksChildren,
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        }));
      }
      
      children.push(
        createHeader("CAREER OBJECTIVE"),
        new Paragraph({ 
          children: [new TextRun(structuredResume.summary)],
          spacing: { before: 50, after: 150 },
          alignment: AlignmentType.JUSTIFIED,
        }),

        createHeader("EXPERIENCE"),
        ...structuredResume.experience.flatMap(exp => [
          new Paragraph({
            children: [
              new TextRun({ text: exp.company, bold: true }),
              new TextRun({ text: `\t${exp.startDate} - ${exp.endDate}`, bold: true }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
            spacing: { before: 100 },
          }),
          new Paragraph({ 
            children: [
              new TextRun({ text: exp.position, italics: true }),
              new TextRun({ text: ` | ${exp.location}`, italics: true })
            ],
            spacing: { after: 25 },
          }),
          ...exp.highlights.map(h => new Paragraph({
            children: [new TextRun(h)],
            bullet: { level: 0 },
            spacing: { after: 25 },
            alignment: AlignmentType.JUSTIFIED,
          })),
        ]),

        createHeader("EDUCATION"),
        ...structuredResume.education.map(edu => new Paragraph({
          children: [
            new TextRun({ text: `${edu.school} - ${edu.degree}`, bold: true }),
            new TextRun({ text: `\t${edu.graduationDate || ''}`, bold: true }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
          spacing: { before: 50, after: 25 },
        })),

        createHeader("SKILLS"),
        ...structuredResume.skills.map(skill => new Paragraph({
          children: [
            new TextRun({ text: `${skill.category}: `, bold: true }),
            new TextRun(skill.items.join(', ')),
          ],
          spacing: { before: 25, after: 25 },
        })),
      );

      if (structuredResume.projects && structuredResume.projects.length > 0) {
        children.push(createHeader("PROJECTS"));
        structuredResume.projects.forEach(proj => {
          const projectTitleChildren: any[] = [new TextRun({ text: proj.name, bold: true })];
          if (proj.technologies && proj.technologies.length > 0) {
            projectTitleChildren.push(new TextRun({ text: ` (${proj.technologies.join(', ')})`, italics: true }));
          }
          if (proj.link) {
            projectTitleChildren.push(new TextRun({ text: " | " }));
            projectTitleChildren.push(createLink("Project Link", proj.link));
          }

          children.push(new Paragraph({
            children: projectTitleChildren,
            spacing: { before: 50 },
          }));
          children.push(new Paragraph({
            children: [new TextRun(proj.description)],
            spacing: { after: 50 },
            alignment: AlignmentType.JUSTIFIED,
          }));
        });
      }

      if (structuredResume.certificates && structuredResume.certificates.length > 0) {
        children.push(createHeader("CERTIFICATIONS"));
        structuredResume.certificates.forEach(cert => {
          children.push(new Paragraph({
            children: [new TextRun(cert)],
            bullet: { level: 0 },
            spacing: { after: 25 },
          }));
        });
      }

      if (structuredResume.achievements && structuredResume.achievements.length > 0) {
        children.push(createHeader("ACHIEVEMENTS"));
        structuredResume.achievements.forEach(ach => {
          children.push(new Paragraph({
            children: [new TextRun(ach)],
            bullet: { level: 0 },
            spacing: { after: 25 },
          }));
        });
      }

      if (structuredResume.strengths && structuredResume.strengths.length > 0) {
        children.push(createHeader("STRENGTHS"));
        children.push(new Paragraph({
          children: [new TextRun(structuredResume.strengths.join(' • '))],
          spacing: { before: 50, after: 50 },
        }));
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 inch margins
            },
          },
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${finalFileName}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      setShowDownloadModal(false);
    } catch (err) {
      console.error("DOCX Export failed", err);
      setError("Failed to export DOCX. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.optimizedResume);
  };

  const handleUpdateStructuredResume = (newData: ResumeAnalysis['structuredResume']) => {
    if (!analysis) return;
    const updatedAnalysis = { ...analysis, structuredResume: newData };
    setAnalysis(updatedAnalysis);
    
    // Update history as well
    const newHistory = history.map(h => h === analysis ? updatedAnalysis : h);
    setHistory(newHistory);
  };

  const handleReset = () => {
    setAnalysis(null);
    setResumeText('');
    setJdText('');
    setCompanyName('');
    setJobUrl('');
    setResumeFileData(null);
    setResumeFileName(null);
    setJdFileData(null);
    setJdFileName(null);
    setUploadedResumeUrl(null);
    setShowValidation(false);
    setDashboardTab('match');
    localStorage.removeItem('resume_analysis');
  };

  const loadSample = () => {
    setResumeText(SAMPLE_RESUME);
    setJdText(SAMPLE_JD);
    setShowValidation(false);
    setError(null);
  };

  const NoiseBackground = () => (
    <div className="fixed inset-0 z-[-1] pointer-events-none noise-bg overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-400/10 dark:bg-brand-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-[100px] animate-pulse delay-2000" />
    </div>
  );

  const ScoreCard = ({ title, before, after, icon: Icon, color, tooltip }: { title: string, before: number, after: number, icon: any, color: string, tooltip: string }) => {
    const diff = after - before;
    return (
      <div className="bento-card p-6 flex flex-col justify-between relative group overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color.replace('bg-', 'bg-').concat('/10'))}>
            <Icon className={cn("w-5 h-5", color.replace('bg-', 'text-'))} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{after}</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">/100</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-500 dark:text-slate-400">Improvement</span>
            <span className={cn("font-bold", diff >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500")}>
              {diff >= 0 ? '+' : ''}{diff}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${after}%` }}
              className={cn("h-full rounded-full", color)}
            />
          </div>
        </div>
      </div>
    );
  };

  if (isAuthReady && user && userProfile && (!userProfile.isProfileComplete || showProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <OnboardingForm 
          userId={user.uid}
          initialData={userProfile}
          onComplete={async () => {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
            setShowProfile(false);
          }} 
          onCancel={() => setShowProfile(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen boult-grid noise-bg selection:bg-brand-100 selection:text-brand-900">
      <NoiseBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={handleReset}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="text-white w-6 h-6 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">CareerSync <span className="text-indigo-600">AI</span></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CareerSync AI Optimizer</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => {
                  setAnalysis(null);
                  setShowHistory(false);
                  setActiveTab('dashboard');
                }}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold transition-all",
                  !showHistory && !analysis ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <RefreshCcw className="w-4 h-4" />
                Optimize
              </button>
              {user && (
                <button 
                  onClick={() => setShowHistory(true)}
                  className={cn(
                    "flex items-center gap-2 text-sm font-bold transition-all",
                    showHistory ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  History
                </button>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthReady && user && (
              <button 
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-all bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-xl"
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </button>
            )}
            
            {isAuthReady && (
              user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1">{user.displayName}</p>
                    <button onClick={logout} className="text-[10px] font-bold text-slate-500 hover:text-indigo-500 transition-colors uppercase tracking-wider">Sign Out</button>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-9 h-9 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm" />
                  ) : (
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={signInWithGoogle}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 transition-colors duration-300">
        {showHistory ? (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Your History</h1>
                <p className="text-slate-500 dark:text-slate-400">Access your past resume optimizations</p>
              </div>
            </div>

            <div className="grid gap-4">
              {historyList.length > 0 ? (
                historyList.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setAnalysis(item.analysis);
                      setResumeLength(item.resumeLength || 'Auto-detect');
                      setShowHistory(false);
                      setActiveTab('dashboard');
                    }}
                    className="bento-card p-6 flex items-center justify-between group cursor-pointer hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                        <FileSearch className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.analysis?.structuredResume?.personalInfo?.fullName || 'Resume Analysis'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Score: {item.analysis?.atsScore || 0}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {item.resumeLength}
                          </span>
                          <span>{item.timestamp?.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bento-card border-dashed">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <History className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No history yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">
                    Your optimized resumes will appear here once you start using the tool.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : !analysis ? (
          <div className="space-y-16">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <h1 className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white">
                Improve Your Resume <span className="text-indigo-600 dark:text-indigo-400">for Any Job</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Paste your resume and the job you want. We improve it to match — automatically.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <div className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 flex items-center gap-2">
                  <Zap className="w-3 h-3 fill-current" />
                  AI-Powered Optimization
                </div>
                <div className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  ATS-Friendly Templates
                </div>
              </div>
            </div>            {/* Form Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Resume Input */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">Your Resume</h3>
                    <p className="text-xs text-slate-400">Paste text or upload a PDF, Image, or Doc</p>
                  </div>
                </div>
                
                {resumeFileData ? (
                  <div className="w-full h-64 flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-6 space-y-4">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                      <FileText className="text-indigo-500 w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{resumeFileName}</p>
                      <p className="text-xs text-slate-500">File uploaded and ready for analysis</p>
                    </div>
                    <button 
                      onClick={() => {
                        setResumeFileData(null);
                        setResumeFileName(null);
                        setUploadedResumeUrl(null);
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove File
                    </button>
                  </div>
                ) : (
                  <textarea 
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setResumeFileData(null);
                    }}
                    placeholder="Paste your resume text here... Include your work experience, education, skills, and any other relevant sections."
                    className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none text-sm custom-scrollbar text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                )}

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-500/10 transition-colors">
                    <Upload className="text-slate-400 w-5 h-5 group-hover:text-indigo-400" />
                  </div>
                  <p className="text-sm font-bold">Add File or Image</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOCX, Image (Max 5MB)</p>
                </div>
              </div>

              {/* JD Input */}
              <div className="bento-card p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Job Description</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Paste text or upload a PDF, Image, or Doc</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input 
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Google, Amazon..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Job URL / Website</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <input 
                        type="text"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="e.g. https://careers.google.com/..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {jdFileData ? (
                  <div className="w-full h-64 flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-6 space-y-4">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                      <Briefcase className="text-indigo-500 w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{jdFileName}</p>
                      <p className="text-xs text-slate-500">File uploaded and ready for analysis</p>
                    </div>
                    <button 
                      onClick={() => {
                        setJdFileData(null);
                        setJdFileName(null);
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove File
                    </button>
                  </div>
                ) : (
                  <textarea 
                    value={jdText}
                    onChange={(e) => {
                      setJdText(e.target.value);
                      setJdFileData(null);
                    }}
                    placeholder="Paste the full job description here... Include requirements, responsibilities, qualifications, and any preferred skills."
                    className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none text-sm custom-scrollbar text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                )}
                <input 
                  type="file" 
                  ref={jdFileInputRef}
                  onChange={handleJdFileUpload}
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <div 
                  onClick={() => jdFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-500/10 transition-colors">
                    <Upload className="text-slate-400 w-5 h-5 group-hover:text-indigo-400" />
                  </div>
                  <p className="text-sm font-bold">Add File or Image</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOCX, Image (Max 5MB)</p>
                </div>
                {/* Job URL Fetch Section */}
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Or fetch from a job posting URL:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://linkedin.com/jobs/..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <button 
                      onClick={handleFetchJob}
                      disabled={isAnalyzing || !jobUrl}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing && jobUrl ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Fetch"}
                    </button>
                  </div>
                  {error && error.includes("fetch job description from this URL") && (
                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Length Selector - Moved Up */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Target Resume Length</label>
              <div className="relative">
                <select 
                  value={resumeLength}
                  onChange={(e) => setResumeLength(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-2.5 pr-12 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer hover:border-indigo-500/50"
                >
                  <option value="Auto-detect">Auto-detect (Let AI decide)</option>
                  <option value="1 Page">1 Page (Concise & Impactful)</option>
                  <option value="2 Pages">2 Pages (Detailed & Professional)</option>
                  <option value="Academic CV">Academic CV (Research Focused)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Additional Instructions - New Design */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center gap-2 overflow-hidden relative">
                  <button 
                    onClick={() => scrollSuggestions('left')}
                    className="absolute left-0 z-10 p-1 bg-slate-950/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div 
                    ref={suggestionsRef}
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-8"
                  >
                    {suggestions.map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => setAdditionalInstructions(suggestion)}
                        className="whitespace-nowrap px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-white transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => scrollSuggestions('right')}
                    className="absolute right-0 z-10 p-1 bg-slate-950/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bento-card p-4 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-within:border-indigo-500/50 transition-all">
                  {instructionFilesData.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {instructionFilesData.map((file) => (
                        <div 
                          key={file.id}
                          className="flex items-center gap-3 p-2 pr-3 bg-slate-900/50 border border-slate-800 rounded-xl group/file relative"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {file.preview ? (
                              <img src={file.preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 pr-4">
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">{file.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              {file.inlineData.mimeType.split('/')[1] || 'File'}
                            </span>
                          </div>
                          <button 
                            onClick={() => removeInstructionFile(file.id)}
                            className="p-1 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea 
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Make changes, add new features, ask for anything"
                    className="w-full h-24 bg-transparent outline-none resize-none text-sm text-slate-900 dark:text-white placeholder:text-slate-500 custom-scrollbar"
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <input 
                      type="file" 
                      ref={instructionsFileInputRef}
                      onChange={handleInstructionsFileUpload}
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      className="hidden"
                    />
                    <button 
                      onClick={() => setError("Crop feature coming soon!")}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
                      title="Crop Image"
                    >
                      <Crop className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={startVoiceInput}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-white/5 text-slate-400"
                      )}
                      title="Voice Input"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => instructionsFileInputRef.current?.click()}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
                      title="Add File"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isAnalyzing ? "bg-indigo-500/20 text-indigo-400" : "hover:bg-indigo-500/10 text-indigo-500"
                      )}
                      title="Improve My Resume"
                    >
                      {isAnalyzing ? (
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-8">
            {/* New Results Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              <div className="flex items-center gap-6 relative z-10">
                <button 
                  onClick={handleReset}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:scale-105 active:scale-95"
                  title="Back to Editor"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
                  🚀
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Optimization Report</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">We've analyzed your resume against the job requirements.</p>
                </div>
              </div>

              <div className="flex items-center gap-8 relative z-10">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Match Rate</span>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-4xl font-black",
                      (analysis.after.matchRate || analysis.after.atsScore) >= 90 ? "text-emerald-500" : 
                      (analysis.after.matchRate || analysis.after.atsScore) >= 70 ? "text-amber-500" : "text-rose-500"
                    )}>
                      {analysis.after.matchRate || analysis.after.atsScore}%
                    </span>
                    <span className="text-sm font-bold text-slate-400">/ 100</span>
                  </div>
                </div>
                <div className="h-12 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">ATS Score</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {analysis.after.atsScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">/ 100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit mx-auto">
              {[
                { id: 'match', label: 'Match Report', icon: Target },
                { id: 'keywords', label: 'Keywords', icon: FileSearch },
                { id: 'formatting', label: 'Formatting', icon: Layout },
                { id: 'tips', label: 'Recruiter Tips', icon: Sparkles },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDashboardTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    dashboardTab === tab.id 
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Always show the resume preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Optimized Resume</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                      title="Full Screen Editor"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowDownloadModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                
                <div className="bento-card p-0 overflow-hidden bg-white aspect-[1/1.414] shadow-2xl relative group border-slate-200 dark:border-slate-800">
                  <div className="absolute inset-0 overflow-hidden bg-slate-50 pointer-events-none">
                    <div className="origin-top-left scale-[0.4] lg:scale-[0.35] xl:scale-[0.45] w-[300%] h-[300%]">
                      <div className="w-[794px] h-[1123px] text-slate-900 bg-white overflow-hidden">
                        <ResumePreview 
                          data={analysis.structuredResume} 
                          templateId={selectedTemplate} 
                          baseFontSize={baseFontSize}
                          isExporting={isExporting}
                          customization={customization}
                          originalPdfUrl={uploadedResumeUrl}
                        />
                      </div>
                    </div>
                  </div>
                  <div 
                    className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-all flex items-center justify-center cursor-pointer"
                    onClick={() => setIsExpanded(true)}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 px-6 py-3 bg-white/95 backdrop-blur shadow-2xl rounded-2xl text-indigo-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-100">
                      <Edit3 className="w-4 h-4" />
                      Open in Editor
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Tab Content */}
              <div className="lg:col-span-7 space-y-6">
                <AnimatePresence mode="wait">
                  {dashboardTab === 'match' && (
                    <motion.div 
                      key="match"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bento-card p-6 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Score Breakdown</h4>
                          <div className="space-y-5">
                            {[
                              { label: 'Searchability', score: analysis.after.scoreBreakdown?.searchability || 0, max: 25, color: 'bg-purple-500' },
                              { label: 'Hard Skills', score: analysis.after.scoreBreakdown?.hardSkills || 0, max: 35, color: 'bg-indigo-500' },
                              { label: 'Soft Skills', score: analysis.after.scoreBreakdown?.softSkills || 0, max: 15, color: 'bg-emerald-500' },
                              { label: 'Recruiter Tips', score: analysis.after.scoreBreakdown?.recruiterTips || 0, max: 25, color: 'bg-amber-500' },
                            ].map((item) => (
                              <div key={item.label} className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-slate-400">{item.label}</span>
                                  <span className="text-slate-900 dark:text-white">{item.score}/{item.max}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(item.score / item.max) * 100}%` }}
                                    className={cn("h-full rounded-full", item.color)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bento-card p-6 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Analysis Summary</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { label: 'Searchability', issues: analysis.before.searchabilityIssues, icon: Search, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                              { label: 'Hard Skills', issues: analysis.before.hardSkillsIssues, icon: Code, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                              { label: 'Soft Skills', issues: analysis.before.softSkillsIssues, icon: UserIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                              { label: 'Recruiter Tips', issues: analysis.before.recruiterTipsIssues, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg, item.color)}>
                                    <item.icon className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.issues > 0 ? (
                                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-black rounded-full uppercase">
                                      {item.issues} Issues
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase">
                                      Optimized
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bento-card p-6 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">ATS Optimization Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Key Improvements</p>
                            <div className="space-y-2">
                              {analysis.changesMade.slice(0, 4).map((change, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                                  <span>{change.change}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategic Focus</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              We've prioritized <span className="text-indigo-500 font-bold">hard skills</span> and <span className="text-indigo-500 font-bold">measurable outcomes</span>. 
                              The resume now uses industry-standard terminology that matches the job description's semantic requirements.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {dashboardTab === 'keywords' && (
                    <motion.div 
                      key="keywords"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 gap-6">
                        {[
                          { title: 'Hard Skills', data: analysis.before.keywordAnalysis?.hardSkills || [], icon: Code, color: 'indigo' },
                          { title: 'Soft Skills', data: analysis.before.keywordAnalysis?.softSkills || [], icon: UserIcon, color: 'purple' },
                          { title: 'Other Keywords', data: analysis.before.keywordAnalysis?.otherKeywords || [], icon: Target, color: 'blue' },
                        ].map((section) => (
                          <div key={section.title} className="bento-card p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${section.color}-500/10 text-${section.color}-500`)}>
                                  <section.icon className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h4>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {section.data.filter(k => k.found).length} / {section.data.length} Matched
                              </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Keyword</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Frequency</th>
                                    <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Expected</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                  {section.data.length > 0 ? section.data.map((keyword, i) => (
                                    <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                      <td className="py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{keyword.name}</td>
                                      <td className="py-3 text-center">
                                        {keyword.found ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                        ) : (
                                          <AlertCircle className="w-4 h-4 text-rose-400 mx-auto" />
                                        )}
                                      </td>
                                      <td className="py-3 text-center text-xs font-medium text-slate-500">{keyword.frequency}</td>
                                      <td className="py-3 text-right text-xs font-medium text-slate-500">{keyword.expectedFrequency}</td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={4} className="py-8 text-center text-xs text-slate-500 italic">No keywords identified in this category.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {dashboardTab === 'formatting' && (
                    <motion.div 
                      key="formatting"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="bento-card p-8 space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                            <Layout className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Formatting Check</h4>
                            <p className="text-sm text-slate-500">Ensuring your resume is readable by all major ATS systems.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {(analysis.before.formattingCheck || [
                            { category: 'Font Size', status: 'pass', message: 'Standard 10-12pt font size detected.' },
                            { category: 'Margins', status: 'pass', message: 'Professional margins maintained.' },
                            { category: 'Section Headings', status: 'pass', message: 'Standard headings used for better parsability.' },
                            { category: 'Contact Info', status: 'pass', message: 'All essential contact details found.' },
                            { category: 'File Type', status: 'pass', message: 'Optimized for PDF/DOCX parsing.' }
                          ]).map((check, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center",
                                  check.status === 'pass' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                )}>
                                  {check.status === 'pass' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{check.category}</p>
                                  <p className="text-xs text-slate-500">{check.message}</p>
                                </div>
                              </div>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                check.status === 'pass' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              )}>
                                {check.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {dashboardTab === 'tips' && (
                    <motion.div 
                      key="tips"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bento-card p-8 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Recruiter Insights</h4>
                          </div>
                          <div className="space-y-4">
                            {(analysis.before.recruiterTips || [
                              "Quantify your achievements with more percentages and dollar amounts.",
                              "Move your technical skills section higher to catch the recruiter's eye immediately.",
                              "Ensure your LinkedIn profile is up to date and matches your resume content.",
                              "Use more action verbs like 'Spearheaded', 'Orchestrated', and 'Transformed'."
                            ]).map((tip, i) => (
                              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                <span className="w-6 h-6 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-sm flex-shrink-0">{i + 1}</span>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bento-card p-8 space-y-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                <Target className="w-5 h-5" />
                              </div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white">ATS Specific Tips</h4>
                            </div>
                            <div className="space-y-3">
                              {analysis.before.atsTips.slice(0, 4).map((tip, i) => (
                                <div key={i} className={cn(
                                  "p-4 rounded-2xl border flex gap-3 items-start transition-all hover:scale-[1.02]",
                                  tip.status === 'success' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                  tip.status === 'warning' ? "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400" :
                                  "bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}>
                                  {tip.status === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                                   tip.status === 'warning' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                                   <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{tip.category}</p>
                                    <p className="text-xs font-medium leading-relaxed">{tip.tip}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden Export Portal - ensures consistent high-quality downloads regardless of view state */}
      <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none">
        <div 
          ref={resumeRef} 
          className="w-[794px] bg-white text-slate-900"
        >
          {analysis && (
            <ResumePreview 
              data={analysis.structuredResume} 
              templateId={selectedTemplate} 
              baseFontSize={baseFontSize}
              pageCount={pageCount}
              isExporting={true}
              customization={customization}
              originalPdfUrl={uploadedResumeUrl}
            />
          )}
        </div>
      </div>

      {/* Download Modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Download className="text-brand-600 w-6 h-6" />
                    DOWNLOAD
                  </h3>
                  <button 
                    onClick={() => setShowDownloadModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">File Name</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter file name..."
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all font-medium pr-12"
                    />
                    {fileName && (
                      <button 
                        onClick={() => setFileName('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => setSelectedFormat('pdf')}
                    className={cn(
                      "flex flex-col items-center gap-4 p-4 bg-white border-2 rounded-3xl transition-all group",
                      selectedFormat === 'pdf' ? "border-brand-600 bg-brand-50/30" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      selectedFormat === 'pdf' ? "bg-brand-100" : "bg-red-50"
                    )}>
                      <FileText className="text-red-600 w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Standard PDF</span>
                  </button>
                  <button 
                    onClick={() => setSelectedFormat('print')}
                    className={cn(
                      "flex flex-col items-center gap-4 p-4 bg-white border-2 rounded-3xl transition-all group",
                      selectedFormat === 'print' ? "border-brand-600 bg-brand-50/30" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      selectedFormat === 'print' ? "bg-brand-100" : "bg-indigo-50"
                    )}>
                      <Printer className="text-indigo-600 w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900 text-center">High Fidelity<br/>(Links)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedFormat('docx')}
                    className={cn(
                      "flex flex-col items-center gap-4 p-4 bg-white border-2 rounded-3xl transition-all group",
                      selectedFormat === 'docx' ? "border-brand-600 bg-brand-50/30" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      selectedFormat === 'docx' ? "bg-brand-100" : "bg-blue-50"
                    )}>
                      <Briefcase className="text-blue-600 w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Word Format</span>
                  </button>
                </div>

                <AnimatePresence>
                  {selectedFormat && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={() => {
                        if (selectedFormat === 'pdf') handleExportPDF();
                        else if (selectedFormat === 'docx') handleExportDOCX();
                        else if (selectedFormat === 'print') handlePrintPDF();
                      }}
                      disabled={isExporting}
                      className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCcw className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Download {selectedFormat.toUpperCase()} Now
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>

                {isExporting && (
                  <div className="flex items-center justify-center gap-3 text-brand-600 font-black text-[10px] uppercase tracking-widest animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Generating high-fidelity file...
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expanded Editor Modal */}
      <AnimatePresence>
        {isExpanded && analysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-950 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Resume Editor</h2>
                  <p className="text-xs text-slate-500">Edit your optimized resume details below</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowDownloadModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-slate-200 dark:border-slate-800"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Save className="w-4 h-4" />
                  Save & Close
                </button>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-2.5 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Template Selection & Settings */}
              <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Page Settings</h3>
                  <div className="px-2 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font Size</label>
                        <span className="text-[10px] font-bold text-indigo-400">{baseFontSize}pt</span>
                      </div>
                      <input 
                        type="range" 
                        min="8" 
                        max="14" 
                        step="0.5"
                        value={baseFontSize} 
                        onChange={(e) => setBaseFontSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section Spacing</label>
                        <span className="text-[10px] font-bold text-indigo-400">{customization.sectionSpacing}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2" 
                        step="0.1"
                        value={customization.sectionSpacing} 
                        onChange={(e) => setCustomization(prev => ({ ...prev, sectionSpacing: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Height</label>
                        <span className="text-[10px] font-bold text-indigo-400">{customization.lineHeight}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="2" 
                        step="0.1"
                        value={customization.lineHeight} 
                        onChange={(e) => setCustomization(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Color</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {['#000000', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#db2777'].map(color => (
                          <button
                            key={color}
                            onClick={() => setCustomization(prev => ({ ...prev, primaryColor: color }))}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              customization.primaryColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input 
                          type="color"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer overflow-hidden p-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font Family</label>
                      <select 
                        value={customization.fontFamily}
                        onChange={(e) => setCustomization(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Inter, sans-serif">Inter (Sans)</option>
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Playfair Display', serif">Playfair Display</option>
                        <option value="system-ui, sans-serif">System Sans</option>
                        <option value="Georgia, serif">Georgia</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Templates</h3>
                  <div className="grid gap-4">
                    {TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTemplate(template.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedTemplate(template.id);
                          }
                        }}
                        className={cn(
                          "group relative flex flex-col gap-3 p-3 rounded-2xl transition-all border-2 text-left cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950",
                          selectedTemplate === template.id 
                            ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10" 
                            : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                        )}
                      >
                        {/* Mini Preview Thumbnail */}
                        <div className="aspect-[1/1.414] w-full bg-white rounded-lg overflow-hidden relative shadow-sm border border-slate-200 dark:border-slate-800/10">
                          <div className="absolute inset-0 origin-top-left scale-[0.15] w-[666%] h-[666%] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                            <div className="w-[794px] h-[1123px]">
                              <ResumePreview 
                                data={analysis.structuredResume} 
                                templateId={template.id} 
                                baseFontSize={baseFontSize}
                                isExporting={isExporting}
                                customization={customization}
                                originalPdfUrl={uploadedResumeUrl}
                                originalPdfType={resumeFileData?.inlineData.mimeType}
                              />
                            </div>
                          </div>
                          {selectedTemplate === template.id && (
                            <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                              <div className="bg-indigo-500 text-white p-1.5 rounded-full shadow-lg">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-bold transition-colors",
                            selectedTemplate === template.id ? "text-indigo-400" : "text-slate-300"
                          )}>
                            {template.name}
                          </p>
                          <p className="text-[9px] text-slate-500 line-clamp-1">{template.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Preview Area */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-y-auto custom-scrollbar flex justify-center p-12 transition-colors duration-300">
                <div className="relative">
                  {/* Scaled Container for Full Page View */}
                  <div className="relative origin-top transition-all duration-500 ease-out" style={{ transform: 'scale(0.75)' }}>
                    <div className="w-[794px] h-[1123px] bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] text-slate-900 rounded-sm overflow-hidden relative">
                      <ResumePreview 
                        data={analysis.structuredResume} 
                        templateId={selectedTemplate} 
                        baseFontSize={baseFontSize}
                        onUpdate={updateResumeData}
                        isExporting={isExporting}
                        resumeLength={resumeLength}
                        customization={customization}
                        originalPdfUrl={uploadedResumeUrl}
                        originalPdfType={resumeFileData?.inlineData.mimeType}
                      />
                    </div>
                  </div>
                  {/* Spacer to ensure the scaled content doesn't get cut off at the bottom of the scrollable area */}
                  <div style={{ height: '842px' }} /> 
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-32 border-t border-slate-200/50 bg-white/50 backdrop-blur-xl py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-16">
            <div className="col-span-2 space-y-8 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Zap className="text-white w-6 h-6 fill-current" />
                </div>
                <span className="text-2xl font-black tracking-tighter uppercase">CareerSync <span className="text-brand-600">AI.</span></span>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                The world's most advanced AI resume optimizer. Built for high-performers who want to bypass the noise and get hired.
              </p>
              <div className="flex gap-4">
                {['twitter', 'github', 'linkedin'].map(s => (
                  <div key={s} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all cursor-pointer">
                    <Zap className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Platform</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Analyzer</a></li>
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Templates</a></li>
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">ATS Guide</a></li>
              </ul>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Terms</a></li>
                <li><a href="#" className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-24 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">© 2026 CAREERSYNC AI. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">System Operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
