import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, MessageCircle, Star } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ApiResponse } from '../types';

type CmsNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: { articleId?: number; articleSlug?: string; commentId?: number; rating?: number } | null;
  readAt: string | null;
  createdAt: string;
};
type NotificationSummary = { items: CmsNotification[]; unreadCount: number };

export function CmsNotifications() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 16 });
  const navigate = useNavigate();
  const cache = useQueryClient();
  const notifications = useQuery({
    queryKey: ['cms-notifications'],
    queryFn: async () => (await api.get<ApiResponse<NotificationSummary>>('/notifications')).data.data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`, {}),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['cms-notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['cms-notifications'] }),
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const reposition = () => {
      const bounds = trigger.current?.getBoundingClientRect();
      if (bounds) setPanelPosition({ top: bounds.bottom + 8, right: Math.max(8, window.innerWidth - bounds.right) });
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const unreadCount = notifications.data?.unreadCount ?? 0;
  const openNotification = async (notification: CmsNotification) => {
    if (!notification.readAt) await markRead.mutateAsync(notification.id).catch(() => undefined);
    setOpen(false);
    if (notification.type === 'COMMENT') navigate('/admin/comments');
    else if (notification.data?.articleSlug) navigate(`/news/${notification.data.articleSlug}`);
    else navigate('/admin/articles');
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const bounds = trigger.current?.getBoundingClientRect();
    if (bounds) setPanelPosition({ top: bounds.bottom + 8, right: Math.max(8, window.innerWidth - bounds.right) });
    setOpen(true);
  };

  return <>
    <button
      ref={trigger}
      type="button"
      onClick={toggle}
      aria-label={unreadCount ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
      aria-expanded={open}
      aria-controls="cms-notifications-panel"
      className="cms-notification-trigger relative grid h-10 w-10 place-items-center rounded-xl text-violet-500 transition hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <Bell size={20} strokeWidth={1.8}/>
      {unreadCount > 0 && <span className="cms-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && createPortal(<div className="cms-notification-portal pointer-events-none fixed inset-0 z-[1000]">
    <section ref={panel} id="cms-notifications-panel" role="dialog" aria-label="Notifikasi CMS" style={{ top: panelPosition.top, right: panelPosition.right }} className="cms-notification-panel pointer-events-auto fixed w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div><h2 className="text-sm font-black text-ink">Notifikasi</h2><p className="mt-0.5 text-xs text-slate-500">Komentar dan aktivitas artikel</p></div>
        {unreadCount > 0 && <button type="button" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 disabled:opacity-50"><CheckCheck size={14}/>Tandai dibaca</button>}
      </header>
      <div className="max-h-[min(24rem,65vh)] overflow-y-auto overscroll-contain">
        {notifications.isLoading && <p className="px-4 py-8 text-center text-sm text-slate-500">Memuat notifikasi…</p>}
        {notifications.isError && <p role="alert" className="px-4 py-8 text-center text-sm text-slate-500">Notifikasi belum bisa dimuat.</p>}
        {!notifications.isLoading && !notifications.isError && !notifications.data?.items.length && <div className="px-4 py-8 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-500"><Bell size={18}/></span><p className="mt-3 text-sm font-bold text-ink">Belum ada notifikasi</p><p className="mt-1 text-xs text-slate-500">Komentar dan rating baru akan tampil di sini.</p></div>}
        {notifications.data?.items.map(notification => {
          const isComment = notification.type === 'COMMENT';
          const Icon = isComment ? MessageCircle : Star;
          return <button key={notification.id} type="button" onClick={() => void openNotification(notification)} className={`cms-notification-item flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-violet-50/60 ${notification.readAt ? '' : 'is-unread'}`}>
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isComment ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}><Icon size={17}/></span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-extrabold text-ink">{notification.title}</span>{!notification.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500"/>}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span><time className="mt-1.5 block text-[11px] font-medium text-slate-400" dateTime={notification.createdAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</time></span>
            <ChevronRight className="mt-2 shrink-0 text-slate-300" size={16}/>
          </button>;
        })}
      </div>
      {notifications.data?.items.length ? <footer className="border-t border-slate-100 px-4 py-2.5 text-center text-[11px] font-semibold text-slate-400">Pembaruan otomatis setiap 15 detik</footer> : null}
    </section>
    </div>, document.body)}
  </>;
}
