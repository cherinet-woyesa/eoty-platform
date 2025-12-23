import React, { useState, useEffect, forwardRef } from 'react';
import { Check, CreditCard, Building, ShieldCheck, X, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null; 

const DonationForm: React.FC<{ totalRaised: number | null; statsError?: string; loadingStats?: boolean }> = ({ totalRaised, statsError, loadingStats }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');
  const minDonation = 5;
  const goalAmount = 100000;
  const progressPercent = typeof totalRaised === 'number' ? Math.min((totalRaised / goalAmount) * 100, 100) : 0;
  const displayTotal = typeof totalRaised === 'number' ? `$${totalRaised.toLocaleString()}` : '—';
  const percentLabel = typeof totalRaised === 'number'
    ? t('donation.hero.percent_funded', { percent: Math.round((totalRaised / goalAmount) * 100) })
    : '—';
  
  // Form Fields
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState('');

  const stripe = useStripe();
  const elements = useElements();

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parsed = Number(val);
    setCustomAmount(val);
    if (!Number.isNaN(parsed)) {
      setAmount(Math.max(1, parsed));
    }
  };

  const isAmountValid = amount >= minDonation;

  const handleDonate = async () => {
    if (!stripe || !elements) {
      return;
    }

    if (paymentMethod === 'card' && !cardholderName) {
        setError(t('donation.validation.cardholder_required'));
        return;
    }
    if (!isAmountValid) {
      setError(t('donation.validation.min_amount', { amount: minDonation }));
        return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create PaymentIntent on backend
      const { data } = await apiClient.post('/donations/create-payment-intent', {
        amount,
        currency: 'usd',
        donorInfo: {
            name: cardholderName || 'Anonymous', 
            email: email || 'donor@example.com'
        }
      });

      const { clientSecret, donationId } = data;

      // 2. Confirm Card Payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName,
            email: email
          },
        },
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          await apiClient.post('/donations/confirm', {
            paymentIntentId: result.paymentIntent.id
          });
          
          setTransactionId(donationId);
          setShowConfirmation(true);
        }
      }
    } catch (err: any) {
      console.error('Donation error:', err);
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getImpactText = (val: number) => {
    if (val >= 100) return t('donation.impact.tier_100');
    if (val >= 50) return t('donation.impact.tier_50');
    if (val >= 25) return t('donation.impact.tier_25');
    return t('donation.impact.tier_default');
  };

  return (
    <div id="donation-section" data-section-id="donation-section" className="bg-beige-50 font-sans text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
        
        {/* Hero Section - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 sm:mb-16">
            {/* Left: Image */}
            <div className="relative h-[260px] sm:h-[360px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl order-2 lg:order-1">
                 <img 
                    src="/eoc.jpg" 
                    alt="EOTY Mission" 
                    className="w-full h-full object-cover"
                    style={{ filter: 'sepia(0.2) saturate(1.1)' }} 
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                 />
                 <div className="absolute inset-0 bg-indigo-900/10 mix-blend-multiply"></div>
            </div>

            {/* Right: Content */}
            <div className="space-y-6 sm:space-y-8 order-1 lg:order-2">
                 <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-indigo-900 tracking-wide uppercase">{t('donation.hero.badge')}</span>
                 </div>

                 <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-indigo-900 leading-tight">
                    {t('donation.hero.title_line1')}: <br/>
                    <span className="text-rose-600">{t('donation.hero.title_line2')}</span>
                 </h2>
                 
                 <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-light">
                    {t('donation.hero.subtitle')}
                 </p>
                 
                 {/* Progress Metric */}
                 <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                    <span className="text-stone-500 font-medium text-sm uppercase tracking-wider">{t('donation.hero.raised')}</span>
                    <span className="text-3xl font-bold text-indigo-900">
                      {loadingStats ? '—' : displayTotal}
                    </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-indigo-900 to-rose-600 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: loadingStats ? '15%' : `${progressPercent}%` }}
                    ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-stone-500">
                    <span>{t('donation.hero.goal', { amount: '$100,000' })}</span>
                    <span>{loadingStats ? '...' : percentLabel}</span>
                    </div>
                    {statsError && (
                      <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {statsError}
                    </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Donation Form Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Donation Form */}
            <div className="lg:col-span-7 p-8 lg:p-10 space-y-8 border-b lg:border-b-0 lg:border-r border-stone-100">
              
              {/* Frequency */}
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">{t('donation.form.frequency_label')}</h3>
                <div className="flex p-1 bg-stone-100 rounded-xl">
                  <button
                    onClick={() => setFrequency('one-time')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                      frequency === 'one-time' 
                        ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {t('donation.form.frequency.one_time')}
                  </button>
                  <button
                    onClick={() => setFrequency('monthly')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                      frequency === 'monthly' 
                        ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {t('donation.form.frequency.monthly')}
                  </button>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">{t('donation.form.amount_label')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[25, 50, 100, 250].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleAmountSelect(val)}
                      className={`py-3 rounded-xl font-bold text-lg transition-all border-2 ${
                        amount === val && !customAmount
                          ? 'bg-indigo-50 text-indigo-900 border-indigo-900'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-indigo-200'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
                  <input
                    type="number"
                    placeholder={t('donation.form.custom_placeholder')}
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-stone-200 focus:ring-0 focus:border-indigo-900 outline-none transition-all text-lg font-medium text-indigo-900 placeholder-stone-400"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">{t('donation.form.method_label')}</h3>
                <div className="space-y-3">
                  {/* Credit Card Option */}
                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${paymentMethod === 'card' ? 'border-indigo-900 bg-indigo-50/30' : 'border-stone-200'}`}>
                      <button 
                        onClick={() => setPaymentMethod('card')}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center space-x-3">
                            <CreditCard className={`h-5 w-5 ${paymentMethod === 'card' ? 'text-indigo-900' : 'text-stone-400'}`} />
                            <span className={`font-medium ${paymentMethod === 'card' ? 'text-indigo-900' : 'text-stone-600'}`}>{t('donation.form.method_card')}</span>
                        </div>
                      </button>
                      
                      {/* Expanded Card Form */}
                      <AnimatePresence>
                        {paymentMethod === 'card' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4"
                            >
                                <div className="space-y-3 bg-white p-4 rounded-lg border border-stone-200 shadow-inner">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">{t('donation.form.cardholder_label')}</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                            <input 
                                                type="text" 
                                                placeholder={t('donation.form.cardholder_placeholder')}
                                                value={cardholderName}
                                                onChange={(e) => setCardholderName(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:border-indigo-900 focus:ring-1 focus:ring-indigo-900 outline-none text-sm font-medium text-indigo-900"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">{t('donation.form.card_details')}</label>
                                        <div className="p-3 rounded-lg border border-stone-200 bg-white">
                                            <CardElement options={{
                                                style: {
                                                    base: {
                                                        fontSize: '16px',
                                                        color: '#312e81',
                                                        fontFamily: 'Inter, sans-serif',
                                                        '::placeholder': {
                                                            color: '#a8a29e',
                                                        },
                                                    },
                                                },
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                  </div>

                  {/* PayPal Option */}
                  <button 
                    onClick={() => setPaymentMethod('paypal')}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentMethod === 'paypal' ? 'border-indigo-900 bg-indigo-50/30' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold italic text-[#003087]">Pay</span><span className="font-bold italic text-[#009cde]">Pal</span>
                    </div>
                    {paymentMethod === 'paypal' && <Check className="h-5 w-5 text-indigo-900" />}
                  </button>

                  {/* Bank Transfer Option */}
                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${paymentMethod === 'bank' ? 'border-indigo-900 bg-indigo-50/30' : 'border-stone-200'}`}>
                      <button 
                        onClick={() => setPaymentMethod('bank')}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center space-x-3">
                            <Building className={`h-5 w-5 ${paymentMethod === 'bank' ? 'text-indigo-900' : 'text-stone-400'}`} />
                            <span className={`font-medium ${paymentMethod === 'bank' ? 'text-indigo-900' : 'text-stone-600'}`}>{t('donation.form.bank_soon')}</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {paymentMethod === 'bank' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4"
                            >
                                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-inner space-y-3">
                                    <p className="text-sm text-stone-600 mb-2">{t('donation.form.method_label')}</p>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">{t('donation.form.cardholder_placeholder')}</label>
                                        <input 
                                            type="text" 
                                            placeholder={t('donation.form.cardholder_placeholder')}
                                            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-indigo-900 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="name@example.com" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-indigo-900 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Summary & Impact */}
            <div className="lg:col-span-5 bg-stone-50 p-8 lg:p-10 flex flex-col h-full">
              
              {/* Impact Card */}
              <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                <h3 className="text-indigo-200 font-medium mb-2 uppercase tracking-wider text-xs relative z-10">{t('donation.impact.title')}</h3>
                <div className="text-3xl font-bold mb-4 relative z-10 font-serif">
                  ${amount} <span className="text-indigo-300 font-sans font-normal text-lg">/ {t(`donation.form.frequency.${frequency === 'one-time' ? 'one_time' : 'monthly'}`)}</span>
                </div>
                <p className="text-lg leading-relaxed font-light text-indigo-50 relative z-10">
                  {getImpactText(amount)}
                </p>
              </div>

              {/* Summary Details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-900 mb-6">{t('donation.summary.title')}</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <span className="text-stone-600">{t('donation.summary.amount')}</span>
                    <span className="font-bold text-xl text-indigo-900">${amount}.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <span className="text-stone-600">{t('donation.summary.frequency')}</span>
                    <span className="font-medium capitalize text-indigo-900">{t(`donation.form.frequency.${frequency === 'one-time' ? 'one_time' : 'monthly'}`)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-emerald-700 bg-emerald-50 py-3 rounded-xl mb-6 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t('donation.summary.secure')}</span>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100 flex items-start">
                        <X className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {statsError && (
                    <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100 flex items-start">
                        <X className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        {statsError}
                    </div>
                )}
                {!isAmountValid && (
                  <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100 flex items-start">
                    <X className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    {t('donation.validation.min_amount', { amount: minDonation })}
                    </div>
                )}

                <button
                  onClick={handleDonate}
                  disabled={isProcessing || !stripe || !isAmountValid}
                  className="w-full py-4 bg-indigo-900 hover:bg-indigo-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] flex items-center justify-center text-lg"
                >
                  {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t('donation.summary.processing')}
                      </>
                  ) : (
                      t('donation.summary.submit')
                  )}
                </button>
                
                <p className="text-center text-xs text-stone-400 mt-4 leading-relaxed">
                  {t('donation.summary.terms')}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-950/60 backdrop-blur-sm"
              onClick={() => setShowConfirmation(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              
              <div className="mx-auto h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <Check className="h-10 w-10 text-emerald-600" strokeWidth={3} />
              </div>
              
              <h2 className="text-2xl font-bold text-indigo-900 mb-2 font-serif">{t('donation.modal.title')}</h2>
              <p className="text-stone-600 mb-6">
                {t('donation.modal.body')}
              </p>
              
              <div className="bg-stone-50 rounded-xl p-4 mb-6 border border-stone-100">
                <p className="text-sm text-stone-500 mb-1">{t('donation.modal.transaction_id', { id: transactionId || Math.floor(Math.random() * 100000) })}</p>
                <p className="text-sm text-stone-500">{t('donation.modal.receipt_note')}</p>
              </div>

              <div className="space-y-3">
                <button className="w-full py-3 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl cursor-not-allowed opacity-70">
                  {t('donation.modal.receipt_email')}
                </button>
                
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-3 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  {t('donation.modal.close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DonationSection = forwardRef<HTMLDivElement>((_props, ref) => {
    const { t } = useTranslation();
    const [totalRaised, setTotalRaised] = useState<number | null>(null);
    const [statsError, setStatsError] = useState<string | undefined>(undefined);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoadingStats(true);
            const { data } = await apiClient.get('/donations/stats');
            if (typeof data?.totalRaised === 'number') {
              setTotalRaised(data.totalRaised);
            } else {
              setTotalRaised(null);
            }
            } catch (error) {
                // Keep UI functional even if stats endpoint fails
                console.warn('Donation stats unavailable', error);
                setStatsError(t('donation.summary.stats_error'));
            setTotalRaised(null);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [t]);

    if (!stripePromise) {
        return (
            <div ref={ref} id="donation-section" data-section-id="donation-section" className="max-w-7xl mx-auto px-4 py-10">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-6 shadow-sm">
                    {t('donation.errors.payments_unavailable')}
                </div>
            </div>
        );
    }

    return (
        <div ref={ref} id="donation-section" data-section-id="donation-section">
        <Elements stripe={stripePromise}>
                <DonationForm totalRaised={totalRaised} statsError={statsError} loadingStats={loadingStats} />
        </Elements>
        </div>
    );
});

DonationSection.displayName = 'DonationSection';

export default DonationSection;
