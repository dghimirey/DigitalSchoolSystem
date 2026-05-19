import React, { useState, useEffect } from 'react';
import { Book, Users, ClipboardCheck, Award, MessageCircle, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function TeacherDashboard({ user }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/teacher/classes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const classList = Array.isArray(data) ? data : [];
        setClasses(classList);
        if (classList.length > 0) setSelectedClass(classList[0]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      fetch(`/api/teacher/students/${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          setStudents(Array.isArray(data) ? data : []);
          setLoading(false);
        });
    }
  }, [selectedClass]);

  const markAttendance = async (studentId, status) => {
    try {
      await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ student_id: studentId, status })
      });
      alert(`Attendance marked: ${status}`);
    } catch (err) {
      console.error(err);
    }
  };

  const [marksData, setMarksData] = useState({ subject: '', month: 'January', score: 0 });
  const enterMarks = async (studentId) => {
    try {
      await fetch('/api/teacher/marks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: studentId,
          subject: marksData.subject,
          exam_month: marksData.month,
          score: parseInt(marksData.score),
          total_marks: 100
        })
      });
      alert('Marks entered successfully');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !selectedClass) return <div className="p-12 text-center">Loading Classes...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar - Class List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Book className="text-indigo-600" /> My Classes
        </h2>
        <div className="space-y-2">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedClass?.id === c.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
            >
              <p className="font-bold">{c.name} - {c.section}</p>
              <p className="text-xs text-indigo-500 uppercase font-semibold mt-1">Primary Teacher</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-3 space-y-8">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex">
          {[
            { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
            { id: 'marks', label: 'Monthly Marks', icon: Award },
            { id: 'analytics', label: 'Performance Insight', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="font-bold text-xl">Daily Attendance - {new Date().toLocaleDateString()}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {students.map(s => (
                <div key={s.id} className="p-6 flex items-center justify-between hover:bg-gray-50/30">
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <p className="text-xs text-gray-500">Roll: {s.roll_number}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => markAttendance(s.id, 'present')} className="px-4 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-lg hover:bg-green-100">Present</button>
                    <button onClick={() => markAttendance(s.id, 'absent')} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100">Absent</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-xl mb-6">Subject Marks Entry</h3>
              {/* ... (existing marks entry UI) ... */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <input 
                  placeholder="Subject (e.g. Math)" 
                  className="px-4 py-2 rounded-lg border bg-white outline-none focus:ring-2 focus:ring-indigo-100" 
                  onChange={e => setMarksData({...marksData, subject: e.target.value})}
                />
                <select className="px-4 py-2 rounded-lg border bg-white outline-none" onChange={e => setMarksData({...marksData, month: e.target.value})}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input 
                  type="number" placeholder="Score (/100)" 
                  className="px-4 py-2 rounded-lg border bg-white outline-none" 
                  onChange={e => setMarksData({...marksData, score: e.target.value})}
                />
              </div>
              <div className="divide-y divide-gray-50">
                {students.map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between">
                    <p className="font-bold">{s.name}</p>
                    <button 
                      onClick={() => enterMarks(s.id)}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-sm hover:indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Post Result
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-xl mb-4">Pending Assignments</h3>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-amber-900">Calculus Worksheet #4</p>
                    <p className="text-sm text-amber-700">Due: Tomorrow</p>
                  </div>
                  <button className="px-4 py-2 bg-white rounded-lg text-xs font-bold text-amber-600 shadow-sm">Remind Parents</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="text-green-500 h-5 w-5" /> Score Distribution</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{n: 'Math', s: 78}, {n: 'Science', s: 85}, {n: 'History', s: 22}, {n: 'English', s: 64}]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="n" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="s" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
              <h4 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500 h-5 w-5" /> At-Risk Students</h4>
              <div className="space-y-4">
                <RiskItem name="Siddharth Thapa" reason="Attendance below 75%" />
                <RiskItem name="Maya Rai" reason="Monthly Marks Dropping" />
                <RiskItem name="Aarav Sharma" reason="3 Missing Assignments" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskItem({ name, reason }) {
  return (
    <div className="p-3 bg-red-50 rounded-xl flex items-center justify-between">
      <div>
        <p className="font-bold text-sm text-red-900">{name}</p>
        <p className="text-xs text-red-600">{reason}</p>
      </div>
      <div className="p-2 bg-white rounded-full text-red-500 shadow-sm">
        <AlertTriangle className="h-4 w-4" />
      </div>
    </div>
  );
}
