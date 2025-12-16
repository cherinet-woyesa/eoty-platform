import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import teacherApi from '@/services/api/teacherApi';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Shield, CreditCard, FileText,
  ChevronDown, ChevronUp, HelpCircle,
  Phone, Mail, Search, ArrowRight, Banknote,
  Globe, Upload, Clock, Check, LayoutDashboard, BookOpen, ArrowLeft,
  BarChart3, TrendingUp, TrendingDown, Users, Play, Award,
  Calendar, DollarSign, Target, Activity, Star, Lock, Trash2,
  AlertCircle, Settings, Bell, User
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
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    // Social Links State - initialize from profile
    const [socialLinks, setSocialLinks] = useState(() => ({
      website_url: profile.website_url || '',
      twitter_url: profile.twitter_url || '',
      linkedin_url: profile.linkedin_url || '',
      facebook_url: profile.facebook_url || '',
      instagram_url: profile.instagram_url || ''
    }));

    // Update social links when profile changes
    useEffect(() => {
      setSocialLinks({
        website_url: profile.website_url || '',
        twitter_url: profile.twitter_url || '',
        linkedin_url: profile.linkedin_url || '',
        facebook_url: profile.facebook_url || '',
        instagram_url: profile.instagram_url || ''
      });
    }, [profile]);

    // Certifications query
    const {
      data: certifications = [],
      isLoading: certsLoading
    } = useQuery({
      queryKey: ['teacher-certifications'],
      queryFn: async () => {
        const res = await fetch('/api/teacher/certifications', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        return data.success ? data.data.certifications : [];
      },
      staleTime: 5 * 60 * 1000
    });

    // Certification mutations
    const addCertMutation = useMutation({
      mutationFn: async (formData: FormData) => {
        const res = await fetch('/api/teacher/certifications', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to upload certification');
        }
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teacher-certifications'] });
        showNotification(t('teacher_profile.certification_uploaded', 'Certification uploaded successfully'), 'success');
      },
      onError: (error) => {
        console.error('Failed to upload certification:', error);
        showNotification(error.message || t('teacher_profile.certification_upload_failed', 'Failed to upload certification. Please try again.'), 'error');
      }
    });

    const deleteCertMutation = useMutation({
      mutationFn: async (id: number) => {
        const res = await fetch(`/api/teacher/certifications/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to delete certification');
        }
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teacher-certifications'] });
        showNotification(t('teacher_profile.certification_deleted', 'Certification deleted successfully'), 'success');
      },
      onError: (error) => {
        console.error('Failed to delete certification:', error);
        showNotification(error.message || t('teacher_profile.certification_delete_failed', 'Failed to delete certification. Please try again.'), 'error');
      }
    });

    // Certification form state
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certTitle, setCertTitle] = useState('');
    const [certInstitution, setCertInstitution] = useState('');
    const [certYear, setCertYear] = useState('');
    const [certDesc, setCertDesc] = useState('');
    const certInputRef = useRef<HTMLInputElement>(null);

    // Save Social Links Mutation
    const saveLinksMutation = useMutation({
      mutationFn: onUpdate,
      onSuccess: () => {
        showNotification(t('teacher_profile.social_links_updated', 'Social links updated successfully'), 'success');
      },
      onError: (error) => {
        console.error('Failed to update social links:', error);
        showNotification(t('teacher_profile.social_links_update_failed', 'Failed to update social links. Please try again.'), 'error');
      }
    });

    // URL validation helper
    const isValidUrl = (url: string): boolean => {
      if (!url.trim()) return true; // Empty URLs are allowed
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    };

    const handleSaveLinks = () => {
      // Validate URLs
      const invalidUrls = Object.entries(socialLinks)
        .filter(([key, value]) => value && !isValidUrl(value))
        .map(([key]) => key);

      if (invalidUrls.length > 0) {
        showNotification(
          t('teacher_profile.invalid_social_urls', `Invalid URL format for: ${invalidUrls.join(', ')}`),
          'warning'
        );
        return;
      }

      saveLinksMutation.mutate(socialLinks);
    };

    // Upload Certification
    const handleUploadCert = async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!certTitle.trim()) {
        showNotification(t('teacher_profile.certification_title_required', 'Certification title is required'), 'warning');
        return;
      }

      if (!certFile) {
        showNotification(t('teacher_profile.certification_file_required', 'Please select a file to upload'), 'warning');
        return;
      }

      // File type validation
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(certFile.type)) {
        showNotification(t('teacher_profile.certification_invalid_file_type', 'Please upload a PDF or image file'), 'warning');
        return;
      }

      // File size validation (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (certFile.size > maxSize) {
        showNotification(t('teacher_profile.certification_file_too_large', 'File size must be less than 5MB'), 'warning');
        return;
      }

      // Year validation
      if (certYear && (isNaN(Number(certYear)) || Number(certYear) < 1950 || Number(certYear) > new Date().getFullYear() + 1)) {
        showNotification(t('teacher_profile.certification_invalid_year', 'Please enter a valid year'), 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('title', certTitle.trim());
      formData.append('institution', certInstitution.trim());
      formData.append('year', certYear);
      formData.append('description', certDesc.trim());
      formData.append('certificate', certFile);

      addCertMutation.mutate(formData, {
        onSuccess: () => {
          setCertFile(null);
          setCertTitle('');
          setCertInstitution('');
          setCertYear('');
          setCertDesc('');
          if (certInputRef.current) certInputRef.current.value = '';
        }
      });
    };

    // Delete Certification
    const handleDeleteCert = (id: number) => {
      const cert = certifications.find(c => c.id === id);
      const confirmMessage = cert
        ? `Are you sure you want to delete "${cert.title}"? This action cannot be undone.`
        : 'Are you sure you want to delete this certification? This action cannot be undone.';

      if (!window.confirm(confirmMessage)) return;
      deleteCertMutation.mutate(id);
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
                    const res = await fetch('/api/auth/upload-profile-image', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                      body: formData
                    });
                    const data = await res.json();
                    if (data.success && data.data?.profilePicture) {
                      await onUpdate({ profile_picture: data.data.profilePicture });
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
            <div className="relative">
              <textarea
                defaultValue={profile.bio || ''}
                onBlur={async (e) => {
                  const bio = e.target.value.trim();
                  if (bio.length > 1000) {
                    showNotification(t('teacher_profile.bio_too_long', 'Bio must be less than 1000 characters'), 'warning');
                    return;
                  }
                  if (bio !== (profile.bio || '')) {
                    await onUpdate({ bio });
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={3}
                maxLength={1000}
                placeholder={t('teacher_profile.bio_placeholder', 'Tell students about your background, teaching style, and interests.')}
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                {profile.bio?.length || 0}/1000
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Check className="h-3 w-3 text-green-600" />
              <p className="text-xs text-slate-500">Changes are saved automatically when you click outside.</p>
            </div>
          </div>
        </div>
        
        {/* Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
          <button
            onClick={() => onNavigate('verification')}
            className="group flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 bg-gradient-to-r from-blue-600 to-blue-700"
          >
            <Shield className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>{t('teacher_dashboard.start_verification_btn')}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => onNavigate('statistics')}
            className="group flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <BarChart3 className="h-5 w-5 text-slate-600 group-hover:text-purple-600 transition-colors" />
            <span>View Statistics</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </button>
          <button
            onClick={() => onNavigate('payout')}
            className="group flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <CreditCard className="h-5 w-5 text-slate-600 group-hover:text-green-600 transition-colors" />
            <span>{t('teacher_dashboard.setup_payouts_btn')}</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
          </button>
          <button
            onClick={() => onNavigate('security')}
            className="group flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Lock className="h-5 w-5 text-slate-600 group-hover:text-red-600 transition-colors" />
            <span>Account Security</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
          </button>
          <button
            onClick={() => onNavigate('notifications')}
            className="group flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Bell className="h-5 w-5 text-slate-600 group-hover:text-orange-600 transition-colors" />
            <span>Notifications</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Social Links
          </h3>
          <div className="space-y-3">
            {[
              { key: 'website_url', label: 'Website', placeholder: 'https://yourwebsite.com' },
              { key: 'twitter_url', label: 'Twitter', placeholder: 'https://twitter.com/username' },
              { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
              { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/username' },
              { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/username' }
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={placeholder}
                  value={socialLinks[key as keyof typeof socialLinks]}
                  onChange={e => setSocialLinks(l => ({...l, [key]: e.target.value}))}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveLinks}
            disabled={saveLinksMutation.isPending}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
          >
            {saveLinksMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Social Links
              </>
            )}
          </button>
        </div>
        {/* Certifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Certifications
          </h3>
          <form onSubmit={handleUploadCert} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Master of Divinity"
                  value={certTitle}
                  onChange={e => setCertTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Theological College"
                  value={certInstitution}
                  onChange={e => setCertInstitution(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., 2020"
                  value={certYear}
                  onChange={e => setCertYear(e.target.value)}
                  min="1950"
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Certificate File *</label>
                <input
                  type="file"
                  ref={certInputRef}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm"
                  accept="application/pdf,image/*"
                  onChange={e => setCertFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Brief description of this certification..."
                value={certDesc}
                onChange={e => setCertDesc(e.target.value)}
                rows={2}
              />
            </div>
            <button
              type="submit"
              disabled={addCertMutation.isPending}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {addCertMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Uploading Certification...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Certification
                </>
              )}
            </button>
          </form>
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Your Certifications</h4>
            {certsLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="bg-slate-50 rounded p-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : certifications.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No certifications uploaded yet.</p>
                <p className="text-xs text-gray-400 mt-1">Upload your credentials to build trust with students.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {certifications.map(cert => (
                  <li key={cert.id} className="flex items-center justify-between bg-slate-50 rounded p-3 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{cert.title}</div>
                      <div className="text-xs text-slate-500">{cert.institution} {cert.year && `(${cert.year})`}</div>
                      {cert.description && <div className="text-xs text-slate-400 mt-1">{cert.description}</div>}
                      {cert.documentUrl && (
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-xs underline hover:text-blue-800 transition-colors inline-flex items-center gap-1 mt-1"
                        >
                          <FileText className="h-3 w-3" />
                          View Document
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCert(cert.id)}
                      disabled={deleteCertMutation.isPending}
                      className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs disabled:opacity-50 transition-colors"
                    >
                      {deleteCertMutation.isPending ? (
                        <>
                          <Clock className="h-3 w-3 inline mr-1 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
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

      {/* Save Profile Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => {
            // Force save all pending changes
            const bioTextarea = document.querySelector('textarea[placeholder*="background"]') as HTMLTextAreaElement;
            if (bioTextarea) {
              bioTextarea.blur(); // Trigger onBlur save
            }
            showNotification('Profile information saved successfully', 'success');
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Save Profile
        </button>
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
  const queryClient = useQueryClient();
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

  // Payout update mutation
  const updatePayoutMutation = useMutation({
    mutationFn: onUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      showNotification(t('teacher_profile.payout_updated', 'Payout settings updated successfully'), 'success');
    },
    onError: (error) => {
      console.error('Failed to update payout settings:', error);
      showNotification(t('teacher_profile.payout_update_failed', 'Failed to update payout settings. Please try again.'), 'error');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.account_holder.trim()) {
      showNotification(t('teacher_profile.payout_account_holder_required', 'Account holder name is required'), 'warning');
      return;
    }

    if (!formData.account_number.trim()) {
      showNotification(t('teacher_profile.payout_account_number_required', 'Account number is required'), 'warning');
      return;
    }

    if (formData.payout_method === 'bank' && !formData.routing_number.trim()) {
      showNotification(t('teacher_profile.payout_routing_required', 'Routing number is required for bank transfers'), 'warning');
      return;
    }

    if (!formData.address.trim()) {
      showNotification(t('teacher_profile.payout_address_required', 'Billing address is required'), 'warning');
      return;
    }

    if (!formData.dob) {
      showNotification(t('teacher_profile.payout_dob_required', 'Date of birth is required'), 'warning');
      return;
    }

    if (!formData.tax_id.trim()) {
      showNotification(t('teacher_profile.payout_tax_id_required', 'Tax ID is required'), 'warning');
      return;
    }

    if (!formData.tax_agreed) {
      showNotification(t('teacher_profile.payout_tax_agreement_required', 'Please agree to the tax information terms'), 'warning');
      return;
    }

    // Age validation (must be 18+)
    const dob = new Date(formData.dob);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      showNotification(t('teacher_profile.payout_age_requirement', 'You must be at least 18 years old'), 'warning');
      return;
    }

    await updatePayoutMutation.mutateAsync({
      payout_method: formData.payout_method,
      payout_region: formData.payout_region,
      payout_details: {
        account_holder: formData.account_holder.trim(),
        account_number: formData.account_number.trim(),
        routing_number: formData.routing_number.trim(),
        address: formData.address.trim(),
        dob: formData.dob,
        tax_id: formData.tax_id.trim()
      },
      tax_status: formData.tax_agreed ? 'AGREED' : undefined
    });
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
                disabled={updatePayoutMutation.isPending || !formData.tax_agreed}
                className="px-6 py-2 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColors.primaryHex }}
              >
                {updatePayoutMutation.isPending ? t('teacher_profile.payout_setup.saving_btn') : t('teacher_profile.payout_setup.confirm_details_btn')}
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Document upload mutation
  const uploadDocMutation = useMutation({
    mutationFn: async (key: string) => {
      const currentDocs = profile.verification_docs || {};
      return await onUpdate({
        verification_docs: {
          ...currentDocs,
          [key]: 'PENDING'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      showNotification(t('teacher_profile.document_upload_started', 'Document upload started. Please wait for verification.'), 'success');
    },
    onError: (error) => {
      console.error('Failed to upload document:', error);
      showNotification(t('teacher_profile.document_upload_failed', 'Failed to start document upload. Please try again.'), 'error');
    }
  });

  const handleUpload = (key: string) => {
    uploadDocMutation.mutate(key);
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
                    disabled={uploadDocMutation.isPending || status === 'VERIFIED' || status === 'PENDING'}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {uploadDocMutation.isPending ? (
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
                    disabled={uploadDocMutation.isPending || status === 'VERIFIED' || status === 'PENDING'}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {doc.key === 'tracking_history' ? (
                      <>
                        <LayoutDashboard className="h-4 w-4" />
                        {t('teacher_profile.verification_docs.view_history_btn')}
                      </>
                    ) : uploadDocMutation.isPending ? (
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

const StatisticsView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch teacher statistics
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-statistics'],
    queryFn: async () => {
      const res = await teacherApi.getTeacherStats();
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
              <p className="text-slate-600 text-lg">Loading your teaching analytics...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
              <p className="text-slate-600 text-lg">View your teaching performance and student engagement</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Statistics</h3>
            <p className="text-red-700 mb-4">Unable to fetch your teaching analytics at this time.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Performance Statistics</h1>
            <p className="text-slate-600 text-lg">Comprehensive view of your teaching impact and student engagement</p>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                stats.overview.enrollmentGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.overview.enrollmentGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats.overview.enrollmentGrowth)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNumber(stats.overview.totalStudents)}
            </div>
            <div className="text-sm text-slate-600">Total Students</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats.overview.recentEnrollments} new this month
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center text-sm font-medium text-green-600">
                <Activity className="h-4 w-4 mr-1" />
                Active
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNumber(stats.engagement.activeStudents)}
            </div>
            <div className="text-sm text-slate-600">Active Students</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats.engagement.weeklyEngagement} engaged this week
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                stats.overview.completionGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.overview.completionGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stats.overview.completionGrowth)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {stats.overview.averageCompletionRate}%
            </div>
            <div className="text-sm text-slate-600">Avg. Completion</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats.overview.totalEnrollments} completed courses
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              {stats.overview.averageRating && (
                <div className="flex items-center text-sm font-medium text-yellow-600">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  {stats.overview.averageRating}
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {stats.overview.averageRating || 'N/A'}
            </div>
            <div className="text-sm text-slate-600">Average Rating</div>
            <div className="text-xs text-slate-500 mt-2">
              {stats.overview.totalRatings} total reviews
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Performing Courses */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Top Performing Courses
            </h3>
          </div>
          <div className="p-6">
            {stats.trends.topCourses.length > 0 ? (
              <div className="space-y-4">
                {stats.trends.topCourses.map((course, index) => (
                  <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{course.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{course.studentCount} students</span>
                          <span>{course.avgCompletion}% completion</span>
                          {course.avgRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span>{course.avgRating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No courses yet. Create your first course to see performance metrics!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Recent Activity (30 days)
            </h3>
          </div>
          <div className="p-6">
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 8).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'enrollment' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {activity.type === 'enrollment' ? (
                        <Users className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.description} {activity.type === 'enrollment' ? 'enrolled in' : 'completed'} {activity.courseTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No recent activity. Student enrollments and completions will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Stats */}
      <div className="space-y-6">
        {/* Engagement Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Play className="h-4 w-4 text-purple-600" />
              Engagement
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Watch Time</span>
                <span className="font-semibold text-slate-900">{formatTime(stats.engagement.totalWatchTime)}</span>
              </div>
              <div className="text-xs text-slate-500">Total time students spent watching</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Lesson Completion</span>
                <span className="font-semibold text-slate-900">{stats.engagement.averageLessonCompletion}%</span>
              </div>
              <div className="text-xs text-slate-500">Average progress per lesson</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Completed Lessons</span>
                <span className="font-semibold text-slate-900">{formatNumber(stats.engagement.completedLessons)}</span>
              </div>
              <div className="text-xs text-slate-500">Total lessons finished</div>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Earnings
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Total Earnings</span>
                <span className="font-semibold text-slate-900">${stats.earnings.totalEarnings.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">All-time earnings</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">This Month</span>
                <span className="font-semibold text-slate-900">${stats.earnings.monthlyEarnings.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">Current month earnings</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Pending</span>
                <span className="font-semibold text-slate-900">${stats.earnings.pendingPayments.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500">Awaiting payout</div>
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Monthly Trends
            </h3>
          </div>
          <div className="p-4">
            {stats.trends.monthlyActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.trends.monthlyActivity.slice(0, 3).map((month, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{month.enrollments} enrollments</div>
                      <div className="text-xs text-green-600">{month.completions} completed</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">
                No enrollment data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      showNotification(t('teacher_security.password_changed', 'Password changed successfully'), 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      showNotification(error.message || t('teacher_security.password_change_failed', 'Failed to change password'), 'error');
    }
  });

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      showNotification(t('teacher_security.account_deleted', 'Account deleted successfully'), 'success');
      logout();
    },
    onError: (error) => {
      showNotification(error.message || t('teacher_security.account_deletion_failed', 'Failed to delete account'), 'error');
    }
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.currentPassword) {
      showNotification(t('teacher_security.current_password_required', 'Current password is required'), 'warning');
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      showNotification(t('teacher_security.password_too_short', 'New password must be at least 8 characters'), 'warning');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification(t('teacher_security.passwords_dont_match', 'Passwords do not match'), 'warning');
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation !== 'DELETE') {
      showNotification(t('teacher_security.confirmation_required', 'Please type DELETE to confirm'), 'warning');
      return;
    }

    deleteAccountMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Account Security</h1>
            <p className="text-slate-600 text-lg">Manage your password and account security settings</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Change Password
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Regularly update your password to keep your account secure
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter new password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Security Settings
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Additional security options for your account
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Coming Soon
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Login Notifications</h4>
                <p className="text-sm text-slate-600">Get notified of new logins to your account</p>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-5 bg-slate-300 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 transition-transform"></div>
                </div>
                <span className="ml-2 text-sm text-slate-600">Coming Soon</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-900">Session Management</h4>
                <p className="text-sm text-slate-600">View and manage your active sessions</p>
              </div>
              <button className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                View Sessions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Account Deletion */}
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm">
          <div className="p-6 border-b border-red-100">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Irreversible and destructive actions
            </p>
          </div>

          <div className="p-6">
            {!showDeleteConfirm ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-900">Delete Account</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-100 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Confirm Account Deletion</h4>
                  <p className="text-sm text-red-800 mb-3">
                    This will permanently delete your account, all your courses, lessons, and data.
                    Type <strong>DELETE</strong> to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE to confirm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmation('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending || deleteConfirmation !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Account Information
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Account Created</span>
              <span className="font-medium text-slate-900">
                {new Date().toLocaleDateString()} {/* Placeholder - should come from user data */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Last Login</span>
              <span className="font-medium text-slate-900">
                Today {/* Placeholder */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Account Status</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsView: React.FC<{
  profile: TeacherProfileData;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    // Email notifications
    email_course_updates: true,
    email_student_messages: true,
    email_forum_replies: true,
    email_weekly_digest: true,
    email_marketing: false,

    // Push notifications
    push_course_activity: true,
    push_student_engagement: true,
    push_forum_activity: false,
    push_system_updates: true,

    // Communication preferences
    allow_student_messages: true,
    allow_course_invitations: true,
    public_profile_visible: true,
    show_online_status: true,
    allow_analytics_tracking: true
  });

  // Fetch current preferences
  const { data: currentPreferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await teacherApi.getNotificationPreferences();
      return res.data || preferences;
    },
    onSuccess: (data) => {
      if (data) setPreferences(prev => ({ ...prev, ...data }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: teacherApi.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      showNotification(t('notifications.preferences_updated', 'Notification preferences updated successfully'), 'success');
    },
    onError: (error) => {
      showNotification(error.message || t('notifications.preferences_update_failed', 'Failed to update preferences'), 'error');
    }
  });

  const handlePreferenceChange = (key: string, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  const handleSaveAll = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Notification Preferences</h1>
              <p className="text-slate-600 text-lg">Loading your preferences...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="lg:col-span-3">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification Preferences</h1>
            <p className="text-slate-600 text-lg">Customize how and when you receive notifications</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Email Notifications
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Choose which emails you'd like to receive
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'email_course_updates',
                label: 'Course Updates',
                description: 'Notifications about your course performance and student activity'
              },
              {
                key: 'email_student_messages',
                label: 'Student Messages',
                description: 'Direct messages from students enrolled in your courses'
              },
              {
                key: 'email_forum_replies',
                label: 'Forum Replies',
                description: 'Replies to your forum posts and discussions'
              },
              {
                key: 'email_weekly_digest',
                label: 'Weekly Digest',
                description: 'Weekly summary of your teaching activity and platform updates'
              },
              {
                key: 'email_marketing',
                label: 'Marketing & Promotions',
                description: 'Special offers, platform updates, and promotional content'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{label}</h4>
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences[key as keyof typeof preferences] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences[key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Push Notifications
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Browser notifications for important updates
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                key: 'push_course_activity',
                label: 'Course Activity',
                description: 'New enrollments and student progress updates'
              },
              {
                key: 'push_student_engagement',
                label: 'Student Engagement',
                description: 'Comments, questions, and interactions from students'
              },
              {
                key: 'push_forum_activity',
                label: 'Forum Activity',
                description: 'New replies and mentions in forum discussions'
              },
              {
                key: 'push_system_updates',
                label: 'System Updates',
                description: 'Platform maintenance, new features, and important announcements'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{label}</h4>
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences[key as keyof typeof preferences] ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences[key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar - Communication Preferences */}
      <div className="space-y-6">
        {/* Communication Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Communication
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              {
                key: 'allow_student_messages',
                label: 'Student Messages',
                description: 'Allow students to send you direct messages'
              },
              {
                key: 'allow_course_invitations',
                label: 'Course Invitations',
                description: 'Receive invitations to join other courses'
              },
              {
                key: 'public_profile_visible',
                label: 'Public Profile',
                description: 'Make your profile visible to other teachers'
              },
              {
                key: 'show_online_status',
                label: 'Online Status',
                description: 'Show when you are online to students'
              },
              {
                key: 'allow_analytics_tracking',
                label: 'Analytics Tracking',
                description: 'Help improve the platform with usage analytics'
              }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-900">{label}</h4>
                  <p className="text-xs text-slate-600 mt-1">{description}</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange(key, !preferences[key as keyof typeof preferences])}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-3 ${
                    preferences[key as keyof typeof preferences] ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      preferences[key as keyof typeof preferences] ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Notification Summary</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Email notifications: {Object.entries(preferences).filter(([k, v]) => k.startsWith('email_') && v).length} enabled</p>
            <p>• Push notifications: {Object.entries(preferences).filter(([k, v]) => k.startsWith('push_') && v).length} enabled</p>
            <p>• Communication: {Object.entries(preferences).filter(([k, v]) => !k.startsWith('email_') && !k.startsWith('push_') && v).length} features enabled</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveAll}
          disabled={updatePreferencesMutation.isPending}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          {updatePreferencesMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save All Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// --- Main Container ---

const TeacherProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const [activeView, setActiveView] = useState<'dashboard' | 'payout' | 'verification' | 'statistics' | 'security' | 'notifications'>('dashboard');
  const queryClient = useQueryClient();

  // Fetch profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      const res = await teacherApi.getProfile();
      return res?.data?.teacherProfile || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: teacherApi.updateProfile,
    onSuccess: (res) => {
      if (res?.success) {
        // Invalidate and refetch profile data
        queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
        // Refresh user context
        refreshUser();
        showNotification(t('teacher_profile.profile_updated', 'Profile updated successfully'), 'success');
      }
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      showNotification(t('teacher_profile.profile_update_failed', 'Failed to update profile. Please try again.'), 'error');
    }
  });

  const profile = profileData || ({} as TeacherProfileType);
  const loading = profileLoading;
  const error = profileError;

  const handleUpdateProfile = async (data: Partial<TeacherProfileType>) => {
    await updateProfileMutation.mutateAsync(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text={t('common.loading_dashboard')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('common.error_loading_data', 'Failed to load profile')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('common.try_again_description', 'Please try again or contact support if the problem persists.')}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.try_again', 'Try Again')}
          </button>
        </div>
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
          {activeView === 'statistics' && (
            <StatisticsView
              profile={profile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'security' && (
            <SecurityView
              profile={profile}
              onBack={() => setActiveView('dashboard')}
            />
          )}
          {activeView === 'notifications' && (
            <NotificationsView
              profile={profile}
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
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" disabled={!newItem.trim() || items.length>=5 || newItem.trim().length > 50} onClick={() => { const updated=[...items,newItem.trim()].filter(Boolean); setItems(updated); setNewItem(''); onSave(updated); }}>Add</button>
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

    // Validate time format (HH:MM-HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      alert(t('teacher_profile.invalid_time_format', 'Please use format HH:MM-HH:MM (e.g., 09:00-17:00)'));
      return;
    }

    // Check for duplicates
    if ((slots[day]||[]).includes(time)) {
      alert(t('teacher_profile.time_slot_exists', 'This time slot already exists'));
      return;
    }

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