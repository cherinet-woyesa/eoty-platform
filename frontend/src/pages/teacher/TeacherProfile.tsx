import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import teacherApi from '@/services/api/teacherApi';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { useTranslation } from 'react-i18next';
import { 
  Shield, CreditCard, FileText,
  ChevronDown, ChevronUp, HelpCircle,
  Phone, Mail, Search, ArrowRight, Banknote,
  Globe, Upload, Clock, Check, LayoutDashboard, BookOpen, ArrowLeft
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { brandColors } from '@/theme/brand';
import { useNavigate } from 'react-router-dom';

// --- Types ---

type TeacherProfileData = TeacherProfileType;

interface FAQItem {
  question: string;
  answer: string;
}

interface ResourceItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
}

// --- Components ---

import { useRef } from 'react';
import { useNotification } from '@/context/NotificationContext';

const DashboardView: React.FC<{
  user: any;
  profile: TeacherProfileData;
  onNavigate: (view: 'dashboard' | 'payout' | 'verification') => void;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
}> = ({ user, profile, onNavigate, onUpdate }) => {
    // Social Links State
    const [socialLinks, setSocialLinks] = useState({
      website_url: profile.website_url || '',
      twitter_url: profile.twitter_url || '',
      linkedin_url: profile.linkedin_url || '',
      facebook_url: profile.facebook_url || '',
      instagram_url: profile.instagram_url || ''
    });
    const [bioDraft, setBioDraft] = useState(profile.bio || '');
    const [savingBio, setSavingBio] = useState(false);
    const { showNotification } = useNotification();

    // Certifications State
    const [certifications, setCertifications] = useState<any[]>(profile.certifications || []);
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certTitle, setCertTitle] = useState('');
    const [certInstitution, setCertInstitution] = useState('');
    const [certYear, setCertYear] = useState('');
    const [certDesc, setCertDesc] = useState('');
    const [uploadingCert, setUploadingCert] = useState(false);
    const certInputRef = useRef<HTMLInputElement>(null);

    // Save Social Links
    const handleSaveLinks = async () => {
      setSavingLinks(true);
      try {
        // Use onUpdate to save and update parent state
        await onUpdate(socialLinks);
        showNotification('Social links updated', 'success');
      } catch (e) {
        showNotification('Failed to update social links', 'error');
      } finally {
        setSavingLinks(false);
      }
    };

    // Upload Certification
    const handleUploadCert = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!certFile || !certTitle) {
        showNotification('Title and file required', 'warning');
        return;
      }
      setUploadingCert(true);
      try {
        const formData = new FormData();
        formData.append('title', certTitle);
        formData.append('institution', certInstitution);
        formData.append('year', certYear);
        formData.append('description', certDesc);
        formData.append('file', certFile);
        const res = await fetch('/api/teacher/certifications', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          const newCerts = data.data.certifications;
          setCertifications(newCerts);
          // Update parent state
          onUpdate({ certifications: newCerts });
          
          showNotification('Certification uploaded', 'success');
          setCertFile(null);
          setCertTitle('');
          setCertInstitution('');
          setCertYear('');
          setCertDesc('');
          if (certInputRef.current) certInputRef.current.value = '';
        } else {
          showNotification(data.message || 'Failed to upload certification', 'error');
        }
      } catch (e) {
        showNotification('Failed to upload certification', 'error');
      } finally {
        setUploadingCert(false);
      }
    };

    // Delete Certification
    const handleDeleteCert = async (id: number) => {
      if (!window.confirm('Delete this certification?')) return;
      try {
        const res = await fetch(`/api/teacher/certifications/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await res.json();
        if (data.success) {
          const newCerts = data.data.certifications;
          setCertifications(newCerts);
          // Update parent state
          onUpdate({ certifications: newCerts });
          
          showNotification('Certification deleted', 'success');
        } else {
          showNotification(data.message || 'Failed to delete certification', 'error');
        }
      } catch (e) {
        showNotification('Failed to delete certification', 'error');
      }
    };
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const checklistItems = [
    { 
      id: 'identity', 
      label: t('teacher_dashboard.checklist_complete_profile'), 
      isComplete: !!(user?.firstName && user?.lastName && user?.bio),
      action: () => {
        // Scroll to top to focus on bio/avatar
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Optionally focus the bio field
        const bioField = document.querySelector('textarea');
        if (bioField) bioField.focus();
      }
    },
    { 
      id: 'verification', 
      label: t('teacher_dashboard.checklist_submit_documents'), 
      isComplete: Object.values(profile.verification_docs || {}).some(s => s === 'VERIFIED'),
      action: () => onNavigate('verification')
    },
    { 
      id: 'payout', 
      label: t('teacher_dashboard.checklist_setup_payout'), 
      isComplete: !!profile.payout_method,
      action: () => onNavigate('payout')
    }
  ];

  const resources: ResourceItem[] = [
    {
      title: t('teacher_dashboard.resource_guidelines_title'),
      description: t('teacher_dashboard.resource_guidelines_description'),
      icon: <BookOpen className="h-6 w-6 text-white" />,
      link: '/resources/guidelines'
    },
    {
      title: t('teacher_dashboard.resource_video_standards_title'),
      description: t('teacher_dashboard.resource_video_standards_description'),
      icon: <FileText className="h-6 w-6 text-white" />,
      link: '/resources/video-standards'
    },
    {
      title: t('teacher_dashboard.resource_community_rules_title'),
      description: t('teacher_dashboard.resource_community_rules_description'),
      icon: <Shield className="h-6 w-6 text-white" />,
      link: '/resources/community-rules'
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: t('teacher_dashboard.faq_q1'),
      answer: t('teacher_dashboard.faq_a1')
    },
    {
      question: t('teacher_dashboard.faq_q2'),
      answer: t('teacher_dashboard.faq_a2')
    },
    {
      question: t('teacher_dashboard.faq_q3'),
      answer: t('teacher_dashboard.faq_a3')
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          {t('teacher_dashboard.welcome_header', { name: user?.firstName ? user.firstName : t('teacher_dashboard.default_teacher_name')})}
        </h1>
        <p className="text-slate-600 mt-2 text-lg">
          {t('teacher_dashboard.welcome_subtitle')}
        </p>
        {/* Avatar + Bio editor */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <img
              src={profile.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || 'Teacher')}`}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover border border-slate-200"
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // Immediate preview
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) {
                      // Update local state immediately for preview
                      // We need to update the profile state in the parent component or force a re-render
                      // Since we can't easily access setProfile here without prop drilling or context, 
                      // we'll rely on the API update to trigger a refresh if possible, 
                      // OR we can manipulate the DOM directly for immediate feedback (less React-y but works)
                      const img = document.querySelector('img[alt="Avatar"]') as HTMLImageElement;
                      if (img) img.src = ev.target.result as string;
                    }
                  };
                  reader.readAsDataURL(file);

                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await fetch('/api/files/avatar', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                      body: formData
                    });
                    const data = await res.json();
                    if (data.success && data.url) {
                      await onUpdate({ profile_picture: data.url });
                    }
                  } catch (err) {
                    console.error('Avatar upload failed', err);
                  }
                }}
                className="text-sm"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Bio</label>
            <textarea
              defaultValue={profile.bio || ''}
              onBlur={async (e) => {
                const bio = e.target.value;
                await onUpdate({ bio });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              placeholder="Tell students about your background, teaching style, and interests."
            />
            <p className="text-xs text-slate-500 mt-1">Changes are saved automatically when you click outside.</p>
          </div>
        </div>
        
        {/* Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <button
            onClick={() => onNavigate('verification')}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            <Shield className="h-5 w-5" />
            {t('teacher_dashboard.start_verification_btn')}
          </button>
          <button
            onClick={() => navigate('/resources')}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition-all"
          >
            <BookOpen className="h-5 w-5" />
            {t('teacher_dashboard.access_resources_btn')}
          </button>
          <button
            onClick={() => onNavigate('payout')}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition-all"
        >
          <CreditCard className="h-5 w-5" />
          {t('teacher_dashboard.setup_payouts_btn')}
        </button>

        </div>

        {/* End Welcome Card */}
      </div>

      {/* Onboarding Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" style={{ color: brandColors.primaryHex }} />
            {t('teacher_dashboard.onboarding_checklist_title')}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {checklistItems.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${item.isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  {item.isComplete ? <Check className="h-5 w-5" /> : <div className="h-3 w-3 rounded-full bg-current" />}
                </div>
                <span className={`font-medium ${item.isComplete ? 'text-slate-900' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </div>
              <button
                onClick={item.action}
                className="text-sm font-medium hover:underline flex items-center gap-1"
                style={{ color: brandColors.primaryHex }}
              >
                {item.isComplete ? t('teacher_dashboard.view_details_btn') : t('teacher_dashboard.start_now_btn')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources.map((resource, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: brandColors.primaryHex }}>
              {resource.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{resource.title}</h3>
            <p className="text-slate-600 text-sm mb-4">{resource.description}</p>
            <a href={resource.link} className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: brandColors.primaryHex }}>
              {t('teacher_dashboard.learn_more_btn')} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>

      {/* Social Links & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Social Links */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" /> Social Links
          </h3>
          <div className="space-y-3">
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Website URL" value={socialLinks.website_url} onChange={e => setSocialLinks(l => ({...l, website_url: e.target.value}))} />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Twitter URL" value={socialLinks.twitter_url} onChange={e => setSocialLinks(l => ({...l, twitter_url: e.target.value}))} />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="LinkedIn URL" value={socialLinks.linkedin_url} onChange={e => setSocialLinks(l => ({...l, linkedin_url: e.target.value}))} />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Facebook URL" value={socialLinks.facebook_url} onChange={e => setSocialLinks(l => ({...l, facebook_url: e.target.value}))} />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Instagram URL" value={socialLinks.instagram_url} onChange={e => setSocialLinks(l => ({...l, instagram_url: e.target.value}))} />
          </div>
          <button onClick={handleSaveLinks} disabled={savingLinks} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{savingLinks ? 'Saving...' : 'Save Social Links'}</button>
        </div>
        {/* Certifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Certifications
          </h3>
          <form onSubmit={handleUploadCert} className="space-y-3">
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Title" value={certTitle} onChange={e => setCertTitle(e.target.value)} required />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Institution" value={certInstitution} onChange={e => setCertInstitution(e.target.value)} />
            <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Year" value={certYear} onChange={e => setCertYear(e.target.value)} />
            <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Description" value={certDesc} onChange={e => setCertDesc(e.target.value)} />
            <input type="file" ref={certInputRef} className="w-full" accept="application/pdf,image/*" onChange={e => setCertFile(e.target.files?.[0] || null)} required />
            <button type="submit" disabled={uploadingCert} className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{uploadingCert ? 'Uploading...' : 'Upload Certification'}</button>
          </form>
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Your Certifications</h4>
            {certifications.length === 0 ? (
              <div className="text-gray-500 text-sm">No certifications uploaded yet.</div>
            ) : (
              <ul className="space-y-2">
                {certifications.map(cert => (
                  <li key={cert.id} className="flex items-center justify-between bg-slate-50 rounded p-3">
                    <div>
                      <div className="font-medium text-slate-900">{cert.title}</div>
                      <div className="text-xs text-slate-500">{cert.institution} {cert.year && `(${cert.year})`}</div>
                      {cert.description && <div className="text-xs text-slate-400 mt-1">{cert.description}</div>}
                      {cert.documentUrl && <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">View Document</a>}
                    </div>
                    <button onClick={() => handleDeleteCert(cert.id)} className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs">Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Subjects & Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Subjects */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Teaching Subjects</h3>
          <p className="text-sm text-slate-600 mb-3">Add up to 5 subjects you teach.</p>
          <SubjectEditor initial={profile.subjects || []} onSave={async (subjects) => {
            await onUpdate({ subjects });
            showNotification('Subjects saved', 'success');
          }} />
        </div>
        {/* Availability */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Weekly Availability</h3>
          <AvailabilityEditor initial={profile.availability || {}} onSave={async (availability) => {
            await onUpdate({ availability });
            showNotification('Availability saved', 'success');
          }} />
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{t('teacher_dashboard.faq_title')}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors focus:outline-none"
              >
                <span className="font-medium text-slate-900">{faq.question}</span>
                {expandedFaq === idx ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-6 pb-4 text-slate-600 text-sm animate-in slide-in-from-top-2 duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PayoutView: React.FC<{
  profile: TeacherProfileData;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onCancel: () => void;
}> = ({ profile, onUpdate, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payout_method: profile.payout_method || 'bank',
    payout_region: profile.payout_region || 'US',
    account_holder: profile.payout_details?.account_holder || '',
    account_number: profile.payout_details?.account_number || '',
    routing_number: profile.payout_details?.routing_number || '',
    address: profile.payout_details?.address || '',
    dob: profile.payout_details?.dob || '',
    tax_id: profile.payout_details?.tax_id || '',
    tax_agreed: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        payout_method: formData.payout_method,
        payout_region: formData.payout_region,
        payout_details: {
          account_holder: formData.account_holder,
          account_number: formData.account_number,
          routing_number: formData.routing_number,
          address: formData.address,
          dob: formData.dob,
          tax_id: formData.tax_id
        },
        tax_status: formData.tax_agreed ? 'AGREED' : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{t('teacher_profile.payout_setup.main_title')}</h2>
            <p className="text-slate-600 text-lg">{t('teacher_profile.payout_setup.subtitle')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">{t('teacher_profile.payout_setup.payout_details_title')}</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Selected Country */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('teacher_profile.payout_setup.selected_country_title')}</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-slate-500" />
                  <div>
                    <select
                      value={formData.payout_region}
                      onChange={e => setFormData({...formData, payout_region: e.target.value})}
                      className="font-medium text-slate-900 bg-transparent border-none focus:outline-none"
                    >
                      <option value="ET">{t('teacher_profile.payout_setup.country_ethiopia')}</option>
                      <option value="US">{t('teacher_profile.payout_setup.country_united_states')}</option>
                      <option value="UK">{t('teacher_profile.payout_setup.country_united_kingdom')}</option>
                      <option value="CA">{t('teacher_profile.payout_setup.country_canada')}</option>
                    </select>
                    <div className="text-xs text-slate-500">
                      {formData.payout_region === 'ET' ? t('teacher_profile.payout_setup.currency_etb') : t('teacher_profile.payout_setup.currency_usd')}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Method Selector */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('teacher_profile.payout_setup.choose_method_title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${formData.payout_method === 'mobile_money' ? 'border-[#1e1b4b] bg-[#1e1b4b]/5 ring-1 ring-[#1e1b4b]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="method" 
                    value="mobile_money" 
                    checked={formData.payout_method === 'mobile_money'} 
                    onChange={() => setFormData({...formData, payout_method: 'mobile_money'})}
                    className="sr-only" 
                  />
                  <Phone className={`h-6 w-6 mb-3 ${formData.payout_method === 'mobile_money' ? 'text-[#1e1b4b]' : 'text-slate-400'}`} />
                  <span className="font-semibold text-slate-900">{t('teacher_profile.payout_setup.mobile_money_method')}</span>
                  <span className="text-xs text-slate-500 mt-1">{t('teacher_profile.payout_setup.mobile_money_description')}</span>
                </label>

                <label className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${formData.payout_method === 'bank' ? 'border-[#1e1b4b] bg-[#1e1b4b]/5 ring-1 ring-[#1e1b4b]' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="method" 
                    value="bank" 
                    checked={formData.payout_method === 'bank'} 
                    onChange={() => setFormData({...formData, payout_method: 'bank'})}
                    className="sr-only" 
                  />
                  <Banknote className={`h-6 w-6 mb-3 ${formData.payout_method === 'bank' ? 'text-[#1e1b4b]' : 'text-slate-400'}`} />
                  <span className="font-semibold text-slate-900">{t('teacher_profile.payout_setup.bank_transfer_method')}</span>
                  <span className="text-xs text-slate-500 mt-1">{t('teacher_profile.payout_setup.bank_transfer_description')}</span>
                </label>
              </div>
            </section>

            {/* Account Details */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('teacher_profile.payout_setup.account_details_title')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.account_holder_name_label')}</label>
                  <input 
                    type="text" 
                    value={formData.account_holder}
                    onChange={e => setFormData({...formData, account_holder: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder={t('teacher_profile.payout_setup.account_holder_name_placeholder')}
                  />
                </div>
                
                {formData.payout_method === 'mobile_money' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.mobile_money_account_number_label')}</label>
                    <input 
                      type="text" 
                      value={formData.account_number}
                      onChange={e => setFormData({...formData, account_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                      placeholder={t('teacher_profile.payout_setup.mobile_money_account_number_placeholder')}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.routing_number_label')}</label>
                      <input 
                        type="text" 
                        value={formData.routing_number}
                        onChange={e => setFormData({...formData, routing_number: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                        placeholder={t('teacher_profile.payout_setup.routing_number_placeholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.account_number_label')}</label>
                      <input 
                        type="text" 
                        value={formData.account_number}
                        onChange={e => setFormData({...formData, account_number: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                        placeholder={t('teacher_profile.payout_setup.account_number_placeholder')}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.date_of_birth_label')}</label>
                  <input 
                    type="date" 
                    value={formData.dob}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.tax_id_label')}</label>
                  <input 
                    type="text" 
                    value={formData.tax_id}
                    onChange={e => setFormData({...formData, tax_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder={t('teacher_profile.payout_setup.tax_id_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('teacher_profile.payout_setup.billing_address_label')}</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e1b4b] focus:border-transparent"
                    placeholder={t('teacher_profile.payout_setup.billing_address_placeholder')}
                  />
                </div>
              </div>
            </section>

            {/* Tax Information */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('teacher_profile.payout_setup.tax_information_title')}</h3>
              <div className="flex items-start gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="tax_agree"
                  checked={formData.tax_agreed}
                  onChange={e => setFormData({...formData, tax_agreed: e.target.checked})}
                  className="mt-1 h-4 w-4 text-[#1e1b4b] border-slate-300 rounded focus:ring-[#1e1b4b]"
                />
                <label htmlFor="tax_agree" className="text-sm text-slate-600">
                  <span dangerouslySetInnerHTML={{ __html: t('teacher_profile.payout_setup.tax_agree_label') }} />
                </label>
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                {t('teacher_profile.payout_setup.cancel_btn')}
              </button>
              <button
                type="submit"
                disabled={loading || !formData.tax_agreed}
                className="px-6 py-2 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                {loading ? t('teacher_profile.payout_setup.saving_btn') : t('teacher_profile.payout_setup.confirm_details_btn')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t('teacher_profile.payout_setup.payout_summary_title')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.method_label')}</span>
              <span className="font-medium text-slate-900 capitalize">
                {formData.payout_method === 'bank' ? t('teacher_profile.payout_setup.bank_transfer_method') : t('teacher_profile.payout_setup.mobile_money_method')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.region_label')}</span>
              <span className="font-medium text-slate-900">
                {formData.payout_region === 'ET' ? t('teacher_profile.payout_setup.country_ethiopia') : formData.payout_region === 'US' ? t('teacher_profile.payout_setup.country_united_states') : formData.payout_region === 'UK' ? t('teacher_profile.payout_setup.country_united_kingdom') : t('teacher_profile.payout_setup.country_canada')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('teacher_profile.payout_setup.currency_label')}</span>
              <span className="font-medium text-slate-900">
                {formData.payout_region === 'ET' ? t('teacher_profile.payout_setup.currency_etb') : t('teacher_profile.payout_setup.currency_usd')}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">{t('teacher_profile.payout_setup.transactional_terms_title')}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('teacher_profile.payout_setup.transactional_terms_description')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">{t('teacher_profile.payout_setup.next_steps_title')}</h3>
          <p className="text-sm text-slate-600 mb-4">
            {t('teacher_profile.payout_setup.next_steps_description')}
          </p>
          <button 
            onClick={onCancel}
            className="w-full py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: brandColors.primaryHex }}
          >
            {t('teacher_profile.payout_setup.proceed_to_documents_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

const VerificationView: React.FC<{
  profile: TeacherProfileData;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onBack: () => void;
}> = ({ profile, onUpdate, onBack }) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleUpload = async (key: string) => {
    setUploading(key);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const currentDocs = profile.verification_docs || {};
    await onUpdate({
      verification_docs: {
        ...currentDocs,
        [key]: 'PENDING'
      }
    });
    setUploading(null);
  };

  const docs = [
    { key: 'national_id', title: t('teacher_profile.verification_docs.national_id_title'), description: t('teacher_profile.verification_docs.national_id_description') },
    { key: 'tax_photo', title: t('teacher_profile.verification_docs.tax_photo_title'), description: t('teacher_profile.verification_docs.tax_photo_description') },
    { key: 'ordination', title: t('teacher_profile.verification_docs.ordination_title'), description: t('teacher_profile.verification_docs.ordination_description') },
    { key: 'proof_of_address', title: t('teacher_profile.verification_docs.proof_of_address_title'), description: t('teacher_profile.verification_docs.proof_of_address_description') }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-500';
      case 'PENDING': return 'bg-amber-500';
      default: return 'bg-slate-200';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'VERIFIED': return 'Verified';
      case 'PENDING': return 'Processing';
      default: return 'Not Submitted';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Main Content Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('teacher_profile.verification_docs.main_title')}</h1>
            <p className="text-slate-600 text-lg">{t('teacher_profile.verification_docs.checklist_title')}</p>
            <p className="text-sm text-slate-500 mt-2">
              {t('teacher_profile.verification_docs.checklist_description')}
            </p>
          </div>
        </div>

        {/* Two-column layout for documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Required Documents Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('teacher_profile.verification_docs.required_docs_title')}</h3>
            <p className="text-sm text-slate-600">{t('teacher_profile.verification_docs.required_docs_subtitle')}</p>
            {docs.map((doc) => {
              const status = profile.verification_docs?.[doc.key];
              return (
                <div key={doc.key} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h4 className="font-semibold text-slate-900">{doc.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500">{doc.description}</p>

                  {/* Progress Bar for Proof of Address */}
                  {doc.key === 'proof_of_address' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{getStatusText(status)}</span>
                        {status === 'PENDING' && <span className="text-slate-500">Reviewing...</span>}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getStatusColor(status)}`}
                          style={{ width: status === 'VERIFIED' ? '100%' : status === 'PENDING' ? '60%' : '0%' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t('teacher_profile.verification_docs.estimated_completion')}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleUpload(doc.key)}
                    disabled={!!uploading || status === 'VERIFIED' || status === 'PENDING'}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {uploading === doc.key ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        {t('common.uploading')}
                      </>
                    ) : status === 'VERIFIED' ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t('common.complete')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {t('teacher_profile.verification_docs.upload_document_btn')}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Optional Documents Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('teacher_profile.verification_docs.optional_docs_title')}</h3>
            <p className="text-sm text-slate-600">{t('teacher_profile.verification_docs.optional_docs_subtitle')}</p>

            {[ 
              { key: 'academic_transcript', title: t('teacher_profile.verification_docs.academic_transcript_title'), description: t('teacher_profile.verification_docs.academic_transcript_description') },
              { key: 'tracking_history', title: t('teacher_profile.verification_docs.tracking_history_title'), description: t('teacher_profile.verification_docs.tracking_history_description') },
            ].map((doc) => {
              const status = profile.verification_docs?.[doc.key];
              return (
                <div key={doc.key} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h4 className="font-semibold text-slate-900">{doc.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500">{doc.description}</p>
                  <button
                    onClick={() => handleUpload(doc.key)}
                    disabled={!!uploading || status === 'VERIFIED' || status === 'PENDING'}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {doc.key === 'tracking_history' ? (
                      <>
                        <LayoutDashboard className="h-4 w-4" />
                        {t('teacher_profile.verification_docs.view_history_btn')}
                      </>
                    ) : uploading === doc.key ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        {t('common.uploading')}
                      </>
                    ) : status === 'VERIFIED' ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t('common.complete')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {t('teacher_profile.verification_docs.upload_now_btn')}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Help Sidebar */}
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-slate-600" />
            {t('teacher_profile.verification_docs.need_help_title')}
          </h3>
          <div className="space-y-3">
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{t('teacher_profile.verification_docs.search_knowledge_base')}</span>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{t('teacher_profile.verification_docs.email_support')}</span>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{t('teacher_profile.verification_docs.call_us')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Container ---

const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const [activeView, setActiveView] = useState<'dashboard' | 'payout' | 'verification'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfileType>({} as TeacherProfileType);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await teacherApi.getProfile();
        if (res?.success) {
          setProfile(res.data.teacherProfile || {});
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUpdateProfile = async (data: Partial<TeacherProfileType>) => {
    try {
      const res = await teacherApi.updateProfile(data);
      if (res?.success) {
        // Merge response data if available, otherwise use optimistic update
        const updatedData = res.data || data;
        setProfile((prev: TeacherProfileType) => ({ ...prev, ...updatedData }));
        // Refresh user context to ensure completion status is updated
        await refreshUser();
      }
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text={t('common.loading_dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* View Content */}
        <div className="min-h-[500px]">
          {activeView === 'dashboard' && (
            <DashboardView 
              user={user} 
              profile={profile} 
              onNavigate={setActiveView} 
              onUpdate={handleUpdateProfile}
            />
          )}
          {activeView === 'payout' && (
            <PayoutView 
              profile={profile} 
              onUpdate={handleUpdateProfile} 
              onCancel={() => setActiveView('dashboard')} 
            />
          )}
          {activeView === 'verification' && (
            <VerificationView 
              profile={profile} 
              onUpdate={handleUpdateProfile} 
              onBack={() => setActiveView('dashboard')}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherProfile;
export type { TeacherProfile };

// Inline simple editors to avoid placeholders
const SubjectEditor: React.FC<{ initial: string[]; onSave: (subjects: string[]) => void }> = ({ initial, onSave }) => {
  const [items, setItems] = useState<string[]>(initial);
  const [newItem, setNewItem] = useState('');
  useEffect(() => setItems(initial), [initial]);
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 px-3 py-2 border rounded-lg" value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder={t('teacher_profile.subjects.placeholder')} />
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" disabled={!newItem || items.length>=5} onClick={() => { const updated=[...items,newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}>Add</button>
      </div>
      <ul className="space-y-2">
        {items.map((s, idx) => (
          <li key={idx} className="flex items-center justify-between bg-slate-50 rounded p-2">
            <span className="text-slate-800 text-sm">{s}</span>
            <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded" onClick={() => { const updated=items.filter((_,i)=>i!==idx); setItems(updated); onSave(updated); }}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AvailabilityEditor: React.FC<{ initial: Record<string, string[]>; onSave: (availability: Record<string, string[]>) => void }> = ({ initial, onSave }) => {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const [slots, setSlots] = useState<Record<string, string[]>>(initial || {});
  useEffect(()=>setSlots(initial || {}),[initial]);
  const addSlot = (day: string) => {
    const time = prompt(`Add time slot for ${day} (HH:MM-HH:MM)`);
    if (!time) return;
    const updated = { ...slots, [day]: [...(slots[day]||[]), time] };
    setSlots(updated);
    onSave(updated);
  };
  const removeSlot = (day: string, idx: number) => {
    const updated = { ...slots, [day]: (slots[day]||[]).filter((_,i)=>i!==idx) };
    setSlots(updated);
    onSave(updated);
  };
  return (
    <div className="space-y-3">
      {days.map(day => (
        <div key={day} className="bg-slate-50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-800">{day}</span>
            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>addSlot(day)}>Add Slot</button>
          </div>
          <ul className="space-y-1">
            {(slots[day]||[]).length===0 && <li className="text-xs text-slate-500">No slots</li>}
            {(slots[day]||[]).map((s, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{s}</span>
                <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded" onClick={()=>removeSlot(day, idx)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};