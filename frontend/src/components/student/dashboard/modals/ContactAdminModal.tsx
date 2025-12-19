import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactAdminModal: React.FC<ContactAdminModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/support/contact', {
        subject,
        message,
        type: 'student_support'
      });
      
      setSuccess(true);
      showNotification({
        type: 'success',
        title: t('common.success'),
        message: t('student.contact_success', 'Message sent successfully')
      });
      
      // Close after delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSubject('');
        setMessage('');
      }, 2000);
    } catch (err) {
      console.error('Failed to send message:', err);
      showNotification({
        type: 'error',
        title: t('common.error'),
        message: t('student.contact_error', 'Failed to send message. Please try again.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h3 className="text-lg font-semibold text-stone-800">
            {t('student.contact_admin_title', 'Contact Support')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-stone-800 mb-1">
                {t('student.message_sent', 'Message Sent!')}
              </h4>
              <p className="text-stone-500 text-sm">
                {t('student.message_sent_desc', 'We will get back to you shortly.')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('student.contact_subject', 'Subject')}
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">{t('student.select_subject', 'Select a topic...')}</option>
                  <option value="technical">{t('student.subject_technical', 'Technical Issue')}</option>
                  <option value="course">{t('student.subject_course', 'Course Content')}</option>
                  <option value="account">{t('student.subject_account', 'Account & Billing')}</option>
                  <option value="other">{t('student.subject_other', 'Other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('student.contact_message', 'Message')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                  placeholder={t('student.contact_message_placeholder', 'How can we help you?')}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !subject || !message}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  style={{ backgroundColor: brandColors.primaryHex }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('common.send_message', 'Send Message')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactAdminModal;
