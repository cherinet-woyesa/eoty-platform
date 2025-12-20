import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Check, DollarSign, FileText } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import type { TeacherProfile as TeacherProfileType } from '@/services/api/teacherApi';
import { brandColors } from '@/theme/brand';

interface PayoutViewProps {
  profile: TeacherProfileType;
  onUpdate: (data: Partial<TeacherProfileType>) => Promise<void>;
  onCancel: () => void;
}

const PAYOUT_REGIONS = [
  { code: 'US', labelKey: 'teacher_profile.payout_setup.country_united_states', defaultLabel: 'United States' },
  { code: 'UK', labelKey: 'teacher_profile.payout_setup.country_united_kingdom', defaultLabel: 'United Kingdom' },
  { code: 'CA', labelKey: 'teacher_profile.payout_setup.country_canada', defaultLabel: 'Canada' },
  { code: 'ET', labelKey: 'teacher_profile.payout_setup.country_ethiopia', defaultLabel: 'Ethiopia' },
];

const PayoutView: React.FC<PayoutViewProps> = ({ profile, onUpdate, onCancel }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    payout_method: profile.payout_method || 'bank',
    payout_region: profile.payout_region || 'US',
    mobile_provider: (profile as any)?.payout_details?.mobile_provider || '',
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
      showNotification({ title: t('common.success', 'Success'), message: t('teacher_profile.payout_updated', 'Payout settings updated successfully'), type: 'success' });
    },
    onError: (error) => {
      console.error('Failed to update payout settings:', error);
      showNotification({ title: t('common.error', 'Error'), message: t('teacher_profile.payout_update_failed', 'Failed to update payout settings. Please try again.'), type: 'error' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.payout_method !== 'stripe' && !formData.account_holder.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_holder_required', 'Account holder name is required'), type: 'warning' });
      return;
    }

    if (formData.payout_method !== 'stripe' && !formData.account_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_account_number_required', 'Account number is required'), type: 'warning' });
      return;
    }

    if (formData.payout_method === 'bank' && !formData.routing_number.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_routing_required', 'Routing number is required for bank transfers'), type: 'warning' });
      return;
    }

    if (formData.payout_method === 'mobile_money' && !formData.mobile_provider) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.mobile_money_provider_required', 'Please select a mobile money provider'), type: 'warning' });
      return;
    }

    if (!formData.address.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_address_required', 'Billing address is required'), type: 'warning' });
      return;
    }

    if (!formData.dob) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_dob_required', 'Date of birth is required'), type: 'warning' });
      return;
    }

    if (!formData.tax_id.trim()) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_tax_id_required', 'Tax ID is required'), type: 'warning' });
      return;
    }

    if (!formData.tax_agreed) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_tax_agreement_required', 'Please agree to the tax information terms'), type: 'warning' });
      return;
    }

    // Age validation (must be 18+)
    const dob = new Date(formData.dob);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      showNotification({ title: t('common.warning', 'Warning'), message: t('teacher_profile.payout_age_requirement', 'You must be at least 18 years old'), type: 'warning' });
      return;
    }

    await updatePayoutMutation.mutateAsync({
      payout_method: formData.payout_method,
      payout_region: formData.payout_region,
      payout_details: {
        account_holder: formData.payout_method === 'stripe' ? undefined : formData.account_holder.trim(),
        account_number: formData.payout_method === 'stripe' ? undefined : formData.account_number.trim(),
        routing_number: formData.payout_method === 'bank' ? formData.routing_number.trim() : undefined,
        mobile_provider: formData.payout_method === 'mobile_money' ? formData.mobile_provider : undefined,
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
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <section>
            <div className="flex items-center gap-4 mb-2">
              <button
                type="button"
                onClick={onCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{t('teacher_profile.payout_setup.main_title')}</h2>
                <p className="text-gray-600 text-lg">{t('teacher_profile.payout_setup.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Region Selector */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('teacher_profile.payout_setup.region_label')}
                </label>
                <select
                  value={formData.payout_region}
                  onChange={e => setFormData({ ...formData, payout_region: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all bg-gray-50"
                  style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  disabled={updatePayoutMutation.isPending}
                >
                  {PAYOUT_REGIONS.map(region => (
                    <option key={region.code} value={region.code}>
                      {t(region.labelKey, region.defaultLabel)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payout Method */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('teacher_profile.payout_setup.method_label')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'bank' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'bank'
                      ? 'bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    style={formData.payout_method === 'bank' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'bank' ? 'bg-white' : 'bg-gray-100'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.bank_transfer_method')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.bank_transfer_desc')}</div>
                    </div>
                    {formData.payout_method === 'bank' && <Check className="ml-auto h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'stripe' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'stripe'
                      ? 'bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    style={formData.payout_method === 'stripe' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'stripe' ? 'bg-white' : 'bg-gray-100'}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.stripe_method', 'Stripe')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.stripe_desc', 'Fast, secure payouts via Stripe')}</div>
                    </div>
                    {formData.payout_method === 'stripe' && <Check className="ml-auto h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payout_method: 'mobile_money' })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${formData.payout_method === 'mobile_money'
                      ? 'bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    style={formData.payout_method === 'mobile_money' ? { borderColor: brandColors.primaryHex, color: brandColors.primaryHex } : {}}
                  >
                    <div className={`p-2 rounded-full ${formData.payout_method === 'mobile_money' ? 'bg-white' : 'bg-gray-100'}`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{t('teacher_profile.payout_setup.mobile_money_method')}</div>
                      <div className="text-xs opacity-80">{t('teacher_profile.payout_setup.mobile_money_desc')}</div>
                    </div>
                    {formData.payout_method === 'mobile_money' && <Check className="ml-auto h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Account / Phone Details */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 pt-4 border-t border-gray-100">
                  <CreditCard className="h-4 w-4" />
                  {t('teacher_profile.payout_setup.account_details_title')}
                </h3>

                {formData.payout_method !== 'stripe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      {t('teacher_profile.payout_setup.account_holder_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.account_holder}
                      onChange={e => setFormData({ ...formData, account_holder: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder={t('teacher_profile.payout_setup.account_holder_placeholder', 'e.g. John Doe')}
                    />
                  </div>
                  {formData.payout_method === 'bank' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                        {t('teacher_profile.payout_setup.routing_number_label')}
                      </label>
                      <input
                        type="text"
                        value={formData.routing_number}
                        onChange={e => setFormData({ ...formData, routing_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                        placeholder={t('teacher_profile.payout_setup.routing_number_placeholder', 'Routing / Sort Code')}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      {formData.payout_method === 'bank' ? t('teacher_profile.payout_setup.account_number_label') : t('teacher_profile.payout_setup.phone_number_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder={formData.payout_method === 'bank' 
                        ? t('teacher_profile.payout_setup.account_number_placeholder', 'Account Number / IBAN') 
                        : t('teacher_profile.payout_setup.phone_number_placeholder', '+251...')}
                    />
                  </div>
                </div>
                )}

                {formData.payout_method === 'mobile_money' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                        {t('teacher_profile.payout_setup.mobile_money_provider_label', 'Mobile Money Provider')}
                      </label>
                      <select
                        value={formData.mobile_provider}
                        onChange={e => setFormData({ ...formData, mobile_provider: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all bg-gray-50"
                        style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      >
                        <option value="">{t('teacher_profile.payout_setup.select_provider', 'Select provider')}</option>
                        <option value="cbe_birr">{t('teacher_profile.payout_setup.provider_cbe_birr', 'CBE Birr')}</option>
                        <option value="tele_birr">{t('teacher_profile.payout_setup.provider_tele_birr', 'Tele Birr')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Details */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 pt-4 border-t border-gray-100">
                  <FileText className="h-4 w-4" />
                  {t('teacher_profile.payout_setup.tax_information_title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      {t('teacher_profile.payout_setup.tax_id_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder={t('teacher_profile.payout_setup.tax_id_placeholder', 'SSN / TIN / National ID')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      {t('teacher_profile.payout_setup.dob_label')}
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      {t('teacher_profile.payout_setup.billing_address_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                      placeholder={t('teacher_profile.payout_setup.address_placeholder', 'Full street address, City, State, Zip')}
                    />
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="md:col-span-2 pt-4 border-t border-gray-100">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="tax_agree"
                    checked={formData.tax_agreed}
                    onChange={e => setFormData({ ...formData, tax_agreed: e.target.checked })}
                    className="mt-1 h-4 w-4 border-gray-300 rounded"
                    style={{ color: brandColors.primaryHex, '--tw-ring-color': brandColors.primaryHex } as React.CSSProperties}
                  />
                  <label htmlFor="tax_agree" className="text-sm text-gray-600">
                    <span dangerouslySetInnerHTML={{ __html: t('teacher_profile.payout_setup.tax_agree_label') }} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
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

      {/* Summary Panel */}
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">{t('teacher_profile.payout_setup.payout_summary_title')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('teacher_profile.payout_setup.method_label')}</span>
              <span className="font-medium text-gray-900 capitalize">
                {formData.payout_method === 'bank' 
                  ? t('teacher_profile.payout_setup.bank_transfer_method') 
                  : formData.payout_method === 'stripe' 
                    ? t('teacher_profile.payout_setup.stripe_method', 'Stripe') 
                    : t('teacher_profile.payout_setup.mobile_money_method')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('teacher_profile.payout_setup.region_label')}</span>
              <span className="font-medium text-gray-900">
                {(PAYOUT_REGIONS.find(r => r.code === formData.payout_region) || PAYOUT_REGIONS[0]).defaultLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('teacher_profile.payout_setup.currency_label')}</span>
              <span className="font-medium text-gray-900">
                {formData.payout_region === 'ET' ? t('teacher_profile.payout_setup.currency_etb') : t('teacher_profile.payout_setup.currency_usd')}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">{t('teacher_profile.payout_setup.transactional_terms_title')}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('teacher_profile.payout_setup.transactional_terms_description')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-2">{t('teacher_profile.payout_setup.next_steps_title')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('teacher_profile.payout_setup.next_steps_description')}
          </p>
          <button
            onClick={onCancel}
            className="w-full py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('teacher_profile.payout_setup.later_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayoutView;