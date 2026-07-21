/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import WorkerPanel from './components/WorkerPanel';
import { 
  authService, 
  dbService, 
  isFirebaseEnabled
} from './lib/db';
import { 
  UserProfile, 
  Task, 
  SystemSettings, 
  SystemNotification, 
  SystemLog, 
  TaskStatus 
} from './types';
import { 
  Database, 
  Info, 
  CheckCircle, 
  Sun, 
  Moon, 
  Settings, 
  X, 
  RefreshCw,
  Server
} from 'lucide-react';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  
  // App States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Database States
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // UI States
  const [apiError, setApiError] = useState('');

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((profile) => {
      setUser(profile);
      setAuthLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch all DB state when user logs in or is changed
  const refreshAllData = async () => {
    if (!user) return;
    try {
      const fetchedSettings = await dbService.getSettings();
      setSettings(fetchedSettings);

      if (user.role === 'ADMIN') {
        // Admins can fetch all profiles, tasks, and system logs
        const allUsers = await dbService.getUsers();
        setUsersList(allUsers);

        const allTasks = await dbService.getTasks();
        setTasksList(allTasks);

        const allLogs = await dbService.getLogs();
        setLogs(allLogs);
      } else if (user.role === 'WORKER') {
        // Workers only fetch their tasks and notifications
        const allTasks = await dbService.getTasks(user.uid);
        setTasksList(allTasks);
      }

      // Both fetch notifications for themselves
      const userNotifications = await dbService.getNotifications(user.uid);
      setNotifications(userNotifications);

    } catch (err: any) {
      console.error('Error refreshing platform data', err);
      setApiError('Error de sincronización con la base de datos.');
    }
  };

  useEffect(() => {
    if (user && user.status === 'APROBADO') {
      refreshAllData();
      // Periodically poll updates every 15 seconds to keep dashboard fresh
      const interval = setInterval(refreshAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Auth / Worker trigger actions
  const handleSignOut = async () => {
    setAuthLoading(true);
    await authService.signOut();
    setUser(null);
    setAuthLoading(false);
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
  };

  // --- ACTIONS ---
  const handleApproveUser = async (uid: string) => {
    if (!user) return;
    await dbService.approveUser(uid, user);
    await refreshAllData();
  };

  const handleRejectUser = async (uid: string, comment: string) => {
    if (!user) return;
    await dbService.rejectUser(uid, comment, user);
    await refreshAllData();
  };

  const handleDeleteUser = async (uid: string) => {
    if (!user) return;
    await dbService.deleteUser(uid, user);
    await refreshAllData();
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'history'>) => {
    if (!user) return;
    await dbService.createTask(taskData, user);
    await refreshAllData();
  };

  const handleUpdateTask = async (task: Task) => {
    if (!user) return;
    await dbService.updateTask(task, user);
    await refreshAllData();
  };

  const handleDeleteTask = async (taskId: string, code: string, title: string) => {
    if (!user) return;
    await dbService.deleteTask(taskId, code, title, user);
    await refreshAllData();
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus, comment?: string) => {
    if (!user) return;
    await dbService.updateTaskStatus(taskId, status, user, comment);
    await refreshAllData();
  };

  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!user) return;
    const updated = await dbService.updateSettings(newSettings, user);
    setSettings(updated);
    await refreshAllData();
  };

  const handleUpdateProfile = async (fields: { fullName: string; age: number; country: string; phone: string }) => {
    if (!user) return;
    const updatedUser = await authService.completeRegistration(user.uid, fields);
    setUser(updatedUser);
  };

  const handleMarkNotificationRead = async (id: string) => {
    await dbService.markNotificationRead(id);
    if (user) {
      const userNotifications = await dbService.getNotifications(user.uid);
      setNotifications(userNotifications);
    }
  };

  // Render Loader
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cargando Plataforma...</span>
      </div>
    );
  }

  // Active theme classes
  const activeTeamName = settings?.teamName || 'Soporte Técnico Global';

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      
      {/* FLOATING OPTIONS & SETTINGS (QUICK ACCESS) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        
        {/* Toggle Theme */}
        <button
          onClick={toggleTheme}
          className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full shadow-lg text-gray-700 dark:text-gray-300 hover:scale-105 transition-transform cursor-pointer"
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* RENDER VIEW ACCORDING TO USER AUTH */}
      {!user ? (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          teamName={activeTeamName}
        />
      ) : (
        <>
          {user.role === 'ADMIN' ? (
            <AdminPanel
              user={user}
              onSignOut={handleSignOut}
              users={usersList}
              tasks={tasksList}
              settings={settings || {
                weeklyPaymentCOP: 250000,
                adminWhatsApp: '+573151234567',
                groupWhatsAppLink: 'https://chat.whatsapp.com/ExampleGroupLink',
                businessProfileWhatsAppLink: 'https://wa.me/c/573151234567',
                teamName: activeTeamName,
                logoUrl: '',
                primaryColor: '#6366f1'
              }}
              logs={logs}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              onDeleteUser={handleDeleteUser}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateSettings={handleUpdateSettings}
            />
          ) : (
            <WorkerPanel
              user={user}
              onSignOut={handleSignOut}
              tasks={tasksList}
              settings={settings || {
                weeklyPaymentCOP: 250000,
                adminWhatsApp: '+573151234567',
                groupWhatsAppLink: 'https://chat.whatsapp.com/ExampleGroupLink',
                businessProfileWhatsAppLink: 'https://wa.me/c/573151234567',
                teamName: activeTeamName,
                logoUrl: '',
                primaryColor: '#6366f1'
              }}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateProfile={handleUpdateProfile}
              notifications={notifications}
              onMarkNotificationRead={handleMarkNotificationRead}
            />
          )}
        </>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
