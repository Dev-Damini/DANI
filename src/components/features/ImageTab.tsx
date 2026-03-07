import { useState, useEffect } from 'react';
import { Wand2, Download, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { GeneratedImage } from '@/types';

export default function ImageTab() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<'realistic' | 'artistic' | 'anime' | 'abstract'>('realistic');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const styles = [
    { id: 'realistic', label: 'Realistic', icon: '📸' },
    { id: 'artistic', label: 'Artistic', icon: '🎨' },
    { id: 'anime', label: 'Anime', icon: '✨' },
    { id: 'abstract', label: 'Abstract', icon: '🌈' }
  ];

  const presets = [
    { 
      id: 'portrait', 
      label: 'Portrait', 
      icon: '👤',
      prompt: 'professional portrait photography, studio lighting, high quality, detailed face',
      style: 'realistic'
    },
    { 
      id: 'landscape', 
      label: 'Landscape', 
      icon: '🏞️',
      prompt: 'beautiful landscape photography, golden hour lighting, scenic view, ultra high resolution',
      style: 'realistic'
    },
    { 
      id: 'product', 
      label: 'Product Shot', 
      icon: '📦',
      prompt: 'professional product photography, clean white background, studio lighting, commercial quality',
      style: 'realistic'
    },
    { 
      id: 'logo', 
      label: 'Logo Design', 
      icon: '🎯',
      prompt: 'modern minimalist logo design, clean vector style, professional branding',
      style: 'artistic'
    },
    { 
      id: 'fantasy', 
      label: 'Fantasy Art', 
      icon: '🔮',
      prompt: 'fantasy art illustration, magical atmosphere, epic composition, detailed artwork',
      style: 'artistic'
    },
    { 
      id: 'anime-char', 
      label: 'Anime Character', 
      icon: '🌸',
      prompt: 'anime character design, colorful vibrant style, expressive eyes, detailed clothing',
      style: 'anime'
    }
  ];

  useEffect(() => {
    checkAuth();
    fetchImages();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setPrompt(preset.prompt);
    setSelectedStyle(preset.style as any);
    setSelectedPreset(preset.id);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image-ai', {
        body: {
          prompt: prompt,
          style: selectedStyle
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

      console.log('Generated image:', data);
      
      // Add the image to the list
      if (data && data.image) {
        setImages(prev => [data.image, ...prev]);
        setPrompt('');
        setSelectedPreset(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (image: GeneratedImage) => {
    if (!confirm('Delete this image?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('generated-images')
        .remove([image.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      setImages(prev => prev.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };



  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4">
      {/* Input Section */}
      <div className="mb-8">
        {/* Style Presets */}
        <div className="glass rounded-3xl p-6 border-2 border-white/30 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Quick Presets</label>
          <div className="flex gap-3 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  selectedPreset === preset.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'bg-white/60 text-gray-600 hover:bg-white/80'
                }`}
              >
                <span className="mr-2">{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border-2 border-white/30 mb-4">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Choose Style</label>
            <div className="flex gap-3 flex-wrap">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id as any)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedStyle === style.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                      : 'bg-white/60 text-gray-600 hover:bg-white/80'
                  }`}
                >
                  <span className="mr-2">{style.icon}</span>
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the image you want to create... (e.g., 'a magical forest with glowing mushrooms at sunset')"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-200 outline-none focus:border-pink-400 text-gray-800 placeholder-gray-400 resize-none h-24"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <Wand2 className="w-5 h-5" />
              Generate
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="glass rounded-2xl p-6 border-2 border-white/30 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
              <p className="text-lg font-semibold text-gray-700">Creating your image...</p>
            </div>
            <p className="text-gray-500">This may take a few moments</p>
          </div>
        )}
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Creations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="glass rounded-2xl overflow-hidden border-2 border-white/30 hover:shadow-xl transition-all group">
                <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 relative">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDelete(image)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{image.prompt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(image.created_at).toLocaleString()}
                    </span>
                    <a
                      href={image.image_url}
                      download
                      className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wand2 className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No images yet</h3>
            <p className="text-gray-500 max-w-md">
              Describe what you want to see and I'll create it for you! ✨
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
