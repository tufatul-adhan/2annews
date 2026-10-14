import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type ChatMessage = { id: number; name: string; content: string; createdAt: string; userId: number | null };

export function LiveChat() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState(() => localStorage.getItem('2annews-chat-name') ?? '');
  const [error, setError] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setCompact(true), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  const messages = useQuery({
    queryKey: ['chat', 'messages'],
    queryFn: async () => (await api.get<{ data: ChatMessage[] }>('/chat/messages')).data.data,
    enabled: open,
    refetchInterval: 3000,
  });
  const send = useMutation({
    mutationFn: (payload: { content: string; name?: string }) => api.post('/chat/messages', payload),
    onSuccess: () => {
      setContent('');
      setError('');
      cache.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
    onError: (cause: any) => setError(cause?.response?.status === 429 ? 'Terlalu banyak pesan. Coba lagi sebentar.' : 'Pesan belum terkirim. Silakan coba lagi.'),
  });

  useEffect(() => {
    if (open) messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = content.trim();
    const name = guestName.trim();
    if (!message || message.length > 500) return;
    if (!user && name.length < 2) { setError('Masukkan nama minimal 2 karakter.'); return; }
    if (!user) localStorage.setItem('2annews-chat-name', name);
    send.mutate({ content: message, ...(!user ? { name } : {}) });
  };

  return <div className="live-chat-launcher fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
    {open ? <section aria-label="Live chat 2anNews" className="flex h-[min(34rem,calc(100dvh-2rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between bg-ink px-4 py-3.5 text-white">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime text-pitch"><MessageCircle size={20}/></span><div><h2 className="font-extrabold">Obrolan komunitas</h2><p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300"><span className="h-2 w-2 rounded-full bg-lime"/>Terbuka untuk semua pembaca</p></div></div>
        <button type="button" aria-label="Tutup live chat" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={19}/></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-mist/70 p-4" aria-live="polite" aria-relevant="additions text">
        <p className="mx-auto max-w-[18rem] rounded-xl border border-emerald-100 bg-white px-3 py-2 text-center text-xs leading-5 text-slate-500">Sapa pembaca lain dan ngobrol soal kabar sepak bola terbaru.</p>
        {messages.isLoading && <p className="py-5 text-center text-sm text-slate-500">Memuat percakapan…</p>}
        {messages.isError && <div role="alert" className="rounded-xl bg-white p-3 text-center text-sm text-slate-600"><p>Chat belum bisa dimuat.</p><button type="button" className="mt-1 font-bold text-pitch" onClick={() => messages.refetch()}>Coba lagi</button></div>}
        {!messages.isLoading && !messages.isError && !messages.data?.length && <p className="py-5 text-center text-sm text-slate-500">Belum ada pesan. Mulai obrolan pertama!</p>}
        {messages.data?.map(message => {
          const ownMessage = Boolean(user && message.userId === user.id);
          return <article key={message.id} className={`max-w-[88%] rounded-md px-3.5 py-2.5 ${ownMessage ? 'ml-auto rounded-br-sm bg-pitch text-white' : 'mr-auto rounded-bl-sm border border-slate-100 bg-white text-ink'}`}>
            <div className={`mb-1 flex items-center justify-between gap-4 text-[11px] font-bold ${ownMessage ? 'text-emerald-100' : 'text-pitch'}`}><span className="max-w-36 truncate">{ownMessage ? 'Anda' : message.name}</span><time className={ownMessage ? 'text-emerald-100/80' : 'text-slate-400'} dateTime={message.createdAt}>{new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}</time></div>
            <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.content}</p>
          </article>;
        })}
        <div ref={messagesEnd}/>
      </div>
      <form onSubmit={submit} className="space-y-2 border-t border-slate-100 bg-white p-3">
        {!user && <label className="sr-only" htmlFor="chat-name">Nama Anda</label>}
        {!user && <input id="chat-name" value={guestName} onChange={event => setGuestName(event.target.value)} maxLength={40} placeholder="Nama Anda" autoComplete="nickname" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-pitch focus:ring-2 focus:ring-pitch/10"/>}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-message">Tulis pesan</label>
          <textarea id="chat-message" value={content} onChange={event => { setContent(event.target.value); if (error) setError(''); }} maxLength={500} rows={2} placeholder="Tulis pesan…" className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-5 outline-none transition placeholder:text-slate-400 focus:border-pitch focus:ring-2 focus:ring-pitch/10" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
          <button type="submit" disabled={send.isPending || !content.trim()} aria-label="Kirim pesan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pitch text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17}/></button>
        </div>
        {error && <p role="alert" className="px-1 text-xs text-red-600">{error}</p>}
        <p className="text-right text-[10px] text-slate-400">{content.length}/500 · Enter untuk kirim</p>
      </form>
    </section> : <button type="button" onClick={() => setOpen(true)} aria-label="Buka live chat" title="Live chat" aria-expanded={open} className={`group flex items-center text-white transition-all duration-500 motion-reduce:transition-none hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-pitch/25 ${compact ? 'h-12 w-12 justify-center rounded-full bg-pitch p-0' : 'h-[60px] w-48 gap-2.5 rounded-md bg-pitch py-3 pl-4 pr-5'}`}><span className={`relative flex shrink-0 items-center justify-center bg-lime text-pitch transition-all duration-500 motion-reduce:transition-none ${compact ? 'h-10 w-10 rounded-full' : 'h-9 w-9 rounded-sm'}`}><MessageCircle size={19}/><span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-pitch bg-white"/></span><span className={`overflow-hidden whitespace-nowrap text-left transition-all duration-500 motion-reduce:transition-none ${compact ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'}`}><span className="block text-sm font-extrabold leading-4">Live chat</span><span className="mt-0.5 block text-[11px] text-emerald-100">Ngobrol sekarang</span></span></button>}
  </div>;
}
