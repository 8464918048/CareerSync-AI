import React, { useState } from 'react';
import { 
  User, Mail, Phone, Github, Globe, Linkedin, Code, Trophy, 
  GraduationCap, Briefcase, Award, Plus, Trash2, Save, 
  ChevronRight, ChevronLeft, CheckCircle2, MapPin, Calendar, Clock
} from 'lucide-react';
import { updateUserProfile } from '../lib/firebase';
import { cn } from '../lib/utils';

interface OnboardingFormProps {
  userId: string;
  initialData: any;
  onComplete: () => void;
  onCancel?: () => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ userId, initialData, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: initialData.displayName || '',
    email: initialData.email || '',
    phoneNumber: initialData.phoneNumber || '',
    github: initialData.github || '',
    portfolio: initialData.portfolio || '',
    linkedin: initialData.linkedin || '',
    leetcode: initialData.leetcode || '',
    hackerrank: initialData.hackerrank || '',
    education: initialData.education || [{ school: '', degree: '', graduationDate: '' }],
    projects: initialData.projects || [{ name: '', description: '', githubLink: '', liveLink: '' }],
    experience: initialData.experience || [{ company: '', role: '', duration: '', type: 'Remote', location: '' }],
    certificates: initialData.certificates || ['']
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayUpdate = (field: string, index: number, subField: string, value: any) => {
    const newArray = [...formData[field as keyof typeof formData] as any[]];
    newArray[index] = { ...newArray[index], [subField]: value };
    updateField(field, newArray);
  };

  const addArrayItem = (field: string, defaultValue: any) => {
    updateField(field, [...formData[field as keyof typeof formData] as any[], defaultValue]);
  };

  const removeArrayItem = (field: string, index: number) => {
    const newArray = [...formData[field as keyof typeof formData] as any[]];
    newArray.splice(index, 1);
    updateField(field, newArray);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateUserProfile(userId, {
        ...formData,
        isProfileComplete: true
      });
      onComplete();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { title: 'Personal Info', icon: User },
    { title: 'Social Links', icon: Globe },
    { title: 'Education', icon: GraduationCap },
    { title: 'Experience', icon: Briefcase },
    { title: 'Projects', icon: Code },
    { title: 'Certificates', icon: Award }
  ];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Full Name *
                </label>
                <input 
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" /> Email Address *
                </label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-500" /> Mobile Number *
                </label>
                <input 
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'github', label: 'GitHub Profile', icon: Github, placeholder: 'https://github.com/username' },
                { id: 'linkedin', label: 'LinkedIn Profile', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
                { id: 'portfolio', label: 'Portfolio Website', icon: Globe, placeholder: 'https://yourportfolio.com' },
                { id: 'leetcode', label: 'LeetCode Profile', icon: Code, placeholder: 'https://leetcode.com/username' },
                { id: 'hackerrank', label: 'HackerRank Profile', icon: Trophy, placeholder: 'https://hackerrank.com/username' }
              ].map((link) => (
                <div key={link.id} className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <link.icon className="w-4 h-4 text-indigo-500" /> {link.label}
                  </label>
                  <input 
                    type="url"
                    value={formData[link.id as keyof typeof formData] as string}
                    onChange={(e) => updateField(link.id, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={link.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {formData.education.map((edu: any, i: number) => (
              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl relative group">
                <button 
                  onClick={() => removeArrayItem('education', i)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">School/University *</label>
                    <input 
                      type="text"
                      value={edu.school}
                      onChange={(e) => handleArrayUpdate('education', i, 'school', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="Stanford University"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Degree *</label>
                    <input 
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleArrayUpdate('education', i, 'degree', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="B.S. Computer Science"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Graduation Date *</label>
                    <input 
                      type="text"
                      value={edu.graduationDate}
                      onChange={(e) => handleArrayUpdate('education', i, 'graduationDate', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="May 2024"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('education', { school: '', degree: '', graduationDate: '' })}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" /> Add Education
            </button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {formData.experience.map((exp: any, i: number) => (
              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl relative group">
                <button 
                  onClick={() => removeArrayItem('experience', i)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Company Name *</label>
                    <input 
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleArrayUpdate('experience', i, 'company', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="Google"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Role *</label>
                    <input 
                      type="text"
                      value={exp.role}
                      onChange={(e) => handleArrayUpdate('experience', i, 'role', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="Software Engineer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration (e.g., 2 years) *</label>
                    <input 
                      type="text"
                      value={exp.duration}
                      onChange={(e) => handleArrayUpdate('experience', i, 'duration', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="Jan 2022 - Present"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Type *</label>
                    <select 
                      value={exp.type}
                      onChange={(e) => handleArrayUpdate('experience', i, 'type', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                    >
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Location *</label>
                    <input 
                      type="text"
                      value={exp.location}
                      onChange={(e) => handleArrayUpdate('experience', i, 'location', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="Mountain View, CA"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('experience', { company: '', role: '', duration: '', type: 'Remote', location: '' })}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" /> Add Experience
            </button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {formData.projects.map((proj: any, i: number) => (
              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl relative group">
                <button 
                  onClick={() => removeArrayItem('projects', i)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Project Name *</label>
                    <input 
                      type="text"
                      value={proj.name}
                      onChange={(e) => handleArrayUpdate('projects', i, 'name', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="AI Resume Builder"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Description *</label>
                    <textarea 
                      value={proj.description}
                      onChange={(e) => handleArrayUpdate('projects', i, 'description', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none min-h-[80px]"
                      placeholder="A full-stack application that..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">GitHub Link</label>
                    <input 
                      type="url"
                      value={proj.githubLink}
                      onChange={(e) => handleArrayUpdate('projects', i, 'githubLink', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Live Project Link</label>
                    <input 
                      type="url"
                      value={proj.liveLink}
                      onChange={(e) => handleArrayUpdate('projects', i, 'liveLink', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      placeholder="https://project.com"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('projects', { name: '', description: '', githubLink: '', liveLink: '' })}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" /> Add Project
            </button>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {formData.certificates.map((cert: string, i: number) => (
              <div key={i} className="flex gap-2 group">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Certificate Name</label>
                  <input 
                    type="text"
                    value={cert}
                    onChange={(e) => {
                      const newCerts = [...formData.certificates];
                      newCerts[i] = e.target.value;
                      updateField('certificates', newCerts);
                    }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                    placeholder="AWS Certified Solutions Architect"
                  />
                </div>
                <button 
                  onClick={() => removeArrayItem('certificates', i)}
                  className="mt-8 p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('certificates', '')}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-500 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" /> Add Certificate
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Complete Your Profile</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Help us build your perfect resume by providing your details.</p>
            </div>
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
              {steps.map((s, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                    step === i + 1 ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400"
                  )}
                >
                  <s.icon className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mb-8">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-0">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                {React.createElement(steps[step - 1].icon, { className: "w-6 h-6" })}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{steps[step - 1].title}</h3>
                <p className="text-sm text-slate-500">Step {step} of {steps.length}</p>
              </div>
            </div>
            {renderStep()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button 
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1}
            className={cn(
              "px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all",
              step === 1 ? "opacity-0 pointer-events-none" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          <div className="flex items-center gap-3">
            {onCancel && initialData.isProfileComplete && (
              <button 
                onClick={onCancel}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-bold transition-all"
              >
                Cancel
              </button>
            )}
            {step < steps.length ? (
              <button 
                onClick={() => setStep(prev => Math.min(steps.length, prev + 1))}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Next Step <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Complete Profile'} <CheckCircle2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
