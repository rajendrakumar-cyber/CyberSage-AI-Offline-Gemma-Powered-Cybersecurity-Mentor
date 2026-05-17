import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  FlaskConical, 
  Send, 
  Upload, 
  History, 
  ShieldCheck,
  ChevronRight,
  BrainCircuit,
  Lock,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Zap,
  Target,
  LogOut,
  User,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  hasFile?: boolean;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Chat/Analysis State
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
      if (user) {
        fetchHistory(user);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  const fetchHistory = async (currentUser: FirebaseUser) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formattedHistory = data.map((item: any) => ({
          role: 'assistant', // Assuming history always shows assistant replies to user prompts
          content: item.response,
          timestamp: new Date(item.timestamp).toLocaleTimeString(),
          hasFile: item.hasFile,
          userPrompt: item.prompt // Optional: store user prompt to show full conversation
        }));
        // For simplicity in this UI, we just show the assistant responses as messages
        // A better approach would be interleaving user/assistant pairs
        const interleaved: Message[] = [];
        data.reverse().forEach((item: any) => {
          interleaved.push({
            role: 'user',
            content: item.prompt,
            timestamp: new Date(item.timestamp).toLocaleTimeString(),
            hasFile: item.hasFile
          });
          interleaved.push({
            role: 'assistant',
            content: item.response,
            timestamp: new Date(item.timestamp).toLocaleTimeString()
          });
        });
        setMessages(interleaved);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (showAuth === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMessages([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const askCyberSage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() && !file) return;
    if (!user) return;

    const currentPrompt = prompt;
    const currentFile = file;
    
    const newUserMessage: Message = {
      role: 'user',
      content: currentPrompt || "[Analyzing Uploaded File]",
      timestamp: new Date().toLocaleTimeString(),
      hasFile: !!currentFile
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setPrompt('');
    setFile(null);
    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('text_prompt', currentPrompt);
    if (currentFile) {
      formData.append('file', currentFile);
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to connect to mentor engine');

      const data = await res.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Error linking to local analysis node.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ShieldAlert className="w-12 h-12 text-brand-primary animate-pulse" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Initializing Secure Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20 mb-4">
              <ShieldAlert className="text-brand-primary w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">CyberSage AI</h2>
            <p className="text-slate-500 text-sm">Access the Offline Mentor Hub</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Secure ID (Email)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-all outline-none"
                  placeholder="name@agency.gov"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">Access Key (Password)</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[11px] leading-relaxed">
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-brand-primary text-brand-bg font-bold py-3 rounded-xl text-sm uppercase tracking-widest hover:bg-brand-primary/90 transition-all mt-4"
            >
              {showAuth === 'login' ? 'Authenticate' : 'Initialize Agent'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-brand-border text-center">
            <button 
              onClick={() => setShowAuth(showAuth === 'login' ? 'register' : 'login')}
              className="text-xs text-slate-500 hover:text-brand-primary transition-colors"
            >
              {showAuth === 'login' ? "Don't have an access ID? Register here" : "Already have an ID? Proceed to login"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-[#f8fafc] font-sans selection:bg-amber-500/30">
      {/* Artisanal Header */}
      <header className="h-20 border-b border-white/5 bg-[#020617] px-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <ShieldAlert className="text-amber-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
              THE SAGE
              <span className="text-[9px] bg-slate-800 text-slate-400 border border-white/10 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                Field Instance
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wide">PRIVATE SECURITY MENTOR // EST. 2024</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Neural Status</span>
              <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: ["20%", "60%", "45%", "80%"] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="h-full bg-amber-500" 
                />
              </div>
            </div>
            <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">Synchronized & Stable</span>
          </div>
          
          <div className="flex items-center gap-4 pl-8 border-l border-white/5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-white mb-0.5">{user.email?.split('@')[0]}</span>
              <span className="text-[8px] font-mono text-slate-500 uppercase">Agent Identity Validated</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all border border-white/5"
              title="Terminate Secure Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Handcrafted List */}
        <aside className="w-64 bg-[#020617] flex flex-col p-6 gap-10 overflow-y-auto border-r border-white/5">
          <div>
            <label className="text-[9px] uppercase font-bold text-slate-600 tracking-[0.2em] mb-6 block border-b border-white/5 pb-2">Manifest History</label>
            <div className="space-y-3">
              {messages.filter(m => m.role === 'user').slice(-8).map((m, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-center gap-3 text-slate-500 group-hover:text-amber-500 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-amber-500 transition-colors" />
                    <span className="text-[11px] font-mono font-bold leading-none">LOG_{i + 102}</span>
                  </div>
                  <div className="pl-4.5 text-[10px] text-slate-600 mt-1 truncate max-w-full">
                    {m.content.slice(0, 24)}...
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-[10px] text-slate-700 italic font-serif">No signals recorded yet.</div>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-3 text-center group hover:bg-white/[0.04] transition-all">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-white/5 group-hover:border-amber-500/20">
                <ShieldCheck className="w-5 h-5 text-slate-600 group-hover:text-amber-500" />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-serif">All traffic is encrypted and analyzed on your local node. No data leakage detected.</p>
            </div>
          </div>
        </aside>

        {/* Center: The Sage's Interactive Desk */}
        <div className="flex-1 flex flex-col bg-[#020617] overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-10 space-y-12 scroll-smooth"
          >
            {messages.length === 0 && !isAnalyzing && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="relative w-24 h-24 bg-[#020617] rounded-3xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                  >
                    <BrainCircuit className="text-amber-500 w-12 h-12" />
                  </motion.div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-4xl font-serif text-white tracking-tight italic">How can I guide your craft today?</h2>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                    I am the Sage. Upload your server logs or paste a logic problem. I will teach you the way of the defense.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-4">
                  {['Dictionary Attacks', 'SQLi Defense', 'Nmap Logic', 'SSH Hardening'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setPrompt(`Guide me on ${tag} logic: `)}
                      className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-amber-500/40 hover:text-white hover:bg-white/10 transition-all text-center"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto w-full space-y-12 pb-20">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className={msg.role === 'assistant' ? 'space-y-8' : 'flex justify-end'}
                >
                  {msg.role === 'user' ? (
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 max-w-[80%] shadow-2xl relative group">
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 opacity-0 group-hover:opacity-100 transition-all">
                        <Terminal className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-sm font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="bg-[#020617] border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sage Response Node</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-700 tracking-tighter italic">TS-ID: {idx.toString().padStart(4, '0')} // LOCAL_SYNC</div>
                      </div>
                      
                      <div className="p-8 space-y-8 font-sans">
                        <div className="text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap font-serif italic">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-amber-500 animate-bounce" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Inhabiting the Context Loop...</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-700">SIG_INT_RECV</span>
                  </div>
                  <div className="w-full h-0.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                      initial={{ width: "0%" }}
                      animate={{ width: "95%" }}
                      transition={{ duration: 12, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Handcrafted Input Hub */}
          <div className="p-10 bg-[#020617] border-t border-white/5">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute inset-0 bg-amber-500/5 blur-2xl rounded-3xl" />
              <div className="relative bg-[#020617] border border-white/10 rounded-3xl p-5 shadow-2xl focus-within:border-amber-500/30 transition-all duration-500">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Tell me what you're seeing in the field..."
                  className="w-full bg-transparent text-[15px] font-serif text-slate-200 h-28 resize-none outline-none placeholder-slate-800 p-2"
                />
                <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-2">
                  <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        file ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {file ? 'Signal Attached' : 'Attach Manifest'}
                    </button>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end hidden sm:flex">
                      <span className="text-[8px] font-black text-slate-700 uppercase tracking-tighter">Instance Auth</span>
                      <span className="text-[10px] font-mono text-slate-500 leading-none">{user.uid.slice(0, 12)}</span>
                    </div>
                    <button 
                      onClick={() => askCyberSage()}
                      disabled={isAnalyzing || (!prompt.trim() && !file)}
                      className="px-10 py-3 bg-amber-500 text-[#020617] font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-20 transition-all"
                    >
                      Dispatch Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Roadmap: Artisanal Detail */}
        <aside className="w-80 bg-[#020617] border-l border-white/5 flex flex-col p-8 space-y-12 overflow-y-auto">
          <div>
            <label className="text-[9px] uppercase font-bold text-slate-600 tracking-[0.2em] mb-6 block border-b border-white/5 pb-2">Field Telemetry</label>
            <div className="space-y-4">
              {[
                { label: 'Local Latency', val: '0.04ms', icon: Zap },
                { label: 'Neural Entropy', val: 'Low', icon: ShieldCheck },
                { label: 'Thread Safety', val: 'Tier 1', icon: Lock },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 group-hover:text-amber-500 transition-colors">
                    <stat.icon className="w-3.5 h-3.5" /> 
                    <span className="font-mono">{stat.label}</span>
                  </div>
                  <div className="text-[11px] font-black text-slate-300 font-mono">{stat.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-slate-600 tracking-[0.2em] mb-8 block border-b border-white/5 pb-2">The Mentor's Path</label>
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6">
              <div className="space-y-1">
                <div className="text-[11px] font-black text-white uppercase tracking-wider">Foundations</div>
                <div className="text-[9px] text-slate-500 font-mono">Agent Induction Course</div>
              </div>
              <div className="space-y-3">
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500/60 w-1/2 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 font-bold tracking-widest">
                  <span>PHASE 01: 50%</span>
                  <span>SYNCING...</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 italic text-[8px] font-serif text-amber-500">TOP_SECRET</div>
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Target className="w-3 h-3" /> Next Objective
            </div>
            <div className="text-sm font-serif italic text-slate-200">Manual Log Reconstruction</div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-serif">Learn to identify automated patterns that simple regex might ignore.</p>
            <button className="w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/20 transition-all">Begin Practice</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

