import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Check, CreditCard, Building, ShieldCheck, X, Loader2, User, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const DonationForm: React.FC<{ totalRaised: number; statsError?: string; statsLoading?: boolean }> = ({ totalRaised, statsError, statsLoading }) => {
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

  const isAmountValid = amount >= 5;

  const handleDonate = async () => {
    if (!stripePromise) {
      setError(t('donation.errors.payments_unavailable'));
      return;
    }
    if (!stripe || !elements) {
      setError(t('donation.errors.payment_loading'));
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
      const { data } = await axios.post('/api/donations/create-payment-intent', {
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
          await axios.post('/api/donations/confirm', {
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
    <div className="min-h-screen bg-beige-50 font-sans text-indigo-900">
      {/* Header / Nav Placeholder */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-40 border-b border-stone-200">
        <div className="flex items-center space-x-2">
          <Heart className="h-6 w-6" style={{ color: brandColors.accentHex }} />
          <span className="text-xl font-bold tracking-tight text-indigo-900">EOTY Platform</span>
        </div>
        <div className="hidden md:block">
          <button className="text-sm font-medium text-stone-600 hover:text-indigo-900 transition-colors">
            {t('donation.header.subtitle')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {!stripePromise && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold">{t('donation.errors.payments_unavailable')}</p>
              <p className="text-sm">{t('donation.errors.payment_loading')}</p>
            </div>
          </div>
        )}
        
        {/* Hero Section - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left: Image */}
            <div className="relative h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl order-2 lg:order-1">
                 <img 
                    src="/eoc.jpg" 
                    alt="EOTY Mission" 
                    className="w-full h-full object-cover"
                    style={{ filter: 'sepia(0.2) saturate(1.1)' }} 
                 />
                 <div className="absolute inset-0 bg-indigo-900/10 mix-blend-multiply"></div>
            </div>

            {/* Right: Content */}
            <div className="space-y-8 order-1 lg:order-2">
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span className="text-xs font-bold text-indigo-900 tracking-wide uppercase">{t('donation.hero.badge')}</span>
                 </div>

                 <h1 className="text-4xl md:text-6xl font-serif font-bold text-indigo-900 leading-tight">
                    {t('donation.hero.title_line1')} <br/>
                    <span className="text-rose-600">{t('donation.hero.title_line2')}</span>
                 </h1>
                 
                 <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-light">
                    {t('donation.hero.subtitle')}
                 </p>
                 
                 {/* Progress Metric */}
                 <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                    <span className="text-stone-500 font-medium text-sm uppercase tracking-wider">{t('donation.hero.raised')}</span>
                    <span className="text-3xl font-bold text-indigo-900">
                      {statsLoading ? '—' : `$${totalRaised.toLocaleString()}`}
                    </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: statsLoading ? '15%' : `${Math.min((totalRaised / 100000) * 100, 100)}%`, background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.accentHex})` }}
                    ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-stone-500">
                    <span>{t('donation.hero.goal', { amount: '$100,000' })}</span>
                    <span>{statsLoading ? '...' : t('donation.hero.percent_funded', { percent: Math.round((totalRaised / 100000) * 100) })}</span>
                    </div>
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

                  {/* PayPal Option (disabled placeholder) */}
                  <button 
                    type="button"
                    disabled
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 cursor-not-allowed bg-stone-50"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold italic text-[#003087]">Pay</span><span className="font-bold italic text-[#009cde]">Pal</span>
                    </div>
                    <span className="text-xs font-semibold text-stone-400">{t('donation.form.coming_soon')}</span>
                  </button>

                  {/* Bank Transfer Option (disabled placeholder) */}
                  <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-4 flex items-center justify-between text-stone-500">
                    <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-stone-400" />
                        <span className="font-medium">{t('donation.form.bank_soon')}</span>
                    </div>
                    <span className="text-xs font-semibold text-stone-400">{t('donation.form.planned')}</span>
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
                        <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        {statsError || t('donation.summary.stats_error')}
                    </div>
                )}
                {!isAmountValid && (
                  <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100 flex items-start">
                    <AlertTriangle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    {t('donation.validation.min_amount', { amount: minDonation })}
                  </div>
                )}

                <button
                  onClick={handleDonate}
                  disabled={isProcessing || !stripe || !isAmountValid}
                  className="w-full py-4 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] flex items-center justify-center text-lg"
                  style={{ backgroundColor: brandColors.primaryHex }}
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

const DonationPage: React.FC = () => {
    const { t } = useTranslation();
  const [totalRaised, setTotalRaised] = useState(75000); // Default fallback
    const [statsError, setStatsError] = useState<string | undefined>(undefined);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setStatsLoading(true);
                const { data } = await axios.get('/api/donations/stats');
                if (data.totalRaised) {
                    setTotalRaised(data.totalRaised);
                }
            } catch (error) {
                console.error("Failed to fetch donation stats", error);
                setStatsError('Unable to load live donation stats right now.');
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (!stripePromise) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center">
                    <Heart className="h-10 w-10 mx-auto mb-4" style={{ color: brandColors.primaryHex }} />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('donation.errors.unavailable_title')}</h1>
                    <p className="text-slate-600 mb-4 text-sm">{t('donation.errors.unavailable_body')}</p>
                    <div className="text-sm text-slate-500">{t('donation.errors.contact_support')}</div>
                </div>
            </div>
        );
    }

    return (
        <Elements stripe={stripePromise}>
            <DonationForm totalRaised={totalRaised} statsError={statsError} statsLoading={statsLoading} />
        </Elements>
    );
};

export default DonationPage;