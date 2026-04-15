import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { extractTextFromImage } from './gemini';

// Set worker source for pdfjs-dist using unpkg CDN
// This avoids TypeScript issues with Vite's ?url imports while ensuring the correct version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (signal?.aborted) throw new Error('Operation cancelled');
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      if (signal?.aborted) throw new Error('Operation cancelled');
      
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
      
      // Extract links from annotations (embedded links)
      const annotations = await page.getAnnotations();
      annotations.forEach((annot: any) => {
        if (annot.url) {
          text += ` ${annot.url} `;
        }
      });
      
      if (onProgress) {
        onProgress(Math.round((i / pdf.numPages) * 100));
      }
    }
    return text;
  } catch (error: any) {
    if (error.message === 'Operation cancelled') throw error;
    console.error('PDF extraction error:', error);
    throw new Error('Failed to parse PDF. The file might be corrupted or in an unsupported format.');
  }
}

export async function extractTextFromDOCX(file: File, signal?: AbortSignal): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (signal?.aborted) throw new Error('Operation cancelled');
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error: any) {
    if (error.message === 'Operation cancelled') throw error;
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to parse DOCX. The file might be corrupted or in an unsupported format.');
  }
}

export async function extractTextFromFile(
  file: File, 
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return extractTextFromPDF(file, onProgress, signal);
  } else if (extension === 'docx') {
    if (onProgress) onProgress(50); // Simulate some progress for DOCX
    const text = await extractTextFromDOCX(file, signal);
    if (onProgress) onProgress(100);
    return text;
  } else if (extension === 'txt') {
    if (onProgress) onProgress(50);
    const text = await file.text();
    if (onProgress) onProgress(100);
    return text;
  } else if (['png', 'jpg', 'jpeg'].includes(extension || '')) {
    if (onProgress) onProgress(30);
    const text = await extractTextFromImage(file);
    if (onProgress) onProgress(100);
    return text;
  }
  throw new Error('Unsupported file format');
}
