import { 
  firebaseAuth, 
  firebaseDb, 
  isFirebaseEnabled 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { 
  UserProfile, 
  Task, 
  SystemSettings, 
  SystemNotification, 
  SystemLog, 
  TaskStatus, 
  TaskPriority,
  PaymentCalculation
} from '../types';

// Default Admin Email - This can be checked dynamically or set manually
// The current user email is carlosdelgado.neska@gmail.com
export const ADMIN_EMAIL = 'carlosdelgado.neska@gmail.com';

// Helper function to recursively remove any properties with 'undefined' values
// so that Firebase Firestore setDoc/addDoc/updateDoc calls never fail with "Unsupported field value: undefined"
function cleanForFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned as T;
}

// Mock Initial Data for LocalStorage Fallback
const DEFAULT_SETTINGS: SystemSettings = {
  weeklyPaymentCOP: 25000,
  adminWhatsApp: '+573151234567',
  groupWhatsAppLink: 'https://chat.whatsapp.com/ExampleGroupLink',
  businessProfileWhatsAppLink: 'https://wa.me/c/573151234567',
  teamName: 'Soporte Técnico Global',
  logoUrl: '',
  primaryColor: '#0ea5e9', // Sky 500
};

const MOCK_PROFILES: UserProfile[] = [
  {
    uid: 'admin_uid',
    email: 'carlosdelgado.neska@gmail.com',
    displayName: 'Carlos Delgado (Admin)',
    fullName: 'Carlos Delgado',
    age: 35,
    country: 'Colombia',
    phone: '+573151234567',
    role: 'ADMIN',
    status: 'APROBADO',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'worker_mateo',
    email: 'mateo@soporte.com',
    displayName: 'Mateo Gómez',
    fullName: 'Mateo Gómez',
    age: 26,
    country: 'Colombia',
    phone: '+573001234567',
    role: 'WORKER',
    status: 'APROBADO',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'worker_valentina',
    email: 'valentina@soporte.com',
    displayName: 'Valentina Rojas',
    fullName: 'Valentina Rojas',
    age: 24,
    country: 'Colombia',
    phone: '+573019876543',
    role: 'WORKER',
    status: 'PENDIENTE_APROBACION',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'worker_andres',
    email: 'andres@soporte.com',
    displayName: 'Andrés Castro',
    fullName: 'Andrés Castro',
    age: 28,
    country: 'Colombia',
    phone: '+573023334445',
    role: 'WORKER',
    status: 'RECHAZADO',
    rejectionReason: 'Falta completar certificaciones técnicas requeridas para el puesto.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const MOCK_TASKS: Task[] = [
  {
    id: 'task_1',
    code: 'TSK-9482',
    title: 'Configurar Servidor DNS',
    description: 'Instalar y configurar el servidor DNS bind9 en el servidor de pruebas Debian. Configurar zonas directas e inversas.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadlineTime: '18:00',
    priority: 'URGENTE',
    assignedTo: 'worker_mateo',
    assignedToName: 'Mateo Gómez',
    requiresSupportMaterial: true,
    status: 'PENDIENTE',
    history: [
      {
        id: 'hist_1_1',
        status: 'PENDIENTE',
        changedBy: 'admin_uid',
        changedByName: 'Carlos Delgado',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        comment: 'Tarea creada y asignada.'
      }
    ]
  },
  {
    id: 'task_2',
    code: 'TSK-3810',
    title: 'Revisión de Backups de Base de Datos',
    description: 'Verificar que los scripts de volcado de base de datos se ejecuten diariamente a las 2 AM y se carguen correctamente al bucket de AWS S3.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadlineTime: '22:00',
    priority: 'NORMAL',
    assignedTo: 'worker_mateo',
    assignedToName: 'Mateo Gómez',
    requiresSupportMaterial: false,
    status: 'EN_PROCESO',
    history: [
      {
        id: 'hist_2_1',
        status: 'PENDIENTE',
        changedBy: 'admin_uid',
        changedByName: 'Carlos Delgado',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        comment: 'Tarea creada.'
      },
      {
        id: 'hist_2_2',
        status: 'ACEPTADA',
        changedBy: 'worker_mateo',
        changedByName: 'Mateo Gómez',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'hist_2_3',
        status: 'EN_PROCESO',
        changedBy: 'worker_mateo',
        changedByName: 'Mateo Gómez',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]
  },
  {
    id: 'task_3',
    code: 'TSK-4029',
    title: 'Renovar Certificados SSL Nginx',
    description: 'Actualizar los certificados SSL expirados en el balanceador de carga Nginx mediante Let\'s Encrypt y programar cronjob.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deadlineTime: '12:00',
    priority: 'IMPORTANTE',
    assignedTo: 'worker_mateo',
    assignedToName: 'Mateo Gómez',
    requiresSupportMaterial: false,
    status: 'PENDIENTE_REVISION',
    history: [
      {
        id: 'hist_3_1',
        status: 'PENDIENTE',
        changedBy: 'admin_uid',
        changedByName: 'Carlos Delgado',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'hist_3_2',
        status: 'PENDIENTE_REVISION',
        changedBy: 'worker_mateo',
        changedByName: 'Mateo Gómez',
        timestamp: new Date(Date.now() - 1 * 10 * 60 * 60 * 1000).toISOString(),
        comment: 'Listo, se renovaron y verificaron los certificados en producción.'
      }
    ]
  },
  {
    id: 'task_4',
    code: 'TSK-1120',
    title: 'Solución de Caída de Red Oficina Bogotá',
    description: 'Diagnosticar pérdida de paquetes e intermitencias reportadas por los desarrolladores de la oficina satélite.',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'URGENTE',
    assignedTo: 'worker_mateo',
    assignedToName: 'Mateo Gómez',
    requiresSupportMaterial: true,
    status: 'APROBADA',
    history: [
      {
        id: 'hist_4_1',
        status: 'PENDIENTE',
        changedBy: 'admin_uid',
        changedByName: 'Carlos Delgado',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'hist_4_2',
        status: 'PENDIENTE_REVISION',
        changedBy: 'worker_mateo',
        changedByName: 'Mateo Gómez',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'hist_4_3',
        status: 'APROBADA',
        changedBy: 'admin_uid',
        changedByName: 'Carlos Delgado',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        comment: 'Excelente trabajo. Se identificó el problema con el router principal.'
      }
    ]
  }
];

const MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif_1',
    userId: 'worker_mateo',
    title: 'Nueva tarea asignada',
    message: 'Se te ha asignado la tarea: Configurar Servidor DNS (TSK-9482)',
    createdAt: new Date().toISOString(),
    read: false,
    type: 'INFO'
  }
];

const MOCK_LOGS: SystemLog[] = [
  {
    id: 'log_1',
    action: 'INICIO_SISTEMA',
    userId: 'admin_uid',
    userName: 'Carlos Delgado',
    userRole: 'ADMIN',
    timestamp: new Date().toISOString(),
    details: 'Se inicializó el sistema de gestión de soporte técnico.'
  }
];

// LocalStorage database class
class LocalStorageDB {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem('tech_settings')) {
      localStorage.setItem('tech_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem('tech_profiles')) {
      localStorage.setItem('tech_profiles', JSON.stringify(MOCK_PROFILES));
    }
    if (!localStorage.getItem('tech_tasks')) {
      localStorage.setItem('tech_tasks', JSON.stringify(MOCK_TASKS));
    }
    if (!localStorage.getItem('tech_notifications')) {
      localStorage.setItem('tech_notifications', JSON.stringify(MOCK_NOTIFICATIONS));
    }
    if (!localStorage.getItem('tech_logs')) {
      localStorage.setItem('tech_logs', JSON.stringify(MOCK_LOGS));
    }
  }

  // Getters
  getSettings(): SystemSettings {
    const raw = localStorage.getItem('tech_settings');
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  }

  updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('tech_settings', JSON.stringify(updated));
    return updated;
  }

  getProfiles(): UserProfile[] {
    const raw = localStorage.getItem('tech_profiles');
    return raw ? JSON.parse(raw) : MOCK_PROFILES;
  }

  getProfile(uid: string): UserProfile | null {
    const profiles = this.getProfiles();
    return profiles.find(p => p.uid === uid) || null;
  }

  getProfileByEmail(email: string): UserProfile | null {
    if (!email) return null;
    const profiles = this.getProfiles();
    const targetEmail = email.toLowerCase();
    return profiles.find(p => p && p.email && p.email.toLowerCase() === targetEmail) || null;
  }

  saveProfile(profile: UserProfile): UserProfile {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.uid === profile.uid);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorage.setItem('tech_profiles', JSON.stringify(profiles));
    return profile;
  }

  deleteProfile(uid: string): boolean {
    const profiles = this.getProfiles();
    const filteredProfiles = profiles.filter(p => p.uid !== uid);
    localStorage.setItem('tech_profiles', JSON.stringify(filteredProfiles));

    // Also unassign tasks assigned to this user
    const tasks = this.getTasks();
    const updatedTasks = tasks.map(t => {
      if (t.assignedTo === uid) {
        return {
          ...t,
          assignedTo: '',
          assignedToName: '',
          status: 'PENDIENTE' as const,
          history: [
            ...(t.history || []),
            {
              id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
              status: 'PENDIENTE' as const,
              changedBy: 'SYSTEM',
              changedByName: 'Sistema',
              timestamp: new Date().toISOString(),
              comment: 'Tarea liberada debido a la eliminación de su encargado'
            }
          ]
        };
      }
      return t;
    });
    localStorage.setItem('tech_tasks', JSON.stringify(updatedTasks));

    // Delete notifications for this user
    const rawNotif = localStorage.getItem('tech_notifications');
    const allNotif: SystemNotification[] = rawNotif ? JSON.parse(rawNotif) : [];
    const filteredNotif = allNotif.filter(n => n.userId !== uid);
    localStorage.setItem('tech_notifications', JSON.stringify(filteredNotif));

    return true;
  }

  getTasks(userId?: string): Task[] {
    const raw = localStorage.getItem('tech_tasks');
    const tasks: Task[] = raw ? JSON.parse(raw) : MOCK_TASKS;
    if (userId) {
      return tasks.filter(t => t.assignedTo === userId);
    }
    return tasks;
  }

  getTask(id: string): Task | null {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === id) || null;
  }

  saveTask(task: Task): Task {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem('tech_tasks', JSON.stringify(tasks));
    return task;
  }

  deleteTask(id: string): boolean {
    const tasks = this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem('tech_tasks', JSON.stringify(filtered));
    return true;
  }

  getNotifications(userId: string): SystemNotification[] {
    const raw = localStorage.getItem('tech_notifications');
    const all: SystemNotification[] = raw ? JSON.parse(raw) : MOCK_NOTIFICATIONS;
    return all.filter(n => n.userId === userId || n.userId === 'ADMIN');
  }

  saveNotification(notification: SystemNotification): SystemNotification {
    const raw = localStorage.getItem('tech_notifications');
    const all: SystemNotification[] = raw ? JSON.parse(raw) : MOCK_NOTIFICATIONS;
    all.unshift(notification);
    localStorage.setItem('tech_notifications', JSON.stringify(all));
    return notification;
  }

  markNotificationRead(id: string): void {
    const raw = localStorage.getItem('tech_notifications');
    const all: SystemNotification[] = raw ? JSON.parse(raw) : MOCK_NOTIFICATIONS;
    const index = all.findIndex(n => n.id === id);
    if (index >= 0) {
      all[index].read = true;
      localStorage.setItem('tech_notifications', JSON.stringify(all));
    }
  }

  getLogs(): SystemLog[] {
    const raw = localStorage.getItem('tech_logs');
    return raw ? JSON.parse(raw) : MOCK_LOGS;
  }

  saveLog(log: SystemLog): SystemLog {
    const raw = localStorage.getItem('tech_logs');
    const all: SystemLog[] = raw ? JSON.parse(raw) : MOCK_LOGS;
    all.unshift(log);
    localStorage.setItem('tech_logs', JSON.stringify(all));
    return log;
  }
}

export const localDb = new LocalStorageDB();

// Dynamic Authentication State simulation
interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'WORKER';
}

let currentMockUser: UserProfile | null = null;
let authStateListener: ((user: UserProfile | null) => void) | null = null;

// Initialize Session Auth state
const storedSessionUid = sessionStorage.getItem('tech_session_uid');
if (storedSessionUid) {
  const profile = localDb.getProfile(storedSessionUid);
  if (profile) {
    currentMockUser = profile;
  }
}

// Unified Auth Interface
export const authService = {
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    if (isFirebaseEnabled) {
      return onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          // Fetch user profile from Firestore or create it
          const userDocRef = doc(firebaseDb, 'profiles', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            callback(profile);
          } else {
            // New register or uncompleted registration
            const isEmailAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
              role: isEmailAdmin ? 'ADMIN' : 'WORKER',
              status: isEmailAdmin ? 'APROBADO' : 'PENDIENTE_REGISTRO',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            callback(newProfile);
          }
        } else {
          callback(null);
        }
      });
    } else {
      authStateListener = callback;
      callback(currentMockUser);
      return () => {
        authStateListener = null;
      };
    }
  },

  signInWithGoogle: async (simulatedEmail?: string, simulatedName?: string): Promise<UserProfile> => {
    if (isFirebaseEnabled) {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const fbUser = result.user;

      const userDocRef = doc(firebaseDb, 'profiles', fbUser.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      } else {
        const isEmailAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const newProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
          role: isEmailAdmin ? 'ADMIN' : 'WORKER',
          status: isEmailAdmin ? 'APROBADO' : 'PENDIENTE_REGISTRO',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        return newProfile;
      }
    } else {
      // Simulation mode
      const email = simulatedEmail || ADMIN_EMAIL; // Defaults to admin for Carlos
      const displayName = simulatedName || (email === ADMIN_EMAIL ? 'Carlos Delgado' : 'Mateo Gómez');
      
      let profile = localDb.getProfileByEmail(email);
      if (!profile) {
        // Create new simulated profile
        const isEmailAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        profile = {
          uid: 'sim_' + Math.random().toString(36).substr(2, 9),
          email: email.toLowerCase(),
          displayName: displayName,
          role: isEmailAdmin ? 'ADMIN' : 'WORKER',
          status: isEmailAdmin ? 'APROBADO' : 'PENDIENTE_REGISTRO',
          createdAt: new Date().toISOString(),
        };
        localDb.saveProfile(profile);
      }
      
      currentMockUser = profile;
      sessionStorage.setItem('tech_session_uid', profile.uid);
      if (authStateListener) {
        authStateListener(profile);
      }
      
      // Log it
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'INICIO_SESION',
        userId: profile.uid,
        userName: profile.displayName,
        userRole: profile.role,
        timestamp: new Date().toISOString(),
        details: 'Simulación de inicio de sesión con Google'
      });

      return profile;
    }
  },

  signOut: async (): Promise<void> => {
    if (isFirebaseEnabled) {
      await fbSignOut(firebaseAuth);
    } else {
      if (currentMockUser) {
        localDb.saveLog({
          id: 'log_' + Date.now(),
          action: 'CERRAR_SESION',
          userId: currentMockUser.uid,
          userName: currentMockUser.displayName,
          userRole: currentMockUser.role,
          timestamp: new Date().toISOString(),
        });
      }
      currentMockUser = null;
      sessionStorage.removeItem('tech_session_uid');
      if (authStateListener) {
        authStateListener(null);
      }
    }
  },

  completeRegistration: async (uid: string, fields: { fullName: string; age: number; country: string; phone: string }): Promise<UserProfile> => {
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'profiles', uid);
      const updates = {
        fullName: fields.fullName,
        age: Number(fields.age),
        country: fields.country,
        phone: fields.phone,
        status: 'PENDIENTE_APROBACION' as const,
      };
      await updateDoc(docRef, updates);
      
      const updatedSnap = await getDoc(docRef);
      return updatedSnap.data() as UserProfile;
    } else {
      const profile = localDb.getProfile(uid);
      if (!profile) throw new Error('Usuario no encontrado');
      
      const updated: UserProfile = {
        ...profile,
        fullName: fields.fullName,
        age: Number(fields.age),
        country: fields.country,
        phone: fields.phone,
        status: 'PENDIENTE_APROBACION',
      };
      localDb.saveProfile(updated);
      currentMockUser = updated;
      
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'REGISTRO_COMPLETADO',
        userId: uid,
        userName: updated.displayName,
        userRole: updated.role,
        timestamp: new Date().toISOString(),
        details: 'Perfil completado, en espera de aprobación'
      });

      if (authStateListener) authStateListener(updated);
      return updated;
    }
  }
};

// Unified Database CRUD Services
export const dbService = {
  // --- SETTINGS ---
  getSettings: async (): Promise<SystemSettings> => {
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'config', 'settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SystemSettings;
      } else {
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } else {
      return localDb.getSettings();
    }
  },

  updateSettings: async (settings: Partial<SystemSettings>, adminUser: UserProfile): Promise<SystemSettings> => {
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'config', 'settings');
      await setDoc(docRef, cleanForFirestore(settings), { merge: true });
      const snap = await getDoc(docRef);
      
      // Log it
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore({
        action: 'AJUSTES_MODIFICADOS',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName || 'Admin',
        userRole: 'ADMIN',
        timestamp: new Date().toISOString(),
        details: JSON.stringify(settings)
      }));

      return snap.data() as SystemSettings;
    } else {
      const updated = localDb.updateSettings(settings);
      
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'AJUSTES_MODIFICADOS',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName,
        userRole: 'ADMIN',
        timestamp: new Date().toISOString(),
        details: `Configuración actualizada: ${Object.keys(settings).join(', ')}`
      });

      return updated;
    }
  },

  // --- USERS ---
  getUsers: async (): Promise<UserProfile[]> => {
    if (isFirebaseEnabled) {
      const snap = await getDocs(collection(firebaseDb, 'profiles'));
      return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } else {
      return localDb.getProfiles();
    }
  },

  approveUser: async (uid: string, adminUser: UserProfile): Promise<UserProfile> => {
    const actionLog = {
      id: 'log_' + Date.now(),
      action: 'USUARIO_APROBADO',
      userId: adminUser.uid,
      userName: adminUser.fullName || adminUser.displayName || 'Admin',
      userRole: 'ADMIN' as const,
      timestamp: new Date().toISOString(),
      details: `Usuario UID ${uid} aprobado.`
    };

    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'profiles', uid);
      await updateDoc(docRef, cleanForFirestore({ status: 'APROBADO', rejectionReason: '' }));
      const snap = await getDoc(docRef);
      
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore(actionLog));
      
      // Send Notification to user if valid UID
      if (uid) {
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: uid,
          title: 'Cuenta Aprobada 🎉',
          message: '¡Felicitaciones! El administrador ha aprobado tu cuenta. Ya puedes acceder al dashboard.',
          createdAt: new Date().toISOString(),
          read: false,
          type: 'SUCCESS'
        }));
      }

      return snap.data() as UserProfile;
    } else {
      const profile = localDb.getProfile(uid);
      if (!profile) throw new Error('Usuario no encontrado');
      
      profile.status = 'APROBADO';
      profile.rejectionReason = '';
      localDb.saveProfile(profile);
      
      localDb.saveLog(actionLog);

      // Create Notification
      localDb.saveNotification({
        id: 'notif_' + Date.now(),
        userId: uid,
        title: 'Cuenta Aprobada 🎉',
        message: '¡Felicitaciones! El administrador ha aprobado tu cuenta. Ya puedes acceder al dashboard.',
        createdAt: new Date().toISOString(),
        read: false,
        type: 'SUCCESS'
      });

      return profile;
    }
  },

  rejectUser: async (uid: string, comment: string, adminUser: UserProfile): Promise<UserProfile> => {
    const actionLog = {
      id: 'log_' + Date.now(),
      action: 'USUARIO_RECHAZADO',
      userId: adminUser.uid,
      userName: adminUser.fullName || adminUser.displayName || 'Admin',
      userRole: 'ADMIN' as const,
      timestamp: new Date().toISOString(),
      details: `Usuario UID ${uid} rechazado. Motivo: ${comment || 'Sin motivo'}`
    };

    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'profiles', uid);
      await updateDoc(docRef, cleanForFirestore({ status: 'RECHAZADO', rejectionReason: comment || '' }));
      const snap = await getDoc(docRef);
      
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore(actionLog));
      
      // Send Notification to user
      if (uid) {
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: uid,
          title: 'Solicitud de Ingreso Rechazada ❌',
          message: `Tu solicitud de ingreso fue rechazada por el administrador. Motivo: ${comment || 'Sin motivo'}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'ALERT'
        }));
      }

      return snap.data() as UserProfile;
    } else {
      const profile = localDb.getProfile(uid);
      if (!profile) throw new Error('Usuario no encontrado');
      
      profile.status = 'RECHAZADO';
      profile.rejectionReason = comment;
      localDb.saveProfile(profile);
      
      localDb.saveLog(actionLog);

      // Create Notification
      localDb.saveNotification({
        id: 'notif_' + Date.now(),
        userId: uid,
        title: 'Solicitud de Ingreso Rechazada ❌',
        message: `Tu solicitud de ingreso fue rechazada por el administrador. Motivo: ${comment}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'ALERT'
      });

      return profile;
    }
  },

  deleteUser: async (uid: string, adminUser: UserProfile): Promise<boolean> => {
    const timestamp = new Date().toISOString();
    let targetName = uid;
    
    try {
      if (isFirebaseEnabled) {
        const snap = await getDoc(doc(firebaseDb, 'profiles', uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          targetName = data.fullName || data.displayName || uid;
        }
      } else {
        const profile = localDb.getProfile(uid);
        if (profile) {
          targetName = profile.fullName || profile.displayName || uid;
        }
      }
    } catch (e) {
      console.error('Error fetching profile for logging deletion', e);
    }

    const actionLog = {
      id: 'log_' + Date.now(),
      action: 'USUARIO_ELIMINADO',
      userId: adminUser.uid,
      userName: adminUser.fullName || adminUser.displayName || 'Admin',
      userRole: 'ADMIN' as const,
      timestamp,
      details: `Usuario ${targetName} (UID: ${uid}) eliminado del sistema.`
    };

    if (isFirebaseEnabled) {
      // 1. Delete profile doc
      const profileDocRef = doc(firebaseDb, 'profiles', uid);
      await deleteDoc(profileDocRef);

      // 2. Fetch and unassign tasks assigned to this user
      const tasksQuery = query(collection(firebaseDb, 'tasks'), where('assignedTo', '==', uid));
      const tasksSnap = await getDocs(tasksQuery);
      for (const taskDoc of tasksSnap.docs) {
        const taskData = taskDoc.data() as Task;
        const updatedHistory = [
          ...(taskData.history || []),
          {
            id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            status: 'PENDIENTE' as const,
            changedBy: adminUser.uid,
            changedByName: adminUser.fullName || adminUser.displayName || 'Admin',
            timestamp,
            comment: 'Tarea liberada debido a la eliminación de su encargado'
          }
        ];
        await updateDoc(doc(firebaseDb, 'tasks', taskDoc.id), cleanForFirestore({
          assignedTo: '',
          assignedToName: '',
          status: 'PENDIENTE',
          history: updatedHistory
        }));
      }

      // 3. Fetch and delete notifications of this user
      const notifQuery = query(collection(firebaseDb, 'notifications'), where('userId', '==', uid));
      const notifSnap = await getDocs(notifQuery);
      for (const notifDoc of notifSnap.docs) {
        await deleteDoc(doc(firebaseDb, 'notifications', notifDoc.id));
      }

      // 4. Log the deletion
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore(actionLog));

      return true;
    } else {
      localDb.deleteProfile(uid);
      localDb.saveLog(actionLog);
      return true;
    }
  },

  // --- TASKS ---
  getTasks: async (userId?: string): Promise<Task[]> => {
    if (isFirebaseEnabled) {
      const colRef = collection(firebaseDb, 'tasks');
      const q = userId ? query(colRef, where('assignedTo', '==', userId)) : colRef;
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } else {
      return localDb.getTasks(userId);
    }
  },

  createTask: async (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'history'>, adminUser: UserProfile): Promise<Task> => {
    const id = isFirebaseEnabled ? '' : 'tsk_' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    const newTask: Task = {
      ...taskData,
      id,
      createdAt,
      status: 'PENDIENTE',
      history: [
        {
          id: 'hist_' + Date.now() + '_1',
          status: 'PENDIENTE',
          changedBy: adminUser.uid,
          changedByName: adminUser.fullName || adminUser.displayName || 'Admin',
          timestamp: createdAt,
          comment: 'Tarea asignada inicialmente'
        }
      ]
    };

    if (isFirebaseEnabled) {
      const docRef = await addDoc(collection(firebaseDb, 'tasks'), {});
      newTask.id = docRef.id;
      await setDoc(docRef, cleanForFirestore(newTask));

      // Log
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore({
        action: 'TAREA_CREADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName || 'Admin',
        userRole: 'ADMIN',
        timestamp: createdAt,
        details: `Tarea creada: [${newTask.code}] ${newTask.title}. Asignada a ${newTask.assignedToName || 'Nadie'}`
      }));

      // Notify Worker if assignedTo exists
      if (newTask.assignedTo) {
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: newTask.assignedTo,
          title: 'Nueva Tarea Asignada 📋',
          message: `Se te ha asignado la tarea [${newTask.code}] ${newTask.title}. Prioridad: ${newTask.priority}`,
          createdAt,
          read: false,
          type: newTask.priority === 'URGENTE' ? 'URGENT' : 'INFO'
        }));
      }

      return newTask;
    } else {
      const created = localDb.saveTask(newTask);

      // Log
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'TAREA_CREADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName,
        userRole: 'ADMIN',
        timestamp: createdAt,
        details: `Tarea creada: [${newTask.code}] ${newTask.title}. Asignada a ${newTask.assignedToName}`
      });

      // Notify Worker
      if (newTask.assignedTo) {
        localDb.saveNotification({
          id: 'notif_' + Date.now(),
          userId: newTask.assignedTo,
          title: 'Nueva Tarea Asignada 📋',
          message: `Se te ha asignado la tarea [${newTask.code}] ${newTask.title}. Prioridad: ${newTask.priority}`,
          createdAt,
          read: false,
          type: newTask.priority === 'URGENTE' ? 'URGENT' : 'INFO'
        });
      }

      return created;
    }
  },

  updateTask: async (task: Task, adminUser: UserProfile): Promise<Task> => {
    const timestamp = new Date().toISOString();
    
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'tasks', task.id);
      await setDoc(docRef, cleanForFirestore(task), { merge: true });

      // Log
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore({
        action: 'TAREA_MODIFICADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName || 'Admin',
        userRole: 'ADMIN',
        timestamp,
        details: `Tarea editada: [${task.code}] ${task.title}`
      }));

      // Notify Worker
      if (task.assignedTo) {
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: task.assignedTo,
          title: 'Tarea Modificada ✏️',
          message: `La tarea [${task.code}] ${task.title} ha sido modificada por el administrador.`,
          createdAt: timestamp,
          read: false,
          type: 'INFO'
        }));
      }

      return task;
    } else {
      const updated = localDb.saveTask(task);

      // Log
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'TAREA_MODIFICADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName,
        userRole: 'ADMIN',
        timestamp,
        details: `Tarea editada: [${task.code}] ${task.title}`
      });

      // Notify Worker
      if (task.assignedTo) {
        localDb.saveNotification({
          id: 'notif_' + Date.now(),
          userId: task.assignedTo,
          title: 'Tarea Modificada ✏️',
          message: `La tarea [${task.code}] ${task.title} ha sido modificada por el administrador.`,
          createdAt: timestamp,
          read: false,
          type: 'INFO'
        });
      }

      return updated;
    }
  },

  deleteTask: async (taskId: string, code: string, title: string, adminUser: UserProfile): Promise<boolean> => {
    const timestamp = new Date().toISOString();

    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'tasks', taskId);
      // Get task before deleting to get assignee UID safely
      let task: Task | null = null;
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          task = snap.data() as Task;
        }
      } catch (e) {
        console.error('Error fetching task prior to deletion:', e);
      }

      await deleteDoc(docRef);

      // Log
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore({
        action: 'TAREA_ELIMINADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName || 'Admin',
        userRole: 'ADMIN',
        timestamp,
        details: `Tarea eliminada: [${code}] ${title}`
      }));

      if (task && task.assignedTo) {
        // Notify Worker ONLY if assignedTo is truthy and non-empty
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: task.assignedTo,
          title: 'Tarea Cancelada/Eliminada 🗑️',
          message: `La tarea [${code}] ${title} asignada a ti ha sido eliminada por el administrador.`,
          createdAt: timestamp,
          read: false,
          type: 'ALERT'
        }));
      }

      return true;
    } else {
      const task = localDb.getTask(taskId);
      localDb.deleteTask(taskId);

      // Log
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'TAREA_ELIMINADA',
        userId: adminUser.uid,
        userName: adminUser.fullName || adminUser.displayName,
        userRole: 'ADMIN',
        timestamp,
        details: `Tarea eliminada: [${code}] ${title}`
      });

      if (task && task.assignedTo) {
        // Notify Worker
        localDb.saveNotification({
          id: 'notif_' + Date.now(),
          userId: task.assignedTo,
          title: 'Tarea Cancelada/Eliminada 🗑️',
          message: `La tarea [${code}] ${title} asignada a ti ha sido eliminada por el administrador.`,
          createdAt: timestamp,
          read: false,
          type: 'ALERT'
        });
      }

      return true;
    }
  },

  // Worker workflow change status
  updateTaskStatus: async (taskId: string, newStatus: TaskStatus, user: UserProfile, comment?: string): Promise<Task> => {
    const timestamp = new Date().toISOString();
    
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'tasks', taskId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Tarea no encontrada');
      const task = snap.data() as Task;

      // Update history
      const historyItem = {
        id: 'hist_' + Date.now(),
        status: newStatus,
        changedBy: user.uid,
        changedByName: user.fullName || user.displayName || 'Usuario',
        timestamp,
        comment
      };

      const updatedHistory = [...(task.history || []), historyItem];
      const updates: Partial<Task> = { 
        status: newStatus, 
        history: updatedHistory 
      };

      if (newStatus === 'RECHAZADA' && comment) {
        updates.rejectionComment = comment;
      } else if (newStatus === 'APROBADA') {
        updates.rejectionComment = '';
      }

      await updateDoc(docRef, cleanForFirestore(updates));
      const updatedSnap = await getDoc(docRef);
      const updatedTask = updatedSnap.data() as Task;

      // Log activity
      await addDoc(collection(firebaseDb, 'logs'), cleanForFirestore({
        action: 'ESTADO_TAREA_ACTUALIZADO',
        userId: user.uid,
        userName: user.fullName || user.displayName || 'Usuario',
        userRole: user.role,
        timestamp,
        details: `Tarea [${task.code}] cambió de ${task.status} a ${newStatus}.`
      }));

      // Send appropriate notifications
      if (user.role === 'WORKER') {
        // Notify Admin
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: 'ADMIN',
          title: 'Estado de Tarea Actualizado 📋',
          message: `${user.fullName || user.displayName || 'Técnico'} actualizó la tarea [${task.code}] a "${newStatus}".`,
          createdAt: timestamp,
          read: false,
          type: newStatus === 'PENDIENTE_REVISION' ? 'URGENT' : 'INFO'
        }));
      } else if (task.assignedTo) {
        // Admin approved or rejected - notify Worker if assignedTo exists
        await addDoc(collection(firebaseDb, 'notifications'), cleanForFirestore({
          userId: task.assignedTo,
          title: newStatus === 'APROBADA' ? 'Tarea Aprobada! 🎉' : 'Tarea Rechazada/Requiere Corrección ❌',
          message: newStatus === 'APROBADA' 
            ? `Tu tarea [${task.code}] ${task.title} ha sido aprobada por el administrador.`
            : `Tu tarea [${task.code}] ${task.title} fue rechazada. Motivo: ${comment || 'Sin motivo'}`,
          createdAt: timestamp,
          read: false,
          type: newStatus === 'APROBADA' ? 'SUCCESS' : 'ALERT'
        }));
      }

      return updatedTask;
    } else {
      const task = localDb.getTask(taskId);
      if (!task) throw new Error('Tarea no encontrada');

      const historyItem = {
        id: 'hist_' + Date.now(),
        status: newStatus,
        changedBy: user.uid,
        changedByName: user.fullName || user.displayName,
        timestamp,
        comment
      };

      const updatedHistory = [...(task.history || []), historyItem];
      task.status = newStatus;
      task.history = updatedHistory;

      if (newStatus === 'RECHAZADA' && comment) {
        task.rejectionComment = comment;
      } else if (newStatus === 'APROBADA') {
        task.rejectionComment = '';
      }

      localDb.saveTask(task);

      // Log activity
      localDb.saveLog({
        id: 'log_' + Date.now(),
        action: 'ESTADO_TAREA_ACTUALIZADO',
        userId: user.uid,
        userName: user.fullName || user.displayName,
        userRole: user.role,
        timestamp,
        details: `Tarea [${task.code}] cambió de ${task.status} a ${newStatus}.`
      });

      // Send notifications
      if (user.role === 'WORKER') {
        // Notify Admin
        localDb.saveNotification({
          id: 'notif_' + Date.now(),
          userId: 'ADMIN',
          title: 'Estado de Tarea Actualizado 📋',
          message: `${user.fullName || user.displayName} actualizó la tarea [${task.code}] a "${newStatus}".`,
          createdAt: timestamp,
          read: false,
          type: newStatus === 'PENDIENTE_REVISION' ? 'URGENT' : 'INFO'
        });
      } else if (task.assignedTo) {
        // Admin approved or rejected - notify Worker
        localDb.saveNotification({
          id: 'notif_' + Date.now(),
          userId: task.assignedTo,
          title: newStatus === 'APROBADA' ? 'Tarea Aprobada! 🎉' : 'Tarea Rechazada ❌',
          message: newStatus === 'APROBADA' 
            ? `Tu tarea [${task.code}] ${task.title} ha sido aprobada por el administrador.`
            : `Tu tarea [${task.code}] ${task.title} fue rechazada. Corrección requerida: ${comment}`,
          createdAt: timestamp,
          read: false,
          type: newStatus === 'APROBADA' ? 'SUCCESS' : 'ALERT'
        });
      }

      return task;
    }
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (userId: string): Promise<SystemNotification[]> => {
    if (isFirebaseEnabled) {
      const q = query(
        collection(firebaseDb, 'notifications'), 
        where('userId', 'in', [userId, 'ADMIN'])
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemNotification));
      // Sort client-side to avoid requiring composite indexes
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      return localDb.getNotifications(userId);
    }
  },

  markNotificationRead: async (id: string): Promise<void> => {
    if (isFirebaseEnabled) {
      const docRef = doc(firebaseDb, 'notifications', id);
      await updateDoc(docRef, { read: true });
    } else {
      localDb.markNotificationRead(id);
    }
  },

  // --- LOGS ---
  getLogs: async (): Promise<SystemLog[]> => {
    if (isFirebaseEnabled) {
      const q = query(collection(firebaseDb, 'logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));
    } else {
      return localDb.getLogs();
    }
  }
};

// Auto Payment Calculator helper
export function calculatePayments(workers: UserProfile[], tasks: Task[], weeklyBasePayment: number): PaymentCalculation[] {
  const safeWorkers = Array.isArray(workers) ? workers.filter(Boolean) : [];
  const safeTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const workersList = safeWorkers.filter(w => w.role === 'WORKER' && w.status === 'APROBADO');
  
  return workersList.map(worker => {
    const workerTasks = safeTasks.filter(t => t && t.assignedTo === worker.uid);
    const totalTasks = workerTasks.length;
    const approvedTasks = workerTasks.filter(t => t.status === 'APROBADA').length;
    const pendingTasks = workerTasks.filter(t => t && (t.status === 'PENDIENTE' || t.status === 'ACEPTADA' || t.status === 'EN_PROCESO')).length;
    const rejectedTasks = workerTasks.filter(t => t.status === 'RECHAZADA').length;
    
    // Non-completed / Faltantes (anything not approved and not rejected)
    const missingTasks = workerTasks.filter(t => t.status !== 'APROBADA').length;
    
    const fulfillmentRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 100;
    const suggestedPayment = Math.round(((weeklyBasePayment || 0) * fulfillmentRate) / 100);

    return {
      uid: worker.uid,
      fullName: worker.fullName || worker.displayName || 'Técnico',
      totalTasks,
      approvedTasks,
      pendingTasks,
      rejectedTasks,
      fulfillmentRate,
      suggestedPayment,
      missingTasks
    };
  });
}

export { isFirebaseEnabled, getSavedFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './firebase';

