import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export default function VoiceTab() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setBrowserSupport(false);
      return;
    }

    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      // Process final result
      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        handleVoiceInput(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleVoiceInput = async (text: string) => {
    if (!text || !text.trim()) {
      setIsProcessing(false);
      return;
    }
    
    setIsProcessing(true);
    console.log('Voice input received:', text);
    
    // Check for voice commands
    const lowerText = text.toLowerCase();
    
    // Navigation commands
    if (lowerText.includes('switch to chat') || lowerText.includes('open chat')) {
      speakTextWithAPI("Switching to chat tab!");
      setTimeout(() => {
        // Trigger tab change - you'll need to pass this down from parent
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'chat' }));
      }, 1500);
      setIsProcessing(false);
      return;
    }
    
    if (lowerText.includes('switch to image') || lowerText.includes('open image')) {
      speakTextWithAPI("Switching to image generation!");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'image' }));
      }, 1500);
      setIsProcessing(false);
      return;
    }
    
    // Image generation command
    if (lowerText.includes('generate image') || lowerText.includes('create image')) {
      const imagePrompt = text.replace(/generate image (of|about)?/i, '').replace(/create image (of|about)?/i, '').trim();
      if (imagePrompt) {
        speakTextWithAPI(`Creating an image of ${imagePrompt}. This will take a moment!`);
        window.dispatchEvent(new CustomEvent('generate-image', { detail: imagePrompt }));
        setIsProcessing(false);
        return;
      }
    }
    
    // History command
    if (lowerText.includes('show history') || lowerText.includes('my history')) {
      speakTextWithAPI("Opening your chat history!");
      window.dispatchEvent(new CustomEvent('show-history'));
      setIsProcessing(false);
      return;
    }
    
    // New chat command
    if (lowerText.includes('new chat') || lowerText.includes('start new conversation')) {
      speakTextWithAPI("Starting a new conversation!");
      window.dispatchEvent(new CustomEvent('new-chat'));
      setIsProcessing(false);
      return;
    }
    
    try {
      // Call AI chat API
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: [
            { role: 'user', content: text }
          ],
          conversationId: null
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      const aiResponse = data.message;
      console.log('AI response:', aiResponse);
      setResponse(aiResponse);
      setIsProcessing(false);
      
      // Speak the response using external TTS API
      await speakTextWithAPI(aiResponse);
    } catch (error) {
      console.error('Error:', error);
      const errorResponse = "Sorry, I had trouble processing that. Please try again! 💕";
      setResponse(errorResponse);
      setIsProcessing(false);
      await speakTextWithAPI(errorResponse);
    }
  };

  const speakTextWithAPI = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Call external TTS API with pitch parameter
      const pitch = 1.2; // Higher pitch for feminine voice
      const ttsUrl = `https://apis.prexzyvilla.site/tts/tts-adult-female--1-american-english-truvoice?text=${encodeURIComponent(text)}&pitch=${pitch}`;
      
      const response = await fetch(ttsUrl);
      
      if (!response.ok) {
        throw new Error('TTS API request failed');
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      // Fallback to browser TTS
      speakTextFallback(text);
    }
  };

  const speakTextFallback = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Samantha') || 
      voice.name.includes('Victoria') ||
      voice.name.includes('Karen')
    ) || voices.find(voice => voice.lang === 'en-US');
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Stop any ongoing speech
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
      setTranscript('');
      setResponse('');
      setIsProcessing(false);
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Started listening...');
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (!browserSupport) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-12 border-2 border-white/30 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <MicOff className="w-10 h-10 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-3">Voice Not Supported</h3>
          <p className="text-gray-600">
            Your browser doesn't support voice features. Please use Chrome, Edge, or Safari for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="glass rounded-3xl p-8 md:p-12 border-2 border-white/30 text-center">
          {/* Voice Visualizer */}
          <div className="mb-8">
            <div className="relative w-48 h-48 mx-auto">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 ${isListening || isSpeaking ? 'animate-pulse-glow' : 'opacity-50'}`}></div>
              <div className="absolute inset-4 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                {isListening ? (
                  <Mic className="w-20 h-20 text-pink-600" />
                ) : isSpeaking ? (
                  <Volume2 className="w-20 h-20 text-purple-600" />
                ) : (
                  <Mic className="w-20 h-20 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Voice Conversation'}
            </h2>
            <p className="text-gray-600">
              {isListening ? 'Say something to DANI' : isSpeaking ? 'DANI is responding' : 'Click the microphone to start talking'}
            </p>
          </div>

          {/* Transcript and Response */}
          {(transcript || response) && (
            <div className="mb-6 space-y-4">
              {transcript && (
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-4 text-left">
                  <p className="text-sm font-semibold mb-1">You said:</p>
                  <p className="text-base">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-left border border-pink-200">
                  <p className="text-sm font-semibold text-gray-600 mb-1">DANI:</p>
                  <p className="text-base text-gray-800">{response}</p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={toggleListening}
              disabled={isSpeaking || isProcessing}
              className={`px-8 py-4 rounded-full font-semibold text-white transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
              }`}
            >
              {isListening ? (
                <>
                  <Square className="w-5 h-5 inline mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 inline mr-2" />
                  Start Talking
                </>
              )}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-8 py-4 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <VolumeX className="w-5 h-5 inline mr-2" />
                Stop Speaking
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Speak naturally and I'll respond with my voice 💕
          </p>
        </div>
      </div>
    </div>
  );
}
