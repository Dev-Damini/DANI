import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, ImagePlus, Mic, FileText, X, Music, Code2, Globe } from 'lucide-react';
import heroImage from '@/assets/hero-bg.jpg';
import daniLogo from '@/assets/dani-logo.png';
import FeatureCube from '@/components/features/FeatureCube';

export default function HomePage() {
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);

  const handleGetStarted = () => {
    if (!termsAccepted) {
      setShowTermsError(true);
      setTimeout(() => setShowTermsError(false), 3000);
      return;
    }
    navigate('/auth');
  };

  const features = [
    { icon: MessageCircle, title: 'Smart Chat', description: 'Natural conversations with emotional intelligence, web search, and memory', color: 'from-pink-500 to-rose-500' },
    { icon: ImagePlus, title: 'AI Image Studio', description: 'Ultra-realistic images and AI photo editing — generate, inpaint, style swap', color: 'from-purple-500 to-violet-600' },
    { icon: Mic, title: 'Voice AI', description: 'Speak naturally and hear DANI respond with a warm female voice', color: 'from-green-500 to-emerald-500' },
    { icon: Music, title: 'Music Studio', description: 'Generate original AI music tracks from any text description', color: 'from-blue-500 to-cyan-500' },
    { icon: Code2, title: 'Vibe Code', description: 'Build complete websites and apps with DANI AQ in seconds', color: 'from-orange-500 to-amber-500' },
    { icon: Globe, title: 'Video AI', description: 'Text-to-video generation — describe any scene and DANI renders it', color: 'from-red-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={daniLogo} alt="DANI" className="h-10 w-auto" />
          </div>
          <button
            onClick={handleGetStarted}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28">
        <div className="absolute inset-0 opacity-10">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
        {/* Futuristic grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Two-column layout: text + cube */}
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-6 border border-pink-200">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-gray-700">Your Sweet & Supportive AI Companion</span>
            </div>
            
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 border text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(236,72,153,0.08)', borderColor: 'rgba(236,72,153,0.25)', color: '#db2777' }}>
                <Sparkles className="w-3.5 h-3.5" /> Gemini Vision · ElevenLabs Voice · DANI AQ
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-4 leading-none tracking-tight">
                <span className="shimmer-text">Meet DANI</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed">
                Your multi-purpose AI — smart chat, image generation, voice, music creation, and full website building in one place.
              </p>
            
            {/* Terms of Service Checkbox */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <input
                type="checkbox"
                id="terms-hero"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setShowTermsError(false);
                }}
                className="w-5 h-5 accent-pink-500 cursor-pointer"
              />
              <label htmlFor="terms-hero" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-pink-600 font-semibold hover:text-pink-700 underline"
                >
                  Terms of Service
                </button>
              </label>
            </div>

            {showTermsError && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-2xl max-w-md mx-auto">
                <p className="text-sm text-red-700 text-center">Please accept the Terms of Service to continue</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 glass text-gray-700 text-lg rounded-full font-semibold hover:bg-white/80 transition-all"
              >
                Learn More
              </button>
              </div>
            </div>{/* end text col */}

            {/* Feature Cube */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2 animate-float">
              <FeatureCube />
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">6 AI Powers</p>
            </div>
            </div>{/* end two-col */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/40 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              DANI combines powerful AI capabilities with a friendly, supportive personality
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div key={index}
                className="p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group cursor-default border" style={{ background: 'var(--glass-card, rgba(255,255,255,0.8))', borderColor: 'var(--border-subtle, rgba(255,255,255,0.2))' }}
                style={{ '--hover-color': '1' } as React.CSSProperties}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black mb-1.5 text-gray-800">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto glass p-12 rounded-3xl text-center border-2 border-white/30">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Ready to Chat with DANI?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Start your conversation now and experience sweet, supportive AI assistance
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-white/20 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              Created by <span className="text-pink-600 font-semibold">Damini Codesphere</span>
            </p>
            <p className="mt-1">
              Inspired by <span className="text-purple-600 font-semibold">Daniella</span>
            </p>
            <p className="mt-4 text-sm">© 2026 DANI AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-3xl p-8 border-2 border-white/30 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-6 h-6 text-pink-600" />
                Terms of Service
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-white/60 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <p className="text-sm">
                <strong>Last Updated:</strong> June 9, 2026
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">1. Acceptance of Terms</h3>
              <p>
                By using DANI, you agree to these Terms of Service. If you do not agree, please do not use our service.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">2. Description of Service</h3>
              <p>
                DANI (Digital Artificial Neural Intelligence) is an AI assistant providing: natural language chat, image and video generation, voice interaction, AI music creation, website builder (Vibe Code), and character roleplay. Features may be updated at any time.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">3. User Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 13 years old to use DANI</li>
                <li>Do not use DANI for illegal, harmful, or deceptive purposes</li>
                <li>Do not attempt to abuse, hack, or disrupt our service</li>
                <li>Respect intellectual property rights in generated content</li>
                <li>Guest mode offers limited access — create an account to save your work</li>
              </ul>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">4. Content and Privacy</h3>
              <p>
                Generated images, websites, and conversations are processed through our AI systems. We do not claim ownership of your content, but we may process it to provide our services. Please do not share sensitive personal information.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">5. Limitations of Liability</h3>
              <p>
                DANI is provided "as is" without warranties. We are not liable for any damages resulting from use of our service, including but not limited to AI-generated content errors or service interruptions.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">6. Changes to Terms</h3>
              <p>
                We may update these terms at any time. Continued use of DANI after changes constitutes acceptance of new terms.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">7. Contact</h3>
              <p>
                For questions or concerns, please contact: <strong>contact@damicodesphere.com</strong>
              </p>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTerms(false);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg"
              >
                Accept Terms
              </button>
              <button
                onClick={() => setShowTerms(false)}
                className="px-6 py-3 glass rounded-2xl font-medium text-gray-700 hover:bg-white/60 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
