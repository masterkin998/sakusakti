/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Power, 
  ChevronRight, 
  History, 
  Users, 
  ShieldAlert, 
  MessageSquare, 
  UserPlus, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle,
  PiggyBank,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Send,
  Loader2,
  Info,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Student, HistoryItem } from './types.ts';

// Storage Keys
const STORAGE_KEY = 'sakusakti_v3_data';

// Initial Data
const INITIAL_DATA: Student[] = [
  { nis: "2024001", nama: "Ahmad Fauzi", saldo: 1500000, role: "user", pass: "123456", history: [] },
  { nis: "2024002", nama: "Siti Aminah", saldo: 750000, role: "user", pass: "123456", history: [] },
  { nis: "admin", nama: "Super Admin", saldo: 0, role: "admin", pass: "admin123", history: [] }
];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auth State
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin UI State
  const [adminTab, setAdminTab] = useState<'transaksi' | 'data' | 'saktiai' | 'sistem'>('transaksi');
  const [userTab, setUserTab] = useState<'home' | 'history' | 'saktiai' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [modalType, setModalType] = useState<'none' | 'reg' | 'confirm_trx' | 'info' | 'cs' | 'logout' | 'success_trx' | 'success_reg' | 'error' | 'detail'>('none');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingTrx, setPendingTrx] = useState<HistoryItem | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // Transaction Form
  const [trxNis, setTrxNis] = useState('');
  const [trxNominal, setTrxNominal] = useState('');
  const [trxKet, setTrxKet] = useState('');
  const [trxType, setTrxType] = useState<'Masuk' | 'Keluar'>('Masuk');

  // Registration Form
  const [regNis, setRegNis] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regPass, setRegPass] = useState('');

  // SaktiAI State
  const [chatMessages, setChatMessages] = useState<{ text: string, isUser: boolean }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync Chat History when Current User changes
  useEffect(() => {
    if (currentUser) {
      setChatMessages(currentUser.chatHistory || []);
    } else {
      setChatMessages([]);
    }
  }, [currentUser?.nis]);

  // Initialize
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setStudents(JSON.parse(stored));
    } else {
      setStudents(INITIAL_DATA);
    }
    setIsReady(true);
  }, []);

  // Persistence
  useEffect(() => {
    if (isReady) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    }
  }, [students, isReady]);

  // Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPass) {
      setErrorMessage("ID Pengguna dan Kata Sandi wajib diisi!");
      setModalType('error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user = students.find(s => s.nis === loginId);
      if (user && user.pass === loginPass) {
        setCurrentUser(user);
        setLoginId('');
        setLoginPass('');
        if (user.role === 'admin') {
          setAdminTab('transaksi');
        } else {
          setUserTab('home');
        }
      } else {
        setErrorMessage("ID atau Kata Sandi salah!");
        setModalType('error');
      }
    }, 1000);
  };

  const handleLogout = () => {
    setIsLoading(true);
    setModalType('none');
    setTimeout(() => {
      setCurrentUser(null);
      setIsLoading(false);
    }, 800);
  };

  const handleProcessTransaction = () => {
    if (!trxNis || !trxNominal) {
      setErrorMessage("Nasabah dan Nominal harus diisi!");
      setModalType('error');
      return;
    }
    const nominal = parseInt(trxNominal);
    const student = students.find(s => s.nis === trxNis);
    
    if (trxType === 'Keluar' && student && nominal > student.saldo) {
      setErrorMessage("Saldo nasabah tidak mencukupi!");
      setModalType('error');
      return;
    }

    setPendingTrx({
      nis: trxNis,
      nominal: nominal,
      type: trxType,
      ket: trxKet || (trxType === 'Masuk' ? 'Setor Tunai' : 'Tarik Tunai'),
      tgl: new Date().toLocaleString('id-ID'),
      studentName: student?.nama
    });
    setModalType('confirm_trx');
  };

  const finalizeTransaction = () => {
    if (!pendingTrx) return;
    setIsLoading(true);
    setModalType('none');
    setTimeout(() => {
      setStudents(prev => prev.map(s => {
        if (s.nis === pendingTrx.nis) {
          const newSaldo = pendingTrx.type === 'Masuk' ? s.saldo + pendingTrx.nominal : s.saldo - pendingTrx.nominal;
          return {
            ...s,
            saldo: newSaldo,
            history: [pendingTrx, ...s.history]
          };
        }
        return s;
      }));
      setModalType('success_trx');
      setTrxNis('');
      setTrxNominal('');
      setTrxKet('');
      setIsLoading(false);
    }, 1000);
  };

  const handleRegistrasi = () => {
    if (!regNis || !regNama || !regPass) {
      setErrorMessage("Semua data registrasi wajib diisi!");
      setModalType('error');
      return;
    }
    if (students.some(s => s.nis === regNis)) {
      setErrorMessage("NIS sudah terdaftar!");
      setModalType('error');
      return;
    }

    setIsLoading(true);
    setModalType('none');
    setTimeout(() => {
      const newStudent: Student = {
        nis: regNis,
        nama: regNama,
        pass: regPass,
        saldo: 0,
        role: 'user',
        history: [{ nis: regNis, nominal: 0, type: 'Masuk', ket: 'Pembukaan Rekening', tgl: new Date().toLocaleString('id-ID') }]
      };
      setStudents([...students, newStudent]);
      setModalType('success_reg');
      setRegNis('');
      setRegNama('');
      setRegPass('');
      setIsLoading(false);
    }, 1000);
  };

  const callSaktiAi = async () => {
    if (!aiInput.trim() || !currentUser) return;
    const msg = aiInput.trim();
    setAiInput('');
    
    const newUserMsg = { text: msg, isUser: true };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setIsTyping(true);

    // Save locally
    updateStudentChatHistory(currentUser.nis, updatedMessages);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: msg,
        config: {
          systemInstruction: `Anda adalah asisten AI ramah bernama SaktiAI. Anda sedang berbicara dengan ${currentUser.nama}. Fokus pada manajemen keuangan sekolah.`
        }
      });
      const text = response.text || "Maaf, saya tidak mengerti.";
      const newAiMsg = { text, isUser: false };
      const finalMessages = [...updatedMessages, newAiMsg];
      setChatMessages(finalMessages);
      updateStudentChatHistory(currentUser.nis, finalMessages);
    } catch (error) {
      setChatMessages(prev => [...prev, { text: "Gagal terhubung ke SaktiAI server.", isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  const updateStudentChatHistory = (nis: string, history: { text: string, isUser: boolean }[]) => {
    setStudents(prev => prev.map(s => {
      if (s.nis === nis) {
        return { ...s, chatHistory: history };
      }
      return s;
    }));
  };

  const formatCurrency = (val: number) => "Rp " + val.toLocaleString('id-ID');

  if (!isReady) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen relative md:max-w-xl font-sans overflow-x-hidden">
      {/* Global Loader */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-xl z-[400] flex flex-col items-center justify-center"
          >
            <Loader2 className="w-12 h-12 text-apple-blue animate-spin mb-4" />
            <p className="font-bold text-slate-500 animate-pulse tracking-widest text-[10px] uppercase">Menyimpan Data...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.section 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div className="w-full bg-white/40 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">SakuSakti</h1>
                <p className="text-slate-500 font-medium mt-2">Masuk ke buku tabungan digital</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">ID Pengguna</label>
                  <input 
                    type="text" 
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-700 placeholder:text-slate-300" 
                    placeholder="Masukkan NIS / Admin ID"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Kata Sandi</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-700 placeholder:text-slate-300" 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all transform mt-2"
                >
                  MASUK SEKARANG
                </button>
              </form>

              <div className="pt-4 text-center">
                <p className="text-[14px] font-bold text-slate-400">SakuSakti V3.1</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">KinDEV &copy; 2026</p>
              </div>
            </div>
          </motion.section>
        ) : currentUser.role === 'admin' ? (
          /* ADMIN VIEW */
          <motion.section 
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-32 bg-transparent"
          >
            <header className="sticky top-0 z-50 p-4 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-3 bg-white/40 p-1.5 pr-4 rounded-full border border-white/50 backdrop-blur-md">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-extrabold text-sm tracking-tight text-slate-800">SakuSakti Admin</span>                    
              </div>
              <button 
                onClick={() => setModalType('logout')}
                className="w-10 h-10 glass-panel flex items-center justify-center text-red-500 active:scale-90 transition-transform"
              >
                <Power className="w-5 h-5" />
              </button>
            </header>

            <main className="p-4">
              <AnimatePresence mode="wait">
                {adminTab === 'transaksi' && (
                  <motion.div key="trx" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-1">
                    <div className="glass-panel p-6 space-y-5">
                      <h2 className="text-md font-bold text-blue-900 flex items-center gap-2">
                        <ArrowUpCircle className="w-5 h-5 text-blue-500" /> Transaksi Baru
                      </h2>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-blue-400 uppercase ml-2 tracking-wider">Nasabah</label>
                          <select 
                            value={trxNis}
                            onChange={(e) => setTrxNis(e.target.value)}
                            className="input-glass w-full p-4 outline-none font-medium text-blue-900 bg-white/40"
                          >
                            <option value="">-- Pilih Nasabah --</option>
                            {students.filter(s => s.role === 'user').map(s => (
                              <option key={s.nis} value={s.nis}>{s.nama} ({s.nis})</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white/30 border border-white/50 rounded-2xl p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-blue-500 uppercase">Saldo Nasabah</span>
                            <span className="text-sm font-black text-blue-900">
                              {trxNis ? formatCurrency(students.find(s => s.nis === trxNis)?.saldo || 0) : 'Rp 0'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setTrxType('Masuk')}
                            className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all ${trxType === 'Masuk' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white/30 text-blue-900 border border-white/50'}`}
                          >
                            SETOR
                          </button>
                          <button 
                            onClick={() => setTrxType('Keluar')}
                            className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all ${trxType === 'Keluar' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white/30 text-blue-900 border border-white/50'}`}
                          >
                            TARIK
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-blue-400 uppercase ml-2 tracking-wider">Nominal</label>
                          <input 
                            type="number" 
                            value={trxNominal}
                            onChange={(e) => setTrxNominal(e.target.value)}
                            className="input-glass w-full p-4 text-xl font-black outline-none bg-white/40" 
                            placeholder="Rp 0"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-blue-400 uppercase ml-2 tracking-wider">Keterangan</label>
                          <input 
                            type="text" 
                            value={trxKet}
                            onChange={(e) => setTrxKet(e.target.value)}
                            className="input-glass w-full p-4 outline-none text-blue-900 text-sm bg-white/40" 
                            placeholder="Contoh: Tabungan Mingguan"
                          />
                        </div>

                        <button 
                          onClick={handleProcessTransaction}
                          className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-sm"
                        >
                          Proses Transaksi
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {adminTab === 'data' && (
                  <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="glass-panel p-6 space-y-5 min-h-[500px]">
                      <h2 className="text-md font-bold text-blue-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" /> Daftar Nasabah
                      </h2>
                      <div className="flex items-center px-5 py-3 gap-3 rounded-full border border-white/60 bg-white/40">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari nama atau NIS..." 
                          className="bg-transparent w-full outline-none text-blue-900 font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {students.filter(s => s.role === 'user' && (s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery))).map(s => (
                          <div 
                            key={s.nis}
                            onClick={() => {
                              setSelectedStudentForDetail(s);
                              setModalType('detail');
                            }}
                            className="p-4 bg-white/50 border border-white rounded-[1.8rem] flex justify-between items-center cursor-pointer active:scale-95 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">
                                {s.nama.charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 text-sm">{s.nama}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{s.nis}</p>
                              </div>
                            </div>
                            <p className="text-xs font-black text-blue-600">{formatCurrency(s.saldo)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {adminTab === 'saktiai' && (
                  <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="glass-panel p-4 h-[450px] flex flex-col">
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div className="bg-white/70 border border-white/50 text-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm text-xs leading-relaxed max-w-[85%]">
                            Halo! Saya SaktiAI. Ada yang bisa saya bantu terkait tabungan atau fitur SakuSakti hari ini?
                          </div>
                        </div>
                        {chatMessages.map((m, idx) => (
                          <div key={idx} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                            {!m.isUser && (
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Smartphone className="w-5 h-5" />
                              </div>
                            )}
                            <div className={`${m.isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/70 border border-white/50 text-slate-700 rounded-tl-none'} p-3 rounded-2xl shadow-sm text-xs leading-relaxed max-w-[85%]`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="bg-white/70 border border-white/50 text-blue-500 p-3 rounded-2xl rounded-tl-none text-[10px] font-bold uppercase tracking-widest animate-pulse">
                              SaktiAI sedang berpikir...
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </div>
                    <div className="glass-panel p-2 flex items-center gap-2">
                      <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && callSaktiAi()}
                        placeholder="Tanya SaktiAI..." 
                        className="flex-1 bg-white/50 border border-white/80 rounded-full px-5 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-all"
                      />
                      <button 
                        onClick={callSaktiAi}
                        className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-transform"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {adminTab === 'sistem' && (
                  <motion.div key="sys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                     <div className="glass-panel p-8 space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-3 border-4 border-white/50">
                                A
                            </div>
                            <h2 className="text-lg font-black text-blue-900">Administrator Utama</h2>
                            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">SakuSakti v3.1</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="stat-card p-4 text-center">
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Total Siswa</p>
                                <p className="text-lg font-black text-blue-900">{students.filter(s => s.role === 'user').length}</p>
                            </div>
                            <div className="stat-card p-4 text-center">
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Total Saldo</p>
                                <p className="text-sm font-black text-blue-600 truncate">{formatCurrency(students.reduce((acc, s) => acc + s.saldo, 0))}</p>
                            </div>
                        </div>                                             

                        <div className="space-y-2">
                            <button onClick={() => setModalType('info')} className="w-full flex items-center justify-between p-4 stat-card active:scale-95 transition-all">
                                <div className="flex items-center gap-3">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-bold text-blue-900">Info Sistem</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                            
                            <button onClick={() => setModalType('cs')} className="w-full flex items-center justify-between p-4 stat-card active:scale-95 transition-all">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-bold text-blue-900">Bantuan CS</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                            
                             <button onClick={() => setModalType('reg')} className="w-full flex items-center justify-between p-4 stat-card active:scale-95 transition-all">
                                <div className="flex items-center gap-3">
                                    <UserPlus className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-bold text-blue-900">Registrasi</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                            
                            <button onClick={() => setModalType('logout')} className="w-full flex items-center justify-between p-4 stat-card active:scale-95 transition-all border-red-50/50">
                                <div className="flex items-center gap-3 text-red-500">
                                    <Power className="w-4 h-4" />
                                    <span className="text-sm font-bold">Keluar Sesi</span>
                                </div>
                            </button>
                        </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <nav className="fixed nav-glass">
              <NavButton active={adminTab === 'transaksi'} onClick={() => setAdminTab('transaksi')} icon={<History className="w-5 h-5" />} label="Transaksi" />
              <NavButton active={adminTab === 'data'} onClick={() => setAdminTab('data')} icon={<Users className="w-5 h-5" />} label="Nasabah" />
              <NavButton active={adminTab === 'saktiai'} onClick={() => setAdminTab('saktiai')} icon={<Smartphone className="w-5 h-5" />} label="SaktiAI" />
              <NavButton active={adminTab === 'sistem'} onClick={() => setAdminTab('sistem')} icon={<ShieldAlert className="w-5 h-5" />} label="Sistem" />
            </nav>
          </motion.section>
        ) : (
          /* USER VIEW */
          <motion.section 
            key="user"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-32"
          >
            <header className="sticky top-0 z-50 p-4 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-2 bg-white/40 p-1.5 pr-4 rounded-full border border-white/50 backdrop-blur-md">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-extrabold text-sm tracking-tight text-slate-800">SakuSakti</span>                    
              </div>
              <button 
                onClick={() => setModalType('logout')}
                className="w-10 h-10 glass-panel flex items-center justify-center text-red-500 active:scale-90 transition-transform"
              >
                <Power className="w-5 h-5" />
              </button>
            </header>

            <main className="p-4 space-y-4">
              <AnimatePresence mode="wait">
                {userTab === 'home' && (
                  <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="glass-panel bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Saldo Anda</p>
                        <h2 className="text-4xl font-black mb-8">{formatCurrency(currentUser.saldo)}</h2>
                        <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md w-fit px-5 py-2.5 rounded-2xl border border-white/10">
                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-bold tracking-tight">{currentUser.nama}</span>
                        </div>
                      </div>
                      <PiggyBank className="absolute -bottom-8 -right-8 text-white/10 w-40 h-40 rotate-12" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setModalType('info')} className="glass-panel p-6 flex flex-col items-center justify-center text-center active:scale-95 transition-all">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                          <Info className="w-6 h-6" />                    
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Info Sistem</span>               
                      </button>
                      
                      <button onClick={() => setModalType('cs')} className="glass-panel p-6 flex flex-col items-center justify-center text-center active:scale-95 transition-all">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6" />                    
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Bantuan CS</span>               
                      </button>
                    </div>
                  </motion.div>
                )}

                {userTab === 'history' && (
                  <motion.div key="hist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 px-2">
                      <History className="w-5 h-5 text-blue-500" /> Mutasi Terakhir
                    </h3>
                    <div className="space-y-3">
                      {currentUser.history.length > 0 ? currentUser.history.map((h, idx) => (
                        <div key={idx} className="glass-panel p-5 flex items-center justify-between border-white/60">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${h.type === 'Masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                              {h.type === 'Masuk' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{h.ket}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{h.tgl}</p>
                            </div>
                          </div>
                          <p className={`font-black tracking-tight ${h.type === 'Masuk' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {h.type === 'Masuk' ? '+' : '-'} {formatCurrency(h.nominal)}
                          </p>
                        </div>
                      )) : (
                        <div className="text-center py-20 opacity-30 font-bold text-xs uppercase tracking-widest">Belum ada transaksi</div>
                      )}
                    </div>
                  </motion.div>
                )}

                {userTab === 'saktiai' && (
                  <motion.div key="uai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="glass-panel p-4 h-[450px] flex flex-col">
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div className="bg-white/70 border border-white/50 text-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm text-xs leading-relaxed max-w-[85%]">
                            Halo {currentUser.nama}! Saya SaktiAI. Ada yang bisa saya bantu terkait tabunganmu?
                          </div>
                        </div>
                        {chatMessages.map((m, idx) => (
                          <div key={idx} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                            {!m.isUser && (
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Smartphone className="w-5 h-5" />
                              </div>
                            )}
                            <div className={`${m.isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/70 border border-white/50 text-slate-700 rounded-tl-none'} p-3 rounded-2xl shadow-sm text-xs leading-relaxed max-w-[85%]`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="bg-white/70 border border-white/50 text-blue-500 p-3 rounded-2xl rounded-tl-none text-[10px] font-bold uppercase tracking-widest animate-pulse">
                              SaktiAI sedang berpikir...
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </div>
                    <div className="glass-panel p-2 flex items-center gap-2">
                      <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && callSaktiAi()}
                        placeholder="Tanya SaktiAI..." 
                        className="flex-1 bg-white/50 border border-white/80 rounded-full px-5 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-all"
                      />
                      <button 
                        onClick={callSaktiAi}
                        className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-transform"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {userTab === 'profile' && (
                  <motion.div key="prof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="glass-panel p-10 space-y-8 text-center">
                        <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-4xl font-bold border-4 border-white/50 shadow-xl mb-3">
                            {currentUser.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-blue-900">{currentUser.nama}</h2>
                          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">NIS. {currentUser.nis}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            Siswa Aktif
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium tracking-tight">Terdaftar sejak: 01 Jan 2026</p>
                        </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <nav className="fixed nav-glass">
              <NavButton active={userTab === 'home'} onClick={() => setUserTab('home')} icon={<Wallet className="w-5 h-5" />} label="Home" />
              <NavButton active={userTab === 'history'} onClick={() => setUserTab('history')} icon={<History className="w-5 h-5" />} label="Riwayat" />
              <NavButton active={userTab === 'saktiai'} onClick={() => setUserTab('saktiai')} icon={<Smartphone className="w-5 h-5" />} label="SaktiAI" />
              <NavButton active={userTab === 'profile'} onClick={() => setUserTab('profile')} icon={<Users className="w-5 h-5" />} label="Profil" />
            </nav>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Shared Modal Overlay */}
      <AnimatePresence>
        {modalType !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalType('none')}
            className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden relative"
            >
              <button 
                onClick={() => setModalType('none')}
                className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              {modalType === 'error' && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Ups! Kesalahan</h3>
                    <p className="text-sm text-slate-500 mt-2">{errorMessage}</p>
                  </div>
                  <button onClick={() => setModalType('none')} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg">MENGERTI</button>
                </div>
              )}

              {modalType === 'logout' && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <Power className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Akhiri Sesi?</h3>
                    <p className="text-sm text-slate-500 mt-2">Sistem akan mengunci akses demi keamanan data.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setModalType('none')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-xs">BATAL</button>
                    <button onClick={handleLogout} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl text-xs ring-offset-2 active:scale-95 transition-all">KELUAR</button>
                  </div>
                </div>
              )}

              {modalType === 'reg' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-500" /> Registrasi Baru
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={regNama}
                        onChange={(e) => setRegNama(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                        placeholder="Contoh: Andi Wijaya"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">NIS Siswa</label>
                      <input 
                        type="text" 
                        value={regNis}
                        onChange={(e) => setRegNis(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                        placeholder="Contoh: 2026001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                      <input 
                        type="password" 
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                        placeholder="••••••"
                      />
                    </div>
                    <button onClick={handleRegistrasi} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg mt-2">SIMPAN NASABAH</button>
                  </div>
                </div>
              )}

              {modalType === 'confirm_trx' && pendingTrx && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Konfirmasi Trx</h3>
                  <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 text-xs font-bold text-slate-600 border border-slate-100">
                    <div className="flex justify-between"><span>Nasabah</span><span className="text-blue-900">{pendingTrx.studentName}</span></div>
                    <div className="flex justify-between"><span>Jenis</span><span className={`uppercase ${pendingTrx.type === 'Masuk' ? 'text-emerald-600' : 'text-red-500'}`}>{pendingTrx.type === 'Masuk' ? 'Setor Tunai' : 'Tarik Tunai'}</span></div>
                    <div className="flex justify-between"><span>Nominal</span><span className="text-blue-600 font-black text-sm">{formatCurrency(pendingTrx.nominal)}</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setModalType('none')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-xs uppercase">Batal</button>
                    <button onClick={finalizeTransaction} className="flex-1 py-4 bg-blue-900 text-white font-bold rounded-2xl text-xs uppercase shadow-lg shadow-blue-100 active:scale-95 transition-all">Lanjutkan</button>
                  </div>
                </div>
              )}

              {modalType === 'success_trx' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-blue-900">Transaksi Berhasil!</h3>
                    <p className="text-sm text-slate-500 mt-2">Saldo nasabah telah diperbarui secara otomatis.</p>
                  </div>
                  <button onClick={() => setModalType('none')} className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-blue-100">SELESAI</button>
                </div>
              )}
              
              {modalType === 'success_reg' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-100 animate-bounce">
                    <UserPlus className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-blue-900">Siswa Terdaftar!</h3>
                    <p className="text-sm text-gray-500 mt-2">Akun siswa telah aktif dan dapat segera digunakan.</p>
                  </div>
                  <button onClick={() => setModalType('none')} className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl text-sm uppercase shadow-lg">MANTAAP</button>
                </div>
              )}

              {modalType === 'info' && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto">
                    <Wallet className="w-12 h-12 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-blue-900 tracking-tight">SakuSakti V3.1</h3>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Digital Student Savings System</p>
                  </div>
                  <div className="text-left space-y-4 bg-slate-50 p-5 rounded-3xl">
                    <div className="pb-3 border-b border-white">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pengembang</p>
                      <p className="text-sm font-bold text-blue-900 mt-0.5">KinDEV Labs</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tentang</p>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium mt-1">Solusi manajemen keuangan digital untuk mempermudah administrasi sekolah secara transparan dan real-time.</p>
                    </div>
                  </div>
                  <button onClick={() => setModalType('none')} className="w-full bg-blue-900 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-widest">TUTUP</button>
                </div>
              )}

              {modalType === 'cs' && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-blue-900">Pusat Bantuan</h3>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Customer Service KinDEV</p>
                  </div>
                  <div className="text-left space-y-3 bg-slate-50 p-5 rounded-3xl border border-white">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Jam Operasional</p>
                      <p className="text-sm font-bold text-blue-900">Senin - Jumat (08:00 - 17:00)</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">WA Messenger</p>
                      <p className="text-sm font-bold text-emerald-600 font-mono">+62 812-3456-7890</p>
                    </div>
                  </div>
                  <button onClick={() => setModalType('none')} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-100">HUBUNGI KAMI</button>
                </div>
              )}

              {modalType === 'detail' && selectedStudentForDetail && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl mb-4">
                      {selectedStudentForDetail.nama.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-black text-blue-900">{selectedStudentForDetail.nama}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">NIS. {selectedStudentForDetail.nis}</p>
                  </div>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto px-1">
                    {selectedStudentForDetail.history.map((h, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${h.type === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                             {h.type === 'Masuk' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 leading-tight">{h.ket}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{h.tgl.split(',')[0]}</p>
                          </div>
                        </div>
                        <p className={`text-[11px] font-black ${h.type === 'Masuk' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {h.type === 'Masuk' ? '+' : '-'} {h.nominal.toLocaleString('id-ID')}
                        </p>
                      </div>
                    ))}
                    {selectedStudentForDetail.history.length === 0 && (
                      <p className="text-center py-6 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Belum ada riwayat</p>
                    )}
                  </div>

                  <div className="bg-blue-900 rounded-[2rem] p-5 text-white flex justify-between items-center shadow-xl shadow-blue-100">
                    <div>
                        <p className="text-[9px] opacity-60 uppercase font-black tracking-widest">Total Tabungan</p>
                        <p className="text-2xl font-black tracking-tight mt-1">{formatCurrency(selectedStudentForDetail.saldo)}</p>
                    </div>
                    <PiggyBank className="w-10 h-10 opacity-20" />
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-400 ${active ? 'text-white' : 'text-slate-400'}`}
    >
      <div className={`p-2.5 rounded-full transition-all flex items-center justify-center ${active ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-black mt-1 uppercase tracking-tighter ${active ? 'text-blue-900 opacity-100' : 'opacity-0'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-pill" 
          className="absolute inset-0 bg-blue-600 hidden" // Handled by active parent classes
        />
      )}
    </button>
  );
}
