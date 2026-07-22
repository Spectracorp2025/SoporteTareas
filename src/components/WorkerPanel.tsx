import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  DollarSign, 
  Bell, 
  User, 
  LogOut, 
  FileText, 
  MessageSquare, 
  ChevronRight, 
  Smartphone, 
  Settings, 
  Activity, 
  Compass, 
  ExternalLink,
  Lock,
  Globe,
  Calendar,
  Layers,
  Send,
  AlertCircle,
  X
} from 'lucide-react';
import { Task, UserProfile, SystemSettings, SystemNotification, TaskStatus } from '../types';

interface WorkerPanelProps {
  user: UserProfile;
  onSignOut: () => void;
  tasks: Task[];
  settings: SystemSettings;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus, comment?: string) => Promise<void>;
  onUpdateProfile: (fields: { fullName: string; age: number; country: string; phone: string }) => Promise<void>;
  notifications: SystemNotification[];
  onMarkNotificationRead: (id: string) => void;
}

export default function WorkerPanel({
  user,
  onSignOut,
  tasks,
  settings,
  onUpdateTaskStatus,
  onUpdateProfile,
  notifications,
  onMarkNotificationRead,
}: WorkerPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tareas' | 'notificaciones' | 'perfil'>('dashboard');
  
  // Profile Form state
  const [fullName, setFullName] = useState(user.fullName || user.displayName || '');
  const [age, setAge] = useState(user.age?.toString() || '');
  const [country, setCountry] = useState(user.country || 'Colombia');
  const [phone, setPhone] = useState(user.phone || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Selected Task Detail modal/state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionError, setActionError] = useState('');

  // Worker-specific tasks safely filtered
  const safeTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const safeNotifications = Array.isArray(notifications) ? notifications.filter(Boolean) : [];
  const myTasks = safeTasks.filter(t => t && t.assignedTo === user?.uid);
  
  // Calculated dashboard counters
  const pendingTasks = myTasks.filter(t => t.status === 'PENDIENTE').length;
  const acceptedTasks = myTasks.filter(t => t.status === 'ACEPTADA').length;
  const inProcessTasks = myTasks.filter(t => t.status === 'EN_PROCESO').length;
  const reviewTasks = myTasks.filter(t => t.status === 'PENDIENTE_REVISION').length;
  const approvedTasks = myTasks.filter(t => t.status === 'APROBADA').length;
  const rejectedTasks = myTasks.filter(t => t.status === 'RECHAZADA').length;
  const urgentTasks = myTasks.filter(t => t.priority === 'URGENTE' && t.status !== 'APROBADA').length;

  // Payments Estimation for Worker
  const totalTasksCount = myTasks.length;
  const complianceRate = totalTasksCount > 0 ? Math.round((approvedTasks / totalTasksCount) * 100) : 100;
  const estimatedPayment = Math.round(((settings?.weeklyPaymentCOP || 0) * complianceRate) / 100);

  // Unread notifications
  const unreadNotificationsCount = safeNotifications.filter(n => !n.read).length;

  // Format currency
  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    if (!fullName || !age || !country || !phone) {
      setProfileError('Todos los campos son obligatorios');
      return;
    }
    setProfileLoading(true);
    try {
      await onUpdateProfile({
        fullName,
        age: Number(age),
        country,
        phone
      });
      setProfileSuccess('¡Perfil actualizado con éxito!');
    } catch (err: any) {
      setProfileError(err.message || 'Error al actualizar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const openWhatsAppBusinessLink = (phone: string, text: string = '') => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const encodedText = encodeURIComponent(text);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      const url = `whatsapp-biz://send?phone=${cleanPhone}${text ? `&text=${encodedText}` : ''}`;
      window.location.href = url;
      setTimeout(() => {
        window.open(`https://wa.me/${cleanPhone}${text ? `?text=${encodedText}` : ''}`, '_blank');
      }, 1200);
    } else {
      const url = `https://wa.me/${cleanPhone}${text ? `?text=${encodedText}` : ''}`;
      window.open(url, '_blank');
    }
  };

  const formatWhatsAppBusinessUrl = (url: string) => {
    if (!url) return '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      if (url.includes('wa.me/') || url.includes('api.whatsapp.com/')) {
        return url
          .replace('https://wa.me/', 'whatsapp-biz://')
          .replace('http://wa.me/', 'whatsapp-biz://')
          .replace('https://api.whatsapp.com/send?', 'whatsapp-biz://send?')
          .replace('http://api.whatsapp.com/send?', 'whatsapp-biz://send?');
      }
    }
    return url;
  };

  const triggerWhatsAppRedirect = (task: Task) => {
    const commentPart = actionComment ? `\nComentario: ${actionComment}` : '';
    const text = `Se completó la tarea:\nCódigo: ${task.code}\nTítulo: ${task.title}${commentPart}\nPendiente de revisión.`;

    // Copy task report to clipboard so worker can easily paste into the group
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    const groupUrl = settings.groupWhatsAppLink || 'https://chat.whatsapp.com/';

    if (groupUrl.includes('wa.me/') || groupUrl.includes('api.whatsapp.com/')) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const encodedText = encodeURIComponent(text);
      if (isMobile) {
        const formatted = formatWhatsAppBusinessUrl(groupUrl);
        const finalUrl = formatted.includes('?') ? `${formatted}&text=${encodedText}` : `${formatted}?text=${encodedText}`;
        window.location.href = finalUrl;
        setTimeout(() => {
          window.open(`${groupUrl}${groupUrl.includes('?') ? '&' : '?'}text=${encodedText}`, '_blank');
        }, 1200);
      } else {
        const finalUrl = `${groupUrl}${groupUrl.includes('?') ? '&' : '?'}text=${encodedText}`;
        window.open(finalUrl, '_blank');
      }
    } else {
      const formatted = formatWhatsAppBusinessUrl(groupUrl);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = formatted;
        setTimeout(() => {
          window.open(groupUrl, '_blank');
        }, 1200);
      } else {
        window.open(groupUrl, '_blank');
      }
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    setActionError('');
    try {
      await onUpdateTaskStatus(task.id, newStatus, actionComment);
      
      // If task moved to Under Review, auto-open WhatsApp message!
      if (newStatus === 'PENDIENTE_REVISION') {
        triggerWhatsAppRedirect(task);
      }

      // Refresh local selected task copy
      const freshTask = { ...task, status: newStatus };
      setSelectedTask(freshTask);
      setActionComment('');
    } catch (err: any) {
      setActionError(err.message || 'Error al cambiar estado.');
    }
  };

  return (
    <div id="worker-panel" className="min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 shadow-sm px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center font-bold text-lg">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" referrerPolicy="no-referrer" />
            ) : (
              'ST'
            )}
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight leading-none text-gray-900 dark:text-white">
              {settings.teamName}
            </h1>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Panel de Soporte Técnico
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Theme display inside nav / user info */}
          <div className="hidden md:flex flex-col text-right">
            <span className="font-semibold text-xs leading-none text-gray-900 dark:text-white">
              {user.fullName || user.displayName}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase">
              Soporte Técnico
            </span>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden md:block"></div>

          {/* Quick Sign Out */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* VIEWPORT CONTROLLER */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none border-b lg:border-b-0 lg:border-r border-gray-150 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-l-2 border-sky-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'tareas' 
                ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-l-2 border-sky-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mis Tareas</span>
            {myTasks.filter(t => t.status !== 'APROBADA').length > 0 && (
              <span className="ml-auto bg-sky-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {myTasks.filter(t => t.status !== 'APROBADA').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'notificaciones' 
                ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-l-2 border-sky-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificaciones</span>
            {unreadNotificationsCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'perfil' 
                ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-l-2 border-sky-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mi Perfil</span>
          </button>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 min-w-0">
          
          <AnimatePresence mode="wait">
            
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 top-0 opacity-10 w-1/3">
                    <Activity className="w-full h-full stroke-[1]" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      ¡Hola, {user.fullName || user.displayName}! 👋
                    </h2>
                    <p className="text-sm text-sky-50/90 max-w-xl">
                      Bienvenido a tu panel de soporte técnico empresarial. Revisa el estado de tus tareas asignadas y tu porcentaje de cumplimiento para estimar tus pagos semanales.
                    </p>
                  </div>
                </div>

                {/* COUNTERS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Pendientes</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{pendingTasks + acceptedTasks + inProcessTasks}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Urgentes</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{urgentTasks}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Aprobadas</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{approvedTasks}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Rechazadas</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{rejectedTasks}</div>
                    </div>
                  </div>
                </div>

                {/* PAYMENTS ESTIMATION & QUICK STATS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Payment Estimation Card */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Pago Estimado de la Semana</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Se actualiza según tu cumplimiento de tareas aprobadas.</p>
                      </div>
                      <div className="w-9 h-9 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-100 dark:border-gray-800/50">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">PAGO SEMANAL BASE</span>
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{formatCOP(settings.weeklyPaymentCOP)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">CUMPLIMIENTO ACTIVO</span>
                        <span className="font-bold text-sm text-sky-600 dark:text-sky-400">{complianceRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-2">
                      <span className="text-xs font-semibold text-gray-500">Estimación de Pago Sugerido:</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {formatCOP(estimatedPayment)}
                      </span>
                    </div>
                  </div>

                  {/* Profile info Summary */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-sky-500" />
                      Ficha Personal
                    </h3>
                    
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-gray-50 dark:border-gray-800/30 pb-1.5">
                        <span className="text-gray-500">Teléfono:</span>
                        <span className="font-semibold">{user.phone || 'No configurado'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 dark:border-gray-800/30 pb-1.5">
                        <span className="text-gray-500">País:</span>
                        <span className="font-semibold">{user.country || 'No configurado'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 dark:border-gray-800/30 pb-1.5">
                        <span className="text-gray-500">Edad:</span>
                        <span className="font-semibold">{user.age ? `${user.age} años` : 'No configurado'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('perfil')}
                      className="w-full mt-2 py-2 text-center text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sky-600 dark:text-sky-400 rounded-xl cursor-pointer transition-colors"
                    >
                      Editar Mi Ficha
                    </button>
                  </div>

                </div>

                {/* CANALES DE COMUNICACIÓN OFICIALES */}
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                    Canales de Comunicación Oficiales
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Canal 1: Grupo de Avisos (WhatsApp Normal/Grupo) */}
                    <div className="p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1 flex-wrap">
                          Grupo de Avisos Oficiales
                          <span className="px-1.5 py-0.5 rounded text-[8px] bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold uppercase">WhatsApp Normal</span>
                        </h4>
                        <p className="text-[11px] text-gray-500">Únete al grupo de avisos generales del equipo.</p>
                      </div>
                      <a
                        href={settings.groupWhatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm shrink-0 text-center"
                      >
                        Unirse al Grupo
                      </a>
                    </div>

                    {/* Canal 2: Soporte / Administrador (WhatsApp Business/Empresa) */}
                    <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1 flex-wrap">
                          Soporte Técnico Administración
                          <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase">WhatsApp Empresa</span>
                        </h4>
                        <p className="text-[11px] text-gray-500">Consulta directa con el administrador de la plataforma.</p>
                      </div>
                      <button
                        onClick={() => openWhatsAppBusinessLink(settings.adminWhatsApp, `Hola, soy técnico de soporte y requiero asistencia directa.`)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm shrink-0 text-center"
                      >
                        Contactar Soporte
                      </button>
                    </div>
                  </div>
                </div>

                {/* RECENT PENDING TASKS PREVIEW */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Tareas Prioritarias</h3>
                    <button 
                      onClick={() => setActiveTab('tareas')}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      Ver todas las tareas <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {myTasks.filter(t => t.status !== 'APROBADA').length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500 text-xs">
                      ¡Felicidades! No tienes ninguna tarea pendiente de revisión ni en proceso.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myTasks.filter(t => t.status !== 'APROBADA').slice(0, 4).map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTask(task);
                            setActiveTab('tareas');
                          }}
                          className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-gray-600 dark:text-gray-400 rounded-md">
                                {task.code}
                              </span>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                task.priority === 'URGENTE' 
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                                  : task.priority === 'IMPORTANTE' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {task.priority}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-gray-900 dark:text-white break-words whitespace-normal">
                              {task.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {task.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/50 mt-3 pt-2.5 text-[11px] text-gray-500">
                            <span>Vence: <strong className="text-gray-700 dark:text-gray-300">{task.deadline}</strong></span>
                            <span className="font-bold text-sky-600 dark:text-sky-400">{task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB: TASKS MANAGER (WORKER VERSION) */}
            {activeTab === 'tareas' && (
              <motion.div
                key="tareas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Mis Tareas Asignadas</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Administra el ciclo de vida de tus tareas de soporte técnico asignadas.</p>
                  </div>
                </div>

                {/* Task List Grid & Detail layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Task List Column (2/5 size or 3/5 depending) */}
                  <div className="lg:col-span-3 space-y-3">
                    {myTasks.length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500 text-xs">
                        No se han encontrado tareas asignadas a tu cuenta.
                      </div>
                    ) : (
                      myTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTask(task);
                            setActionComment('');
                            setActionError('');
                          }}
                          className={`bg-white dark:bg-gray-900 border p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                            selectedTask?.id === task.id
                              ? 'border-sky-500 ring-2 ring-sky-500/20'
                              : 'border-gray-150 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-gray-600 dark:text-gray-400 rounded-md">
                              {task.code}
                            </span>
                            <div className="flex gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                task.priority === 'URGENTE' 
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                                  : task.priority === 'IMPORTANTE' 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {task.priority}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                task.status === 'APROBADA'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : task.status === 'RECHAZADA'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : task.status === 'PENDIENTE_REVISION'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              }`}>
                               {(task.status || '').replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2.5">
                            {task.description}
                          </p>

                          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/30 pt-2 text-[11px] text-gray-400">
                            <span>Vence: <strong className="text-gray-700 dark:text-gray-300">{task.deadline} {task.deadlineTime || ''}</strong></span>
                            {task.requiresSupportMaterial && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Requiere Material</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Task Detail Panel Column (3/5 size) */}
                  <div className={`lg:col-span-2 ${
                    selectedTask 
                      ? 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0 lg:block' 
                      : 'hidden lg:block'
                  }`}>
                    {selectedTask ? (
                      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-5 space-y-5 sticky top-24 w-full max-w-lg lg:max-w-none shadow-2xl lg:shadow-none max-h-[90vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
                        
                        {/* Title & Metadata */}
                        <div className="space-y-2 border-b border-gray-100 dark:border-gray-800/50 pb-4 relative">
                          {/* Close button for mobile */}
                          <button
                            type="button"
                            onClick={() => setSelectedTask(null)}
                            className="lg:hidden absolute -top-1 -right-1 p-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full cursor-pointer transition-colors"
                            title="Cerrar detalles"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                              Código: {selectedTask.code}
                            </span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              selectedTask.status === 'APROBADA'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : selectedTask.status === 'RECHAZADA'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : selectedTask.status === 'PENDIENTE_REVISION'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            }`}>
                              {(selectedTask.status || '').replace(/_/g, ' ')}
                            </span>
                          </div>
                          
                          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight break-words">
                            {selectedTask.title}
                          </h3>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Descripción</span>
                          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                            {selectedTask.description}
                          </p>
                        </div>

                        {/* Support Material Alert */}
                        {selectedTask.requiresSupportMaterial && (
                          <div className="p-3 bg-amber-500/5 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
                            <div className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>
                                Esta tarea requiere material de apoyo. Revise el perfil empresarial de WhatsApp del administrador para obtener los archivos necesarios.
                              </span>
                            </div>
                            <a
                              href={formatWhatsAppBusinessUrl(settings.businessProfileWhatsAppLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              Ver Perfil WhatsApp <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Rejection comment if rejected */}
                        {selectedTask.status === 'RECHAZADA' && selectedTask.rejectionComment && (
                          <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
                            <span className="text-xs font-bold text-red-800 dark:text-red-400 block mb-0.5">Motivo del rechazo de revisión:</span>
                            <p className="text-xs text-red-700 dark:text-red-300 italic">
                              "{selectedTask.rejectionComment}"
                            </p>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-xl text-xs">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Asignado el:</span>
                            <span className="font-semibold">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Límite:</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {selectedTask.deadline} {selectedTask.deadlineTime || ''}
                            </span>
                          </div>
                        </div>

                        {/* FLOW STATS ACTIONS */}
                        <div className="border-t border-gray-100 dark:border-gray-800/50 pt-4 space-y-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Acciones de Estado</span>
                          
                          {actionError && (
                            <div className="p-2 bg-red-500/10 text-red-600 text-xs rounded-lg font-medium">
                              {actionError}
                            </div>
                          )}

                          {/* ACTION BUTTONS ACCORDING TO CYCLE */}
                          <div className="grid grid-cols-1 gap-2">
                            {selectedTask.status === 'PENDIENTE' && (
                              <button
                                onClick={() => handleStatusChange(selectedTask, 'ACEPTADA')}
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                              >
                                Aceptar Tarea
                              </button>
                            )}

                            {selectedTask.status === 'ACEPTADA' && (
                              <button
                                onClick={() => handleStatusChange(selectedTask, 'EN_PROCESO')}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                              >
                                Iniciar Tarea (En Proceso)
                              </button>
                            )}

                            {(selectedTask.status === 'EN_PROCESO' || selectedTask.status === 'RECHAZADA') && (
                              <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-gray-400">
                                  Nota de entrega (opcional para el administrador)
                                </label>
                                <textarea
                                  placeholder="Escriba algún comentario explicativo..."
                                  value={actionComment}
                                  onChange={(e) => setActionComment(e.target.value)}
                                  className="w-full p-2.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  rows={2}
                                />
                                <button
                                  onClick={() => handleStatusChange(selectedTask, 'PENDIENTE_REVISION')}
                                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Entregar para Revisión (Abre Grupo de WhatsApp)</span>
                                </button>
                              </div>
                            )}

                            {selectedTask.status === 'PENDIENTE_REVISION' && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                                <span>Entregada. En espera de aprobación por el administrador.</span>
                              </div>
                            )}

                            {selectedTask.status === 'APROBADA' && (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>¡Tarea aprobada y completada! No requiere más acciones.</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="h-48 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400 text-xs space-y-1">
                        <FileText className="w-8 h-8 opacity-40 mb-1" />
                        <span>Seleccione una tarea</span>
                        <span>para ver sus detalles completos</span>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notificaciones' && (
              <motion.div
                key="notificaciones"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Centro de Notificaciones</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mantente al tanto de tus asignaciones, aprobaciones y alertas.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-xs">
                      No tienes notificaciones en este momento.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-4 flex items-start gap-3.5 transition-colors ${
                          !notif.read ? 'bg-sky-500/5 dark:bg-sky-500/5' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          notif.type === 'SUCCESS' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : notif.type === 'URGENT' || notif.type === 'ALERT'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        }`}>
                          {notif.type === 'SUCCESS' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : notif.type === 'URGENT' || notif.type === 'ALERT' ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {notif.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-gray-400">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                            {!notif.read && (
                              <button
                                onClick={() => onMarkNotificationRead(notif.id)}
                                className="text-sky-600 dark:text-sky-400 hover:underline font-bold"
                              >
                                Marcar como leída
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'perfil' && (
              <motion.div
                key="perfil"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl"
              >
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-6 space-y-6">
                  
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Ficha de Perfil Corporativo</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Modifica tus datos de contacto registrados para el equipo.</p>
                  </div>

                  {profileSuccess && (
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium">
                      {profileSuccess}
                    </div>
                  )}

                  {profileError && (
                    <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                      {profileError}
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Correo de Google (Inmodificable)
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3.5 py-2 text-xs border border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-gray-400 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Edad
                        </label>
                        <input
                          type="number"
                          required
                          min="18"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          País
                        </label>
                        <input
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Número Celular
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      {profileLoading ? 'Guardando...' : 'Actualizar Perfil'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>

    </div>
  );
}
