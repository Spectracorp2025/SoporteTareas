import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Users, 
  Layers, 
  FileText, 
  DollarSign, 
  Settings as SettingsIcon, 
  Activity, 
  Bell, 
  User, 
  LogOut, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  Search, 
  Edit, 
  Trash, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle,
  MessageSquare,
  BookOpen,
  Calendar,
  Share2,
  ListTodo,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  UserProfile, 
  Task, 
  SystemSettings, 
  SystemNotification, 
  SystemLog, 
  TaskPriority, 
  TaskStatus, 
  PaymentCalculation 
} from '../types';
import { calculatePayments } from '../lib/db';

interface AdminPanelProps {
  user: UserProfile;
  onSignOut: () => void;
  users: UserProfile[];
  tasks: Task[];
  settings: SystemSettings;
  logs: SystemLog[];
  onApproveUser: (uid: string) => Promise<void>;
  onRejectUser: (uid: string, comment: string) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'history'>) => Promise<void>;
  onUpdateTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string, code: string, title: string) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus, comment?: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
}

export default function AdminPanel({
  user,
  onSignOut,
  users,
  tasks,
  settings,
  logs,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onUpdateSettings,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'solicitudes' | 'usuarios' | 'tareas' | 'revisar' | 'estadisticas' | 'pagos' | 'ajustes' | 'historial'>('dashboard');

  // State-based confirmation for deletion (safer in iframe sandboxes)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(null);

  // Search and Filter States
  const [userSearch, setUserSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('ALL');

  // Form states for creating/editing a task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskDeadlineTime, setTaskDeadlineTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('NORMAL');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskSupportMaterial, setTaskSupportMaterial] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [taskFormLoading, setTaskFormLoading] = useState(false);

  // Settings form state
  const [settingsTeamName, setSettingsTeamName] = useState(settings.teamName);
  const [settingsWeeklyPayment, setSettingsWeeklyPayment] = useState(settings.weeklyPaymentCOP.toString());
  const [settingsAdminWhatsApp, setSettingsAdminWhatsApp] = useState(settings.adminWhatsApp);
  const [settingsGroupWhatsApp, setSettingsGroupWhatsApp] = useState(settings.groupWhatsAppLink);
  const [settingsBusinessProfile, setSettingsBusinessProfile] = useState(settings.businessProfileWhatsAppLink);
  const [settingsLogoUrl, setSettingsLogoUrl] = useState(settings.logoUrl);
  const [settingsPrimaryColor, setSettingsPrimaryColor] = useState(settings.primaryColor);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Sincronizar cambios en los ajustes cargados de la base de datos
  useEffect(() => {
    if (settings) {
      setSettingsTeamName(settings.teamName || '');
      setSettingsWeeklyPayment((settings.weeklyPaymentCOP || 0).toString());
      setSettingsAdminWhatsApp(settings.adminWhatsApp || '');
      setSettingsGroupWhatsApp(settings.groupWhatsAppLink || '');
      setSettingsBusinessProfile(settings.businessProfileWhatsAppLink || '');
      setSettingsLogoUrl(settings.logoUrl || '');
      setSettingsPrimaryColor(settings.primaryColor || '#6366f1');
    }
  }, [settings]);

  // Rejection reason popups / modals
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionUserComment, setRejectionUserComment] = useState('');
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectionTaskComment, setRejectionTaskComment] = useState('');

  // Filter lists
  const approvedWorkers = users.filter(u => u.role === 'WORKER' && u.status === 'APROBADO');
  const pendingRequests = users.filter(u => u.status === 'PENDIENTE_APROBACION');
  const tasksPendingReview = tasks.filter(t => t.status === 'PENDIENTE_REVISION');

  // Metrics calculations
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'APROBADA').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'PENDIENTE' || t.status === 'ACEPTADA' || t.status === 'EN_PROCESO').length;
  const rejectedTasksCount = tasks.filter(t => t.status === 'RECHAZADA').length;
  const activeWorkersCount = approvedWorkers.length;

  // Payments Estimation for Admin Panel
  const paymentEstimates = calculatePayments(users, tasks, settings.weeklyPaymentCOP);

  // Format currency helper
  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const openWhatsAppBusiness = (phone: string, text: string = '') => {
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

  // Autogenerate unique 4 digit alphanumeric task code
  const generateTaskCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TSK-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError('');
    if (!taskTitle || !taskDesc || !taskDeadline || !taskAssignedTo) {
      setTaskFormError('Todos los campos con (*) son obligatorios.');
      return;
    }

    setTaskFormLoading(true);
    const assignedWorker = users.find(u => u.uid === taskAssignedTo);
    
    try {
      if (editingTask) {
        // Edit Task Flow
        const updated: Task = {
          ...editingTask,
          title: taskTitle,
          description: taskDesc,
          deadline: taskDeadline,
          deadlineTime: taskDeadlineTime || undefined,
          priority: taskPriority,
          assignedTo: taskAssignedTo,
          assignedToName: assignedWorker ? (assignedWorker.fullName || assignedWorker.displayName) : 'Desconocido',
          requiresSupportMaterial: taskSupportMaterial,
        };
        await onUpdateTask(updated);
      } else {
        // Create Task Flow
        const code = generateTaskCode();
        await onCreateTask({
          code,
          title: taskTitle,
          description: taskDesc,
          deadline: taskDeadline,
          deadlineTime: taskDeadlineTime || undefined,
          priority: taskPriority,
          assignedTo: taskAssignedTo,
          assignedToName: assignedWorker ? (assignedWorker.fullName || assignedWorker.displayName) : 'Desconocido',
          requiresSupportMaterial: taskSupportMaterial,
        });
      }

      // Reset Form & Close modal
      setIsTaskModalOpen(false);
      setEditingTask(null);
      resetTaskForm();
    } catch (err: any) {
      setTaskFormError(err.message || 'Error al guardar la tarea.');
    } finally {
      setTaskFormLoading(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskDeadline('');
    setTaskDeadlineTime('');
    setTaskPriority('NORMAL');
    setTaskAssignedTo('');
    setTaskSupportMaterial(false);
    setTaskFormError('');
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskDeadline(task.deadline);
    setTaskDeadlineTime(task.deadlineTime || '');
    setTaskPriority(task.priority);
    setTaskAssignedTo(task.assignedTo);
    setTaskSupportMaterial(task.requiresSupportMaterial);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTaskClick = (task: Task) => {
    setDeletingTaskId(task.id);
  };

  const handleConfirmDeleteTask = async (taskId: string) => {
    setIsDeletingLoading(true);
    setDeleteStatusMessage(null);
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await onDeleteTask(task.id, task.code, task.title);
        setDeleteStatusMessage('Tarea eliminada correctamente.');
        setTimeout(() => setDeleteStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setDeleteStatusMessage('Error: ' + (err.message || err));
    } finally {
      setIsDeletingLoading(false);
      setDeletingTaskId(null);
    }
  };

  const handleCancelDeleteTask = () => {
    setDeletingTaskId(null);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    if (!settingsTeamName || !settingsWeeklyPayment || !settingsAdminWhatsApp || !settingsGroupWhatsApp || !settingsBusinessProfile) {
      setSettingsError('Todos los campos son obligatorios.');
      return;
    }

    try {
      await onUpdateSettings({
        teamName: settingsTeamName,
        weeklyPaymentCOP: Number(settingsWeeklyPayment),
        adminWhatsApp: settingsAdminWhatsApp,
        groupWhatsAppLink: settingsGroupWhatsApp,
        businessProfileWhatsAppLink: settingsBusinessProfile,
        logoUrl: settingsLogoUrl,
        primaryColor: settingsPrimaryColor
      });
      setSettingsSuccess('¡Ajustes de la plataforma guardados correctamente!');
    } catch (err: any) {
      setSettingsError(err.message || 'Error al guardar ajustes.');
    }
  };

  const handleApproveUserClick = async (uid: string) => {
    try {
      await onApproveUser(uid);
    } catch (err: any) {
      alert('Error al aprobar usuario');
    }
  };

  const handleDeleteUserClick = (uid: string) => {
    setDeletingUserId(uid);
  };

  const handleConfirmDeleteUser = async (uid: string) => {
    setIsDeletingLoading(true);
    setDeleteStatusMessage(null);
    try {
      await onDeleteUser(uid);
      setDeleteStatusMessage('Usuario eliminado correctamente.');
      setTimeout(() => setDeleteStatusMessage(null), 4000);
    } catch (err: any) {
      setDeleteStatusMessage('Error al eliminar usuario: ' + (err.message || err));
    } finally {
      setIsDeletingLoading(false);
      setDeletingUserId(null);
    }
  };

  const handleCancelDeleteUser = () => {
    setDeletingUserId(null);
  };

  const handleRejectUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionUserComment.trim()) {
      alert('Debe escribir un motivo para el rechazo.');
      return;
    }
    try {
      if (rejectingUserId) {
        await onRejectUser(rejectingUserId, rejectionUserComment);
        setRejectingUserId(null);
        setRejectionUserComment('');
      }
    } catch (err) {
      alert('Error al rechazar usuario');
    }
  };

  const handleApproveTaskClick = async (taskId: string) => {
    try {
      await onUpdateTaskStatus(taskId, 'APROBADA');
    } catch (err: any) {
      alert('Error al aprobar tarea');
    }
  };

  const handleRejectTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionTaskComment.trim()) {
      alert('Debe escribir un comentario de corrección.');
      return;
    }
    try {
      if (rejectingTaskId) {
        await onUpdateTaskStatus(rejectingTaskId, 'RECHAZADA', rejectionTaskComment);
        setRejectingTaskId(null);
        setRejectionTaskComment('');
      }
    } catch (err) {
      alert('Error al rechazar tarea');
    }
  };

  // Data for Charts
  const statusChartData = [
    { name: 'Pendientes', valor: tasks.filter(t => t.status === 'PENDIENTE').length },
    { name: 'Aceptadas', valor: tasks.filter(t => t.status === 'ACEPTADA').length },
    { name: 'En Proceso', valor: tasks.filter(t => t.status === 'EN_PROCESO').length },
    { name: 'Revisiones', valor: tasks.filter(t => t.status === 'PENDIENTE_REVISION').length },
    { name: 'Aprobadas', valor: tasks.filter(t => t.status === 'APROBADA').length },
    { name: 'Rechazadas', valor: tasks.filter(t => t.status === 'RECHAZADA').length },
  ];

  const workersFulfillmentData = paymentEstimates.map(p => ({
    name: p.fullName,
    Cumplimiento: p.fulfillmentRate,
    Aprobadas: p.approvedTasks,
    Totales: p.totalTasks
  }));

  const COLORS = ['#38bdf8', '#818cf8', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div id="admin-panel" className="min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 shadow-sm px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-lg">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
            ) : (
              'ADM'
            )}
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight leading-none text-gray-900 dark:text-white">
              {settings.teamName} <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-0.5 bg-indigo-500/10 rounded-full ml-1.5">Admin</span>
            </h1>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Panel Administrativo Central
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col text-right">
            <span className="font-semibold text-xs leading-none text-gray-900 dark:text-white">
              {user.fullName || user.displayName}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase">
              Propietario / Admin
            </span>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden md:block"></div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none border-b lg:border-b-0 lg:border-r border-gray-150 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'solicitudes' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Solicitudes</span>
            {pendingRequests.length > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'usuarios' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Trabajadores</span>
          </button>

          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'tareas' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gestionar Tareas</span>
          </button>

          <button
            onClick={() => setActiveTab('revisar')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'revisar' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Revisar Tareas</span>
            {tasksPendingReview.length > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                {tasksPendingReview.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('estadisticas')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'estadisticas' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Estadísticas</span>
          </button>

          <button
            onClick={() => setActiveTab('pagos')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'pagos' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Nómina y Pagos</span>
          </button>

          <button
            onClick={() => setActiveTab('ajustes')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'ajustes' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Ajustes</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap lg:w-full transition-colors cursor-pointer ${
              activeTab === 'historial' 
                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 rounded-l-none' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Historial (Logs)</span>
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
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-slate-800 to-indigo-950 border border-slate-700/50 text-white p-6 rounded-2xl shadow-md">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                    ¡Panel de Control Global, Carlos! 🚀
                  </h2>
                  <p className="text-xs text-indigo-200/90 max-w-xl mt-1.5 leading-relaxed">
                    Usted es el administrador único de <strong>{settings.teamName}</strong>. Gestione los accesos de personal técnico, administre tareas con códigos automatizados y calcule las nóminas proporcionales de cada semana.
                  </p>
                </div>

                {/* GENERAL STATISTICS HERO GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Tareas Totales</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{totalTasks}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Completadas</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{completedTasksCount}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Equipo Técnico</div>
                      <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{activeWorkersCount}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-4 rounded-xl flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('solicitudes')}>
                    <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase leading-none">Solicitudes</div>
                      <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{pendingRequests.length}</div>
                    </div>
                  </div>
                </div>

                {/* NOTIFICATIONS & RECENT REQUESTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Pending Approvals Panel */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-500" />
                        Solicitudes de Ingreso Recientes
                      </h3>
                      <button 
                        onClick={() => setActiveTab('solicitudes')}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="divide-y divide-gray-55 dark:divide-gray-800/50 max-h-60 overflow-y-auto pr-1">
                      {pendingRequests.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs">
                          No hay solicitudes de ingreso pendientes.
                        </div>
                      ) : (
                        pendingRequests.map((req, index) => (
                          <div key={req.uid || `req-${index}`} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{req.fullName || req.displayName}</div>
                              <div className="text-gray-400 text-[11px] mt-0.5">{req.email} • {req.phone}</div>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleApproveUserClick(req.uid)}
                                className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded border border-emerald-500/20 cursor-pointer"
                                title="Aprobar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRejectingUserId(req.uid)}
                                className="p-1 text-red-600 hover:bg-red-500/10 rounded border border-red-500/20 cursor-pointer"
                                title="Rechazar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Tasks Pending Review Panel */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        Tareas en Espera de Aprobación
                      </h3>
                      <button 
                        onClick={() => setActiveTab('revisar')}
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        Revisar
                      </button>
                    </div>

                    <div className="divide-y divide-gray-55 dark:divide-gray-800/50 max-h-60 overflow-y-auto pr-1">
                      {tasksPendingReview.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs">
                          No hay tareas pendientes de revisión de soporte técnico.
                        </div>
                      ) : (
                        tasksPendingReview.map((task, index) => (
                          <div key={task.id || `pending-review-${index}`} className="py-3 flex items-center justify-between gap-3 text-xs border-b last:border-0 border-gray-100 dark:border-gray-800/40">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">{task.code}</span>
                                <span className="truncate min-w-0 block flex-1 break-words">{task.title}</span>
                              </div>
                              <div className="text-gray-400 text-[11px] mt-0.5 truncate">Asignado a: <strong>{task.assignedToName}</strong></div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleApproveTaskClick(task.id)}
                                className="px-2 py-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded cursor-pointer"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => setRejectingTaskId(task.id)}
                                className="px-2 py-1 text-[10px] bg-red-500 hover:bg-red-600 text-white font-bold rounded cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB: REQUEST APPROVALS */}
            {activeTab === 'solicitudes' && (
              <motion.div
                key="solicitudes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Solicitudes de Ingreso</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Apruebe o rechace las cuentas de personal de soporte técnico recién registradas.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {pendingRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-xs">
                      No hay solicitudes de ingreso pendientes de aprobación en este momento.
                    </div>
                  ) : (
                    pendingRequests.map((req, index) => (
                      <div key={req.uid || `solicitud-${index}`} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">
                            {req.fullName}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Correo: <strong className="text-gray-700 dark:text-gray-300">{req.email}</strong></span>
                            <span>Celular: <strong className="text-gray-700 dark:text-gray-300">{req.phone}</strong>
                              {req.phone && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppBusiness(req.phone, `Hola ${req.fullName}, te escribo con respecto a tu solicitud de registro en el panel de soporte técnico.`)}
                                  className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold align-middle cursor-pointer"
                                  title="Enviar mensaje por WhatsApp Business"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                            <span>País/Edad: <strong className="text-gray-700 dark:text-gray-300">{req.country} ({req.age} años)</strong></span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveUserClick(req.uid)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            onClick={() => setRejectingUserId(req.uid)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: USERS LIST (TRABAJADORES) */}
            {activeTab === 'usuarios' && (
              <motion.div
                key="usuarios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Fichas de Trabajadores</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Lista completa de personal técnico autorizado e historial de sus perfiles.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                    />
                  </div>
                </div>

                {deleteStatusMessage && (
                  <div className={`p-3 text-xs rounded-xl font-medium ${
                    deleteStatusMessage.startsWith('Error') 
                      ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50' 
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                  }`}>
                    {deleteStatusMessage}
                  </div>
                )}

                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-semibold uppercase">
                        <th className="p-4">Nombre / Correo</th>
                        <th className="p-4">Celular</th>
                        <th className="p-4">País</th>
                        <th className="p-4">Edad</th>
                        <th className="p-4">Rol</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {users
                        .filter(u => 
                          (u.fullName || u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((u, index) => (
                          <tr key={u.uid || `user-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-4">
                              <div className="font-bold text-gray-900 dark:text-white">{u.fullName || u.displayName}</div>
                              <div className="text-gray-400 mt-0.5">{u.email}</div>
                            </td>
                            <td className="p-4 font-medium">
                              <span className="align-middle">{u.phone || 'N/C'}</span>
                              {u.phone && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppBusiness(u.phone, `Hola ${u.fullName || u.displayName || 'técnico'}, te contacto desde la administración del equipo de soporte.`)}
                                  className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold align-middle cursor-pointer"
                                  title="Enviar mensaje por WhatsApp Business"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                            <td className="p-4 font-medium">{u.country || 'N/C'}</td>
                            <td className="p-4 font-medium">{u.age || 'N/C'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                u.role === 'ADMIN' 
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                u.status === 'APROBADO' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : u.status === 'PENDIENTE_APROBACION'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : u.status === 'RECHAZADO'
                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                      : 'bg-gray-500/10 text-gray-500'
                              }`}>
                                {u.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {deletingUserId === u.uid ? (
                                <div className="flex items-center justify-end gap-2 animate-fade-in">
                                  <span className="text-red-500 font-bold text-[10px] animate-pulse">¿Seguro de borrar TODO?</span>
                                  <button
                                    onClick={() => handleConfirmDeleteUser(u.uid)}
                                    disabled={isDeletingLoading}
                                    className="px-2 py-1 bg-red-600 text-white font-bold text-[10px] rounded hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    {isDeletingLoading ? 'Eliminando...' : 'Sí, borrar'}
                                  </button>
                                  <button
                                    onClick={handleCancelDeleteUser}
                                    disabled={isDeletingLoading}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[10px] rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : u.uid !== user.uid ? (
                                <button
                                  onClick={() => handleDeleteUserClick(u.uid)}
                                  className="px-2.5 py-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-600 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                                  title="Eliminar usuario permanentemente"
                                >
                                  <Trash className="w-3 h-3" />
                                  <span>Eliminar</span>
                                </button>
                              ) : (
                                <span className="text-gray-400 text-[10px] italic">Tú (Admin)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: TASKS BOARD (ADMIN PANEL VERSION) */}
            {activeTab === 'tareas' && (
              <motion.div
                key="tareas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Gestión de Tareas</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Asigne nuevas tareas con códigos autogenerados y modifique las existentes.</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      resetTaskForm();
                      setIsTaskModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Tarea</span>
                  </button>
                </div>

                {deleteStatusMessage && (
                  <div className={`p-3 text-xs rounded-xl font-medium ${
                    deleteStatusMessage.startsWith('Error') 
                      ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50' 
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                  }`}>
                    {deleteStatusMessage}
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-150 dark:border-gray-800 text-xs">
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded-lg">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por código, título..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="bg-transparent focus:outline-none w-48 text-xs"
                    />
                  </div>

                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1"></div>

                  <div className="flex gap-1.5">
                    {['ALL', 'PENDIENTE', 'ACEPTADA', 'EN_PROCESO', 'PENDIENTE_REVISION', 'APROBADA', 'RECHAZADA'].map(status => (
                      <button
                        key={status}
                        onClick={() => setTaskFilterStatus(status)}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] cursor-pointer transition-colors ${
                          taskFilterStatus === status
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750'
                        }`}
                      >
                        {status === 'ALL' ? 'Todos' : status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tasks Table */}
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-semibold uppercase">
                        <th className="p-4">Código</th>
                        <th className="p-4">Título</th>
                        <th className="p-4">Asignado a</th>
                        <th className="p-4">Prioridad</th>
                        <th className="p-4">Fecha Límite</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {tasks
                        .filter(t => {
                          const matchesSearch = t.code.toLowerCase().includes(taskSearch.toLowerCase()) || t.title.toLowerCase().includes(taskSearch.toLowerCase());
                          const matchesFilter = taskFilterStatus === 'ALL' || t.status === taskFilterStatus;
                          return matchesSearch && matchesFilter;
                        })
                        .map((task, index) => (
                          <tr key={task.id || `task-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-4 font-mono font-bold text-gray-600 dark:text-gray-300">{task.code}</td>
                            <td className="p-4 min-w-[150px] max-w-[280px]">
                              <div className="font-bold text-gray-900 dark:text-white break-words whitespace-normal">{task.title}</div>
                              {task.requiresSupportMaterial && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 px-1 rounded">Material Req.</span>
                              )}
                            </td>
                            <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{task.assignedToName}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                task.priority === 'URGENTE'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : task.priority === 'IMPORTANTE'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-red-600 dark:text-red-400">{task.deadline} {task.deadlineTime || ''}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                task.status === 'APROBADA'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : task.status === 'RECHAZADA'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : task.status === 'PENDIENTE_REVISION'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              }`}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {deletingTaskId === task.id ? (
                                  <div className="flex items-center gap-1 animate-fade-in">
                                    <span className="text-[9px] text-red-500 font-bold animate-pulse">¿Borrar?</span>
                                    <button
                                      onClick={() => handleConfirmDeleteTask(task.id)}
                                      disabled={isDeletingLoading}
                                      className="px-1.5 py-0.5 bg-red-600 text-white font-bold text-[9px] rounded hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                                      title="Confirmar borrar tarea"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      onClick={handleCancelDeleteTask}
                                      disabled={isDeletingLoading}
                                      className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[9px] rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
                                      title="Cancelar"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openEditTaskModal(task)}
                                      className="p-1 text-indigo-600 hover:bg-indigo-500/10 rounded border border-indigo-500/20 cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTaskClick(task)}
                                      className="p-1 text-red-600 hover:bg-red-500/10 rounded border border-red-500/20 cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: REVISE TASKS */}
            {activeTab === 'revisar' && (
              <motion.div
                key="revisar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Revisión de Tareas Entregadas</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Evalúe los trabajos completados por el equipo. Si los rechaza, escriba qué corrección se requiere.</p>
                </div>

                <div className="space-y-4">
                  {tasksPendingReview.length === 0 ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl text-gray-400 text-xs">
                      No hay tareas pendientes de revisión técnica en este momento.
                    </div>
                  ) : (
                    tasksPendingReview.map((task, index) => (
                      <div key={task.id || `review-${index}`} className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-xl space-y-4 shadow-sm">
                        
                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-gray-800/50 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="font-mono font-bold bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">{task.code}</span>
                              <span>• Entregada por: <strong>{task.assignedToName}</strong></span>
                            </div>
                            <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white break-words">{task.title}</h3>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase shrink-0 ${
                            task.priority === 'URGENTE' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Instrucciones Originales:</span>
                          <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-850 p-3 rounded-lg leading-relaxed">{task.description}</p>
                        </div>

                        {/* Recent submission notes from the worker */}
                        {task.history && task.history[task.history.length - 1]?.comment && (
                          <div className="p-3 bg-amber-500/5 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-amber-800 dark:text-amber-400 block">Comentarios de Entrega:</span>
                            <p className="text-amber-700 dark:text-amber-300 italic">
                              "{task.history[task.history.length - 1].comment}"
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800/50 pt-3">
                          <button
                            onClick={() => handleApproveTaskClick(task.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar Tarea</span>
                          </button>
                          <button
                            onClick={() => setRejectingTaskId(task.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Solicitar Corrección</span>
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: STATISTICS */}
            {activeTab === 'estadisticas' && (
              <motion.div
                key="estadisticas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Análisis y Estadísticas de Soporte</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verifique el rendimiento, cumplimiento semanal y estados del soporte técnico.</p>
                </div>

                {/* Grid charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Status Pie Chart */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Distribución de Estados de Tareas</h3>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData.filter(d => d.valor > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="valor"
                          >
                            {statusChartData.filter(d => d.valor > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} Tareas`, 'Cantidad']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Workers compliance Bar Chart */}
                  <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-xl space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Tasa de Cumplimiento por Trabajador (%)</h3>
                    
                    <div className="h-64">
                      {workersFulfillmentData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                          No hay trabajadores aprobados para medir cumplimiento.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={workersFulfillmentData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                            <YAxis domain={[0, 100]} stroke="#888888" fontSize={11} />
                            <Tooltip formatter={(value) => [`${value}%`, 'Cumplimiento']} />
                            <Legend />
                            <Bar dataKey="Cumplimiento" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                </div>

                {/* Worker compliance metrics summary board */}
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden p-5 space-y-4">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Resumen de Métricas de Cumplimiento</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {paymentEstimates.map((est, index) => (
                      <div key={est.uid || `estimate-${index}`} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl space-y-2">
                        <div className="font-bold text-gray-950 dark:text-white">{est.fullName}</div>
                        <div className="space-y-1 text-gray-500">
                          <div className="flex justify-between">
                            <span>Tareas Asignadas:</span>
                            <span className="font-semibold text-gray-850 dark:text-gray-300">{est.totalTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Aprobadas (Completas):</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{est.approvedTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tasa de Cumplimiento:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{est.fulfillmentRate}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB: PAYMENTS (NOMINA) */}
            {activeTab === 'pagos' && (
              <motion.div
                key="pagos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Nómina y Pagos Sugeridos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Calculadora automatizada basada en tasa de cumplimiento para la base semanal de {formatCOP(settings.weeklyPaymentCOP)} COP.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-semibold uppercase">
                        <th className="p-4">Trabajador (Soporte)</th>
                        <th className="p-4 text-center">Cumplimiento</th>
                        <th className="p-4 text-center">Tareas Totales</th>
                        <th className="p-4 text-center">Aprobadas</th>
                        <th className="p-4 text-center">Pendientes / Sin Completar</th>
                        <th className="p-4 text-center">Rechazadas</th>
                        <th className="p-4 text-right">Pago Sugerido (Proporcional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {paymentEstimates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            No hay trabajadores aprobados con datos de nómina disponibles.
                          </td>
                        </tr>
                      ) : (
                        paymentEstimates.map((est, index) => (
                          <tr key={est.uid || `payment-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-4">
                              <div className="font-bold text-gray-900 dark:text-white">{est.fullName}</div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                {est.fulfillmentRate}%
                              </span>
                            </td>
                            <td className="p-4 text-center font-semibold">{est.totalTasks}</td>
                            <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{est.approvedTasks}</td>
                            <td className="p-4 text-center font-medium text-amber-600 dark:text-amber-400">{est.missingTasks}</td>
                            <td className="p-4 text-center font-medium text-red-600 dark:text-red-400">{est.rejectedTasks}</td>
                            <td className="p-4 text-right">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                                {formatCOP(est.suggestedPayment)}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-normal">COP</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: ADJUSTMENTS (SETTINGS) */}
            {activeTab === 'ajustes' && (
              <motion.div
                key="ajustes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl"
              >
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Ajustes de la Plataforma</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Configure los valores predeterminados de pagos, enlaces de contacto y personalización.</p>
                  </div>

                  {settingsSuccess && (
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium">
                      {settingsSuccess}
                    </div>
                  )}

                  {settingsError && (
                    <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                      {settingsError}
                    </div>
                  )}

                  <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Nombre del Equipo / Empresa (*)
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsTeamName}
                          onChange={(e) => setSettingsTeamName(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Pago Semanal Base (COP) (*)
                        </label>
                        <input
                          type="number"
                          required
                          value={settingsWeeklyPayment}
                          onChange={(e) => setSettingsWeeklyPayment(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Celular de Soporte del Administrador (*)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: +573151234567"
                          value={settingsAdminWhatsApp}
                          onChange={(e) => setSettingsAdminWhatsApp(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Enlace de Grupo de WhatsApp de Avisos (*)
                        </label>
                        <input
                          type="url"
                          required
                          value={settingsGroupWhatsApp}
                          onChange={(e) => setSettingsGroupWhatsApp(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Enlace de Perfil Empresarial de WhatsApp (Catálogo de Materiales) (*)
                      </label>
                      <input
                        type="url"
                        required
                        value={settingsBusinessProfile}
                        onChange={(e) => setSettingsBusinessProfile(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          URL de Logo Personalizado (Opcional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://ejemplo.com/logo.png"
                          value={settingsLogoUrl}
                          onChange={(e) => setSettingsLogoUrl(e.target.value)}
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Color Principal de Interfaz
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={settingsPrimaryColor}
                            onChange={(e) => setSettingsPrimaryColor(e.target.value)}
                            className="w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settingsPrimaryColor}
                            onChange={(e) => setSettingsPrimaryColor(e.target.value)}
                            className="flex-1 px-3.5 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                    >
                      Guardar Todos los Ajustes
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: SYSTEM AUDIT LOGS */}
            {activeTab === 'historial' && (
              <motion.div
                key="historial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Historial de Auditoría (System Logs)</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Registro inalterable de acciones operativas realizadas en la plataforma de soporte técnico.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-xs">
                      No se han generado logs del sistema todavía.
                    </div>
                  ) : (
                    logs.slice(0, 50).map((log, index) => (
                      <div key={log.id || `log-${index}`} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/20">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-gray-800 dark:text-gray-300 uppercase px-1.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">{log.action.replace('_', ' ')}</span>
                            <span className="text-gray-400">•</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{log.userName} ({log.userRole})</span>
                          </div>
                          {log.details && (
                            <p className="text-gray-550 dark:text-gray-400 font-medium text-[11px] leading-relaxed">
                              {log.details}
                            </p>
                          )}
                        </div>
                        
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 font-mono text-right">
                          {new Date(log.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="block text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>

      {/* --- TASK EDIT/CREATE MODAL --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-950 dark:text-white text-base">
                {editingTask ? `Editar Tarea: ${editingTask.code}` : 'Crear Nueva Tarea de Soporte'}
              </h3>
              <button 
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setEditingTask(null);
                }} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="p-5 space-y-4 text-xs">
              {taskFormError && (
                <div className="p-2.5 bg-red-500/10 text-red-600 rounded-xl font-medium">
                  {taskFormError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Título de la Tarea (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Migración de Servidor Web"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Descripción Detallada (*)
                </label>
                <textarea
                  required
                  placeholder="Describa el alcance de la tarea y los entregables esperados..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Fecha Límite (*)
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Hora Límite (Opcional)
                  </label>
                  <input
                    type="time"
                    value={taskDeadlineTime}
                    onChange={(e) => setTaskDeadlineTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Prioridad de Entrega (*)
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANTE">Importante</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Asignar a Trabajador (*)
                  </label>
                  <select
                    required
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Seleccionar Trabajador --</option>
                    {approvedWorkers.map((w, index) => (
                      <option key={w.uid || `worker-${index}`} value={w.uid}>{w.fullName || w.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-850 rounded-xl">
                <input
                  type="checkbox"
                  id="checkbox-requires-support"
                  checked={taskSupportMaterial}
                  onChange={(e) => setTaskSupportMaterial(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="checkbox-requires-support" className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Esta tarea requiere material de apoyo técnico
                </label>
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={taskFormLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- REJECTION DIALOG (USER APPROVAL) --- */}
      {rejectingUserId && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-md overflow-hidden p-5 space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-gray-950 dark:text-white text-base flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Rechazar Solicitud de Ingreso
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Es obligatorio escribir un comentario explicando de manera detallada el motivo del rechazo. El solicitante verá este motivo al intentar ingresar.
            </p>

            <form onSubmit={handleRejectUserSubmit} className="space-y-4">
              <textarea
                required
                placeholder="Escriba aquí los motivos (Falta de documentación, no cumple perfil, etc.)..."
                value={rejectionUserComment}
                onChange={(e) => setRejectionUserComment(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingUserId(null);
                    setRejectionUserComment('');
                  }}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Enviar Rechazo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- REJECTION DIALOG (TASK DELIVERY REVISION) --- */}
      {rejectingTaskId && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-md overflow-hidden p-5 space-y-4 shadow-2xl"
          >
            <h3 className="font-bold text-gray-950 dark:text-white text-base flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Solicitar Corrección de Tarea
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Escriba detalladamente qué debe corregirse en el trabajo de soporte entregado. El trabajador recibirá una alerta y podrá volver a entregarlo después de corregir.
            </p>

            <form onSubmit={handleRejectTaskSubmit} className="space-y-4">
              <textarea
                required
                placeholder="Indique qué falló o falta corregir (Ej: Faltó documentar las zonas inversas del DNS)..."
                value={rejectionTaskComment}
                onChange={(e) => setRejectionTaskComment(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingTaskId(null);
                    setRejectionTaskComment('');
                  }}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Enviar Corrección
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
