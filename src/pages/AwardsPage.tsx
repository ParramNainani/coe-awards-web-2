import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDb, initAnalytics } from '../lib/firebase';
import emailjs from '@emailjs/browser';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Detect if device should skip heavy WebGL rendering
function useCanRenderWebGL() {
  const [canRender, setCanRender] = useState(false);
  useEffect(() => {
    // Skip on touch-primary devices (phones/tablets) — they struggle with Three.js
    const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
    // Skip on very small screens (likely phones)
    const isSmallScreen = window.innerWidth < 768;
    // Skip on low-memory devices (navigator.deviceMemory is in GB, <4GB is constrained)
    const isLowMemory = (navigator as any).deviceMemory !== undefined && (navigator as any).deviceMemory < 4;
    // Check if WebGL is even available
    let hasWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      hasWebGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch { hasWebGL = false; }

    setCanRender(hasWebGL && !isTouchPrimary && !isSmallScreen && !isLowMemory);
  }, []);
  return canRender;
}

// Lazy load the encapsulated WebGL canvas
const AwardsWebGL = lazy(() => import('../components/AwardsWebGL'));

// Category Data for CoE Awards 2nd Edition
export interface AwardCategory {
  id: string;
  type: 'Organization' | 'Individual';
  category: string;
  title: string;
  description?: string;
}

const awardCategories: AwardCategory[] = [
  // Organization - Contribution
  { id: 'org-cont-1', type: 'Organization', category: 'Contribution', title: 'Strategic Value Creation Champion' },
  { id: 'org-cont-2', type: 'Organization', category: 'Contribution', title: 'Global Collaboration Champion' },
  { id: 'org-cont-3', type: 'Organization', category: 'Contribution', title: 'Agentic Enterprise Champion' },

  // Organization - Function
  { id: 'org-func-1', type: 'Organization', category: 'Function', title: 'Product Development Brilliance' },
  { id: 'org-func-2', type: 'Organization', category: 'Function', title: 'Agile & Lean Transformation Brilliance' },
  { id: 'org-func-3', type: 'Organization', category: 'Function', title: 'Automation and Process Brilliance' },

  // Organization - Talent
  { id: 'org-tal-1', type: 'Organization', category: 'Talent', title: 'Workplace Culture' },
  { id: 'org-tal-2', type: 'Organization', category: 'Talent', title: 'DEI Initiatives' },
  { id: 'org-tal-3', type: 'Organization', category: 'Talent', title: 'Learning and Development' },

  // Organization - Headlining
  { id: 'org-head-1', type: 'Organization', category: 'Headlining', title: 'Best Tech / Retail / FSI CoE' },
  { id: 'org-head-2', type: 'Organization', category: 'Headlining', title: 'Best Engineering CoE' },
  { id: 'org-head-3', type: 'Organization', category: 'Headlining', title: 'Best AI CoE' },
  { id: 'org-head-4', type: 'Organization', category: 'Headlining', title: 'Best Data and Analytics CoE' },

  // Individual
  { id: 'ind-1', type: 'Individual', category: 'Individual Highlights', title: 'Innovation Pioneer' },
  { id: 'ind-2', type: 'Individual', category: 'Individual Highlights', title: 'Team Building Dynamo' },
  { id: 'ind-3', type: 'Individual', category: 'Individual Highlights', title: 'Scale Triumphant' },
  { id: 'ind-4', type: 'Individual', category: 'Individual Highlights', title: 'Technology Visionary' },
];

const GCC_SUMMIT = 'https://gcc-catalyst-summit.coe-nexus.com/';

export function AwardsPage() {
  const canRenderWebGL = useCanRenderWebGL();

  // Lazy-load analytics after page is interactive
  useEffect(() => {
    const timer = setTimeout(() => { initAnalytics(); }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Only Organization & Individual (No combined 'All' tab)
  const [activeFilter, setActiveFilter] = useState<'Organization' | 'Individual'>('Organization');
  const [activeSubFilter, setActiveSubFilter] = useState('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    company: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (categoryTitle: string) => {
    setFormData(prev => ({ ...prev, category: categoryTitle }));
    setSelectedNotification(categoryTitle);

    // Smooth scroll to register section
    const target = document.getElementById('register-now') || document.getElementById('nominate');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      setSelectedNotification(null);
    }, 4000);
  };

  const handleNominationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.category || !formData.phone || !formData.designation) {
      alert("Please fill in all required fields!");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // 1. Save to Firebase
      await addDoc(collection(getDb(), 'nominations'), {
        ...formData,
        edition: '2nd Edition',
        location: 'Hyderabad',
        submittedAt: serverTimestamp(),
        source: 'Awards Website Registration'
      });

      // 2. EmailJS Initialization
      const serviceId = 'service_jrtgg9k';
      const notificationTemplateId = import.meta.env.VITE_EMAILJS_NOTIFICATION_TEMPLATE_ID || 'template_notification';
      const autoReplyTemplateId = 'template_y9e0fj6';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'add_your_public_key_here';

      // 3. Prepare Template Params matching the requested formats
      const templateParams = {
        name: 'Admin',
        sender_name: formData.name,
        sender_email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        company: formData.company,
        message: 'Nomination Registration Submitted - 2nd Edition (Hyderabad)',
        source: 'Awards Website Registration (2nd Edition, Hyderabad)',
        category: formData.category,
      };

      // 4. Send Notification to Admin
      if (import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
        try {
          await emailjs.send(serviceId, notificationTemplateId, templateParams, publicKey);
          // 5. Send Auto-Reply to the submitter
          await emailjs.send(serviceId, autoReplyTemplateId, {
            ...templateParams,
            to_email: formData.email,
            to_name: formData.name
          }, publicKey);
        } catch (emailError) {
          console.error("EmailJS failed to send, but registration was saved:", emailError);
        }
      } else {
        console.warn("EmailJS public key is missing from environment. Skipping email dispatch.");
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', designation: '', company: '', category: '' });
      setTimeout(() => setSubmitStatus('idle'), 6000);
    } catch (error) {
      console.error("Error submitting registration: ", error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Categories: strict separation between Organization and Individual
  const filteredCategories = awardCategories.filter((cat) => {
    const typeMatch = cat.type === activeFilter;
    const subMatch = activeSubFilter === 'All' || cat.category === activeSubFilter;
    return typeMatch && subMatch;
  });

  const orgSubCategories = ['All', ...Array.from(new Set(awardCategories.filter(c => c.type === 'Organization').map(c => c.category)))];

  return (
    <div className="min-h-screen bg-[#f8fafc] overflow-hidden text-slate-900 font-sans relative selection:bg-amber-500/20 selection:text-amber-950">
      {/* Subtle Dark Atmosphere behind WebGL */}
      <div className="absolute inset-0 h-[100vh] w-full bg-[#0d0a08] z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,_rgba(234,88,12,0.10)_0%,_rgba(255,122,0,0.04)_35%,_transparent_70%)]" />
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-orange-900/10 blur-[160px] pointer-events-none" />
        <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-amber-900/8 blur-[180px] pointer-events-none" />
      </div>

      {/* Background WebGL Canvas — only rendered on capable desktop devices */}
      <div className="absolute inset-0 h-[100vh] w-full z-0 pointer-events-none">
        {canRenderWebGL ? (
          <ErrorBoundary fallback={
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-[#FFD700]/50 font-sans tracking-[0.2em] text-xs uppercase animate-pulse">Experience Unavailable</div>
            </div>
          }>
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#060406]">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-orange-400 font-sans tracking-[0.2em] text-sm font-semibold"
                >
                  Loading Experience...
                </motion.div>
              </div>
            }>
              <AwardsWebGL />
            </Suspense>
          </ErrorBoundary>
        ) : null}
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 h-[100vh] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0d0a08]/20 to-[#0d0a08]/70 z-0 pointer-events-none" />

      {/* Navigation */}
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 pointer-events-none flex flex-col items-center">
        <nav className="pointer-events-auto flex justify-between items-center px-4 sm:px-6 py-3 w-full max-w-6xl text-sm font-medium tracking-wide text-white/90 border border-white/10 bg-[#0d0a08]/75 backdrop-blur-2xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
          {/* Logo & Edition Info (Left Side) */}
          <div className="flex-shrink-0 flex items-center gap-3 group cursor-pointer">
            <a href="/" aria-label="COE Awards" className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <img src="/CoE%20Brand%20Logo.png" alt="CoE Awards Logo" className="h-[34px] sm:h-[40px] w-auto object-contain relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              </div>
              <div className="hidden sm:flex flex-col text-left border-l border-white/20 pl-3">
                <span className="text-[10px] font-mono tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400 font-bold uppercase leading-none mb-0.5">2nd Edition</span>
                <span className="text-[9px] font-sans tracking-widest text-white/60 leading-none uppercase">Hyderabad</span>
              </div>
            </a>
          </div>

          {/* Right Actions & Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-8 flex-1 justify-end">
            <a href="#why-nominate" className="relative text-[11px] uppercase tracking-widest font-bold text-white/80 hover:text-orange-400 transition-colors group py-1">
              Why Nominate
              <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#categories" className="relative text-[11px] uppercase tracking-widest font-bold text-white/80 hover:text-orange-400 transition-colors group py-1">
              Categories
              <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a
              href={GCC_SUMMIT}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 hover:text-orange-400 transition-colors text-[11px] uppercase tracking-widest font-bold text-white/80"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Previous Edition
            </a>
            <motion.a
              href="#register-now"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden group px-7 py-2.5 rounded-full border border-orange-500/50 bg-gradient-to-r from-orange-600/90 to-amber-600/90 text-white font-bold tracking-widest text-[11px] uppercase transition-all shadow-[0_0_15px_rgba(234,88,12,0.4)] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)]"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
              <span className="relative z-10 flex items-center gap-2">
                Register Now
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
            </motion.a>
          </div>

          {/* Mobile Actions & Menu Toggle */}
          <div className="lg:hidden flex items-center gap-3">
            <motion.a
              href="#register-now"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-1.5 rounded-full border border-orange-500/50 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold tracking-widest text-[10px] uppercase shadow-[0_0_10px_rgba(234,88,12,0.3)]"
            >
              Register
            </motion.a>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="pointer-events-auto lg:hidden mt-2 w-full max-w-md rounded-2xl bg-[#0c0806]/95 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] overflow-hidden"
            >
              <nav className="flex flex-col p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono uppercase tracking-widest text-orange-400">CoE Awards — 2nd Edition</span>
                  <span className="text-xs font-medium text-white/50">Hyderabad</span>
                </div>
                <a href="#why-nominate" className="text-white/80 hover:text-orange-400 font-medium py-1" onClick={() => setIsMenuOpen(false)}>
                  Why Nominate
                </a>
                <a href="#categories" className="text-white/80 hover:text-orange-400 font-medium py-1" onClick={() => setIsMenuOpen(false)}>
                  Categories
                </a>
                <a
                  href={GCC_SUMMIT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-orange-400 font-medium inline-flex items-center gap-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Previous Edition
                </a>
                <a
                  href="#register-now"
                  className="w-full py-2.5 text-center rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold uppercase text-xs tracking-widest shadow-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register Now
                </a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Hero View */}
      <main className="relative z-10 w-full min-h-[85vh] flex flex-col items-center justify-center pointer-events-none px-4">
        <div className="flex flex-col items-center justify-center select-none z-10 text-center space-y-6 pt-8 pb-12">
          {/* 2nd Edition & Hyderabad Highlight Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400/80 animate-pulse" />
            <span className="text-white/50 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase font-mono">
              2nd Edition • Hyderabad
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[0.04em] font-['Chakra_Petch'] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
          >
            CoE Awards
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg md:text-xl font-light text-white/50 tracking-[0.05em] max-w-3xl leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
          >
            Celebrating Breakthrough Innovations, Visionary Leadership and Global Impact.
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 pt-4 pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
          >
            <a
              href="#register-now"
              className="px-8 py-3.5 rounded-full bg-orange-500/85 hover:bg-orange-500 text-white font-bold tracking-wider text-xs uppercase shadow-[0_2px_16px_rgba(234,88,12,0.3)] hover:shadow-[0_4px_24px_rgba(234,88,12,0.5)] transition-all hover:scale-105"
            >
              Register Now
            </a>
            <a
              href="#categories"
              className="px-8 py-3.5 rounded-full border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/8 text-white/70 hover:text-white/90 font-semibold tracking-wider text-xs uppercase transition-all backdrop-blur-sm hover:scale-105"
            >
              Explore Categories
            </a>
          </motion.div>
        </div>
      </main>

      {/* Transition from dark hero to light content below */}
      <div className="relative z-20 w-full">
        <div className="h-40 sm:h-56 bg-gradient-to-b from-[#060406] via-[#18100a] to-[#f8fafc]" />
      </div>

      <div className="bg-[#f8fafc] relative z-20 w-full pt-4">
        {/* Bottom Information Text */}
        <div className="max-w-[85vw] mx-auto text-center pb-20 text-slate-800 font-medium">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl tracking-wide font-light leading-relaxed text-slate-800"
          >
            The benchmark of distinction for global capability centers in <br className="hidden md:block" />
            <span className="text-amber-600 font-semibold">Hyderabad & worldwide</span>.
          </motion.h2>
        </div>

        {/* Why Nominate Section */}
        <section id="why-nominate" className="max-w-[85vw] mx-auto pb-28 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block px-4 py-1 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-800 text-xs font-mono uppercase tracking-widest mb-4 font-semibold">
              Value of Participation
            </div>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 mb-6">
              Why <span className="text-amber-600">Nominate?</span>
            </h3>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Stand out amongst peers, celebrate your team's hard work, and amplify the true power of your digital transformations to a global audience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
              className="relative bg-white border border-slate-200/90 p-7 rounded-2xl group hover:border-amber-400 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-[0_15px_35px_rgba(245,158,11,0.12),0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100/0 group-hover:bg-amber-100/40 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-yellow-400 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-500 shadow-xs group-hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
                    <svg className="w-6 h-6 text-amber-700 group-hover:text-slate-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-widest group-hover:text-amber-600 transition-colors font-bold">01 //</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-3 tracking-wide group-hover:text-amber-700 transition-colors">Deserved Limelight</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-normal group-hover:text-slate-800 transition-colors">
                  Step into the spotlight and showcase your groundbreaking achievements on a global stage in Hyderabad.
                </p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
              className="relative bg-white border border-slate-200/90 p-7 rounded-2xl group hover:border-amber-400 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-[0_15px_35px_rgba(245,158,11,0.12),0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100/0 group-hover:bg-amber-100/40 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-yellow-400 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-500 shadow-xs group-hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
                    <svg className="w-6 h-6 text-amber-700 group-hover:text-slate-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-widest group-hover:text-amber-600 transition-colors font-bold">02 //</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-3 tracking-wide group-hover:text-amber-700 transition-colors">Highlight Value</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-normal group-hover:text-slate-800 transition-colors">
                  Demonstrate the tangible impact and strategic value delivered by your enterprise initiatives and programs.
                </p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
              className="relative bg-white border border-slate-200/90 p-7 rounded-2xl group hover:border-amber-400 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-[0_15px_35px_rgba(245,158,11,0.12),0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100/0 group-hover:bg-amber-100/40 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-yellow-400 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-500 shadow-xs group-hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
                    <svg className="w-6 h-6 text-amber-700 group-hover:text-slate-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-widest group-hover:text-amber-600 transition-colors font-bold">03 //</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-3 tracking-wide group-hover:text-amber-700 transition-colors">Recognise Team</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-normal group-hover:text-slate-800 transition-colors">
                  Celebrate excellence, boost morale, and give your teams the industry accolades they have earned.
                </p>
              </div>
            </motion.div>

            {/* Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
              className="relative bg-white border border-slate-200/90 p-7 rounded-2xl group hover:border-amber-400 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-[0_15px_35px_rgba(245,158,11,0.12),0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-100/0 group-hover:bg-amber-100/40 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300 group-hover:border-amber-500 group-hover:w-8 group-hover:h-8 transition-all duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-yellow-400 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-500 shadow-xs group-hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
                    <svg className="w-6 h-6 text-amber-700 group-hover:text-slate-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-widest group-hover:text-amber-600 transition-colors font-bold">04 //</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-3 tracking-wide group-hover:text-amber-700 transition-colors">Enhance Credibility</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-normal group-hover:text-slate-800 transition-colors">
                  Solidify your organization as an employer of choice and benchmark of excellence across GCC ecosystems.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Award Categories Grid with Clean Separation (Organization vs Individual) */}
        <section id="categories" className="max-w-[85vw] mx-auto pb-28 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 border-b border-slate-200 pb-8 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-800 text-xs font-mono uppercase tracking-widest mb-3 font-semibold">
                <span>2nd Edition</span>
                <span>•</span>
                <span>Hyderabad</span>
              </div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-950 mb-2">Award Categories</h3>
              <p className="text-amber-700 text-sm md:text-base font-semibold">Click any category card to select it directly for registration</p>
            </div>

            {/* Category Mode Switcher: ONLY Organization & Individual (NO "All" tab) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Main Toggle (Organization vs Individual) */}
              <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
                <button
                  onClick={() => { setActiveFilter('Organization'); setActiveSubFilter('All'); }}
                  className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeFilter === 'Organization'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_2px_10px_rgba(245,158,11,0.25)]'
                    : 'text-slate-600 hover:text-slate-950'
                    }`}
                >
                  Organization
                </button>
                <button
                  onClick={() => { setActiveFilter('Individual'); setActiveSubFilter('All'); }}
                  className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${activeFilter === 'Individual'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_2px_10px_rgba(245,158,11,0.25)]'
                    : 'text-slate-600 hover:text-slate-950'
                    }`}
                >
                  Individual
                </button>
              </div>

              {/* Sub Filter Dropdown for Organization */}
              {activeFilter === 'Organization' && (
                <select
                  value={activeSubFilter}
                  onChange={e => setActiveSubFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer shadow-xs"
                >
                  {orgSubCategories.map(cat => (
                    <option key={cat} value={cat} className="bg-white text-slate-900">
                      {cat === 'All' ? 'All Organization Tracks' : cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Compact Category Cards Grid (refined small boxes) */}
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence mode='popLayout'>
              {filteredCategories.map((category, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.94, y: 25 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 25 }}
                  transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  key={category.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  onClick={() => handleCategorySelect(category.title)}
                  className="group relative p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-[0_12px_28px_rgba(245,158,11,0.14),0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[165px] sm:min-h-[175px] shadow-xs"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-amber-400 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                        {category.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 group-hover:text-amber-600 transition-colors font-bold">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                      {category.title}
                    </h4>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-amber-700 transition-colors">
                    <span>Click to Register</span>
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Register Now / Nomination Section */}
        <section id="register-now" className="max-w-[85vw] mx-auto pb-28 scroll-mt-24">
          <div id="nominate" className="bg-gradient-to-br from-white via-slate-50 to-amber-50/20 rounded-[2.5rem] border border-slate-200/90 p-6 md:p-14 relative overflow-hidden shadow-xl group">
            {/* Background image & gradient overlay */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-15 group-hover:opacity-20 transition-opacity duration-700"
              style={{ backgroundImage: 'url("/nomination-bg.jpeg")' }}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/90 to-white/60" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/4 z-0" />

            <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-16 h-full items-center">

              <div className="flex-1 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-800 text-xs font-mono uppercase tracking-widest mb-4 w-fit font-semibold">
                  <span>2nd Edition</span>
                  <span>•</span>
                  <span>Hyderabad</span>
                </div>

                <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 mb-5 leading-tight">
                  Register <span className="text-amber-600">Now</span>
                </h3>
                <p className="text-base md:text-lg text-slate-600 mb-8 max-w-md leading-relaxed">
                  Join the ranks of globally recognized GCC innovators. Register your nomination for the CoE Awards 2nd Edition in Hyderabad.
                </p>

                {/* Process Steps */}
                <div className="space-y-4 text-sm font-medium text-slate-800 mb-8">
                  <div className="flex items-center gap-4 bg-white/80 border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-full border border-amber-300 flex flex-shrink-0 items-center justify-center bg-amber-100 text-amber-800 font-bold">1</div>
                    <p className="text-xs sm:text-sm font-medium">Select your Desired Award Category</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/80 border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-full border border-amber-300 flex flex-shrink-0 items-center justify-center bg-amber-100 text-amber-800 font-bold">2</div>
                    <p className="text-xs sm:text-sm font-medium">Submit Registration & Supporting Details</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/80 border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
                    <div className="w-9 h-9 rounded-full border border-amber-300 flex flex-shrink-0 items-center justify-center bg-amber-100 text-amber-800 font-bold">3</div>
                    <p className="text-xs sm:text-sm font-medium">Evaluation by Esteemed Jury Panel</p>
                  </div>
                </div>

                {selectedNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
                  >
                    <svg className="w-4 h-4 flex-shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Selected: <strong>{selectedNotification}</strong> (Populated in form)</span>
                  </motion.div>
                )}
              </div>

              {/* Form Container */}
              <div className="flex-1 w-full">
                <form onSubmit={handleNominationSubmit} className="bg-white/95 backdrop-blur-xl border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-5 shadow-xl">
                  <div className="border-b border-slate-200 pb-4 mb-2">
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">Nomination Registration</h4>
                    <p className="text-xs text-slate-500">Complete the form below to submit your nomination</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Full Name <span className="text-amber-600">*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your name"
                        className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Email Address <span className="text-amber-600">*</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="name@company.com"
                        className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Phone Number <span className="text-amber-600">*</span></label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Designation <span className="text-amber-600">*</span></label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. VP / Director of Eng"
                        className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Company / Organization <span className="text-amber-600">*</span></label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      placeholder="Company or GCC Name"
                      className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Award Category <span className="text-amber-600">*</span></label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50/80 hover:bg-slate-100/50 focus:bg-white border border-slate-200/90 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-xs transition-all"
                    >
                      <option value="">Select a category...</option>
                      <optgroup label="Organization Categories">
                        {awardCategories.filter(c => c.type === 'Organization').map(cat => (
                          <option key={cat.id} value={cat.title}>{cat.title} ({cat.category})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Individual Categories">
                        {awardCategories.filter(c => c.type === 'Individual').map(cat => (
                          <option key={cat.id} value={cat.title}>{cat.title}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {submitStatus === 'success' && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-center text-sm font-medium flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span>Registration submitted successfully! Our team will contact you shortly.</span>
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-center text-sm font-medium flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      <span>Failed to submit registration. Please check your connection and try again.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 mt-2 rounded-xl text-slate-950 font-bold tracking-widest uppercase text-xs transition-all shadow-[0_4px_15px_rgba(245,158,11,0.25)] ${isSubmitting ? 'bg-amber-300 cursor-not-allowed text-slate-600' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 hover:shadow-[0_6px_25px_rgba(245,158,11,0.4)]'
                      }`}
                  >
                    {isSubmitting ? 'Submitting Registration...' : 'Register Now'}
                  </button>
                  <p className="text-center text-amber-800 font-medium text-[11px] pt-2">
                    CoE Awards 2nd Edition • Hyderabad | Official Nomination Registration
                  </p>
                </form>
              </div>
            </div>

            {/* Contact Information Bottom */}
            <div className="relative z-10 mt-14 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-600 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-6 font-medium">
                <a href="mailto:vikram@coe-nexus.com" className="hover:text-amber-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  vikram@coe-nexus.com
                </a>
                <a href="tel:+919560292720" className="hover:text-amber-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  +91 9560292720
                </a>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Hyderabad, India
              </div>
            </div>
          </div>
        </section>

        {/* Basic Footer */}
        <footer className="w-full py-8 bg-slate-100/90 border-t border-slate-200 text-center mt-auto">
          <div className="max-w-[85vw] mx-auto flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-1 rounded-full bg-amber-500 mb-1"></div>
            <p className="text-slate-600 text-xs tracking-widest uppercase font-semibold">© {new Date().getFullYear()} CoE Awards — 2nd Edition • Hyderabad. All rights reserved.</p>
            <p className="text-slate-500 text-[11px] tracking-wide max-w-lg font-normal">The Pinnacle of Excellence. Transforming industries through visionary leadership and breakthrough innovation.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
