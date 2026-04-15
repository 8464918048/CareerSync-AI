export interface ExtractedLinks {
  professional: { label: string; url: string }[];
  projects: { label: string; url: string }[];
}

export function extractLinksFromText(text: string): ExtractedLinks {
  const links: ExtractedLinks = {
    professional: [],
    projects: []
  };

  // Regular expression to find URLs (including those without protocol)
  // More restrictive to avoid catching emails or random text with dots
  const urlRegex = /((?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)|(?:[-a-zA-Z0-9@:%._\+~#=]{1,256}\.(?:com|org|net|io|me|co|info|edu|gov|in|us|uk|ca|au|de|fr|jp)\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)))/gi;
  const foundUrls: string[] = text.match(urlRegex) || [];

  const techKeywords = ['react.js', 'node.js', 'vue.js', 'angular.js', 'next.js', 'express.js', 'three.js', 'd3.js', 'chart.js', 'socket.io', 'b.tech', 'm.tech', 'b.sc', 'm.sc', 'b.a', 'm.a', 'ph.d'];

  foundUrls.forEach(url => {
    let cleanUrl = url.replace(/[.,;:)\]]$/, ''); // Remove trailing punctuation or closing brackets
    
    // Exclude emails
    if (cleanUrl.includes('@')) return;

    // Exclude common tech names and degrees
    if (techKeywords.some(tech => cleanUrl.toLowerCase().includes(tech))) return;

    // Exclude version numbers or GPA (e.g., 8.24, 1.0.0)
    if (/^\d+(\.\d+)+$/.test(cleanUrl)) return;

    // Basic validation to avoid catching things like "file.pdf" or "resume.docx" as links
    if (cleanUrl.includes('.') && !cleanUrl.match(/\.(pdf|docx|doc|txt|png|jpg|jpeg|gif|zip|exe|py|js|ts|cpp|h|java|cs|html|css|scss|json|md)$/i)) {
      // Ensure it has a letter in the domain part to avoid things like "127.0.0.1"
      const domainPart = cleanUrl.split('/')[0];
      if (!/[a-zA-Z]/.test(domainPart)) return;

      // Ensure protocol for consistency if missing
      const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : 
                      cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : 
                      `https://${cleanUrl}`;
      
      let lowerUrl;
      let urlObj;
      try {
        urlObj = new URL(fullUrl);
        lowerUrl = fullUrl.toLowerCase();
      } catch (e) {
        return; // Skip invalid URLs
      }

      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase().replace(/\/$/, ''); // Remove trailing slash
      const pathParts = pathname.split('/').filter(p => p.length > 0);

      let category: 'professional' | 'projects' = 'professional';
      let label = 'Link';

      if (hostname.includes('linkedin.com')) {
        label = 'LinkedIn';
        category = 'professional';
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        label = 'Twitter/X';
        category = 'professional';
      } else if (hostname.includes('behance.net')) {
        label = 'Behance';
        category = 'professional';
      } else if (hostname.includes('dribbble.com')) {
        label = 'Dribbble';
        category = 'professional';
      } else if (hostname.includes('github.com')) {
        // GitHub profile vs repository
        if (pathParts.length === 1) {
          label = 'GitHub Profile';
          category = 'professional';
        } else if (pathParts.length >= 2) {
          label = 'GitHub Repo';
          category = 'projects';
        } else {
          label = 'GitHub';
          category = 'professional';
        }
      } else if (hostname.includes('gitlab.com') || hostname.includes('bitbucket.org')) {
        if (pathParts.length >= 2) {
          label = hostname.includes('gitlab') ? 'GitLab Repo' : 'Bitbucket Repo';
          category = 'projects';
        } else {
          label = hostname.includes('gitlab') ? 'GitLab Profile' : 'Bitbucket Profile';
          category = 'professional';
        }
      } else if (
        lowerUrl.includes('portfolio') || 
        hostname.includes('vercel.app') || 
        hostname.includes('netlify.app') || 
        hostname.includes('github.io') ||
        lowerUrl.includes('project') ||
        lowerUrl.includes('demo')
      ) {
        label = (lowerUrl.includes('project') || lowerUrl.includes('demo')) ? 'Project Link' : 'Portfolio';
        category = (lowerUrl.includes('project') || lowerUrl.includes('demo')) ? 'projects' : 'professional';
      } else {
        // Default to professional for unknown domains (likely personal websites)
        label = 'Website';
        category = 'professional';
      }

      // Add to appropriate category
      if (category === 'professional') {
        if (!links.professional.find(l => l.url === fullUrl)) {
          links.professional.push({ label, url: fullUrl });
        }
      } else {
        if (!links.projects.find(l => l.url === fullUrl)) {
          links.projects.push({ label, url: fullUrl });
        }
      }
    }
  });

  return links;
}
