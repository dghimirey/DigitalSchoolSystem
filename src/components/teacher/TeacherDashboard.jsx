import React, { useState, useEffect } from 'react';
import { Book, Users, ClipboardCheck, Award, MessageCircle, BarChart3, TrendingUp, AlertTriangle, Calendar, Plus, CheckCircle2, XCircle, CheckSquare, Square, ChevronRight, Save, RefreshCw, Menu, X as CloseIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TeacherDashboard({ user }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [showMobileClasses, setShowMobileClasses] = useState(false);
  
  // Profile State
  const [profileData, setProfileData] = useState({ name: user?.name || '', mobile: user?.mobile || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Subjects State
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState({ name: '', full_marks: 100, pass_marks: 40 });
  const [showAddSubject, setShowAddSubject] = useState(false);
  
  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isAttendanceDirty, setIsAttendanceDirty] = useState(false);

  // Assignments State
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [isSubmissionsDirty, setIsSubmissionsDirty] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Analytics State
  const [performanceData, setPerformanceData] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  
  // Marks State
  const [marksConfig, setMarksConfig] = useState({ subject: '', month: 'January', fullMarks: 100 });
  const [currentMarks, setCurrentMarks] = useState({});

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
      fetchStudents();
      fetchAssignments();
      fetchSubjects();
      fetchClassStats();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [selectedClass, attendanceDate, activeTab]);

  useEffect(() => {
    if (selectedAssignment && activeTab === 'assignments') {
      fetchSubmissions();
    }
  }, [selectedAssignment, activeTab]);

  const fetchStudents = async () => {
    const res = await fetch(`/api/teacher/students/${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (selectedClass && activeTab === 'assignments') {
      fetchAssignments();
    }
  }, [selectedClass, activeTab, assignmentDate, assignmentSubject]);

  const fetchAssignments = async () => {
    setAssignmentLoading(true);
    try {
      const url = `/api/teacher/assignments/${selectedClass.id}?date=${assignmentDate}${assignmentSubject ? `&subject=${assignmentSubject}` : ''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAssignments(list);
      
      if (list.length > 0) {
        setSelectedAssignment(list[0]);
      } else {
        setSelectedAssignment(null);
        setSubmissions({});
      }
    } catch (err) { console.error(err); }
    setAssignmentLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`/api/teacher/subjects/${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSubjects(list);
      if (list.length > 0 && !marksConfig.subject) {
        setMarksConfig(prev => ({ ...prev, subject: list[0].name, fullMarks: list[0].full_marks }));
      }
    } catch (err) { console.error(err); }
  };

  const fetchClassStats = async () => {
    try {
      const res = await fetch(`/api/teacher/class-stats/${selectedClass.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.averages) {
        setPerformanceData(data.averages.map(a => ({
          n: a.subject,
          s: Math.round(a.avg_score)
        })));
      }
      if (data.atRisk) {
        setAtRiskStudents(data.atRisk);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teacher/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newSubject, class_id: selectedClass.id })
      });
      if (res.ok) {
        setShowAddSubject(false);
        setNewSubject({ name: '', full_marks: 100, pass_marks: 40 });
        fetchSubjects();
      }
    } catch (err) { console.error(err); }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      const res = await fetch(`/api/teacher/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSubjects();
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/teacher/attendance/${selectedClass.id}/${attendanceDate}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapping = {};
        data.forEach(a => mapping[a.student_id] = a.status);
        setAttendanceData(mapping);
        setIsAttendanceDirty(false);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/teacher/submissions/${selectedAssignment.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapping = {};
        data.forEach(s => mapping[s.student_id] = s.status);
        setSubmissions(mapping);
        setIsSubmissionsDirty(false);
      }
    } catch (err) { console.error(err); }
  };

  const markAttendance = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
    setIsAttendanceDirty(true);
  };

  const saveAttendance = async () => {
    try {
      const studentIds = Object.keys(attendanceData);
      let success = true;
      for (const sid of studentIds) {
        const res = await fetch('/api/teacher/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ student_id: sid, status: attendanceData[sid], date: attendanceDate })
        });
        if (!res.ok) success = false;
      }
      if (success) {
        setIsAttendanceDirty(false);
        alert('Attendance saved successfully');
      } else {
        alert('Some records failed to save');
      }
    } catch (err) { console.error(err); }
  };

  const handleAutoCreateAssignment = async () => {
    if (!assignmentSubject) return alert('Please select a subject first');
    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          class_id: selectedClass.id, 
          title: `${assignmentSubject} - ${assignmentDate}`,
          subject: assignmentSubject,
          due_date: assignmentDate,
          description: `Daily assignment for ${assignmentSubject}`
        })
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (err) { console.error(err); }
  };

  const toggleSubmission = (studentId) => {
    const currentStatus = submissions[studentId] === 'submitted' ? 'unsubmitted' : 'submitted';
    setSubmissions(prev => ({ ...prev, [studentId]: currentStatus }));
    setIsSubmissionsDirty(true);
  };

  const saveSubmissions = async () => {
    if (!selectedAssignment) return;
    try {
      const studentIds = Object.keys(submissions);
      let success = true;
      for (const sid of studentIds) {
        const res = await fetch('/api/teacher/submissions/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ assignment_id: selectedAssignment.id, student_id: sid, status: submissions[sid] })
        });
        if (!res.ok) success = false;
      }
      if (success) {
        setIsSubmissionsDirty(false);
        alert('Assignment completions saved successfully');
      } else {
        alert('Some records failed to save');
      }
    } catch (err) { console.error(err); }
  };

  const loadMarks = async () => {
    if (!marksConfig.subject) return alert('Enter subject name');
    try {
      const res = await fetch(`/api/teacher/marks/${selectedClass.id}/${marksConfig.subject}/${marksConfig.month}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapping = {};
        data.forEach(m => mapping[m.student_id] = m.score);
        setCurrentMarks(mapping);
        if (data.length > 0 && data[0].total_marks) {
          setMarksConfig(prev => ({ ...prev, fullMarks: data[0].total_marks }));
        }
      }
    } catch (err) { console.error(err); }
  };

  const saveMark = async (studentId, score) => {
    if (!score && score !== 0) return alert('Enter a score');
    const numericScore = parseInt(score);
    if (numericScore > marksConfig.fullMarks) {
      return alert(`Invalid Score: ${numericScore} exceeds full marks of ${marksConfig.fullMarks}`);
    }

    try {
      const res = await fetch('/api/teacher/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          student_id: studentId, 
          subject: marksConfig.subject, 
          exam_month: marksConfig.month, 
          score: numericScore, 
          total_marks: marksConfig.fullMarks 
        })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save marks');
      }
    } catch (err) { 
      console.error(err);
      alert('A network error occurred while saving marks.');
    }
  };

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

  if (loading && !selectedClass) return <div className="p-12 text-center flex flex-col items-center gap-4"><RefreshCw className="animate-spin h-8 w-8 text-indigo-500" /> <p className="font-bold">Loading...</p></div>;

  if (!selectedClass && !loading) {
    return (
      <div className="p-12 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-2xl font-black italic">No Class Assigned</h2>
        <p className="text-gray-500 max-w-md mx-auto">You haven't been assigned to a class yet. Please contact the school administrator to assign your grade and section.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-screen">
      {/* Mobile Header for Classes */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <span className="font-black uppercase tracking-widest text-xs text-indigo-900">
            {selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : 'Select Class'}
          </span>
        </div>
        <button 
          onClick={() => setShowMobileClasses(!showMobileClasses)}
          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
        >
          {showMobileClasses ? <CloseIcon size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Class List Sidebar */}
      <div className={`${showMobileClasses ? 'block' : 'hidden'} lg:block w-full lg:w-72 space-y-4 shrink-0`}>
        <h2 className="hidden lg:flex text-xl font-black italic items-center gap-3 px-2 uppercase tracking-tighter text-indigo-900">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          My Classes
        </h2>
        <div className="space-y-2 max-h-[50vh] lg:max-h-full overflow-y-auto pr-1">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedClass(c);
                setShowMobileClasses(false);
              }}
              className={`w-full text-left p-5 rounded-[1.5rem] border transition-all duration-300 ${
                selectedClass?.id === c.id 
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-1' 
                  : 'border-white bg-white hover:border-gray-200 shadow-sm text-gray-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className={`font-black text-lg ${selectedClass?.id === c.id ? 'text-white' : 'text-gray-900'}`}>{c.name}</p>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${selectedClass?.id === c.id ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  {c.section}
                </span>
              </div>
              <p className={`text-[10px] font-black mt-2 flex items-center gap-1 uppercase tracking-widest ${selectedClass?.id === c.id ? 'text-indigo-200' : 'text-indigo-400'}`}>
                <Users className="h-3 w-3" /> Manage
              </p>
            </button>
          ))}
        </div>

        {/* Action Quicklinks can go here */}
      </div>

      {/* Main Area */}
      <div className="flex-1 space-y-6">
        {/* Responsive Tabs */}
        <div className="bg-white p-1.5 rounded-[2rem] border border-gray-100 flex overflow-x-auto no-scrollbar shadow-sm sticky top-16 z-40 backdrop-blur-sm bg-white/90">
          {[
            { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
            { id: 'subjects', label: 'Subjects', icon: Book },
            { id: 'assignments', label: 'Assignments', icon: Book },
            { id: 'marks', label: 'Marks', icon: Award },
            { id: 'analytics', label: 'Reports', icon: BarChart3 },
            { id: 'profile', label: 'Profile', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit whitespace-nowrap flex items-center justify-center space-x-2 px-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="font-black text-3xl tracking-tighter text-indigo-900 uppercase">Attendance</h3>
                  <p className="text-gray-400 font-bold italic text-sm">Class: {selectedClass?.name} - Section {selectedClass?.section}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-4 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 shadow-inner group">
                    <Calendar className="h-5 w-5 text-indigo-600 group-focus-within:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={attendanceDate} 
                      onChange={e => setAttendanceDate(e.target.value)}
                      className="bg-transparent font-black outline-none cursor-pointer text-indigo-900"
                    />
                  </div>
                  {isAttendanceDirty && (
                    <button 
                      onClick={saveAttendance}
                      className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all animate-pulse"
                    >
                      <Save className="h-4 w-4" />
                      <span>Update Attendance</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Responsive Attendance List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No.</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-indigo-50/20 group transition-colors">
                        <td className="px-8 py-6 font-mono text-xs font-black text-indigo-300 group-hover:text-indigo-600 transition-colors">#{String(s.roll_number).padStart(3, '0')}</td>
                        <td className="px-8 py-6">
                          <p className="font-black text-gray-900 text-sm">{s.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase italic">Student</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end space-x-1 sm:space-x-2">
                            <button 
                              onClick={() => markAttendance(s.id, 'present')} 
                              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                attendanceData[s.id] === 'present' 
                                  ? 'bg-green-600 text-white shadow-xl shadow-green-100 ring-2 ring-green-500/20' 
                                  : 'bg-white border border-gray-100 text-gray-400 hover:border-green-200 hover:text-green-600'
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Present</span>
                            </button>
                            <button 
                              onClick={() => markAttendance(s.id, 'absent')} 
                              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                attendanceData[s.id] === 'absent' 
                                  ? 'bg-red-600 text-white shadow-xl shadow-red-100 ring-2 ring-red-500/20' 
                                  : 'bg-white border border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-600'
                              }`}
                            >
                              <XCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">Absent</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Subjects</h3>
                <button 
                  onClick={() => setShowAddSubject(true)}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Subject</span>
                </button>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Name</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pass Marks</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subjects.map(sub => (
                      <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-gray-800">{sub.name}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase">Max</span>
                              <span className="font-mono text-sm font-black text-indigo-600">{sub.full_marks}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase">Pass</span>
                              <span className="font-mono text-sm font-black text-green-600">{sub.pass_marks}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deleteSubject(sub.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <XCircle size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-8 py-12 text-center text-gray-400 italic">No subjects added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 lg:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none">
                 <CheckSquare className="w-64 h-64" />
              </div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-gray-50 pb-8">
                  <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-900">Daily Submission</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Mark student tasks for specific subjects</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100">
                      <Calendar className="h-4 w-4 text-indigo-500 mr-3" />
                      <input 
                        type="date" 
                        value={assignmentDate}
                        onChange={e => setAssignmentDate(e.target.value)}
                        className="bg-transparent font-bold outline-none text-sm text-indigo-900 cursor-pointer"
                      />
                    </div>

                    <select 
                      className="px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold text-sm text-indigo-900"
                      value={assignmentSubject}
                      onChange={e => setAssignmentSubject(e.target.value)}
                    >
                      <option value="">Choose Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>

                    {!selectedAssignment && assignmentSubject && (
                      <button 
                        onClick={handleAutoCreateAssignment}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                      >
                        Start Checklist
                      </button>
                    )}
                  </div>
                </div>

                {!assignmentSubject ? (
                  <div className="text-center py-20 bg-gray-50/30 rounded-[2.5rem] border border-dashed border-gray-100">
                     <Book size={48} className="mx-auto text-gray-200 mb-4" />
                     <p className="text-gray-400 font-bold italic">Select a subject above to manage submissions.</p>
                  </div>
                ) : !selectedAssignment ? (
                  <div className="text-center py-20 bg-gray-50/30 rounded-[2.5rem] border border-dashed border-gray-100">
                     <AlertTriangle size={48} className="mx-auto text-amber-200 mb-4" />
                     <p className="text-gray-400 font-bold italic mb-6">No session started for this subject on {assignmentDate}.</p>
                     <button 
                        onClick={handleAutoCreateAssignment}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl"
                      >
                        Create Session for {assignmentDate}
                      </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                       <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Subject: {selectedAssignment.subject}</p>
                          <h4 className="text-2xl font-black italic text-indigo-900 tracking-tighter uppercase">Submission Log - {assignmentDate}</h4>
                       </div>
                       <div className="flex items-center gap-6">
                          {isSubmissionsDirty && (
                            <button 
                              onClick={saveSubmissions}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              Update Log
                            </button>
                          )}
                          <div className="text-right">
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Completed</p>
                             <p className="font-black text-indigo-900">{Object.values(submissions).filter(s => s === 'submitted').length} / {students.length}</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                             <CheckSquare size={20} />
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {students.map(s => {
                        const isDone = submissions[s.id] === 'submitted';
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => toggleSubmission(s.id)}
                            className={`p-5 rounded-[1.8rem] border cursor-pointer transition-all flex items-center justify-between group ${isDone ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-0.5' : 'bg-white border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/10 text-gray-900'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono text-xs font-black transition-colors ${isDone ? 'bg-indigo-700 text-indigo-200' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                {s.roll_number}
                              </div>
                              <div>
                                <p className="font-black text-sm">{s.name}</p>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-indigo-200' : 'text-gray-400'}`}>
                                  {isDone ? 'Task Completed' : 'Incomplete'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-white text-indigo-600 scale-110 shadow-lg' : 'bg-gray-50 border border-gray-100 text-gray-200 group-hover:text-indigo-300 group-hover:border-indigo-200'}`}>
                               {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <select 
                className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                value={marksConfig.subject}
                onChange={e => {
                  const selectedSub = subjects.find(s => s.name === e.target.value);
                  setMarksConfig({
                    ...marksConfig, 
                    subject: e.target.value,
                    fullMarks: selectedSub ? selectedSub.full_marks : 100
                  });
                }}
              >
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <select 
                className="px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none font-bold"
                value={marksConfig.month}
                onChange={e => setMarksConfig({...marksConfig, month: e.target.value})}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
              </select>
              <div className="flex flex-col">
                <input 
                  type="number" 
                  title="Full Marks"
                  className="px-6 py-4 rounded-2xl border border-gray-100 bg-white outline-none focus:ring-4 focus:ring-indigo-100 font-black text-indigo-600 w-24"
                  value={marksConfig.fullMarks}
                  onChange={e => setMarksConfig({...marksConfig, fullMarks: parseInt(e.target.value) || 0})}
                />
                <span className="text-[8px] font-black uppercase text-gray-400 text-center mt-1">Full Marks</span>
              </div>
              <button 
                onClick={loadMarks}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Load
              </button>
              <button 
                onClick={async () => {
                  const studentIds = Object.keys(currentMarks);
                  if (studentIds.length === 0) return alert('No marks to save');
                  let success = true;
                  for (const sid of studentIds) {
                    try {
                      const score = currentMarks[sid];
                      if (score === '' || score === null) continue;
                      const res = await fetch('/api/teacher/marks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ 
                          student_id: sid, 
                          subject: marksConfig.subject, 
                          exam_month: marksConfig.month, 
                          score: parseInt(score), 
                          total_marks: marksConfig.fullMarks 
                        })
                      });
                      if (!res.ok) success = false;
                    } catch (e) { success = false; }
                  }
                  if (success) alert('All marks saved successfully!');
                  else alert('Some marks failed to save. Please check individual records.');
                }}
                className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Save All
              </button>
            </div>

            <div className="space-y-3">
              {students.map(s => (
                <div key={s.id} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-gray-300 group-hover:text-indigo-200 transition-colors">{s.roll_number}</span>
                    <p className="font-bold text-gray-800">{s.name}</p>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                      <input 
                        type="number" 
                        max={marksConfig.fullMarks}
                        placeholder="0"
                        className={`w-24 px-4 py-3 rounded-xl border bg-white text-center font-black outline-none transition-all ${
                          parseInt(currentMarks[s.id]) > marksConfig.fullMarks 
                            ? 'border-red-500 ring-2 ring-red-100 bg-red-50' 
                            : (subjects.find(sub => sub.name === marksConfig.subject)?.pass_marks > parseInt(currentMarks[s.id]))
                              ? 'border-amber-400 focus:ring-4 focus:ring-amber-50 bg-amber-50/10'
                              : 'border-gray-200 focus:ring-2 focus:ring-indigo-500'
                        }`}
                        value={currentMarks[s.id] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setCurrentMarks({...currentMarks, [s.id]: val});
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-gray-400 font-black text-xs">/ {marksConfig.fullMarks}</span>
                        {(subjects.find(sub => sub.name === marksConfig.subject)?.pass_marks > parseInt(currentMarks[s.id])) && (
                          <span className="text-[8px] font-black uppercase text-amber-600 tracking-tighter animate-pulse">Below Pass</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => saveMark(s.id, currentMarks[s.id])}
                      className="p-3 bg-white text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all border border-gray-100 shadow-sm"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 bg-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150">
                  <Book className="w-64 h-64" />
               </div>
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div>
                    <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Class Summary</h4>
                    <p className="text-indigo-200 font-bold max-w-sm">Summary of current class progress and performance.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Total Subjects</p>
                       <p className="text-4xl font-black italic">{subjects.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Pass Ratio (Avg)</p>
                       <p className="text-4xl font-black italic">84%</p>
                    </div>
                  </div>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold mb-4 flex items-center gap-2 font-black"><TrendingUp className="text-green-500 h-5 w-5" /> Marks Overview</h4>
              <div className="h-64">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="n" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontStyle: 'italic', fontWeight: 600, fill: '#94a3b8'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                      />
                      <Tooltip cursor={{fill: '#f8fafc', radius: 10}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="s" radius={[12, 12, 0, 0]} barSize={32}>
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#ec4899'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm">
                    <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                    No performance data recorded yet.
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm border-l-8 border-l-red-500">
              <h4 className="font-black text-xl mb-6 flex items-center gap-2"><AlertTriangle className="text-red-500 h-6 w-6" /> Alerts</h4>
              <div className="space-y-4">
                {atRiskStudents.length > 0 ? atRiskStudents.map((s, idx) => (
                  <RiskItem key={idx} name={s.name} reason={`${s.absences} Absences`} />
                )) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-100 mx-auto mb-2" />
                    <p className="text-gray-300 font-black uppercase tracking-widest text-xs">Everything looks good</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <Users size={40} />
              </div>
              <div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-900">My Profile</h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Manage your teacher account info</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  value={profileData.name}
                  onChange={e => setProfileData({...profileData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  value={profileData.mobile}
                  onChange={e => setProfileData({...profileData, mobile: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Role & Username</label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="px-6 py-4 rounded-2xl border border-gray-100 bg-gray-200/50 text-gray-500 font-black uppercase text-[10px] tracking-widest flex items-center">
                      Teacher Account
                   </div>
                   <div className="px-6 py-4 rounded-2xl border border-gray-100 bg-gray-200/50 text-gray-500 font-mono text-xs flex items-center">
                      @{user?.username}
                   </div>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={profileSaving}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        )}
        </div>
      </div>

      {showAddSubject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Add Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  type="text" required 
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  value={newSubject.name}
                  onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-2">Max Marks</label>
                  <input 
                    type="number" required 
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                    value={newSubject.full_marks}
                    onChange={e => setNewSubject({...newSubject, full_marks: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-2">Pass Marks</label>
                  <input 
                    type="number" required 
                    className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                    value={newSubject.pass_marks}
                    onChange={e => setNewSubject({...newSubject, pass_marks: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowAddSubject(false)} className="flex-1 py-5 bg-gray-100 rounded-2xl font-black text-gray-500 hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 rounded-2xl font-black text-white shadow-xl shadow-indigo-100 hover:scale-105 transition-all uppercase tracking-widest text-xs">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskItem({ name, reason }) {
  return (
    <div className="p-4 bg-red-50 rounded-2xl flex items-center justify-between border border-red-100">
      <div>
        <p className="font-black text-red-900">{name}</p>
        <p className="text-xs text-red-600 font-bold mt-1 uppercase tracking-tighter">{reason}</p>
      </div>
      <div className="p-3 bg-white rounded-xl text-red-500 shadow-sm border border-red-50">
        <AlertTriangle className="h-5 w-5" />
      </div>
    </div>
  );
}
