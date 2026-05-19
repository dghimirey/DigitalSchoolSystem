import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Settings, Save, RefreshCw, Smartphone } from 'lucide-react';
import StudentDetailView from '../shared/StudentDetailView';

export default function ParentDashboard({ user, socket }) {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [stats, setStats] = useState({ attendance: [], marks: [], alerts: [], goals: [], assignments: [], recentAttendance: [] });
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Profile State
  const [profileData, setProfileData] = useState({ name: user?.name || '', mobile: user?.mobile || '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/parent/children', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const childrenList = Array.isArray(data) ? data : [];
        setChildren(childrenList);
        if (childrenList.length > 0) setSelectedChild(childrenList[0]);
      });
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetch(`/api/student/stats/${selectedChild.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          setStats({
            attendance: Array.isArray(data?.attendance) ? data.attendance : [],
            marks: Array.isArray(data?.marks) ? data.marks : [],
            alerts: Array.isArray(data?.alerts) ? data.alerts : [],
            goals: Array.isArray(data?.goals) ? data.goals : [],
            assignments: Array.isArray(data?.assignments) ? data.assignments : [],
            recentAttendance: Array.isArray(data?.recentAttendance) ? data.recentAttendance : []
          });
        });
    }
  }, [selectedChild]);

  useEffect(() => {
    if (socket) {
      socket.on('new_alert', (alert) => {
        setNotifications(prev => [alert, ...prev]);
        setStats(prev => ({ ...prev, alerts: [alert, ...prev.alerts] }));
      });
    }
  }, [socket]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-center">
        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex items-center">
           <button 
             onClick={() => setActiveTab('summary')}
             className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}
           >
             Summary
           </button>
           <button 
             onClick={() => setActiveTab('profile')}
             className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}
           >
             Profile
           </button>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <>
          {/* Header section with Child Selector */}
      <div className="bg-indigo-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
          <GraduationCap className="h-64 w-64" />
        </div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">School App</h1>
            <p className="text-indigo-300 mt-3 font-bold italic text-sm sm:text-base border-l-2 border-indigo-500 pl-4">
              Progress report for {selectedChild?.name || 'your child'}
              {selectedChild && <span className="block text-xs mt-1 text-indigo-400 font-black tracking-widest uppercase">[{selectedChild.class_name} - {selectedChild.section}]</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 bg-black/20 p-2 rounded-3xl backdrop-blur-xl border border-white/10 shadow-inner">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`px-6 py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  selectedChild?.id === child.id 
                    ? 'bg-white text-indigo-900 shadow-xl scale-105' 
                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {child.name}
              </button>
            ))}
            {children.length === 0 && <p className="px-6 py-3 text-xs font-bold text-indigo-300 italic uppercase">Loading...</p>}
          </div>
        </div>
      </div>

      {selectedChild && stats ? (
        <StudentDetailView student={selectedChild} stats={stats} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
           <GraduationCap className="h-24 w-24 mb-6 opacity-30 text-indigo-900" />
           <p className="font-black uppercase tracking-widest text-xs italic">Select a child to see details</p>
        </div>
      )}
    </>
    ) : (
      <div className="max-w-xl mx-auto animate-in fade-in zoom-in duration-500">
         <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-6 mb-10">
               <div className="w-20 h-20 bg-indigo-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                  <Settings size={36} className="animate-spin" />
               </div>
               <div>
                  <h3 className="text-3xl font-black italic text-indigo-900 tracking-tighter uppercase">Settings</h3>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Update your contact profile</p>
               </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
               <div className="space-y-2">
                  <label className="block text-xs font-black text-indigo-900 uppercase tracking-widest ml-1">Parent Name</label>
                  <div className="relative">
                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 h-5 w-5" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                      value={profileData.name}
                      onChange={e => setProfileData({...profileData, name: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="block text-xs font-black text-indigo-900 uppercase tracking-widest ml-1">Mobile Contact</label>
                  <div className="relative">
                    <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 h-5 w-5" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-14 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                      value={profileData.mobile}
                      onChange={e => setProfileData({...profileData, mobile: e.target.value})}
                    />
                  </div>
               </div>

               <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm">
                     <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Account ID</p>
                    <p className="font-mono text-xs font-bold text-indigo-900">@{user?.username}</p>
                  </div>
               </div>

               <button 
                 type="submit" 
                 disabled={profileSaving}
                 className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 <Save size={18} />
                 {profileSaving ? 'Updating...' : 'Save Settings'}
               </button>
            </form>
         </div>
      </div>
    )}
  </div>
);
}


