import { useState, useEffect } from 'react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function App() {
  const [contact, setContact] = useState('');
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [contactError, setContactError] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isShake, setIsShake] = useState(false);

  // Default configuration acting as fallback if API fails
  const [config, setConfig] = useState({
    price_tier: '$7',
    number_of_registers: 142,
    number_of_visits: 0,
    selling_points: [
      "Instant Telegram & WhatsApp Alerts",
      "Protects Ad Budget from Drop-offs"
    ],
    dropdown_values: [
      { value: "3-6", label: "$3 - $6 (Lite Monitoring)" },
      { value: "7", label: "$7 (The Founder Deal)" },
      { value: "8-11", label: "$8 - $11 (Pro Monitoring)" },
      { value: "12-15", label: "$12 - $15 (Elite Tier)" }
    ],
    text_content: {
      tag: "Active Checkout Monitoring",
      heading1: "Stop Losing Sales to a",
      heading2: "Laggy Checkout",
      tagline: "HookSnap is the \"Silent\" Guardian for Shopify stores. We monitor your checkout page(s) every 30 minutes.",
      founder_limit: "1k"
    }
  });

  useEffect(() => {
    // 1. Clear validation errors on inputs actively
    if (contact) setContactError(false);
    if (feedback) setFeedbackError(false);
    if (contact || feedback) setErrorMsg('');
  }, [contact, feedback]);

  useEffect(() => {
    // 2. Fetch Homepage Config from Server
    fetch(`${API_URL}/homepage-config-data`)
      .then(res => {
        if (!res.ok) throw new Error("API not ready");
        return res.json();
      })
      .then(data => {
        if (!data.error) {
          setConfig(prev => ({
            price_tier: data.price_tier || prev.price_tier,
            number_of_registers: data.number_of_registers || prev.number_of_registers,
            number_of_visits: data.number_of_visits || prev.number_of_visits,
            selling_points: data.selling_points
              ? (typeof data.selling_points === 'string' ? JSON.parse(data.selling_points) : data.selling_points)
              : prev.selling_points,
            dropdown_values: data.dropdown_values
              ? (typeof data.dropdown_values === 'string' ? JSON.parse(data.dropdown_values) : data.dropdown_values)
              : prev.dropdown_values,
            text_content: data.text_content
              ? (typeof data.text_content === 'string' ? JSON.parse(data.text_content) : data.text_content)
              : prev.text_content
          }));
        }
      })
      .catch(err => console.log('Config fallback activated.', err));

    // 3. Register Visit securely via LocalStorage UUID
    let visitorId = localStorage.getItem('hooksnap_visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('hooksnap_visitor_id', visitorId);
    }

    fetch(`${API_URL}/visited-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId })
    }).catch(err => console.log('Silent analytics failure.', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const contactVal = contact.trim();
    const feedbackVal = feedback;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s-]{7,15}$/;

    const isContactValid = emailRegex.test(contactVal) || phoneRegex.test(contactVal);
    const isFeedbackValid = feedbackVal !== "";

    if (!isContactValid || !isFeedbackValid) {
      if (!isContactValid) setContactError(true);
      if (!isFeedbackValid) setFeedbackError(true);

      setErrorMsg(!isContactValid ? "Invalid email or phone" : "Please select a price");

      setIsShake(false);
      setTimeout(() => {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 400);
      }, 10);
      return;
    }

    // Submit early access representation
    try {
      await fetch(`${API_URL}/early-access-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contactVal, feedback: feedbackVal })
      });
    } catch (err) {
      console.log('Submission API failure, showing success state anyway for local development.', err);
    }

    setIsSubmitted(true);
    // Locally increment register count
    setConfig(prev => ({ ...prev, number_of_registers: prev.number_of_registers + 1 }));
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <nav className="max-w-7xl w-full mx-auto px-6 py-4 md:py-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/30 text-xl">
            H
          </div>
          <span className="text-xl md:text-2xl font-extrabold tracking-tighter text-white">HookSnap</span>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full">
          <span className="text-[9px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-widest">For Shopify</span>
          <svg className="w-3 h-3 text-emerald-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
          </svg>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 pt-2 pb-6 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

        <div className="space-y-6 md:space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
            {config.text_content.tag}
          </div>

          <h1 className="font-extrabold text-white leading-tight">
            <span className="text-2xl md:text-3xl lg:text-4xl block mb-2 text-slate-300">{config.text_content.heading1}</span>
            <span className="text-4xl md:text-6xl lg:text-7xl text-emerald-500 underline decoration-emerald-500/20">{config.text_content.heading2}</span>
          </h1>

          <div className="space-y-3">
            <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
              {config.text_content.tagline}
            </p>
            <p className="text-lg md:text-xl font-medium text-slate-400">
              Starting from only <span className="text-emerald-400 font-extrabold text-xl md:text-2xl px-1">{config.price_tier}</span> <span className="italic text-emerald-400/80 text-sm md:text-base">per month.</span>
            </p>
          </div>

          <ul className="space-y-2 md:space-y-3 inline-block text-left text-slate-200 text-sm md:text-base">
            {config.selling_points.map((point, i) => (
              <li key={i} className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`glass-card p-5 md:p-6 rounded-3xl shadow-2xl relative overflow-hidden transition-all ${isShake ? 'error-shake' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-1">Claim Founder Status</h3>
                <p className="text-slate-400 text-xs md:text-sm">
                  Limited to first <span className="font-bold text-white text-base md:text-lg">{config.text_content.founder_limit}</span> stores.
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[8px] md:text-[9px] uppercase font-black text-emerald-500 tracking-[0.15em] mb-1">Starting From</span>
                <div className="flex items-baseline justify-end space-x-1">
                  <span className="text-3xl md:text-4xl font-black text-white">{config.price_tier}</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">/mo</span>
                </div>
              </div>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1 text-left">
                  <label htmlFor="contact" className="block text-[10px] md:text-xs font-bold text-slate-100 uppercase tracking-widest ml-1">Contact Method</label>
                  <input type="text" id="contact" required placeholder="Email or Phone Number"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className={`w-full px-4 bg-slate-900/90 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600 text-white text-sm ${contactError ? 'border-amber-400 error-input' : 'border-slate-700'}`} />
                </div>

                <div className="space-y-2 text-left">
                  <label htmlFor="feedback" className="block text-[10px] md:text-xs font-bold text-slate-100 uppercase tracking-widest ml-1">What&apos;s a fair price for you?</label>
                  <div className="relative">
                    <select id="feedback" required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className={`w-full px-4 bg-slate-900/90 border rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 text-sm appearance-none text-white ${feedbackError ? 'border-amber-400 error-input' : 'border-slate-700'}`}>
                      <option value="" disabled hidden>Choose your preferred tier...</option>
                      {config.dropdown_values.map((opt, i) => (
                        <option key={i} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-center text-[10px] md:text-xs font-bold text-amber-400 animate-pulse uppercase tracking-[0.12em] flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/40 transition-all uppercase tracking-widest text-sm mt-2 active:scale-[0.98]">
                  Get Early Access
                </button>
              </form>
            ) : (
              <div className="text-center py-10 animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-xl font-bold text-white italic">Spot Reserved!</h2>
                <p className="text-slate-400 mt-2 text-sm px-4 leading-relaxed">
                  We&apos;ll reach out to <strong className="text-white">{contact}</strong> shortly.
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              <span>Secure Registration</span>
              <span className="text-emerald-500">Visited users: <span className="text-white">{config.number_of_visits}</span></span>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full max-w-7xl mx-auto px-6 py-4 text-center border-t border-slate-900/50">
        <p className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold leading-loose">
          &copy; 2026 HookSnap. Zero Dashboard. Zero Noise. 100% Security. {config.number_of_visits > 0 && `| Traffic: ${config.number_of_visits} Hits`}
        </p>
      </footer>
    </div>
  );
}

export default App;
