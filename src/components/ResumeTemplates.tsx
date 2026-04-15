import React from 'react';
import { ResumeAnalysis } from '../lib/gemini';
import { cn } from '../lib/utils';

interface TemplateProps {
  data: ResumeAnalysis['structuredResume'];
  onUpdate?: (newData: ResumeAnalysis['structuredResume']) => void;
  pageCount?: number;
  baseFontSize?: number;
  isExporting?: boolean;
  resumeLength?: string;
  customization?: {
    primaryColor?: string;
    fontFamily?: string;
    sectionSpacing?: number;
    lineHeight?: number;
  };
  originalPdfUrl?: string;
  originalPdfType?: string;
}

const cleanEmail = (email: string) => {
  if (!email) return '';
  // Remove all whitespace characters
  return email.replace(/\s+/g, '').trim();
};

const cleanText = (text: string) => {
  if (!text) return text;
  let cleaned = text;
  
  // Fix common typos/encoding issues
  cleaned = cleaned.replace(/Scikit[^\w\s]?learn/gi, "Scikit-learn");
  cleaned = cleaned.replace(/REST[^\w\s]?APIs/gi, "REST APIs");
  cleaned = cleaned.replace(/REST[^\w\s]?API/gi, "REST API");
  
  // Fix email spacing specifically - remove ALL spaces around @ and dots
  cleaned = cleaned.replace(/\s*@\s*/g, "@");
  cleaned = cleaned.replace(/\s*\.\s*(com|net|org|edu|gov|io|in|me|ai)/gi, ".$1");
  
  // Aggressive punctuation fix - remove spaces before punctuation
  cleaned = cleaned.replace(/\s+([.,:;!/|])/g, "$1");
  
  // Remove leading/trailing bullets
  cleaned = cleaned.replace(/^[•\-\*\/]\s*/, "");
  cleaned = cleaned.replace(/\s*[•\-\*\/]$/, "");

  return cleaned.trim();
};

const EditableText: React.FC<{
  value: string;
  onUpdate: (newValue: string) => void;
  className?: string;
  style?: React.CSSProperties;
  element?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'li';
  multiline?: boolean;
  isExporting?: boolean;
}> = ({ value, onUpdate, className, style, element: Element = 'div', multiline = false, isExporting = false }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onUpdate(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  if (isExporting) {
    const displayValue = cleanText(value);
    if (!displayValue || displayValue === '•' || displayValue === '-' || displayValue === '*') return null;
    
    return (
      <Element 
        className={cn(className, "export-text")} 
        style={{ 
          ...style, 
          wordBreak: 'keep-all', 
          overflowWrap: 'break-word',
          hyphens: 'none',
          whiteSpace: multiline ? 'pre-wrap' : 'normal'
        }}
      >
        {displayValue}
      </Element>
    );
  }

  return (
    <Element
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={(e) => setLocalValue(e.currentTarget.textContent || '')}
      className={cn(
        "outline-none focus:ring-2 focus:ring-brand-400 focus:ring-opacity-50 rounded px-1 -mx-1 transition-all",
        isEditing ? "bg-brand-50/50" : "hover:bg-slate-50/50",
        className
      )}
      style={style}
    >
      {value}
    </Element>
  );
};

const isValidUrl = (url: string) => {
  if (!url) return false;
  // Handle email
  if (url.includes('@') && !url.includes('/')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);
  }
  try {
    const testUrl = url.startsWith('http') ? url : `https://${url}`;
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return pattern.test(testUrl);
  } catch {
    return false;
  }
};

const EditableLink: React.FC<{
  label: string;
  url: string;
  onUpdate: (newLabel: string, newUrl: string) => void;
  onDelete: () => void;
  className?: string;
  isExporting?: boolean;
}> = ({ label, url, onUpdate, onDelete, className, isExporting = false }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localLabel, setLocalLabel] = React.useState(label);
  const [localUrl, setLocalUrl] = React.useState(url);
  const [error, setError] = React.useState<string | null>(null);

  const isBroken = url && !isValidUrl(url);

  const handleTest = () => {
    if (!url) {
      setError("URL is empty");
      return;
    }
    if (!isValidUrl(url)) {
      setError("Invalid URL format");
      setTimeout(() => setError(null), 3000);
      return;
    }
    const testUrl = url.includes('@') && !url.includes('/') 
      ? `mailto:${url}` 
      : (url.startsWith('http') ? url : `https://${url}`);
    window.open(testUrl, '_blank');
  };

  const finalUrl = url 
    ? (url.includes('@') && !url.includes('/') 
        ? `mailto:${url.replace(/^mailto:/, '')}` 
        : (url.startsWith('http') ? url : `https://${url.replace(/^https?:\/\//, '')}`)) 
    : '#';

  if (isExporting) {
    if (!label) return null;
    return (
      <a 
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-blue-600 underline", className)}
        style={{ pointerEvents: 'auto' }}
      >
        {label}
      </a>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 bg-slate-100 p-2 rounded shadow-sm inline-flex min-w-[200px]">
        <div className="flex items-center gap-2">
          <input
            className="text-[10px] p-1 border rounded w-20"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            placeholder="Label"
            autoFocus
          />
          <input
            className="text-[10px] p-1 border rounded flex-1"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="URL (e.g. github.com/user)"
          />
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button 
            onClick={() => { onUpdate(localLabel, localUrl); setIsEditing(false); }} 
            className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded hover:bg-brand-700"
          >
            Save
          </button>
          <button 
            onClick={() => setIsEditing(false)} 
            className="text-[10px] bg-slate-300 text-slate-700 px-2 py-0.5 rounded hover:bg-slate-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative flex items-center gap-1 inline-flex", className)}>
      <a 
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "cursor-pointer hover:underline",
          isBroken ? "text-red-500 decoration-dotted underline" : "text-brand-600"
        )} 
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          setIsEditing(true);
        }}
      >
        {label}
        {isBroken && <span className="ml-1 text-[10px] font-bold" title="Broken Link">⚠️</span>}
      </a>
      
      {error && (
        <div className="absolute -bottom-6 left-0 bg-red-100 text-red-600 text-[8px] px-1 rounded whitespace-nowrap z-20">
          {error}
        </div>
      )}

      <div className="hidden group-hover:flex absolute -top-8 left-0 bg-white shadow-lg border rounded p-1 gap-2 z-10 whitespace-nowrap">
        <button onClick={handleTest} className="text-[10px] text-blue-600 hover:underline px-1">Test</button>
        <button onClick={() => setIsEditing(true)} className="text-[10px] text-slate-600 hover:underline px-1">Edit</button>
        <button onClick={onDelete} className="text-[10px] text-red-600 hover:underline px-1">Delete</button>
      </div>
    </div>
  );
};

const LinksSection: React.FC<{
  links: { label: string; url: string }[];
  onUpdate: (newLinks: { label: string; url: string }[]) => void;
  className?: string;
  separator?: string;
  isExporting?: boolean;
}> = ({ links = [], onUpdate, className, separator = "|", isExporting = false }) => {
  const addLink = () => {
    onUpdate([...links, { label: 'New Link', url: '' }]);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((link, i) => (
        <React.Fragment key={i}>
          <EditableLink
            label={link.label}
            url={link.url}
            isExporting={isExporting}
            onUpdate={(label, url) => {
              const newLinks = [...links];
              newLinks[i] = { label, url };
              onUpdate(newLinks);
            }}
            onDelete={() => {
              onUpdate(links.filter((_, index) => index !== i));
            }}
          />
          {i < links.length - 1 && <span className="text-slate-300">{separator}</span>}
        </React.Fragment>
      ))}
      {!isExporting && (
        <button 
          onClick={addLink}
          className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-500 transition-colors ml-1 hide-on-export"
          title="Add new link"
        >
          + Add Link
        </button>
      )}
    </div>
  );
};

const ModernMinimalist: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false, 
  resumeLength,
  customization = {}
}) => {
  const {
    primaryColor = '#0f172a',
    fontFamily = 'Inter, sans-serif',
    sectionSpacing = 1,
    lineHeight = 1.4
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className={cn(
        "bg-white p-8 shadow-sm text-slate-800 mx-auto",
        isExporting ? "w-[794px]" : "w-full"
      )}
      style={{ 
        minHeight: isExporting ? `${pageCount * 1123}px` : 'auto',
        fontSize: `${baseFontSize}pt`,
        lineHeight: lineHeight,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: '800px',
        fontFamily: fontFamily
      }}
    >
      <header className="border-b-2 pb-3 mb-4" style={{ borderColor: primaryColor }}>
        <EditableText 
          element="h1"
          value={data.personalInfo.fullName} 
          onUpdate={(v) => updatePersonalInfo('fullName', v)}
          isExporting={isExporting}
          className="font-black tracking-tight uppercase mb-1" 
          style={{ fontSize: '2em', color: primaryColor }}
        />
        <div className="flex flex-wrap gap-3 font-bold text-slate-500 uppercase tracking-widest items-center" style={{ fontSize: '0.7em' }}>
          <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
          <span>|</span>
          <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
          <span>|</span>
          <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
          {((data.personalInfo.links || []).length > 0) && <span>|</span>}
          <LinksSection 
            links={data.personalInfo.links || []} 
            onUpdate={(newLinks) => updateLinks(newLinks)} 
            isExporting={isExporting}
          />
        </div>
      </header>

      <section className="mb-6" style={{ marginBottom: `${sectionSpacing * 1.5}rem` }}>
        <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-2" style={{ fontSize: '0.7em' }}>Career Objective</h2>
        <EditableText 
          element="p"
          multiline
          value={data.summary} 
          onUpdate={(v) => onUpdate?.({ ...data, summary: v })}
          isExporting={isExporting}
          className="text-left" 
          style={{ fontSize: '1em' }}
        />
      </section>

      <section className="mb-6" style={{ marginBottom: `${sectionSpacing * 1.5}rem` }}>
        <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-2" style={{ fontSize: '0.7em' }}>Experience</h2>
        <div className="space-y-4" style={{ gap: `${sectionSpacing * 1}rem` }}>
          {(data.experience || []).map((exp, i) => (
            <div key={i}>
              <div className="flex justify-between items-baseline mb-1">
                <EditableText 
                  element="h3"
                  value={exp.position} 
                  onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, position: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }}
                  isExporting={isExporting}
                  className="font-bold text-slate-900" 
                  style={{ fontSize: '1.1em' }}
                />
                <div className="flex gap-1 font-bold text-slate-400 uppercase" style={{ fontSize: '0.7em' }}>
                  <EditableText value={exp.startDate} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, startDate: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} isExporting={isExporting} />
                  <span>—</span>
                  <EditableText value={exp.endDate} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, endDate: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} isExporting={isExporting} />
                </div>
              </div>
              <div className="font-bold uppercase mb-1 flex gap-2" style={{ fontSize: '0.8em', color: primaryColor }}>
                <EditableText value={exp.company} onUpdate={(v) => {
                  const newExp = [...(data.experience || [])];
                  newExp[i] = { ...exp, company: v };
                  onUpdate?.({ ...data, experience: newExp });
                }} isExporting={isExporting} />
                <span>|</span>
                <EditableText value={exp.location} onUpdate={(v) => {
                  const newExp = [...(data.experience || [])];
                  newExp[i] = { ...exp, location: v };
                  onUpdate?.({ ...data, experience: newExp });
                }} isExporting={isExporting} />
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {(exp.highlights || []).map((h, j) => (
                  <EditableText 
                    key={j}
                    element="li"
                    multiline
                    value={h} 
                    onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      const newHighlights = [...(exp.highlights || [])];
                      newHighlights[j] = v;
                      newExp[i] = { ...exp, highlights: newHighlights };
                      onUpdate?.({ ...data, experience: newExp });
                    }}
                    isExporting={isExporting}
                    className="text-slate-600 text-left" 
                    style={{ fontSize: '0.9em' }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-2" style={{ fontSize: '0.7em' }}>Education</h2>
          <div className="space-y-3">
            {(data.education || []).map((edu, i) => (
              <div key={i}>
                <EditableText 
                  value={edu.degree} 
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, degree: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  isExporting={isExporting}
                  className="font-bold text-slate-900" 
                  style={{ fontSize: '0.95em' }}
                />
                <div className="text-slate-500 flex gap-1" style={{ fontSize: '0.8em' }}>
                  <EditableText value={edu.school} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, school: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} isExporting={isExporting} />
                  <span>|</span>
                  <EditableText value={edu.graduationDate} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, graduationDate: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} isExporting={isExporting} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-2" style={{ fontSize: '0.7em' }}>Skills</h2>
          <div className="space-y-1.5">
            {(data.skills || []).map((skill, i) => (
              <div key={i} className="flex gap-1" style={{ fontSize: '0.85em' }}>
                <span className="text-slate-400">•</span>
                <EditableText 
                  value={skill.category} 
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, category: v };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                  isExporting={isExporting}
                  className="font-bold text-slate-900" 
                />
                <span>:</span>
                <EditableText 
                  value={(skill.items || []).join(', ')} 
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, items: v.split(',').map(s => s.trim()) };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                  isExporting={isExporting}
                  className="text-slate-600"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {data.certificates && (data.certificates || []).length > 0 && (
        <section className="mt-8">
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-4" style={{ fontSize: '0.75em' }}>Certifications</h2>
          <div className="flex flex-wrap gap-2">
            {(data.certificates || []).map((cert, i) => (
              <EditableText 
                key={i}
                element="span"
                value={cert} 
                onUpdate={(v) => {
                  const newCerts = [...(data.certificates || [])];
                  newCerts[i] = v;
                  onUpdate?.({ ...data, certificates: newCerts });
                }}
                className="bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-700" 
                style={{ fontSize: '0.75em' }}
              />
            ))}
          </div>
        </section>
      )}

      {data.projects && (data.projects || []).length > 0 && (
        <section className="mt-10">
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-4" style={{ fontSize: '0.75em' }}>Projects</h2>
          <div className="grid grid-cols-2 gap-8">
            {(data.projects || []).map((proj, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2">
                    <EditableText 
                      element="h3"
                      value={proj.name} 
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, name: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                      isExporting={isExporting}
                      className="font-bold text-slate-900" 
                      style={{ fontSize: '1em' }}
                    />
                    {proj.link && (
                      <EditableLink
                        label="GitHub"
                        url={proj.link}
                        isExporting={isExporting}
                        onUpdate={(label, url) => {
                          const newProj = [...(data.projects || [])];
                          newProj[i] = { ...proj, link: url };
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                        onDelete={() => {
                          const newProj = [...(data.projects || [])];
                          const { link, ...rest } = proj;
                          newProj[i] = rest;
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                        className="text-[10px]"
                      />
                    )}
                  </div>
                  <span className="text-slate-400 italic" style={{ fontSize: '0.75em' }}>
                    <EditableText 
                      value={(proj.technologies || []).join(', ')} 
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, technologies: v.split(',').map(s => s.trim()) };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                      isExporting={isExporting}
                    />
                  </span>
                </div>
                <EditableText 
                  element="p"
                  multiline
                  value={proj.description} 
                  onUpdate={(v) => {
                    const newProj = [...(data.projects || [])];
                    newProj[i] = { ...proj, description: v };
                    onUpdate?.({ ...data, projects: newProj });
                  }}
                  isExporting={isExporting}
                  className="text-slate-600 leading-relaxed" 
                  style={{ fontSize: '0.85em' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {data.achievements && (data.achievements || []).length > 0 && (
        <section className="mt-10">
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-4" style={{ fontSize: '0.75em' }}>Achievements</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            {(data.achievements || []).map((ach, i) => (
              <EditableText 
                key={i}
                element="li"
                value={ach} 
                onUpdate={(v) => {
                  const newAch = [...(data.achievements || [])];
                  newAch[i] = v;
                  onUpdate?.({ ...data, achievements: newAch });
                }}
                isExporting={isExporting}
                className="text-slate-600 leading-relaxed" 
                style={{ fontSize: '0.9em' }}
              />
            ))}
          </ul>
        </section>
      )}

      {data.strengths && (data.strengths || []).length > 0 && (
        <section className="mt-10">
          <h2 className="font-black uppercase tracking-[0.3em] text-slate-400 mb-4" style={{ fontSize: '0.75em' }}>Strengths</h2>
          <div className="flex flex-wrap gap-2">
            {(data.strengths || []).map((strength, i) => (
              <EditableText 
                key={i}
                element="span"
                value={strength} 
                onUpdate={(v) => {
                  const newStrengths = [...(data.strengths || [])];
                  newStrengths[i] = v;
                  onUpdate?.({ ...data, strengths: newStrengths });
                }}
                isExporting={isExporting}
                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest" 
                style={{ fontSize: '0.65em' }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const ExecutiveProfessional: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false,
  customization = {}
}) => {
  const {
    primaryColor = '#0f172a',
    fontFamily = 'Georgia, serif',
    sectionSpacing = 1,
    lineHeight = 1.4
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className={cn(
        "bg-white p-10 shadow-sm text-slate-900 mx-auto",
        isExporting ? "w-[794px]" : "w-full"
      )}
      style={{ 
        minHeight: isExporting ? `${pageCount * 1123}px` : 'auto',
        fontSize: `${baseFontSize}pt`,
        lineHeight: lineHeight,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: '800px',
        fontFamily: fontFamily
      }}
    >
      <header className="text-center mb-6">
        <EditableText 
          element="h1"
          value={data.personalInfo.fullName} 
          onUpdate={(v) => updatePersonalInfo('fullName', v)}
          isExporting={isExporting}
          className="font-bold mb-2" 
          style={{ fontSize: '2.2em', color: primaryColor }}
        />
        <div className="font-bold text-slate-600 flex justify-center gap-3 items-center" style={{ fontSize: '0.8em' }}>
          <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
          <span>•</span>
          <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
          <span>•</span>
          <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
          {((data.personalInfo.links || []).length > 0) && <span>•</span>}
          <LinksSection 
            links={data.personalInfo.links || []} 
            onUpdate={(newLinks) => updateLinks(newLinks)} 
            separator="•"
            isExporting={isExporting}
          />
        </div>
      </header>

      <section className="mb-4" style={{ marginBottom: `${sectionSpacing * 1}rem` }}>
        <h2 className="font-bold border-b mb-2 uppercase tracking-wider" style={{ fontSize: '1.1em', borderColor: primaryColor, color: primaryColor }}>Executive Summary</h2>
        <EditableText 
          element="p"
          multiline
          value={data.summary} 
          onUpdate={(v) => onUpdate?.({ ...data, summary: v })}
          className="italic text-left" 
          style={{ fontSize: '1em' }}
        />
      </section>

      <section className="mb-4" style={{ marginBottom: `${sectionSpacing * 1}rem` }}>
        <h2 className="font-bold border-b mb-3 uppercase tracking-wider" style={{ fontSize: '1.1em', borderColor: primaryColor, color: primaryColor }}>Professional Experience</h2>
        <div className="space-y-4" style={{ gap: `${sectionSpacing * 1}rem` }}>
          {(data.experience || []).map((exp, i) => (
            <div key={i}>
                <div className="flex justify-between font-bold mb-0.5" style={{ fontSize: '1.05em' }}>
                  <EditableText value={exp.company} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, company: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} style={{ color: primaryColor }} />
                  <div className="flex gap-1">
                    <EditableText value={exp.startDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, startDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                    <span>—</span>
                    <EditableText value={exp.endDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, endDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                  </div>
                </div>
                <div className="italic mb-1.5 flex gap-2" style={{ fontSize: '0.85em' }}>
                  <EditableText value={exp.position} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, position: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                  <span>|</span>
                  <EditableText value={exp.location} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, location: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                </div>
              <ul className="list-disc ml-5 space-y-0.5">
                {(exp.highlights || []).map((h, j) => (
                  <EditableText 
                    key={j}
                    element="li"
                    multiline
                    value={h} 
                    onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      const newHighlights = [...(exp.highlights || [])];
                      newHighlights[j] = v;
                      newExp[i] = { ...exp, highlights: newHighlights };
                      onUpdate?.({ ...data, experience: newExp });
                    }}
                    className="text-justify" 
                    style={{ fontSize: '1em' }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h2 className="font-bold border-b border-slate-300 mb-3 uppercase tracking-wider" style={{ fontSize: '1.1em' }}>Education</h2>
        {(data.education || []).map((edu, i) => (
          <div key={i} className="flex justify-between mb-1" style={{ fontSize: '1em' }}>
            <div className="flex gap-1">
              <EditableText 
                value={edu.school} 
                isExporting={isExporting}
                onUpdate={(v) => {
                  const newEdu = [...(data.education || [])];
                  newEdu[i] = { ...edu, school: v };
                  onUpdate?.({ ...data, education: newEdu });
                }}
                className="font-bold" 
              />
              <span>,</span>
              <EditableText 
                value={edu.degree} 
                isExporting={isExporting}
                onUpdate={(v) => {
                  const newEdu = [...(data.education || [])];
                  newEdu[i] = { ...edu, degree: v };
                  onUpdate?.({ ...data, education: newEdu });
                }}
              />
            </div>
            <EditableText 
              value={edu.graduationDate} 
              isExporting={isExporting}
              onUpdate={(v) => {
                const newEdu = [...(data.education || [])];
                newEdu[i] = { ...edu, graduationDate: v };
                onUpdate?.({ ...data, education: newEdu });
              }}
              className="italic" 
              style={{ fontSize: '0.85em' }}
            />
          </div>
        ))}
      </section>

      {data.certificates && (data.certificates || []).length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold border-b border-slate-300 mb-4 uppercase tracking-wider" style={{ fontSize: '1.2em' }}>Certifications</h2>
          <div className="space-y-2">
            {(data.certificates || []).map((cert, i) => (
              <EditableText 
                key={i}
                element="p"
                value={cert} 
                onUpdate={(v) => {
                  const newCerts = [...(data.certificates || [])];
                  newCerts[i] = v;
                  onUpdate?.({ ...data, certificates: newCerts });
                }}
                className="italic" 
                style={{ fontSize: '0.9em' }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-bold border-b border-slate-300 mb-4 uppercase tracking-wider" style={{ fontSize: '1.2em' }}>Core Competencies</h2>
        <div className="space-y-2">
            {(data.skills || []).map((skill, i) => (
              <div key={i} className="flex gap-1" style={{ fontSize: '1em' }}>
                <span className="text-slate-400">•</span>
                <EditableText 
                  value={skill.category} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, category: v };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                  className="font-bold whitespace-nowrap" 
                />
                <span>:</span>
                <EditableText 
                  value={(skill.items || []).join(', ')} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, items: v.split(',').map(s => s.trim()) };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                />
              </div>
            ))}
        </div>
      </section>

      {data.projects && (data.projects || []).length > 0 && (
        <section>
          <h2 className="font-bold border-b border-slate-300 mb-4 uppercase tracking-wider" style={{ fontSize: '1.2em' }}>Key Projects</h2>
          <div className="space-y-4">
            {(data.projects || []).map((proj, i) => (
              <div key={i}>
                <div className="flex justify-between font-bold mb-1" style={{ fontSize: '1em' }}>
                  <div className="flex items-center gap-2">
                    <EditableText 
                      value={proj.name} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, name: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                    />
                    {proj.link && (
                      <EditableLink
                        label="GitHub"
                        url={proj.link}
                        isExporting={isExporting}
                        onUpdate={(label, url) => {
                          const newProj = [...(data.projects || [])];
                          newProj[i] = { ...proj, link: url };
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                        onDelete={() => {
                          const newProj = [...(data.projects || [])];
                          const { link, ...rest } = proj;
                          newProj[i] = rest;
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                        className="text-[10px] font-normal"
                      />
                    )}
                  </div>
                  <span className="italic font-normal" style={{ fontSize: '0.9em' }}>
                    <EditableText 
                      value={(proj.technologies || []).join(', ')} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, technologies: v.split(',').map(s => s.trim()) };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                    />
                  </span>
                </div>
                <EditableText 
                  element="p"
                  multiline
                  value={proj.description} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newProj = [...(data.projects || [])];
                    newProj[i] = { ...proj, description: v };
                    onUpdate?.({ ...data, projects: newProj });
                  }}
                  className="leading-relaxed italic text-slate-700" 
                  style={{ fontSize: '0.9em' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const CreativeTech: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false,
  customization = {}
}) => {
  const {
    primaryColor = '#0f172a',
    fontFamily = 'Inter, sans-serif',
    sectionSpacing = 1,
    lineHeight = 1.4
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className={cn(
        "bg-slate-50 p-0 shadow-sm font-sans flex mx-auto",
        isExporting ? "w-[794px]" : "w-full"
      )}
      style={{ 
        fontSize: `${baseFontSize}pt`,
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: '800px'
      }}
    >
      <aside className="w-1/3 bg-slate-900 text-white p-6">
        <div className="mb-6">
          <EditableText 
            element="h1"
            multiline
            value={data.personalInfo.fullName.split(' ').join('\n')} 
            onUpdate={(v) => updatePersonalInfo('fullName', v.replace(/\n/g, ' '))}
            isExporting={isExporting}
            className="font-black leading-tight mb-3" 
            style={{ fontSize: '2em' }}
          />
          <div className="space-y-2 font-bold text-slate-400" style={{ fontSize: '0.7em' }}>
            <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
            <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
            <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
            <div className="pt-2">
              <LinksSection 
                links={data.personalInfo.links || []} 
                onUpdate={(newLinks) => updateLinks(newLinks)} 
                className="flex-col items-start gap-1"
                separator=""
                isExporting={isExporting}
              />
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="font-black uppercase tracking-widest text-brand-400 mb-4" style={{ fontSize: '0.85em' }}>Skills</h2>
          <div className="space-y-3">
            {(data.skills || []).map((skill, i) => (
              <div key={i} className="text-slate-300 flex gap-1" style={{ fontSize: '0.75em' }}>
                <span>•</span>
                <EditableText 
                  value={skill.category} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, category: v };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                  className="font-bold text-slate-100" 
                />
                <span>:</span>
                <EditableText 
                  value={(skill.items || []).join(', ')} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, items: v.split(',').map(s => s.trim()) };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-black uppercase tracking-widest text-brand-400 mb-4" style={{ fontSize: '0.85em' }}>Education</h2>
          <div className="space-y-4">
            {(data.education || []).map((edu, i) => (
              <div key={i}>
                <EditableText 
                  element="p"
                  value={edu.degree} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, degree: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  className="font-bold" 
                  style={{ fontSize: '0.85em' }}
                />
                <EditableText 
                  element="p"
                  value={edu.school} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, school: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  className="text-slate-500" 
                  style={{ fontSize: '0.75em' }}
                />
                <EditableText 
                  element="p"
                  value={edu.graduationDate} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, graduationDate: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  className="text-slate-500" 
                  style={{ fontSize: '0.75em' }}
                />
              </div>
            ))}
          </div>
        </div>

        {data.certificates && (data.certificates || []).length > 0 && (
          <div className="mt-10">
            <h2 className="font-black uppercase tracking-widest text-brand-400 mb-4" style={{ fontSize: '0.85em' }}>Certifications</h2>
            <div className="space-y-3">
              {(data.certificates || []).map((cert, i) => (
                <EditableText 
                  key={i}
                  element="p"
                  value={cert} 
                  onUpdate={(v) => {
                    const newCerts = [...(data.certificates || [])];
                    newCerts[i] = v;
                    onUpdate?.({ ...data, certificates: newCerts });
                  }}
                  className="text-slate-400 leading-tight" 
                  style={{ fontSize: '0.75em' }}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 p-8 bg-white">
        <section className="mb-6">
          <h2 className="font-black uppercase tracking-widest text-slate-900 mb-2 border-b-2 border-slate-900 pb-1" style={{ fontSize: '0.9em' }}>About Me</h2>
          <EditableText 
            element="p"
            multiline
            value={data.summary} 
            onUpdate={(v) => onUpdate?.({ ...data, summary: v })}
            isExporting={isExporting}
            className="text-slate-600 text-justify" 
            style={{ fontSize: '1em' }}
          />
        </section>

        <section className="mb-6">
          <h2 className="font-black uppercase tracking-widest text-slate-900 mb-4 border-b-2 border-slate-900 pb-1" style={{ fontSize: '0.9em' }}>Experience</h2>
          <div className="space-y-4">
            {(data.experience || []).map((exp, i) => (
              <div key={i} className="relative pl-5 border-l border-slate-200">
                <div className="absolute w-2.5 h-2.5 bg-brand-500 rounded-full -left-[5.5px] top-1" />
                <div className="mb-1">
                  <EditableText 
                    element="h3"
                    value={exp.position} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, position: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }}
                    className="font-bold text-slate-900" 
                    style={{ fontSize: '1.05em' }}
                  />
                  <EditableText 
                    element="div"
                    value={exp.company} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, company: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }}
                    className="font-bold text-brand-600" 
                    style={{ fontSize: '0.8em' }}
                  />
                  <div className="font-bold text-slate-400 uppercase flex gap-1" style={{ fontSize: '0.7em' }}>
                    <EditableText value={exp.startDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, startDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                    <span>—</span>
                    <EditableText value={exp.endDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, endDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {(exp.highlights || []).map((h, j) => (
                    <EditableText 
                      key={j}
                      element="li"
                      multiline
                      value={`• ${h}`} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newExp = [...(data.experience || [])];
                        const newHighlights = [...(exp.highlights || [])];
                        newHighlights[j] = v.replace(/^•\s*/, '');
                        newExp[i] = { ...exp, highlights: newHighlights };
                        onUpdate?.({ ...data, experience: newExp });
                      }}
                      className="text-slate-600 text-left" 
                      style={{ fontSize: '0.85em' }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {data.projects && (data.projects || []).length > 0 && (
          <section>
            <h2 className="font-black uppercase tracking-widest text-slate-900 mb-6 border-b-2 border-slate-900 pb-2" style={{ fontSize: '1em' }}>Projects</h2>
            <div className="space-y-6">
              {(data.projects || []).map((proj, i) => (
                <div key={i} className="relative pl-6 border-l border-slate-200">
                  <div className="absolute w-3 h-3 bg-brand-500 rounded-full -left-[6.5px] top-1" />
                  <div className="mb-1">
                    <div className="flex justify-between items-baseline">
                      <EditableText 
                        element="h3"
                        value={proj.name} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newProj = [...(data.projects || [])];
                          newProj[i] = { ...proj, name: v };
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                        className="font-bold text-slate-900" 
                        style={{ fontSize: '1.1em' }}
                      />
                      <div className="flex items-center gap-2">
                        {proj.link && (
                          <EditableLink
                            label="GitHub"
                            url={proj.link}
                            isExporting={isExporting}
                            onUpdate={(label, url) => {
                              const newProj = [...(data.projects || [])];
                              newProj[i] = { ...proj, link: url };
                              onUpdate?.({ ...data, projects: newProj });
                            }}
                            onDelete={() => {
                              const newProj = [...(data.projects || [])];
                              const { link, ...rest } = proj;
                              newProj[i] = rest;
                              onUpdate?.({ ...data, projects: newProj });
                            }}
                            className="text-[0.7em] font-bold uppercase"
                          />
                        )}
                        <EditableText 
                          value={(proj.technologies || []).join(' • ')} 
                          isExporting={isExporting}
                          onUpdate={(v) => {
                            const newProj = [...(data.projects || [])];
                            newProj[i] = { ...proj, technologies: v.split(' • ').map(s => s.trim()) };
                            onUpdate?.({ ...data, projects: newProj });
                          }}
                          className="font-bold text-brand-600 uppercase" 
                          style={{ fontSize: '0.75em' }}
                        />
                      </div>
                    </div>
                  </div>
                  <EditableText 
                    element="p"
                    multiline
                    value={proj.description} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newProj = [...(data.projects || [])];
                      newProj[i] = { ...proj, description: v };
                      onUpdate?.({ ...data, projects: newProj });
                    }}
                    className="text-slate-600 leading-relaxed mt-2" 
                    style={{ fontSize: '0.85em' }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const StartupHustler: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false, 
  resumeLength,
  customization = {}
}) => {
  const {
    primaryColor = '#0f172a',
    fontFamily = 'Inter, sans-serif',
    sectionSpacing = 1,
    lineHeight = 1.4
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className="bg-white p-8 shadow-sm font-sans text-slate-900"
      style={{ 
        fontSize: `${baseFontSize}pt`,
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word'
      }}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <EditableText 
            element="h1"
            value={data.personalInfo.fullName} 
            onUpdate={(v) => updatePersonalInfo('fullName', v)}
            isExporting={isExporting}
            className="font-black tracking-tighter mb-1" 
            style={{ fontSize: '2.8em' }}
          />
          <EditableText 
            element="p"
            value={data.experience[0]?.position || 'Professional'} 
            onUpdate={(v) => {
              const newExp = [...data.experience];
              if (newExp[0]) {
                newExp[0] = { ...newExp[0], position: v };
                onUpdate?.({ ...data, experience: newExp });
              }
            }}
            isExporting={isExporting}
            className="text-brand-600 font-bold uppercase tracking-widest" 
            style={{ fontSize: '0.8em' }}
          />
        </div>
        <div className="text-right font-medium text-slate-500 space-y-0.5 flex flex-col items-end" style={{ fontSize: '0.7em' }}>
          <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
          <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
          <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
          <div className="pt-1">
            <LinksSection 
              links={data.personalInfo.links || []} 
              onUpdate={(newLinks) => updateLinks(newLinks)} 
              className="justify-end"
              isExporting={isExporting}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className={cn("col-span-8 space-y-6", resumeLength === '1 Page' ? "space-y-4" : "space-y-6")}>
          <section>
            <h2 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontSize: '0.8em' }}>
              <span className="w-6 h-1 bg-slate-900" /> Experience
            </h2>
            <div className="space-y-4">
              {(data.experience || []).map((exp, i) => (
                <div key={i}>
                <div className="flex justify-between items-baseline mb-1">
                  <EditableText 
                    element="h3"
                    value={exp.company} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, company: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }}
                    className="font-bold" 
                    style={{ fontSize: '1.1em' }}
                  />
                  <div className="flex gap-1 font-bold text-slate-400" style={{ fontSize: '0.7em' }}>
                    <EditableText value={exp.startDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, startDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                    <span>—</span>
                    <EditableText value={exp.endDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, endDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                  </div>
                </div>
                <EditableText 
                  element="p"
                  value={exp.position} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, position: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }}
                  className="font-bold text-slate-600 mb-1.5" 
                  style={{ fontSize: '0.8em' }}
                />
                  <ul className="space-y-1">
                    {(exp.highlights || []).map((h, j) => (
                      <EditableText 
                        key={j}
                        element="li"
                        multiline
                        value={`/ ${h}`} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newExp = [...(data.experience || [])];
                          const newHighlights = [...(exp.highlights || [])];
                          newHighlights[j] = v.replace(/^\/\s*/, '');
                          newExp[i] = { ...exp, highlights: newHighlights };
                          onUpdate?.({ ...data, experience: newExp });
                        }}
                        className="text-slate-600 text-left flex gap-2" 
                        style={{ fontSize: '0.85em' }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className={cn("col-span-4 space-y-6", resumeLength === '1 Page' ? "space-y-4" : "space-y-6")}>
          <section>
            <h2 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontSize: '0.8em' }}>
              <span className="w-6 h-1 bg-slate-900" /> Summary
            </h2>
            <EditableText 
              element="p"
              multiline
              value={data.summary} 
              onUpdate={(v) => onUpdate?.({ ...data, summary: v })}
              isExporting={isExporting}
              className="text-slate-600 text-justify" 
              style={{ fontSize: '0.85em' }}
            />
          </section>

          <section>
            <h2 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontSize: '0.8em' }}>
              <span className="w-6 h-1 bg-slate-900" /> Skills
            </h2>
            <div className="space-y-1">
              {(data.skills || []).map((skill, i) => (
                <div key={i} className="flex gap-1" style={{ fontSize: '0.8em' }}>
                  <span className="text-slate-400">•</span>
                  <EditableText 
                    value={skill.category} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newSkills = [...(data.skills || [])];
                      newSkills[i] = { ...skill, category: v };
                      onUpdate?.({ ...data, skills: newSkills });
                    }}
                    className="font-bold text-slate-900" 
                  />
                  <span>:</span>
                  <EditableText 
                    value={(skill.items || []).join(', ')} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newSkills = [...(data.skills || [])];
                      newSkills[i] = { ...skill, items: v.split(',').map(s => s.trim()) };
                      onUpdate?.({ ...data, skills: newSkills });
                    }}
                    className="text-slate-600"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontSize: '0.8em' }}>
              <span className="w-6 h-1 bg-slate-900" /> Education
            </h2>
            {(data.education || []).map((edu, i) => (
              <div key={i} className="mb-2">
                <EditableText 
                  element="p"
                  value={edu.degree} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, degree: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  className="font-bold" 
                  style={{ fontSize: '0.8em' }}
                />
                <EditableText 
                  element="p"
                  value={edu.school} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, school: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }}
                  className="text-slate-500" 
                  style={{ fontSize: '0.7em' }}
                />
              </div>
            ))}
          </section>

          {data.certificates && (data.certificates || []).length > 0 && (
            <section>
              <h2 className="font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ fontSize: '0.85em' }}>
                <span className="w-8 h-1 bg-slate-900" /> Certifications
              </h2>
              <div className="space-y-3">
                {(data.certificates || []).map((cert, i) => (
                  <EditableText 
                    key={i}
                    element="p"
                    value={cert} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newCerts = [...(data.certificates || [])];
                      newCerts[i] = v;
                      onUpdate?.({ ...data, certificates: newCerts });
                    }}
                    className="text-slate-600 leading-tight" 
                    style={{ fontSize: '0.75em' }}
                  />
                ))}
              </div>
            </section>
          )}

          {data.projects && (data.projects || []).length > 0 && (
            <section>
              <h2 className="font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ fontSize: '0.85em' }}>
                <span className="w-8 h-1 bg-slate-900" /> Projects
              </h2>
              <div className="space-y-4">
                {(data.projects || []).map((proj, i) => (
                  <div key={i}>
                    <EditableText 
                      element="p"
                      value={proj.name} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, name: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                      className="font-bold" 
                      style={{ fontSize: '0.85em' }}
                    />
                    <EditableText 
                      element="p"
                      multiline
                      value={proj.description} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, description: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                      className="text-slate-600 leading-tight" 
                      style={{ fontSize: '0.75em' }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const ElegantSerif: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false,
  resumeLength,
  customization = {}
}) => {
  const {
    primaryColor = '#0f172a',
    fontFamily = 'Georgia, serif',
    sectionSpacing = 1,
    lineHeight = 1.6
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className="bg-white p-12 shadow-sm font-serif text-slate-900 border-[12px] border-slate-50"
      style={{ 
        fontSize: `${baseFontSize}pt`,
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word'
      }}
    >
      <header className="text-center mb-8">
        <EditableText 
          element="h1"
          value={data.personalInfo.fullName} 
          onUpdate={(v) => updatePersonalInfo('fullName', v)}
          isExporting={isExporting}
          className="text-4xl font-light tracking-widest uppercase mb-4" 
        />
        <div className="h-px w-20 bg-slate-300 mx-auto mb-4" />
        <div className="text-[0.7em] tracking-[0.2em] uppercase text-slate-500 flex justify-center gap-4 items-center">
          <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
          <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
          <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
          {((data.personalInfo.links || []).length > 0) && (
            <LinksSection 
              links={data.personalInfo.links || []} 
              onUpdate={(newLinks) => updateLinks(newLinks)} 
              separator="•"
              isExporting={isExporting}
            />
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-12">
        <section className="text-center">
          <EditableText 
            element="p"
            multiline
            value={`"${data.summary}"`} 
            isExporting={isExporting}
            onUpdate={(v) => onUpdate?.({ ...data, summary: v.replace(/^"|"$/g, '') })}
            className="text-lg leading-relaxed font-light italic text-slate-600" 
          />
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-center mb-8 text-slate-400">Professional History</h2>
          <div className={cn("space-y-10", resumeLength === '1 Page' ? "space-y-6" : "space-y-10")}>
            {(data.experience || []).map((exp, i) => (
              <div key={i} className="text-center">
                <EditableText 
                  element="h3"
                  value={exp.position} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, position: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }}
                  className="text-xl font-medium mb-1" 
                />
                <div className="text-sm uppercase tracking-widest text-brand-700 mb-4 flex justify-center gap-2 flex-wrap">
                  <EditableText value={exp.company} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, company: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                  <span>|</span>
                  <EditableText value={exp.location} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, location: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                  <span>|</span>
                  <div className="flex gap-1">
                    <EditableText value={exp.startDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, startDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                    <span>—</span>
                    <EditableText value={exp.endDate} isExporting={isExporting} onUpdate={(v) => {
                      const newExp = [...(data.experience || [])];
                      newExp[i] = { ...exp, endDate: v };
                      onUpdate?.({ ...data, experience: newExp });
                    }} />
                  </div>
                </div>
                <ul className="space-y-3">
                  {(exp.highlights || []).map((h, j) => (
                    <EditableText 
                      key={j}
                      element="li"
                      multiline
                      value={h} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newExp = [...(data.experience || [])];
                        const newHighlights = [...(exp.highlights || [])];
                        newHighlights[j] = v;
                        newExp[i] = { ...exp, highlights: newHighlights };
                        onUpdate?.({ ...data, experience: newExp });
                      }}
                      className="text-sm leading-relaxed text-slate-600" 
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {data.projects && (data.projects || []).length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-center mb-8 text-slate-400">Selected Projects</h2>
            <div className="space-y-8">
              {(data.projects || []).map((proj, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center gap-2 items-baseline mb-1">
                    <EditableText 
                      element="h3"
                      value={proj.name} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, name: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }}
                      className="text-lg font-medium" 
                    />
                    <span className="text-xs text-slate-400 italic">
                      <EditableText 
                        value={(proj.technologies || []).join(', ')} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newProj = [...(data.projects || [])];
                          newProj[i] = { ...proj, technologies: v.split(',').map(s => s.trim()) };
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                      />
                    </span>
                  </div>
                  <EditableText 
                    element="p"
                    multiline
                    value={proj.description} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newProj = [...(data.projects || [])];
                      newProj[i] = { ...proj, description: v };
                      onUpdate?.({ ...data, projects: newProj });
                    }}
                    className="text-sm text-slate-600 leading-relaxed" 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] mb-6 text-slate-400">Education & Expertise</h2>
          <div className="grid grid-cols-2 gap-12 text-left">
            <div className="space-y-6">
              {(data.education || []).map((edu, i) => (
                <div key={i}>
                  <EditableText 
                    element="p"
                    value={edu.degree} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newEdu = [...(data.education || [])];
                      newEdu[i] = { ...edu, degree: v };
                      onUpdate?.({ ...data, education: newEdu });
                    }}
                    className="font-bold" 
                  />
                  <div className="text-sm italic text-slate-600 flex flex-wrap gap-1">
                    <EditableText 
                      value={edu.school} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newEdu = [...(data.education || [])];
                        newEdu[i] = { ...edu, school: v };
                        onUpdate?.({ ...data, education: newEdu });
                      }}
                    />
                    <span>,</span>
                    <EditableText 
                      value={edu.location || ''} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newEdu = [...(data.education || [])];
                        newEdu[i] = { ...edu, location: v };
                        onUpdate?.({ ...data, education: newEdu });
                      }}
                    />
                    <span className="ml-auto">
                      <EditableText 
                        value={edu.graduationDate} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newEdu = [...(data.education || [])];
                          newEdu[i] = { ...edu, graduationDate: v };
                          onUpdate?.({ ...data, education: newEdu });
                        }}
                      />
                    </span>
                  </div>
                </div>
              ))}
              
              {data.certificates && (data.certificates || []).length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Certifications</h3>
                  <div className="space-y-2">
                    {(data.certificates || []).map((cert, i) => (
                      <EditableText 
                        key={i}
                        element="p"
                        value={cert} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newCerts = [...(data.certificates || [])];
                          newCerts[i] = v;
                          onUpdate?.({ ...data, certificates: newCerts });
                        }}
                        className="text-sm italic text-slate-600" 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm space-y-2">
              {(data.skills || []).map((s, i) => (
                <div key={i} className="flex gap-1 justify-center">
                  <span>•</span>
                  <EditableText 
                    value={s.category} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newSkills = [...(data.skills || [])];
                      newSkills[i] = { ...s, category: v };
                      onUpdate?.({ ...data, skills: newSkills });
                    }}
                    className="font-bold" 
                  />
                  <span>:</span>
                  <EditableText 
                    value={(s.items || []).join(', ')} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newSkills = [...(data.skills || [])];
                      newSkills[i] = { ...s, items: v.split(',').map(item => item.trim()) };
                      onUpdate?.({ ...data, skills: newSkills });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const LatexStandard: React.FC<TemplateProps> = ({ 
  data, 
  onUpdate, 
  pageCount = 1, 
  baseFontSize = 11, 
  isExporting = false,
  resumeLength,
  customization = {}
}) => {
  const {
    primaryColor = '#000000',
    fontFamily = 'Inter, sans-serif',
    sectionSpacing = 1,
    lineHeight = 1.2
  } = customization;

  const updatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateLinks = (newLinks: { label: string; url: string }[]) => {
    onUpdate?.({
      ...data,
      personalInfo: { ...data.personalInfo, links: newLinks }
    });
  };

  return (
    <div 
      data-resume-root
      className={cn(
        "bg-white p-10 shadow-sm text-black mx-auto",
        isExporting ? "w-[794px]" : "w-full"
      )}
      style={{ 
        fontSize: `${baseFontSize}pt`,
        lineHeight: lineHeight,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        maxWidth: '800px',
        fontFamily: fontFamily
      }}
    >
      <header className="text-center mb-6">
        <EditableText 
          element="h1"
          value={data.personalInfo.fullName} 
          onUpdate={(v) => updatePersonalInfo('fullName', v)}
          isExporting={isExporting}
          className="font-bold uppercase tracking-tight mb-2" 
          style={{ fontSize: '22pt', color: primaryColor }}
        />
        <div className="flex justify-center gap-4 flex-wrap items-center mb-1 text-slate-700" style={{ fontSize: '9pt' }}>
          <EditableText value={data.personalInfo.location} onUpdate={(v) => updatePersonalInfo('location', v)} isExporting={isExporting} />
          <span>|</span>
          <EditableText value={data.personalInfo.phone} onUpdate={(v) => updatePersonalInfo('phone', v)} isExporting={isExporting} />
          <span>|</span>
          <EditableText value={cleanEmail(data.personalInfo.email)} onUpdate={(v) => updatePersonalInfo('email', v)} isExporting={isExporting} />
        </div>
        {((data.personalInfo.links || []).length > 0) && (
          <div className="flex justify-center gap-6 flex-wrap items-center mt-1" style={{ fontSize: '9pt' }}>
            <LinksSection 
              links={data.personalInfo.links || []} 
              onUpdate={(newLinks) => updateLinks(newLinks)} 
              isExporting={isExporting}
              separator="|"
            />
          </div>
        )}
      </header>

      <div className={cn("space-y-4", resumeLength === '1 Page' ? "space-y-2" : "space-y-4")} style={{ gap: `${sectionSpacing * 1}rem` }}>
        <section style={{ marginBottom: `${sectionSpacing * (resumeLength === '1 Page' ? 0.2 : 0.5)}rem` }}>
          <div className="flex flex-col mb-2">
            <h2 className="font-bold uppercase" style={{ fontSize: '11pt', color: primaryColor }}>Career Objective</h2>
            <div className="h-[1px] w-full mt-0.5" style={{ backgroundColor: primaryColor }} />
          </div>
          <EditableText 
            element="p"
            multiline
            value={data.summary} 
            onUpdate={(v) => onUpdate?.({ ...data, summary: v })}
            isExporting={isExporting}
            className="text-justify leading-relaxed" 
            style={{ fontSize: '9pt' }}
          />
        </section>

        <section>
          <div className="flex flex-col mb-2">
            <h2 className="font-bold uppercase" style={{ fontSize: '11pt' }}>Education</h2>
            <div className="h-[1px] w-full mt-0.5 bg-slate-300" />
          </div>
          {(data.education || []).map((edu, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex justify-between items-start font-bold" style={{ fontSize: '9.5pt' }}>
                <div className="flex-grow">
                  <EditableText value={edu.school} isExporting={isExporting} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, school: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} />
                </div>
                <div className="text-right ml-4 whitespace-nowrap flex-shrink-0">
                  <EditableText value={edu.graduationDate} isExporting={isExporting} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, graduationDate: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} />
                </div>
              </div>
              <div className="flex justify-between items-start italic text-slate-700" style={{ fontSize: '9pt' }}>
                <div className="flex-grow">
                  <EditableText value={edu.degree} isExporting={isExporting} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, degree: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} />
                </div>
                <div className="text-right ml-4 whitespace-nowrap flex-shrink-0">
                  <EditableText value={edu.location || ''} isExporting={isExporting} onUpdate={(v) => {
                    const newEdu = [...(data.education || [])];
                    newEdu[i] = { ...edu, location: v };
                    onUpdate?.({ ...data, education: newEdu });
                  }} />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="flex flex-col mb-2">
            <h2 className="font-bold uppercase" style={{ fontSize: '11pt' }}>Experience</h2>
            <div className="h-[1px] w-full mt-0.5 bg-slate-300" />
          </div>
          <div className="space-y-3">
            {(data.experience || []).map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-start font-bold" style={{ fontSize: '9.5pt' }}>
                <div className="flex-grow">
                  <EditableText value={exp.company} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, company: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                </div>
                <div className="text-right ml-4 whitespace-nowrap flex-shrink-0 flex gap-1">
                  <EditableText value={exp.startDate} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, startDate: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                  <span>—</span>
                  <EditableText value={exp.endDate} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, endDate: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                </div>
                </div>
                <div className="flex justify-between items-start italic mb-1 text-slate-700" style={{ fontSize: '9pt' }}>
                <div className="flex-grow">
                  <EditableText value={exp.position} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, position: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                </div>
                <div className="text-right ml-4 whitespace-nowrap flex-shrink-0">
                  <EditableText value={exp.location} isExporting={isExporting} onUpdate={(v) => {
                    const newExp = [...(data.experience || [])];
                    newExp[i] = { ...exp, location: v };
                    onUpdate?.({ ...data, experience: newExp });
                  }} />
                </div>
                </div>
                <ul className="list-disc pl-[18px] space-y-1">
                  {(exp.highlights || []).map((h, j) => (
                    <EditableText 
                      key={j}
                      element="li"
                      multiline
                      value={h} 
                      isExporting={isExporting}
                      onUpdate={(v) => {
                        const newExp = [...(data.experience || [])];
                        const newHighlights = [...(exp.highlights || [])];
                        newHighlights[j] = v;
                        newExp[i] = { ...exp, highlights: newHighlights };
                        onUpdate?.({ ...data, experience: newExp });
                      }}
                      className="text-justify leading-relaxed" 
                      style={{ fontSize: '9pt' }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col mb-2">
            <h2 className="font-bold uppercase" style={{ fontSize: '11pt' }}>Skills</h2>
            <div className="h-[1px] w-full mt-0.5 bg-slate-300" />
          </div>
          <div className="space-y-1">
            {(data.skills || []).map((skill, i) => (
              <div key={i} className="flex gap-2" style={{ fontSize: '9pt' }}>
                <span className="flex-shrink-0">•</span>
                <EditableText 
                  value={skill.category} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, category: v };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                  className="font-bold whitespace-nowrap" 
                />
                <span>:</span>
                <EditableText 
                  value={(skill.items || []).join(', ')} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newSkills = [...(data.skills || [])];
                    newSkills[i] = { ...skill, items: v.split(',').map(s => s.trim()) };
                    onUpdate?.({ ...data, skills: newSkills });
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {data.certificates && (data.certificates || []).length > 0 && (
          <section>
            <div className="flex flex-col mb-2">
              <h2 className="font-bold uppercase" style={{ fontSize: '11pt' }}>Certifications</h2>
              <div className="h-[1px] w-full mt-0.5 bg-slate-300" />
            </div>
            <div className="space-y-1">
              {(data.certificates || []).map((cert, i) => (
                <div key={i} className="flex gap-2" style={{ fontSize: '9pt' }}>
                  <span className="flex-shrink-0">•</span>
                  <EditableText 
                    element="p"
                    value={cert} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newCerts = [...(data.certificates || [])];
                      newCerts[i] = v;
                      onUpdate?.({ ...data, certificates: newCerts });
                    }}
                    className="text-justify" 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.projects && (data.projects || []).length > 0 && (
          <section>
            <div className="flex flex-col mb-2">
              <h2 className="font-bold uppercase" style={{ fontSize: '11pt' }}>Projects</h2>
              <div className="h-[1px] w-full mt-0.5 bg-slate-300" />
            </div>
            <div className="space-y-3">
              {(data.projects || []).map((proj, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start font-bold" style={{ fontSize: '9.5pt' }}>
                    <div className="flex items-center gap-2 flex-1">
                      <EditableText value={proj.name} isExporting={isExporting} onUpdate={(v) => {
                        const newProj = [...(data.projects || [])];
                        newProj[i] = { ...proj, name: v };
                        onUpdate?.({ ...data, projects: newProj });
                      }} />
                      {proj.link && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-300">|</span>
                          <EditableLink
                            label="GitHub"
                            url={proj.link}
                            isExporting={isExporting}
                            onUpdate={(label, url) => {
                              const newProj = [...(data.projects || [])];
                              newProj[i] = { ...proj, link: url };
                              onUpdate?.({ ...data, projects: newProj });
                            }}
                            onDelete={() => {
                              const newProj = [...(data.projects || [])];
                              const { link, ...rest } = proj;
                              newProj[i] = rest;
                              onUpdate?.({ ...data, projects: newProj });
                            }}
                            className="text-[8.5pt] font-normal"
                          />
                        </div>
                      )}
                    </div>
                    <div className="font-normal italic text-right ml-4 text-slate-600" style={{ fontSize: '9pt' }}>
                      <EditableText 
                        value={(proj.technologies || []).join(', ')} 
                        isExporting={isExporting}
                        onUpdate={(v) => {
                          const newProj = [...(data.projects || [])];
                          newProj[i] = { ...proj, technologies: v.split(',').map(s => s.trim()) };
                          onUpdate?.({ ...data, projects: newProj });
                        }}
                      />
                    </div>
                  </div>
                  <EditableText 
                    element="p"
                    multiline
                    value={proj.description} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newProj = [...(data.projects || [])];
                      newProj[i] = { ...proj, description: v };
                      onUpdate?.({ ...data, projects: newProj });
                    }}
                    className="text-justify leading-relaxed" 
                    style={{ fontSize: '9pt' }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.achievements && (data.achievements || []).length > 0 && (
          <section>
            <h2 className="font-bold border-b-[0.5px] border-slate-300 uppercase mb-2" style={{ fontSize: '11pt' }}>Achievements</h2>
            <ul className="list-disc pl-[18px] space-y-1">
              {(data.achievements || []).map((ach, i) => (
                <EditableText 
                  key={i}
                  element="li"
                  value={ach} 
                  isExporting={isExporting}
                  onUpdate={(v) => {
                    const newAch = [...(data.achievements || [])];
                    newAch[i] = v;
                    onUpdate?.({ ...data, achievements: newAch });
                  }}
                  className="leading-relaxed" 
                  style={{ fontSize: '9pt' }}
                />
              ))}
            </ul>
          </section>
        )}

        {data.strengths && (data.strengths || []).length > 0 && (
          <section>
            <h2 className="font-bold border-b-[0.5px] border-slate-300 uppercase mb-2" style={{ fontSize: '11pt' }}>Strengths</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {(data.strengths || []).map((strength, i) => (
                <div key={i} className="flex items-center gap-2" style={{ fontSize: '9pt' }}>
                  <span className="flex-shrink-0">•</span>
                  <EditableText 
                    value={strength} 
                    isExporting={isExporting}
                    onUpdate={(v) => {
                      const newStrengths = [...(data.strengths || [])];
                      newStrengths[i] = v;
                      onUpdate?.({ ...data, strengths: newStrengths });
                    }}
                    className="font-medium" 
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const OriginalPDF: React.FC<TemplateProps> = ({ originalPdfUrl, originalPdfType }) => {
  if (!originalPdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📄</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Original File</h3>
        <p className="text-sm text-slate-500 mt-2">Upload a PDF or Image resume to see it here as a template option.</p>
      </div>
    );
  }

  const isImage = originalPdfType?.startsWith('image/');

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-4 overflow-auto gap-4">
      <div className="flex-1 w-full flex items-center justify-center min-h-0">
        {isImage ? (
          <img 
            src={originalPdfUrl} 
            alt="Original Resume" 
            className="max-w-full h-auto shadow-2xl rounded-lg"
            referrerPolicy="no-referrer"
          />
        ) : (
          <object
            data={originalPdfUrl}
            type="application/pdf"
            className="w-full h-full border-none shadow-2xl rounded-lg"
          >
            <iframe 
              src={`${originalPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
              className="w-full h-full border-none shadow-2xl rounded-lg"
              title="Original Resume PDF"
            />
          </object>
        )}
      </div>
      <div className="flex items-center gap-4 py-2 px-4 bg-white/80 backdrop-blur shadow-sm rounded-full border border-slate-200">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preview not loading?</p>
        <a 
          href={originalPdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1"
        >
          Open in New Tab <span className="text-xs">↗</span>
        </a>
      </div>
    </div>
  );
};

export const TEMPLATES = [
  { id: 'latex-standard', name: 'LaTeX Standard', component: LatexStandard, description: 'Classic, dense, and high-impact LaTeX style.' },
  { id: 'modern-minimalist', name: 'Modern Minimalist', component: ModernMinimalist, description: 'Clean, spacious, and professional.' },
  { id: 'executive-professional', name: 'Executive Professional', component: ExecutiveProfessional, description: 'Traditional serif style for senior roles.' },
  { id: 'creative-tech', name: 'Creative Tech', component: CreativeTech, description: 'Bold two-column layout for tech & design.' },
  { id: 'startup-hustler', name: 'Startup Hustler', component: StartupHustler, description: 'High-impact, modern, and compact.' },
  { id: 'elegant-serif', name: 'Elegant Serif', component: ElegantSerif, description: 'Sophisticated and high-end aesthetic.' },
  { id: 'original-pdf', name: 'Original Uploaded', component: OriginalPDF, description: 'The original layout from your uploaded PDF.' },
];

export const ResumePreview: React.FC<{ 
  templateId: string; 
  data: ResumeAnalysis['structuredResume'];
  onUpdate?: (newData: ResumeAnalysis['structuredResume']) => void;
  pageCount?: number;
  baseFontSize?: number;
  isExporting?: boolean;
  resumeLength?: string;
  customization?: {
    primaryColor?: string;
    fontFamily?: string;
    sectionSpacing?: number;
    lineHeight?: number;
  };
  originalPdfUrl?: string;
  originalPdfType?: string;
}> = ({ templateId, data, onUpdate, pageCount, baseFontSize, isExporting = false, resumeLength, customization, originalPdfUrl, originalPdfType }) => {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const Component = template.component;
  return <Component data={data} onUpdate={onUpdate} pageCount={pageCount} baseFontSize={baseFontSize} isExporting={isExporting} resumeLength={resumeLength} customization={customization} originalPdfUrl={originalPdfUrl} originalPdfType={originalPdfType} />;
};
