import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import emailjs from '@emailjs/browser';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Lazy load the encapsulated WebGL canvas
const AwardsWebGL = lazy(() => import('../components/AwardsWebGL'));

// Mock Data for Categories Restored to "Fire" Grid Format
const awardCategories: any[] = [
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSubFilter, setActiveSubFilter] = useState('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      await addDoc(collection(db, 'nominations'), {
        ...formData,
        submittedAt: serverTimestamp(),
        source: 'Awards Website'
      });

      // 2. EmailJS Initialization
      const serviceId = 'service_jrtgg9k';
      const notificationTemplateId = import.meta.env.VITE_EMAILJS_NOTIFICATION_TEMPLATE_ID || 'template_notification'; // Needs to be added to .env
      const autoReplyTemplateId = 'template_y9e0fj6';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'add_your_public_key_here';

      // 3. Prepare Template Params matching the requested formats
      const templateParams = {
        name: 'Admin', // For notification recipient (e.g. 'Admin' or receiver's name)
        sender_name: formData.name,
        sender_email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        company: formData.company,
        message: 'Nomination Interest Expressed',
        source: 'Awards Website Nomination',
        category: formData.category,
      };

      // 4. Send Notification to Admin
      if (import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
         try {
           await emailjs.send(serviceId, notificationTemplateId, templateParams, publicKey);
           // 5. Send Auto-Reply to the submitter
           await emailjs.send(serviceId, autoReplyTemplateId, {
             ...templateParams,
             to_email: formData.email, // Auto reply usually needs recipient email
             to_name: formData.name
           }, publicKey);
         } catch (emailError) {
           console.error("EmailJS failed to send, but nomination was saved:", emailError);
         }
      } else {
         console.warn("EmailJS public key is missing from environment. Skipping email dispatch.");
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', designation: '', company: '', category: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error("Error submitting nomination: ", error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = awardCategories.filter((cat) => {
    const typeMatch = activeFilter === 'All' || cat.type === activeFilter;
    const subMatch = activeSubFilter === 'All' || cat.category === activeSubFilter;
    return typeMatch && subMatch;
  });

  return (
    <div className="min-h-screen bg-[#050510] overflow-hidden text-white font-sans relative">
      {/* Background WebGL Canvas taking over the Hero section completely */}
      <div className="absolute inset-0 h-[100vh] w-full z-0 pointer-events-none opacity-80 mix-blend-screen bg-[#050510]">
         <ErrorBoundary fallback={
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-[#FFD700]/50 font-sans tracking-[0.2em] text-xs uppercase animate-pulse">Experience Unavailable</div>
            </div>
         }>
           <Suspense fallback={
             <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c1222]">
               <motion.div 
                 animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }} 
                 transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                 className="text-[#FFD700] font-sans tracking-[0.2em] text-sm font-semibold"
               >
                 Loading Experience...
               </motion.div>
             </div>
           }>
            <AwardsWebGL />
           </Suspense>
         </ErrorBoundary>
      </div>
      
      {/* Soft dark vignette gradient to frame the 3D element smoothly */}
      <div className="absolute inset-0 h-[100vh] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-[#050510] z-0 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 flex justify-between items-center px-4 sm:px-8 py-4 sm:py-6 w-full text-sm font-medium tracking-wide text-white/80 border-b border-white/10 bg-[#030305]/60 backdrop-blur-xl transition-all">
        {/* Left Links (Desktop) */}
        <div className="hidden lg:flex gap-10 flex-1">
          <ul className="flex items-center gap-8">
            <li>
              <a href={GCC_SUMMIT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#FFD700] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                GCC Catalyst Summit
              </a>
            </li>
          </ul>
        </div>

        {/* Center Logo */}
        <div className="flex-shrink-0 flex items-center justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <a href="/" aria-label="COE Awards">
              <img src="/CoE%20Brand%20Logo.png" alt="CoE Awards Logo" className="h-[32px] sm:h-[40px] w-auto object-contain opacity-90 transition-opacity hover:opacity-100" />
            </a>
        </div>

        {/* Right Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-end">
          <ul className="flex items-center gap-8 mr-4">
            <li><a href="#categories" className="hover:text-[#FFD700] transition-colors">Categories</a></li>
          </ul>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 rounded-full border border-[#FFD700]/30 hover:border-[#FFD700]/80 bg-[#FFD700]/5 text-[#FFD700] font-semibold tracking-wider text-xs uppercase transition-colors"
            onClick={() => document.getElementById('nominate')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Express Interest
          </motion.button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-1.5 rounded-full border border-[#FFD700]/30 hover:border-[#FFD700]/80 bg-[#FFD700]/5 text-[#FFD700] font-semibold tracking-wider text-[10px] uppercase transition-colors"
            onClick={() => document.getElementById('nominate')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Express Interest
          </motion.button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/50 rounded-lg"
            aria-label="Toggle Menu"
          >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden relative z-40 bg-[#030305]/95 border-b border-white/10 backdrop-blur-xl overflow-hidden"
          >
            <nav className="flex flex-col p-4 space-y-4">
              <a href={GCC_SUMMIT} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-[#FFD700] font-medium inline-flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                GCC Catalyst Summit
              </a>
              <a href="#categories" className="text-white/80 hover:text-[#FFD700] font-medium" onClick={() => setIsMenuOpen(false)}>Categories</a>
              {/* Nominate button removed as requested */}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Hero View - Clean, modest, upscale elegant text */}
      <main className="relative z-10 w-full min-h-[85vh] flex flex-col items-center justify-center pointer-events-none">
        
        <div className="flex flex-col items-center justify-center select-none z-10 text-center space-y-6 pt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#FFD700]/50" />
            <span className="text-[#FFD700] text-xs font-medium tracking-[0.3em] uppercase">The Pinnacle of Excellence</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#FFD700]/50" />
          </motion.div>
          
          <motion.h1 
            className="text-6xl md:text-8xl lg:text-9xl tracking-[0.05em] font-['Chakra_Petch'] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 drop-shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
          >
            CoE Awards
          </motion.h1>
          
          <motion.h2 
            className="text-lg md:text-xl font-light text-white/60 tracking-[0.1em] max-w-3xl mt-6 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
          >
            Celebrating visionary leadership, breakthrough <br className="hidden md:block" />
            innovation, and global impact across industries
          </motion.h2>
        </div>
      </main>

      <div className="bg-[#050510] relative z-20 w-full pt-16 border-t border-[#FFD700]/10 shadow-[0_-20px_50px_rgba(5,5,16,1)]">
        {/* Bottom Information Text */}
        <div className="max-w-[85vw] mx-auto text-center pb-24 text-white font-medium">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl tracking-wide font-light leading-relaxed text-white/90"
          >
            An esteemed recognition platform honoring <br />
            <span className="text-[#FFD700] font-normal">outstanding achievements</span> worldwide.
          </motion.h2>
        </div>

        {/* Why Nominate Section */}
        <section id="why-nominate" className="max-w-[85vw] mx-auto pb-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
              Why <span className="text-[#FFD700]">Nominate?</span>
            </h3>
            <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              Stand out amongst peers, celebrate your team's hard work, and amplify the true power of your digital transformations to a global audience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="relative bg-[#080d19] border border-[#1a253f] p-8 group hover:border-[#FFD700]/50 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] cursor-pointer"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#00ffff]/0 group-hover:bg-[#FFD700]/10 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_95%,rgba(0,255,255,0.05)_100%)] bg-[length:100%_4px] group-hover:opacity-50 transition-opacity duration-500" />
              
              <div className="relative z-10 transform group-hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded bg-[#0b1426] border border-[#00ffff]/20 flex items-center justify-center group-hover:border-[#FFD700]/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_0_rgba(0,255,255,0)] group-hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                    <svg className="w-6 h-6 text-[#00ffff] group-hover:text-[#FFD700] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-white/30 tracking-widest group-hover:text-[#FFD700]/80 transition-colors">01 //</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4 tracking-wide group-hover:text-[#FFD700] transition-colors">Deserved Limelight</h4>
                <p className="text-sm md:text-base text-white/50 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                  Step into the spotlight and showcase your groundbreaking achievements on a global stage. Let your hard work and innovation receive the premier recognition they truly deserve.
                </p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
              className="relative bg-[#080d19] border border-[#1a253f] p-8 group hover:border-[#FFD700]/50 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] cursor-pointer"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#00ffff]/0 group-hover:bg-[#FFD700]/10 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_95%,rgba(0,255,255,0.05)_100%)] bg-[length:100%_4px] group-hover:opacity-50 transition-opacity duration-500" />
              
              <div className="relative z-10 transform group-hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded bg-[#0b1426] border border-[#00ffff]/20 flex items-center justify-center group-hover:border-[#FFD700]/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_0_rgba(0,255,255,0)] group-hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                    <svg className="w-6 h-6 text-[#00ffff] group-hover:text-[#FFD700] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-white/30 tracking-widest group-hover:text-[#FFD700]/80 transition-colors">02 //</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4 tracking-wide group-hover:text-[#FFD700] transition-colors">Highlight Value</h4>
                <p className="text-sm md:text-base text-white/50 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                  Demonstrate the tangible impact and strategic value of your initiatives. Illustrate how your transformative efforts are driving positive change and delivering exceptional outcomes.
                </p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
              className="relative bg-[#080d19] border border-[#1a253f] p-8 group hover:border-[#FFD700]/50 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] cursor-pointer"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#00ffff]/0 group-hover:bg-[#FFD700]/10 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_95%,rgba(0,255,255,0.05)_100%)] bg-[length:100%_4px] group-hover:opacity-50 transition-opacity duration-500" />
              
              <div className="relative z-10 transform group-hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded bg-[#0b1426] border border-[#00ffff]/20 flex items-center justify-center group-hover:border-[#FFD700]/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_0_rgba(0,255,255,0)] group-hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                    <svg className="w-6 h-6 text-[#00ffff] group-hover:text-[#FFD700] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-white/30 tracking-widest group-hover:text-[#FFD700]/80 transition-colors">03 //</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4 tracking-wide group-hover:text-[#FFD700] transition-colors">Recognise Team</h4>
                <p className="text-sm md:text-base text-white/50 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                  There's no better recognition for your team's hard work than winning or being shortlisted for an award. Celebrate excellence and boost morale on a premier stage.
                </p>
              </div>
            </motion.div>

            {/* Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
              className="relative bg-[#080d19] border border-[#1a253f] p-8 group hover:border-[#FFD700]/50 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] cursor-pointer"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#00ffff]/0 group-hover:bg-[#FFD700]/10 blur-[50px] transition-all duration-700 rounded-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ffff]/50 group-hover:border-[#FFD700] group-hover:w-8 group-hover:h-8 transition-all duration-500" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_95%,rgba(0,255,255,0.05)_100%)] bg-[length:100%_4px] group-hover:opacity-50 transition-opacity duration-500" />
              
              <div className="relative z-10 transform group-hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded bg-[#0b1426] border border-[#00ffff]/20 flex items-center justify-center group-hover:border-[#FFD700]/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_0_rgba(0,255,255,0)] group-hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                    <svg className="w-6 h-6 text-[#00ffff] group-hover:text-[#FFD700] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs text-white/30 tracking-widest group-hover:text-[#FFD700]/80 transition-colors">04 //</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4 tracking-wide group-hover:text-[#FFD700] transition-colors">Enhance Credibility</h4>
                <p className="text-sm md:text-base text-white/50 leading-relaxed font-light group-hover:text-white/80 transition-colors">
                  Being recognized by an esteemed jury positions you and your organization as industry leaders. Leverage this prestige to attract top-tier talent and forge invaluable partnerships.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Award Categories Grid with Filtering */}
        <section id="categories" className="max-w-[85vw] mx-auto pb-32">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 border-b border-white/10 pb-8 gap-6">
            <div>
              <h3 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">Award Categories</h3>
              <p className="text-[#FFD700] text-lg font-medium">Explore the diverse domains of excellence</p>
            </div>
            
            {/* Filter Bar with Drops Downs */}
            <div className="flex flex-wrap items-center gap-4">
               {/* Main Toggle */}
               <div className="flex bg-[#111122] rounded-full p-1 border border-white/10">
                 {['All', 'Organization', 'Individual'].map(f => (
                   <button 
                     key={f} 
                     onClick={() => { setActiveFilter(f); setActiveSubFilter('All') }}
                     className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeFilter === f ? 'bg-[#FFD700] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                   >
                     {f}
                   </button>
                 ))}
               </div>

               {/* Sub Dropdown Filter representing those nested categories */}
               {activeFilter === 'Organization' && (
                 <select 
                   value={activeSubFilter}
                   onChange={e => setActiveSubFilter(e.target.value)}
                   className="bg-[#111122] border border-[#FFD700]/30 rounded-full px-6 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#FFD700]"
                 >
                   <option value="All">All {activeFilter} Awards</option>
                   {Array.from(new Set(awardCategories.filter(c => c.type === activeFilter).map(c => c.category))).map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                 </select>
               )}
            </div>
          </div>

          {/* Animated "Fire Grid" Layout restored */}
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14">
            <AnimatePresence mode='popLayout'>
              {filteredCategories.map((category) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 40 }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  className="group relative p-8 rounded-[1.5rem] bg-gradient-to-b from-[#111122] to-[#0a0a15] border border-white/5 hover:border-[#FFD700]/50 hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all duration-500 ease-out cursor-pointer overflow-hidden flex flex-col justify-between min-h-[280px]"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#FFD700] rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                      <span className="px-4 py-1.5 bg-black/50 border border-[#FFD700]/30 text-[#FFD700] rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                        {category.category}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black tracking-tight mb-4 text-white group-hover:text-white transition-colors pr-4 leading-tight">
                      {category.title}
                    </h4>
                  </div>
                  
                  {/* Nominate button removed as requested */}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Register / Nominate Now Section */}
        <section id="nominate" className="max-w-[85vw] mx-auto pb-32 pt-10">
          <div className="bg-[#050510] rounded-[2.5rem] border border-white/10 p-8 md:p-16 relative overflow-hidden shadow-2xl group">
            {/* WhatsApp Image Background */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 group-hover:opacity-50 transition-opacity duration-700"
              style={{ backgroundImage: 'url("/nomination-bg.jpeg")' }}
            />
            {/* Dark gradient overlay so text remains readable */}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#050510] via-[#050510]/70 to-[#050510]/30" />
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFD700]/10 rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/4 z-0" />
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-16 h-full">
              
              <div className="flex-1 flex flex-col justify-center relative">
                {/* Adding the generated image for visual appeal behind/above the text */}
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 relative z-10">
                  Nomination <br/><span className="text-[#FFD700]">Process</span>
                </h3>
                <p className="text-lg text-white/60 mb-10 max-w-md leading-relaxed relative z-10">
                  Join the ranks of the globally recognized innovators. Follow this process to express your interest in excellence in technology and leadership.
                </p>
                <div className="space-y-6 text-sm font-medium text-white/80 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-[#FFD700]/30 flex flex-shrink-0 items-center justify-center bg-[#FFD700]/10 text-[#FFD700]">1</div>
                    <p>Select your Desired Award Category</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-[#FFD700]/30 flex flex-shrink-0 items-center justify-center bg-[#FFD700]/10 text-[#FFD700]">2</div>
                    <p>Present Supporting Credentials</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-[#FFD700]/30 flex flex-shrink-0 items-center justify-center bg-[#FFD700]/10 text-[#FFD700]">3</div>
                    <p>Evaluation by Esteemed Jury Panel</p>
                  </div>
                </div>
                

              </div>

              <div className="flex-1">
                <form onSubmit={handleNominationSubmit} className="bg-[#050510]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Full Name <span className="text-[#FFD700]">*</span></label>
                       <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="" className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Email Address <span className="text-[#FFD700]">*</span></label>
                       <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="" className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Phone Number <span className="text-[#FFD700]">*</span></label>
                       <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="" className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Designation <span className="text-[#FFD700]">*</span></label>
                       <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} required placeholder="" className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Company / Organization <span className="text-[#FFD700]">*</span></label>
                     <input type="text" name="company" value={formData.company} onChange={handleInputChange} required placeholder="" className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-white/60 uppercase tracking-widest">Nomination Category <span className="text-[#FFD700]">*</span></label>
                     <select name="category" value={formData.category} onChange={handleInputChange} required className="w-full bg-[#111122] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 transition-colors appearance-none">
                       <option value="">Select a category...</option>
                       <optgroup label="Organization Categories">
                         {awardCategories.filter(c => c.type === 'Organization').map(cat => <option key={cat.id} value={cat.title}>{cat.title}</option>)}
                       </optgroup>
                       <optgroup label="Individual Categories">
                         {awardCategories.filter(c => c.type === 'Individual').map(cat => <option key={cat.id} value={cat.title}>{cat.title}</option>)}
                       </optgroup>
                     </select>
                  </div>
                  {/* Brief Reason removed per instructions */}
                  
                  {submitStatus === 'success' && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-center text-sm font-medium">
                      Nomination submitted successfully!
                    </div>
                  )}
                  {submitStatus === 'error' && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center text-sm font-medium">
                      Failed to submit nomination. Please try again.
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full py-4 mt-2 rounded-xl text-black font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)] ${isSubmitting ? 'bg-[#FFD700]/50 cursor-not-allowed' : 'bg-gradient-to-r from-[#FFD700] to-[#ffaa00] hover:brightness-110'}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Express Interest'}
                  </button>
                  <p className="text-center text-[#FFD700]/70 font-medium text-xs pt-4">Disclaimer: This form is only to Express Interest. The Nomination Submission process will commence after coordinating with our team.</p>
                </form>
              </div>
            </div>
            
            {/* Contact Information Bottom */}
            <div className="relative z-10 mt-20 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-white/50 text-sm">
              <div className="flex items-center gap-6 font-medium">
                <a href="mailto:vikram@coe-nexus.com" className="hover:text-[#FFD700] transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  vikram@coe-nexus.com
                </a>
                <a href="tel:+919560292720" className="hover:text-[#FFD700] transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  +91 9560292720
                </a>
              </div>
              <div className="flex items-center gap-2 font-medium">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                 India
              </div>
            </div>
          </div>
        </section>

        {/* Basic Footer */}
        <footer className="w-full py-8 bg-[#020205] border-t border-white/5 text-center mt-auto">
          <div className="max-w-[85vw] mx-auto flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-1 rounded-full bg-[#FFD700]/30 mb-2"></div>
             <p className="text-white/40 text-xs tracking-widest uppercase font-medium">© {new Date().getFullYear()} CoE Awards. All rights reserved.</p>
             <p className="text-white/30 text-[10px] tracking-wide max-w-lg mt-2 font-light">The Pinnacle of Excellence. Transforming industries through visionary leadership and breakthrough innovation.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
