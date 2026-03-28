import { useState } from 'react'
import AccountTab from './AccountTab'
import LearningTab from './LearningTab'
import NotificationsTab from './NotificationsTab'
import PrivacyTab from './PrivacyTab'
import ParentalControlTab from './ParentalControlTab'

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('account')

  const tabs = [
    { id: 'account', label: 'Cuenta y Perfil', icon: '👤' },
    { id: 'learning', label: 'Preferencias de Aprendizaje', icon: '🧠' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
    { id: 'privacy', label: 'Privacidad y Datos', icon: '🔒' },
    { id: 'parental', label: 'Control Parental', icon: '👨‍👩‍👧' },
  ]

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 w-full">
      <div className="w-full md:w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 md:sticky md:top-24">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left border ${
                  activeTab === tab.id ? 'bg-indigo-50/70 text-indigo-700 border-indigo-100 shadow-sm' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="text-xl opacity-80">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="flex-1 min-w-0 pb-20">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[500px]">
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'learning' && <LearningTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'privacy' && <PrivacyTab />}
          {activeTab === 'parental' && <ParentalControlTab />}
        </div>
      </div>
    </div>
  )
}
