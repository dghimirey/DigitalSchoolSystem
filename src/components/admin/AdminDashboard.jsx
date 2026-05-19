import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Plus, RefreshCw, AlertCircle, LayoutGrid, Edit, Trash2, Eye, EyeOff, X, Menu } from 'lucide-react';
import StudentDetailView from '../shared/StudentDetailView';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('checking');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [students, setStudents] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', role: 'teacher', name: '', mobile: '', assigned_class_id: '', linked_student_ids: [] });
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '', parent_id: '', roll_number: '' });
  const [newClass, setNewClass] = useState({ name: '', section: 'A', teacher_id: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [uRes, cRes, sRes, hRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/classes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/health')
      ]);
      
      const [uData, cData, sData, hData] = await Promise.all([uRes.json(), cRes.json(), sRes.json(), hRes.json()]);
      
      setUsers(Array.isArray(uData) ? uData : []);
      setClasses(Array.isArray(cData) ? cData : []);
      setStudents(Array.isArray(sData) ? sData : []);
      setDbStatus(hData.db === 'connected' ? 'connected' : 'error');
    } catch (err) {
      console.error(err);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowAddUser(false);
        setNewUser({ username: '', role: 'teacher', name: '', mobile: '', assigned_class_id: '', linked_student_ids: [] });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to register user');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred while trying to register the user.');
    }
  };
  
  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) { console.error(err); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        setStudentSearch('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (err) { 
      console.error(err);
      alert('A network error occurred while trying to update the user.');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student? All related records (attendance, marks) will be lost!')) return;
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingStudent)
      });
      if (res.ok) {
        setEditingStudent(null);
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleViewDetails = async (student) => {
    setViewingStudent(student);
    setStatsLoading(true);
    setStudentStats(null);
    try {
      const res = await fetch(`/api/student/stats/${student.id}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setStudentStats({
          attendance: Array.isArray(data?.attendance) ? data.attendance : [],
          marks: Array.isArray(data?.marks) ? data.marks : [],
          alerts: Array.isArray(data?.alerts) ? data.alerts : [],
          goals: Array.isArray(data?.goals) ? data.goals : [],
          assignments: Array.isArray(data?.assignments) ? data.assignments : [],
          recentAttendance: Array.isArray(data?.recentAttendance) ? data.recentAttendance : []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => {
        setActiveView(id);
        setShowMobileSidebar(false);
      }}
      className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
        activeView === id 
          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-1' 
          : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-screen">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-16 z-[60]">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
             <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="font-black italic text-lg tracking-tighter uppercase text-indigo-900">Admin Hub</span>
        </div>
        <button 
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg transition-transform active:scale-95"
        >
          {showMobileSidebar ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`${showMobileSidebar ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100'} fixed lg:relative inset-0 z-[110] lg:z-auto bg-white/80 backdrop-blur-md lg:bg-transparent transition-all duration-500 w-full lg:w-72 space-y-2 p-6 lg:p-0`}>
        <div className="flex flex-col space-y-1">
          <SidebarItem icon={LayoutGrid} label="Dashboard" id="overview" />
          <SidebarItem icon={Users} label="Teachers" id="teachers" />
          <SidebarItem icon={Users} label="Parents" id="parents" />
          <SidebarItem icon={GraduationCap} label="Students" id="students" />
          <SidebarItem icon={BookOpen} label="Classes" id="classes" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-4xl font-black text-indigo-900 tracking-tighter uppercase italic leading-none">
              {activeView === 'overview' ? 'Dashboard' : activeView}
            </h1>
            <p className="text-gray-400 font-bold text-sm mt-2 italic">
              {activeView === 'overview' ? 'Manage your school system' : `Manage ${activeView}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {dbStatus === 'error' && (
              <div className="flex items-center px-6 py-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100 text-xs font-black uppercase tracking-widest animate-pulse">
                <AlertCircle className="h-4 w-4 mr-2" />
                SYSTEM ERROR
              </div>
            )}
            <button 
              onClick={() => setShowAddClass(true)}
              className="flex items-center space-x-2 bg-white text-indigo-600 border border-gray-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-indigo-200 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Class +</span>
            </button>
            <button 
              onClick={() => setShowAddStudent(true)}
              className="flex items-center space-x-2 bg-white text-indigo-600 border border-gray-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-indigo-200 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Student +</span>
            </button>
            <button 
              onClick={() => setShowAddUser(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>User +</span>
            </button>
          </div>
        </div>

        {activeView === 'overview' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard color="blue" icon={<Users className="text-blue-600" />} label="Teachers" value={users.filter(u => u.role === 'teacher').length} />
              <StatCard color="purple" icon={<GraduationCap className="text-purple-600" />} label="Parents" value={users.filter(u => u.role === 'parent').length} />
              <StatCard color="orange" icon={<BookOpen className="text-orange-600" />} label="Total Classes" value={classes.length} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <h2 className="font-black text-xl tracking-tighter uppercase italic text-gray-900 group-hover:text-indigo-600 transition-colors">Recent Users</h2>
                  <Eye className="text-gray-300" size={20} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                      <tr>
                        <th className="px-8 py-5">Name</th>
                        <th className="px-8 py-5">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.slice(0, 5).map(user => (
                        <tr key={user.id} className="hover:bg-indigo-50/20 transition-colors group/row">
                          <td className="px-8 py-6 font-black text-gray-800 text-sm">{user.name}</td>
                          <td className="px-8 py-6">
                             <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${user.role === 'teacher' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>
                               {user.role}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <h2 className="font-black text-xl tracking-tighter uppercase italic text-gray-900 group-hover:text-indigo-600 transition-colors">Students</h2>
                  <Eye className="text-gray-300" size={20} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                      <tr>
                        <th className="px-8 py-5">Student Name</th>
                        <th className="px-8 py-5">Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.slice(0, 5).map(student => (
                        <tr key={student.id} className="hover:bg-indigo-50/20 transition-colors group/row">
                          <td className="px-8 py-6 font-black text-gray-800 text-sm">{student.name}</td>
                          <td className="px-8 py-6 text-[10px] font-black uppercase text-indigo-400 italic tracking-widest">{student.class_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'teachers' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">Teachers</h2>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">List of teachers</p>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5">Name</th>
                      <th className="px-8 py-5">Username</th>
                      <th className="px-8 py-5">Mobile</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'teacher').map(t => (
                      <tr key={t.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-8 py-6 font-black text-gray-900">{t.name}</td>
                        <td className="px-8 py-6 font-mono font-black text-indigo-400 text-xs">{t.username}</td>
                        <td className="px-8 py-6 text-gray-500 font-bold text-xs">{t.mobile}</td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-2">
                             <button 
                               onClick={() => {
                                 const assignedClass = classes.find(c => c.teacher_id === t.id);
                                 setEditingUser({...t, assigned_class_id: assignedClass?.id || '', password: t.plain_password});
                               }} 
                               className="p-2.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-indigo-100 hover:shadow-sm"
                             >
                               <Edit size={16} />
                             </button>
                            <button onClick={() => handleDeleteUser(t.id)} className="p-2.5 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-red-100 hover:shadow-sm">
                              <Trash2 size={16} />
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

        {activeView === 'parents' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Parents</h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">List of parents</p>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5">Name</th>
                      <th className="px-8 py-5">Username</th>
                      <th className="px-8 py-5">Mobile</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'parent').map(p => (
                      <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-8 py-6 font-black text-gray-900">{p.name}</td>
                        <td className="px-8 py-6 font-mono font-black text-indigo-400 text-xs">{p.username}</td>
                        <td className="px-8 py-6 text-gray-500 font-bold text-xs">{p.mobile}</td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-2">
                             <button 
                               onClick={() => {
                                 const linkedIds = students.filter(s => s.parent_id === p.id).map(s => s.id);
                                 setEditingUser({...p, password: p.plain_password, linked_student_ids: linkedIds});
                               }} 
                               className="p-2.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-indigo-100 hover:shadow-sm"
                             >
                               <Edit size={16} />
                             </button>
                            <button onClick={() => handleDeleteUser(p.id)} className="p-2.5 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-red-100 hover:shadow-sm">
                              <Trash2 size={16} />
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

        {activeView === 'students' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">All Students</h2>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Full list of students in the system</p>
                </div>
                <button 
                  onClick={() => setShowAddStudent(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={16} />
                  <span>Add Student</span>
                </button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5">Full Name</th>
                      <th className="px-8 py-5">Class</th>
                      <th className="px-8 py-5">Roll No.</th>
                      <th className="px-8 py-5">Parent</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-8 py-6 font-black text-gray-900">{s.name}</td>
                        <td className="px-8 py-6">
                           <span className="text-[10px] font-black px-2 py-1 bg-indigo-50 text-indigo-500 rounded border border-indigo-100 uppercase tracking-tighter">{s.class_name} - {s.section}</span>
                        </td>
                        <td className="px-8 py-6 font-mono text-gray-400 text-xs">#{String(s.roll_number).padStart(3, '0')}</td>
                        <td className="px-8 py-6 text-gray-500 font-bold text-xs">{s.parent_name}</td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleViewDetails(s)} 
                              className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-blue-100 hover:shadow-sm"
                            >
                              <Eye size={16} />
                            </button>
                            <button onClick={() => setEditingStudent(s)} className="p-2.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-indigo-100 hover:shadow-sm">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteStudent(s.id)} className="p-2.5 text-red-300 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-red-100 hover:shadow-sm">
                              <Trash2 size={16} />
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

        {activeView === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(c => {
               const teacher = users.find(u => u.id === c.teacher_id);
               const studentCount = students.filter(s => s.class_id === c.id).length;
               return (
                <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-100 group-hover:text-indigo-100 transition-colors">SEC {c.section}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{c.name}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{studentCount} Students</span>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Class Teacher</p>
                      <p className="font-bold text-indigo-600">{teacher ? teacher.name : 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold mb-6">Register New User</h3>
            {/* ... form content here ... */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              {newUser.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Class Assignment</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                    value={newUser.assigned_class_id}
                    onChange={e => setNewUser({...newUser, assigned_class_id: e.target.value})}
                  >
                    <option value="">No Class Assigned</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-500 mt-1 uppercase font-black tracking-tighter">Validation: A teacher can only be assigned to one class at a time.</p>
                </div>
              )}
              {newUser.role === 'parent' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="block text-sm font-medium">Link Students</label>
                    <span className="text-[10px] font-black text-indigo-400 uppercase">Selected: {newUser.linked_student_ids?.length || 0}</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="Search students..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2 text-left">
                    {students.length > 0 ? (
                      students
                        .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.class_name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(student => {
                        const isSelected = newUser.linked_student_ids?.includes(student.id);
                        const isLinkedToOthers = student.parent_id && !isSelected;
                        return (
                          <div 
                            key={student.id} 
                            onClick={(e) => {
                              const current = newUser.linked_student_ids || [];
                              const updated = current.includes(student.id) 
                                ? current.filter(id => id !== student.id)
                                : [...current, student.id];
                              setNewUser({...newUser, linked_student_ids: updated});
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-indigo-100'}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200'}`}>
                                {isSelected && <Plus size={14} className="text-white rotate-45" />}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-sm font-black ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{student.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] uppercase font-bold text-gray-400">{student.class_name} • Roll {student.roll_number}</span>
                                  {isLinkedToOthers && (
                                    <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-bold uppercase">Linked to {student.parent_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                               <span className="text-[8px] font-black text-indigo-500 uppercase bg-indigo-100 px-2 py-0.5 rounded-full">Primary Link</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-4 text-xs font-bold text-gray-400 italic">No students available to link</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.mobile}
                  onChange={e => setNewUser({...newUser, mobile: e.target.value})}
                />
                <p className="text-[10px] text-indigo-500 mt-2 font-black uppercase tracking-widest">
                  Note: Username will be auto-generated (lowercase first name). Default password is 123456.
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setShowAddUser(false); setStudentSearch(''); }} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Register User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold mb-6">Enroll New Student</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/students', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(newStudent)
                });
                if (res.ok) {
                  setShowAddStudent(false);
                  setNewStudent({ name: '', class_id: '', parent_id: '', roll_number: '' });
                  fetchData();
                }
              } catch (err) { console.error(err); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student Name</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.class_id} onChange={e => setNewStudent({...newStudent, class_id: e.target.value})}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Parent</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.parent_id} onChange={e => setNewStudent({...newStudent, parent_id: e.target.value})}>
                    <option value="">Select Parent</option>
                    {users.filter(u => u.role === 'parent').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Roll Number</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.roll_number} onChange={e => setNewStudent({...newStudent, roll_number: e.target.value})} />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddStudent(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold mb-6">Create New Class</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/classes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(newClass)
                });
                if (res.ok) {
                  setShowAddClass(false);
                  setNewClass({ name: '', section: 'A', teacher_id: '' });
                  fetchData();
                } else {
                  const data = await res.json();
                  alert(data.error || 'Failed to create class');
                }
              } catch (err) { 
                console.error(err);
                alert('A network error occurred.');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade / Class Name</label>
                <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})}>
                  <option value="">Select Grade</option>
                  {['ECD', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={`Class ${g}`}>Class {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input type="text" required placeholder="e.g. A, B, Blue, Red" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.section} onChange={e => setNewClass({...newClass, section: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class Teacher</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.teacher_id} onChange={e => setNewClass({...newClass, teacher_id: e.target.value})}>
                  <option value="">Select Teacher (Optional)</option>
                  {users.filter(u => u.role === 'teacher').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddClass(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold mb-6">Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input 
                    type="text" required 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                    value={editingUser.name}
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input 
                    type="text" required 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none font-mono text-sm"
                    value={editingUser.username || ''}
                    onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              {editingUser.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Assigned Class</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                    value={editingUser.assigned_class_id || ''}
                    onChange={e => setEditingUser({...editingUser, assigned_class_id: e.target.value})}
                  >
                    <option value="">No Class Assigned</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-500 mt-1 uppercase font-black tracking-tighter">Validation: A teacher can only be assigned to one class at a time.</p>
                </div>
              )}
              {editingUser.role === 'parent' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Link Students</label>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-indigo-600 uppercase">Selected: {editingUser.linked_student_ids?.length || 0}</span>
                    </div>
                  </div>
                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder="Search students by name or class..."
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300 font-bold"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-[2rem] p-4 bg-gray-50/30 space-y-2 custom-scrollbar">
                    {students.length > 0 ? (
                      students
                        .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.class_name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(student => {
                        const isSelected = editingUser.linked_student_ids?.includes(student.id);
                        const isLinkedToOthers = student.parent_id && student.parent_id !== editingUser.id;
                        
                        return (
                          <div 
                            key={student.id} 
                            onClick={() => {
                              const current = editingUser.linked_student_ids || [];
                              const updated = current.includes(student.id) 
                                ? current.filter(id => id !== student.id)
                                : [...current, student.id];
                              setEditingUser({...editingUser, linked_student_ids: updated});
                            }}
                            className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border group/item ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-100'}`}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-indigo-600 border-indigo-600 scale-110' : 'bg-white border-gray-200 group-hover/item:border-indigo-200'}`}>
                                {isSelected && <Plus size={16} className="text-white rotate-45" />}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-sm font-black transition-colors ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{student.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-400' : 'text-gray-400'}`}>{student.class_name} • ROLL {student.roll_number}</span>
                                  {isLinkedToOthers && (
                                    <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 font-black uppercase tracking-tighter shadow-sm">
                                      {student.parent_name}'s Student
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="animate-in fade-in slide-in-from-right-2">
                                <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                                  Linked
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center py-8 text-center">
                        <Users className="h-8 w-8 text-gray-200 mb-2" />
                        <p className="text-xs font-black text-gray-300 uppercase italic">No students found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={editingUser.mobile}
                  onChange={e => setEditingUser({...editingUser, mobile: e.target.value})}
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative group">
                  <input 
                    type={editingUser.showPassword ? "text" : "password"} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none pr-12"
                    value={editingUser.password || ''}
                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingUser({...editingUser, showPassword: !editingUser.showPassword})}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    {editingUser.showPassword ? <EyeOff size={18} className="text-indigo-500" /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-tighter">Admin can view and update passwords here.</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setEditingUser(null); setStudentSearch(''); }} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          {/* ... */}
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[130] p-4 overflow-y-auto">
          <div className="bg-gray-50 rounded-[2.5rem] w-full max-w-6xl shadow-2xl relative min-h-[90vh] max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-sm p-8 border-b border-gray-100 flex justify-between items-center rounded-t-[2.5rem]">
              <div>
                <h3 className="text-3xl font-black text-indigo-900 tracking-tighter uppercase">Student Details</h3>
                <p className="text-sm font-bold text-gray-500 mt-1 italic">Viewing details for {viewingStudent.name} (Roll: {viewingStudent.roll_number})</p>
              </div>
              <button 
                onClick={() => setViewingStudent(null)}
                className="p-3 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl shadow-sm transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8">
              {statsLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <RefreshCw className="animate-spin h-10 w-10 text-indigo-500" />
                  <p className="font-bold text-gray-400 italic">Loading data...</p>
                </div>
              ) : (
                <StudentDetailView student={viewingStudent} stats={studentStats} />
              )}
            </div>

            <div className="p-8 bg-indigo-900 text-white rounded-b-[2.5rem] mt-8">
               <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-3 rounded-2xl"><Eye className="h-6 w-6" /></div>
                  <div>
                    <p className="font-bold">Admin View</p>
                    <p className="text-xs text-indigo-200">This is what parents see in their app. Use this to check student progress or help with parent questions.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-50/50 hover:bg-blue-600 group transition-all duration-500 border-blue-100',
    purple: 'bg-purple-50/50 hover:bg-purple-600 group transition-all duration-500 border-purple-100',
    orange: 'bg-orange-50/50 hover:bg-orange-600 group transition-all duration-500 border-orange-100'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-sm ${colorMap[color]}`}>
      <div className="bg-white p-4 rounded-3xl w-fit shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
        {icon}
      </div>
      <div className="mt-6">
        <p className="text-gray-400 group-hover:text-white/70 text-[10px] font-black uppercase tracking-widest transition-colors">{label}</p>
        <p className="text-4xl font-black text-gray-900 group-hover:text-white mt-1 transition-colors leading-none">{value}</p>
      </div>
    </div>
  );
}
