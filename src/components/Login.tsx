import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  LogIn, 
  User, 
  Briefcase, 
  Globe, 
  Phone, 
  Calendar, 
  Mail, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  HelpCircle,
  Database,
  Lock
} from 'lucide-react';
import { authService, isFirebaseEnabled } from '../lib/db';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  teamName: string;
}

export default function Login({ onLoginSuccess, teamName }: LoginProps) {
  // Authentication states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration form states
  const [regUid, setRegUid] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('Colombia');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Approval status screens
  const [statusScreen, setStatusScreen] = useState<{
    status: 'PENDIENTE_APROBACION' | 'RECHAZADO';
    reason?: string;
    email: string;
  } | null>(null);

  // Quick preset login simulation
  const handleQuickLogin = async (presetEmail: string, presetName: string) => {
    setLoading(true);
    setError('');
    try {
      const user = await authService.signInWithGoogle(presetEmail, presetName);
      handleUserRedirect(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingrese un correo válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const computedName = name || email.split('@')[0];
      const user = await authService.signInWithGoogle(email, computedName);
      handleUserRedirect(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleRealGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await authService.signInWithGoogle();
      handleUserRedirect(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google real. Asegúrese de configurar las llaves de Firebase.');
      setLoading(false);
    }
  };

  const handleUserRedirect = (user: UserProfile) => {
    if (user.status === 'PENDIENTE_REGISTRO') {
      setRegUid(user.uid);
      setRegEmail(user.email);
      setFullName(user.displayName);
      setIsNewUser(true);
      setLoading(false);
    } else if (user.status === 'PENDIENTE_APROBACION') {
      setStatusScreen({
        status: 'PENDIENTE_APROBACION',
        email: user.email
      });
      setLoading(false);
    } else if (user.status === 'RECHAZADO') {
      setStatusScreen({
        status: 'RECHAZADO',
        reason: user.rejectionReason,
        email: user.email
      });
      setLoading(false);
    } else if (user.status === 'APROBADO') {
      onLoginSuccess(user);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !age || !country || !phone) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (isNaN(Number(age)) || Number(age) <= 0) {
      setError('Por favor ingrese una edad válida');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const updatedUser = await authService.completeRegistration(regUid, {
        fullName,
        age: Number(age),
        country,
        phone
      });
      setIsNewUser(false);
      handleUserRedirect(updatedUser);
    } catch (err: any) {
      setError(err.message || 'Error al completar el registro');
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="mx-auto w-12 h-12 bg-sky-500/10 dark:bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {teamName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Plataforma de Control de Soporte Técnico
          </p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            Solo cuentas autorizadas
          </div>
        </div>

        {/* Status Error Display */}
        {error && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
              {error}
            </div>
          </div>
        )}

        {/* BODY - SWITCHABLE VIEWS */}
        <div className="p-6">
          
          {/* VIEW 1: REGULAR LOGIN SCREEN */}
          {!isNewUser && !statusScreen && (
            <div className="space-y-6">
              {/* Main Login Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  id="google-real-login-btn"
                  onClick={handleRealGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.68 14.97 1 12 1 7.24 1 3.2 3.74 1.25 7.72l3.75 2.91C5.92 7.07 8.74 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.84c2.15-1.98 3.38-4.9 3.38-8.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5 14.28c-.25-.76-.39-1.57-.39-2.4 0-.83.14-1.64.39-2.4L1.25 6.57C.45 8.18 0 9.99 0 11.88s.45 3.7 1.25 5.31l3.75-2.91z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.67-2.84c-1.02.68-2.33 1.09-4.29 1.09-3.26 0-6.08-2.03-7.06-5.59L1.19 15.6C3.13 19.54 7.21 23 12 23z"
                    />
                  </svg>
                  <span>Iniciar con Google</span>
                </button>
              </div>

              {isFirebaseEnabled && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/10 font-medium">
                  <Database className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Base de datos Firebase Real conectada</span>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: NEW WORKER REGISTRATION FORM */}
          {isNewUser && (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleRegisterSubmit} 
              className="space-y-4"
            >
              <div className="p-3 bg-sky-500/10 text-sky-800 dark:text-sky-300 rounded-lg text-xs font-medium mb-2">
                ¡Primer inicio de sesión detectado! Para registrarte como miembro del equipo, completa tu ficha de soporte técnico:
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Correo Electrónico (Google)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={regEmail}
                    disabled
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Escriba su nombre completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Edad
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      required
                      min="18"
                      max="100"
                      placeholder="Edad"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    País
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="País de residencia"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Número Celular
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Ej: +57 300 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <span>Enviar Registro para Aprobación</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsNewUser(false);
                  authService.signOut();
                }}
                className="w-full mt-1 text-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                Volver atrás
              </button>
            </motion.form>
          )}

          {/* VIEW 3: ACCOUNT RESTRICTION STATES (PENDING / REJECTED) */}
          {statusScreen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              {statusScreen.status === 'PENDIENTE_APROBACION' ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center">
                    <Clock className="w-10 h-10 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Registro Pendiente de Aprobación
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                      Su cuenta ha sido creada exitosamente con el correo <strong>{statusScreen.email}</strong>, pero requiere la aprobación del administrador para ingresar.
                    </p>
                    <div className="p-3 bg-amber-500/5 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      Por favor, notifique a su administrador para que apruebe su solicitud en la pestaña de <strong>"Solicitudes de ingreso"</strong>.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Registro Rechazado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Su solicitud para el correo <strong>{statusScreen.email}</strong> ha sido rechazada por el administrador.
                    </p>
                    
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 text-left rounded-xl space-y-1">
                      <div className="text-xs font-semibold text-red-800 dark:text-red-400">
                        Motivo de Rechazo:
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 italic">
                        "{statusScreen.reason || 'Sin comentarios adicionales.'}"
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setStatusScreen(null);
                  authService.signOut();
                }}
                className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cerrar Sesión / Volver
              </button>
            </motion.div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 text-center flex items-center justify-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            ¿Problemas para ingresar? Contacte a soporte de infraestructura.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
