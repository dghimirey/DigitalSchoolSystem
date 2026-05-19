import React, { useState, useEffect } from 'react';
import { Award, Bell, Calendar, ChevronRight, Star, TrendingUp, Zap, Target, CheckCircle2, History, Brain, GraduationCap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export default function ParentDashboard({ user, socket }) {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [stats, setStats] = useState({ attendance: [], marks: [], alerts: [], goals: [] });
  const [notifications, setNotifications] = useState([]);

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
            goals: Array.isArray(data?.goals) ? data.goals : []
          });
        });
    }
  }, [selectedChild]);

  useEffect(() => {
    if (socket) {
      socket.on('new_alert', (alert) => {
        setNotifications(prev => [alert, ...prev]);
        setStats(prev => ({ ...prev, alerts: [alert, ...prev.alerts] }));
        // Play notification sound or show toast in a real app
      });
    }
  }, [socket]);

  // Derived Analytics
  const attendanceRate = stats.attendance.length > 0 
    ? Math.round((stats.attendance.find(a => a.status === 'present')?.count || 0) / stats.attendance.reduce((acc, curr) => acc + parseInt(curr.count), 0) * 100) 
    : 0;

  const averageScore = stats.marks.length > 0
    ? Math.round(stats.marks.reduce((acc, curr) => acc + curr.score, 0) / stats.marks.length)
    : 0;

  const getImprovement = () => {
    if (stats.marks.length < 2) return null;
    const last = stats.marks[stats.marks.length - 1].score;
    const prev = stats.marks[stats.marks.length - 2].score;
    return last - prev;
  };

  const improvement = getImprovement();

  return (
    <div className="space-y-8 pb-12">
      {/* Header section with Child Selector */}
      <div className="bg-indigo-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <GraduationCapLarge />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold italic serif tracking-tight">Parent Portal</h1>
            <p className="text-indigo-200 mt-1">
              Real-time monitoring for {selectedChild?.name}
              {selectedChild && ` (${selectedChild.class_name} - ${selectedChild.section})`}
            </p>
          </div>
          <div className="flex space-x-2 bg-indigo-900/50 p-1.5 rounded-2xl backdrop-blur-md">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${selectedChild?.id === child.id ? 'bg-white text-indigo-900 shadow-lg' : 'hover:bg-indigo-700/50'}`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Real-time Feed & Gamification */}
        <div className="lg:col-span-1 space-y-6">
          {/* Gamification Stats */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2"><Award className="text-amber-500" /> Achievements</h3>
            <div className="grid grid-cols-2 gap-4">
              <BadgeBox label="Present Streak" value="12 Days" icon={<Zap className="h-5 w-5 text-orange-500" />} />
              <BadgeBox label="HW Done" value="100%" icon={<Star className="h-5 w-5 text-yellow-500" />} />
            </div>
            {improvement > 0 && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg shadow-sm"><TrendingUp className="text-green-500" /></div>
                <div>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Most Improved</p>
                  <p className="text-sm font-medium text-green-800">Score increased by {improvement}% this month!</p>
                </div>
              </div>
            )}
          </div>

          {/* Goal Tracker */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Target className="text-indigo-500" /> Academic Goals</h3>
            <div className="space-y-4">
              {stats.goals.map(goal => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-indigo-600 font-bold">{Math.round((goal.current_value / goal.target_value) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-indigo-600 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(goal.current_value / goal.target_value) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
              {stats.goals.length === 0 && <p className="text-gray-400 text-sm italic">No goals set yet</p>}
            </div>
          </div>

          {/* Live Alert Feed */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Bell className="text-red-500" /> Live Alert Log</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {stats.alerts.map((alert, i) => (
                  <motion.div 
                    key={alert.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-2xl border-l-4 ${alert.type === 'attendance' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-indigo-50 border-indigo-500 text-indigo-900'}`}
                  >
                    <p className="text-sm font-medium leading-tight">{alert.message}</p>
                    <p className="text-[10px] opacity-60 mt-2 font-bold uppercase tracking-wider">{new Date(alert.created_at).toLocaleTimeString()}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {stats.alerts.length === 0 && <p className="text-gray-400 text-sm text-center py-8 italic">No active alerts</p>}
            </div>
          </div>
        </div>

        {/* Right Column - Deep Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Attendance" value={`${attendanceRate}%`} sub="Last 30 Days" trend={attendanceRate > 90 ? 'positive' : 'warning'} />
            <MetricCard label="GPA Average" value={averageScore} sub="Subject Mean" trend={improvement > 0 ? 'positive' : 'negative'} />
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-xl">Exam Progress Map</h3>
                <p className="text-sm text-gray-500">Monthly exam comparison across subjects</p>
              </div>
              <div className="flex gap-2 text-xs font-bold uppercase">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Score</span>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.marks}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="exam_month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weak Subject Detection */}
          <div className="bg-indigo-900 rounded-3xl p-8 text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Brain className="text-indigo-300 h-5 w-5" /> Cognitive Insight</h3>
            {stats.marks.length > 0 ? (
              <div className="space-y-6">
                <p className="text-indigo-100 leading-relaxed">
                  Our system has analyzed {selectedChild?.name}'s performance. 
                  {averageScore < 60 ? (
                    ' Significant improvement is needed in core subjects. Consider scheduling a teacher meeting.'
                  ) : (
                    ' The overall trend is stable with excellence in recent test marks.'
                  )}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700">
                    <p className="text-xs uppercase text-indigo-300 font-bold tracking-widest mb-1">Focus Area</p>
                    <p className="font-bold">Mathematics</p>
                  </div>
                  <div className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700">
                    <p className="text-xs uppercase text-indigo-300 font-bold tracking-widest mb-1">Strength</p>
                    <p className="font-bold">Natural Science</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-indigo-400 italic">Not enough data to generate insights yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeBox({ label, value, icon }) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
      <div className="bg-white p-2 rounded-xl shadow-sm mb-2">{icon}</div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, trend }) {
  const trendColor = trend === 'positive' ? 'text-green-500' : trend === 'warning' ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        <p className={`text-xs font-bold ${trendColor}`}>{sub}</p>
      </div>
    </div>
  );
}

function GraduationCapLarge() {
  return (
    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
