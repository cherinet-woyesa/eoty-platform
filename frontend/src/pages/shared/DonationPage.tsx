import React, { useState, useEffect } from 'react';
import { Heart, Check, CreditCard, Building, ShieldCheck, X, Download, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_51O...'); 

const DonationForm: React.FC<{ totalRaised: number }> = ({ totalRaised }) => {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');
  
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
    setCustomAmount(val);
    if (val) {
      setAmount(Number(val));
    }
  };

  const handleDonate = async () => {
    if (!stripe || !elements) {
      return;
    }

    if (paymentMethod === 'card' && !cardholderName) {
        setError("Please enter the cardholder's name.");
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
    if (val >= 100) return "Funds 1000+ AI-assisted Q&A interactions";
    if (val >= 50) return "Sponsors 1 month of high-quality video hosting";
    if (val >= 25) return "Supports new faith-based content creation";
    return "Builds the future of Orthodox faith learning";
  };

  return (
    <div className="min-h-screen bg-beige-50 font-sans text-indigo-900">
      {/* Header / Nav Placeholder */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-40 border-b border-stone-200">
        <div className="flex items-center space-x-2">
          <Heart className="h-6 w-6 text-rose-600 fill-current" />
          <span className="text-xl font-bold tracking-tight text-indigo-900">EOTY Platform</span>
        </div>
        <div className="hidden md:block">
          <button className="text-sm font-medium text-stone-600 hover:text-indigo-900 transition-colors">AI Expansion Fund ▼</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        
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
                    <span className="text-xs font-bold text-indigo-900 tracking-wide uppercase">AI Mission</span>
                 </div>

                 <h1 className="text-4xl md:text-6xl font-serif font-bold text-indigo-900 leading-tight">
                    Faith Meets Future: <br/>
                    <span className="text-rose-600">The AI Expansion</span>
                 </h1>
                 
                 <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-light">
                    Counter social media's noise with a sanctuary of learning. Your donation powers our AI engines, video hosting, and content creation for Orthodox youth worldwide.
                 </p>
                 
                 {/* Progress Metric */}
                 <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                    <span className="text-stone-500 font-medium text-sm uppercase tracking-wider">Raised So Far</span>
                    <span className="text-3xl font-bold text-indigo-900">${totalRaised.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-indigo-900 to-rose-600 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((totalRaised / 100000) * 100, 100)}%` }}
                    ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-stone-500">
                    <span>Goal: $100,000</span>
                    <span>{Math.round((totalRaised / 100000) * 100)}% Funded</span>
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
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Choose Frequency</h3>
                <div className="flex p-1 bg-stone-100 rounded-xl">
                  <button
                    onClick={() => setFrequency('one-time')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                      frequency === 'one-time' 
                        ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    One-Time
                  </button>
                  <button
                    onClick={() => setFrequency('monthly')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                      frequency === 'monthly' 
                        ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Select Amount</h3>
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
                    placeholder="Custom Amount"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-stone-200 focus:ring-0 focus:border-indigo-900 outline-none transition-all text-lg font-medium text-indigo-900 placeholder-stone-400"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">Payment Method</h3>
                <div className="space-y-3">
                  {/* Credit Card Option */}
                  <div className={`rounded-xl border-2 transition-all overflow-hidden ${paymentMethod === 'card' ? 'border-indigo-900 bg-indigo-50/30' : 'border-stone-200'}`}>
                      <button 
                        onClick={() => setPaymentMethod('card')}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center space-x-3">
                            <CreditCard className={`h-5 w-5 ${paymentMethod === 'card' ? 'text-indigo-900' : 'text-stone-400'}`} />
                            <span className={`font-medium ${paymentMethod === 'card' ? 'text-indigo-900' : 'text-stone-600'}`}>Credit Card</span>
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
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">Cardholder Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Full Name on Card" 
                                                value={cardholderName}
                                                onChange={(e) => setCardholderName(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-200 focus:border-indigo-900 focus:ring-1 focus:ring-indigo-900 outline-none text-sm font-medium text-indigo-900"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">Card Details</label>
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
                            <span className={`font-medium ${paymentMethod === 'bank' ? 'text-indigo-900' : 'text-stone-600'}`}>Bank Transfer</span>
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
                                    <p className="text-sm text-stone-600 mb-2">Please provide your details to receive bank transfer instructions via email.</p>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">Full Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Your Full Name" 
                                            className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-indigo-900 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase">Email Address</label>
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
                <h3 className="text-indigo-200 font-medium mb-2 uppercase tracking-wider text-xs relative z-10">Your Impact</h3>
                <div className="text-3xl font-bold mb-4 relative z-10 font-serif">
                  ${amount} <span className="text-indigo-300 font-sans font-normal text-lg">/ {frequency}</span>
                </div>
                <p className="text-lg leading-relaxed font-light text-indigo-50 relative z-10">
                  {getImpactText(amount)}
                </p>
              </div>

              {/* Summary Details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-900 mb-6">Donation Summary</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <span className="text-stone-600">Amount</span>
                    <span className="font-bold text-xl text-indigo-900">${amount}.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                    <span className="text-stone-600">Frequency</span>
                    <span className="font-medium capitalize text-indigo-900">{frequency}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-emerald-700 bg-emerald-50 py-3 rounded-xl mb-6 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm font-semibold">Secure & Verified Charity</span>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100 flex items-start">
                        <X className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <button
                  onClick={handleDonate}
                  disabled={isProcessing || !stripe}
                  className="w-full py-4 bg-indigo-900 hover:bg-indigo-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] flex items-center justify-center text-lg"
                >
                  {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                  ) : (
                      'Complete Donation'
                  )}
                </button>
                
                <p className="text-center text-xs text-stone-400 mt-4 leading-relaxed">
                  By donating, you agree to our Terms of Service and Privacy Policy. All donations are tax-deductible.
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
              
              <h2 className="text-2xl font-bold text-indigo-900 mb-2 font-serif">Thank You!</h2>
              <p className="text-stone-600 mb-6">
                Your generosity helps us make a difference in the lives of children.
              </p>
              
              <div className="bg-stone-50 rounded-xl p-4 mb-6 border border-stone-100">
                <p className="text-sm text-stone-500 mb-1">Transaction ID: #DON-{transactionId || Math.floor(Math.random() * 100000)}</p>
                <p className="text-sm text-stone-500">A receipt has been sent to your email.</p>
              </div>

              <div className="space-y-3">
                <button className="w-full py-3 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors">
                  <Download className="h-5 w-5" />
                  <span>Download Receipt</span>
                </button>
                
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-3 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Close
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
    const [totalRaised, setTotalRaised] = useState(75000); // Default fallback

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get('/api/donations/stats');
                if (data.totalRaised) {
                    setTotalRaised(data.totalRaised);
                }
            } catch (error) {
                console.error("Failed to fetch donation stats", error);
            }
        };
        fetchStats();
    }, []);

    return (
        <Elements stripe={stripePromise}>
            <DonationForm totalRaised={totalRaised} />
        </Elements>
    );
};

export default DonationPage;