import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, ImagePlus, Mic } from 'lucide-react';
import heroImage from '@/assets/hero-bg.jpg';
import daniLogo from '@/assets/dani-logo.png';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageCircle,
      title: 'Chat with DANI',
      description: 'Have natural conversations about anything - get help, advice, or just friendly chat'
    },
    {
      icon: ImagePlus,
      title: 'Generate Images',
      description: 'Create stunning images from your descriptions - art, photos, illustrations, and more'
    },
    {
      icon: Mic,
      title: 'Voice Conversation',
      description: 'Talk to DANI naturally with voice input and hear responses spoken back to you'
    }
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
            onClick={() => navigate('/chat')}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Chatting
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 opacity-20">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-6 border border-pink-200">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-gray-700">Your Sweet & Supportive AI Companion</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Meet DANI
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
              Your multi-purpose AI helper for chat, creativity, and productivity. 
              I'm here to support you with conversation, image generation, and voice interaction.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/chat')}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Start Conversation
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

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass p-8 rounded-3xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-white/30"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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
              onClick={() => navigate('/chat')}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              Launch DANI
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
              Sponsored by <span className="text-purple-600 font-semibold">Daniella</span>
            </p>
            <p className="mt-4 text-sm">© 2026 DANI AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
