'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, ChevronRight, Bell, Lock, Eye, Mail, Smartphone, AlertCircle, Menu } from 'lucide-react'
import { authAPI, settingsAPI, APIError } from '@/lib/apiClient'
import { resetDemoData } from '@/lib/mockBackend'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'



const SETTINGS_KEY_MAP: Record<string, string> = {
  timezone: 'timezone',
  language: 'language',
  theme: 'theme',
  emailNotifications: 'email_notifications',
  smsNotifications: 'sms_notifications',
  pushNotifications: 'push_notifications',
  alertSeverity: 'alert_severity',
  consumptionThreshold: 'consumption_threshold',
  temperatureThreshold: 'temperature_threshold',
  costThreshold: 'cost_threshold',
  twoFactor: 'two_factor',
  sessionTimeout: 'session_timeout',
  autoLogout: 'auto_logout',
}

const DEFAULT_SETTINGS = {
  // General
  timezone: 'Asia/Jakarta',
  language: 'id',
  theme: 'light',

  // Notifications
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  alertSeverity: 'high',

  // Thresholds
  consumptionThreshold: 15,
  temperatureThreshold: 70,
  costThreshold: 50000,

  // Security
  twoFactor: false,
  sessionTimeout: 30,
  autoLogout: true,
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [profile, setProfile] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const me = await authAPI.me()
        
        let userSettingsObj: any = null
        try {
          userSettingsObj = await settingsAPI.getUserSettings(me.id)
        } catch (err) {
          if (err instanceof APIError && err.status === 404) {
            console.log('User settings not found for this user, using defaults.')
          } else {
            console.error('Error fetching user settings, will fallback:', err)
          }
        }
        
        // Merge API settings with defaults
        const mergedSettings = { ...DEFAULT_SETTINGS }
        if (userSettingsObj) {
          Object.keys(SETTINGS_KEY_MAP).forEach((uiKey) => {
            const dbKey = SETTINGS_KEY_MAP[uiKey]
            if (dbKey in userSettingsObj) {
              const val = userSettingsObj[dbKey]
              if (typeof (DEFAULT_SETTINGS as any)[uiKey] === 'boolean') {
                ;(mergedSettings as any)[uiKey] = (val === true || val === 1 || val === 'true')
              } else if (typeof (DEFAULT_SETTINGS as any)[uiKey] === 'number') {
                ;(mergedSettings as any)[uiKey] = Number(val)
              } else {
                ;(mergedSettings as any)[uiKey] = val
              }
            }
          })
        }
        
        setSettings(mergedSettings)
        setProfile({
          full_name: me.full_name || '',
          email: me.email || '',
          password: '',
          phone: '',
        })
        setError(null)
      } catch (err) {
        console.error('Error loading settings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] })
  }

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const me = await authAPI.me()
      
      const payload: Record<string, any> = {}
      Object.keys(SETTINGS_KEY_MAP).forEach((uiKey) => {
        const dbKey = SETTINGS_KEY_MAP[uiKey]
        const val = (settings as any)[uiKey]
        payload[dbKey] = typeof val === 'boolean' ? (val ? 1 : 0) : val
      })
      
      await settingsAPI.updateUserSettings(me.id, payload)
      setError(null)
      alert('Pengaturan berhasil disimpan!')
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsProfileSaving(true)
      await authAPI.updateProfile({
        full_name: profile.full_name,
        email: profile.email,
        password: profile.password || undefined,
      })
      await refreshUser()
      setProfile((prev) => ({ ...prev, password: '' }))
      alert('Profil berhasil diperbarui!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsProfileSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: 'url(/sier-building-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/95 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Pengaturan" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Action Header bar */}
        <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-slate-900 font-bold text-sm">Konfigurasi Smart Energy</h2>
            <p className="text-slate-500 text-xs mt-0.5">Sesuaikan pengaturan sistem dan parameter akun Anda</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || loading}
            className="px-6 py-2 bg-[#2f46a3] hover:bg-teal-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 smooth-transition"
          >
            <Save size={16} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-4 bg-red-100 border-l-4 border-red-500 p-4 text-red-700 relative z-10 rounded-r-lg">
            <p className="text-xs font-bold">Error: {error}</p>
          </div>
        )}

        {/* Content Tabs Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-8 gap-6 relative z-10">
          {/* Tab Menu */}
          <div className="w-full md:w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit shrink-0">
            <div className="space-y-1">
              {[
                { id: 'general', label: 'Pengaturan Umum', icon: <Settings size={18} /> },
                { id: 'notifications', label: 'Pemberitahuan', icon: <Bell size={18} /> },
                { id: 'thresholds', label: 'Ambang Batas', icon: <AlertCircle size={18} /> },
                { id: 'security', label: 'Keamanan', icon: <Lock size={18} /> },
                { id: 'account', label: 'Akun', icon: <Menu size={18} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#2f46a3] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-y-auto">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Pengaturan Umum</h3>
                
                <div className="space-y-4">
                  <SettingItem
                    label="Zona Waktu"
                    description="Atur zona waktu lokal Anda untuk log dan pelaporan"
                  >
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3] text-slate-700 font-bold"
                    >
                      <option>Asia/Jakarta</option>
                      <option>Asia/Bangkok</option>
                      <option>Asia/Manila</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    label="Bahasa"
                    description="Pilih bahasa pilihan Anda untuk antarmuka pengguna"
                  >
                    <select
                      value={settings.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3] text-slate-700 font-bold"
                    >
                      <option value="id">Indonesia</option>
                      <option value="en">English</option>
                      <option value="th">Thai</option>
                    </select>
                  </SettingItem>

                  <SettingItem
                    label="Tema"
                    description="Pilih tema tampilan untuk dashboard"
                  >
                    <select
                      value={settings.theme}
                      onChange={(e) => handleChange('theme', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3] text-slate-700 font-bold"
                    >
                      <option value="light">Terang</option>
                      <option value="dark">Gelap</option>
                      <option value="auto">Otomatis</option>
                    </select>
                  </SettingItem>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Preferensi Pemberitahuan</h3>
                
                <div className="space-y-4">
                  <ToggleItem
                    label="Pemberitahuan Email"
                    description="Terima pemberitahuan penting melalui email terdaftar"
                    checked={settings.emailNotifications}
                    icon={<Mail size={18} />}
                    onChange={() => handleToggle('emailNotifications')}
                  />

                  <ToggleItem
                    label="Pemberitahuan SMS"
                    description="Terima notifikasi darurat langsung melalui SMS"
                    checked={settings.smsNotifications}
                    icon={<Smartphone size={18} />}
                    onChange={() => handleToggle('smsNotifications')}
                  />

                  <ToggleItem
                    label="Pemberitahuan Push"
                    description="Aktifkan notifikasi langsung di browser/aplikasi"
                    checked={settings.pushNotifications}
                    icon={<Bell size={18} />}
                    onChange={() => handleToggle('pushNotifications')}
                  />

                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 mt-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tingkat Keparahan Alert (Alert Severity Level)</label>
                    <select
                      value={settings.alertSeverity}
                      onChange={(e) => handleChange('alertSeverity', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#2f46a3] text-slate-700 font-bold"
                    >
                      <option value="all">Semua Alert</option>
                      <option value="high">Hanya Tinggi & Kritis</option>
                      <option value="critical">Hanya Kritis</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Thresholds */}
            {activeTab === 'thresholds' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Ambang Batas Alert (Thresholds)</h3>
                
                <div className="space-y-4">
                  <SettingItem
                    label="Ambang Batas Konsumsi Daya"
                    description="Picu peringatan ketika konsumsi melebihi batas (kWh)"
                  >
                    <input
                      type="number"
                      value={settings.consumptionThreshold}
                      onChange={(e) => handleChange('consumptionThreshold', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </SettingItem>

                  <SettingItem
                    label="Ambang Batas Suhu Ruangan"
                    description="Picu peringatan ketika suhu ruangan melebihi batas (°C)"
                  >
                    <input
                      type="number"
                      value={settings.temperatureThreshold}
                      onChange={(e) => handleChange('temperatureThreshold', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </SettingItem>

                  <SettingItem
                    label="Ambang Batas Estimasi Biaya Harian"
                    description="Picu peringatan ketika biaya harian melebihi estimasi (Rp)"
                  >
                    <input
                      type="number"
                      value={settings.costThreshold}
                      onChange={(e) => handleChange('costThreshold', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </SettingItem>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Pengaturan Keamanan</h3>
                
                <div className="space-y-4">
                  <ToggleItem
                    label="Autentikasi Dua Faktor (2FA)"
                    description="Tingkatkan keamanan login akun Anda menggunakan OTP"
                    checked={settings.twoFactor}
                    icon={<Lock size={18} />}
                    onChange={() => handleToggle('twoFactor')}
                  />

                  <ToggleItem
                    label="Keluar Otomatis"
                    description="Logout otomatis ketika sesi tidak aktif terdeteksi"
                    checked={settings.autoLogout}
                    icon={<Eye size={18} />}
                    onChange={() => handleToggle('autoLogout')}
                  />

                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 mt-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Batas Waktu Sesi Aktif (menit)</label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#2f46a3]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Pengaturan Akun</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Akun</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kata Sandi Baru (Opsional)</label>
                    <input
                      type="password"
                      placeholder="Kosongkan jika tidak ingin mengubah"
                      value={profile.password}
                      onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
                    />
                  </div>

                  <div className="rounded-lg bg-slate-100 border border-slate-200 p-4 text-xs font-bold text-slate-600">
                    Role Aktif Anda: <span className="font-extrabold text-[#2f46a3] uppercase">{user?.role || '-'}</span>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isProfileSaving}
                    className="px-4 py-2.5 bg-[#2f46a3] hover:bg-teal-850 transition-all font-bold text-xs uppercase tracking-wider text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProfileSaving ? 'Menyimpan profil...' : 'Simpan Profil'}
                  </button>

                  {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
                    <>
                      <hr className="my-6 border-slate-200" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-700 mb-1">Mode Demo</h4>
                        <p className="text-xs text-slate-400 mb-2">
                          Kembalikan seluruh data demo (perangkat, user, pemberitahuan, penghuni ruangan, jadwal) ke kondisi awal seolah baru pertama dibuka.
                        </p>
                        <button
                          onClick={() => {
                            if (!confirm('Reset seluruh data demo ke kondisi awal? Perubahan yang dibuat selama sesi ini akan hilang.')) return
                            resetDemoData()
                            window.location.reload()
                          }}
                          className="px-4 py-2 border border-amber-400 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all text-xs font-bold uppercase tracking-wider"
                        >
                          Reset Data Demo
                        </button>
                      </div>
                    </>
                  )}

                  <hr className="my-6 border-slate-200" />

                  <div>
                    <h4 className="font-bold text-sm text-red-600 mb-2">Zona Berbahaya</h4>
                    <button className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-wider">
                      Hapus Akun
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function SettingItem({ label, description, children }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      {children}
    </div>
  )
}

function ToggleItem({ label, description, checked, icon, onChange }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex items-center justify-between gap-4">
      <div className="flex items-center space-x-4">
        <div className="p-2.5 bg-white rounded-lg text-slate-600 border border-slate-200">{icon}</div>
        <div>
          <p className="font-bold text-sm text-gray-900 leading-tight">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#2f46a3]' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
