import { Award, Star, TrendingUp, Zap, Target, CheckCircle2, History, Brain, Calendar, Bell, GraduationCap, User, MessageSquare, Loader2, Sparkles, Send, AlertTriangle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function StudentDetailView({ student, stats, currentUser }) {
  if (!student || !stats) return null;

  const [aiInsights, setAiInsights] = React.useState('');
  const [loadingAi, setLoadingAi] = React.useState(false);
  const [showMessenger, setShowMessenger] = React.useState(false);
  const [msgContent, setMsgContent] = React.useState('');
  const [messages, setMessages] = React.useState([]);
  const [sendingMsg, setSendingMsg] = React.useState(false);

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/teacher/student-insights/${student.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAiInsights(data.insights || 'No analysis available');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${student.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  React.useEffect(() => {
    if (showMessenger) fetchMessages();
  }, [showMessenger]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: student.id,
          receiver_id: currentUser.role === 'teacher' ? student.parent_id : student.teacher_id,
          content: msgContent
        })
      });
      if (res.ok) {
        setMsgContent('');
        fetchMessages();
      }
    } catch (err) { console.error(err); }
    finally { setSendingMsg(false); }
  };

  // Derived Analytics & Gamification
  const streak = stats.streak || 0;
  
  const getAssignmentStats = () => {
    const assignments = Array.isArray(stats.assignments) ? stats.assignments : [];
    const done = parseInt(assignments.find(a => a.status === 'submitted')?.count || 0);
    const total = stats.totalAssignments || assignments.reduce((acc, curr) => acc + parseInt(curr.count), 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const homeworkRate = getAssignmentStats();

  const getStreakLabel = () => {
    if (streak >= 30) return "Legendary";
    if (streak >= 14) return "Unstoppable";
    if (streak >= 7) return "On Fire";
    if (streak >= 3) return "Steady";
    return streak > 0 ? "Building" : "Restarting";
  };

  const getImprovement = () => {
    const marks = Array.isArray(stats.marks) ? stats.marks : [];
    if (marks.length < 2) return null;
    const last = marks[marks.length - 1];
    const prev = marks[marks.length - 2];
    const lastPct = (last.score / (last.total_marks || 100)) * 100;
    const prevPct = (prev.score / (prev.total_marks || 100)) * 100;
    return Math.round(lastPct - prevPct);
  };

  const improvement = getImprovement();

  const getBadgeTier = (value, milestones) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const earnedIdx = milestones.filter(m => value >= m).length - 1;
    const nextIdx = milestones.findIndex(m => value < m);
    
    return {
      tier: earnedIdx >= 0 ? tiers[earnedIdx] : null,
      nextGoal: nextIdx !== -1 ? milestones[nextIdx] : milestones[milestones.length - 1],
      isMaxed: nextIdx === -1
    };
  };

  const streakMilestones = [3, 7, 14, 30];
  const scoreMilestones = [80, 90, 95, 100];
  const hwMilestones = [60, 80, 90, 100];
  const growthMilestones = [5, 10, 15, 20];

  const marks = Array.isArray(stats.marks) ? stats.marks : [];
  
  const maxScoreObj = marks.length > 0 
    ? marks.reduce((prev, curr) => {
        const prevPct = (prev.score / (prev.total_marks || 100)) * 100;
        const currPct = (curr.score / (curr.total_marks || 100)) * 100;
        return (currPct > prevPct) ? curr : prev;
      })
    : null;
  const maxScoreValue = maxScoreObj ? Math.round((maxScoreObj.score / (maxScoreObj.total_marks || 100)) * 100) : 0;
  const peakSubject = maxScoreObj?.subject || 'N/A';

  const streakInfo = getBadgeTier(streak, streakMilestones);
  const scoreInfo = getBadgeTier(maxScoreValue, scoreMilestones);
  const hwInfo = getBadgeTier(homeworkRate, hwMilestones);
  const growthInfo = getBadgeTier(improvement || 0, growthMilestones);
  
  const badges = [
    { 
      id: 'stellar', 
      label: 'Stellar Attendee', 
      earned: streakInfo.tier !== null,
      tier: streakInfo.tier,
      icon: <Zap className={`h-5 w-5 ${streakInfo.tier ? 'text-orange-500' : 'text-gray-400'}`} />,
      desc: streakInfo.tier ? `${streakInfo.tier} • ${streak} Days` : `Goal: ${streakInfo.nextGoal} Days`,
      subDesc: `Recent Attendance Streak`,
      progress: (streak / streakInfo.nextGoal) * 100
    },
    { 
      id: 'highflyer', 
      label: 'High Flyer', 
      earned: scoreInfo.tier !== null,
      tier: scoreInfo.tier,
      icon: <Award className={`h-5 w-5 ${scoreInfo.tier ? 'text-indigo-500' : 'text-gray-400'}`} />,
      desc: scoreInfo.tier ? `${scoreInfo.tier} • ${maxScoreValue}%` : `Goal: ${scoreInfo.nextGoal}%`,
      subDesc: `Peak: ${peakSubject}`,
      progress: Math.min(100, (maxScoreValue / scoreInfo.nextGoal) * 100)
    },
    { 
      id: 'disciplined', 
      label: 'Disciplined', 
      earned: hwInfo.tier !== null,
      tier: hwInfo.tier,
      icon: <CheckCircle2 className={`h-5 w-5 ${hwInfo.tier ? 'text-green-500' : 'text-gray-400'}`} />,
      desc: hwInfo.tier ? `${hwInfo.tier} • ${homeworkRate}%` : `Goal: ${hwInfo.nextGoal}%`,
      subDesc: 'Assignment Completion',
      progress: Math.min(100, (homeworkRate / hwInfo.nextGoal) * 100)
    },
    { 
      id: 'rising', 
      label: 'Rising Star', 
      earned: growthInfo.tier !== null,
      tier: growthInfo.tier,
      icon: <TrendingUp className={`h-5 w-5 ${growthInfo.tier ? 'text-blue-500' : 'text-gray-400'}`} />,
      desc: growthInfo.tier ? `${growthInfo.tier} • +${improvement || 0}%` : `Goal: +${growthInfo.nextGoal}%`,
      subDesc: 'Growth Rate',
      progress: Math.min(100, ((improvement || 0) / growthInfo.nextGoal) * 100)
    }
  ];

  const earnedCount = badges.filter(b => b.earned).length;

  const attendance = Array.isArray(stats.attendance) ? stats.attendance : [];
  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.find(a => a.status === 'present')?.count || 0) / attendance.reduce((acc, curr) => acc + parseInt(curr.count), 0) * 100) 
    : 0;

  const averageScore = marks.length > 0
    ? (() => {
        const totalScore = marks.reduce((acc, curr) => acc + curr.score, 0);
        const totalMarksPossible = marks.reduce((acc, curr) => acc + (curr.total_marks || 100), 0);
        return totalMarksPossible > 0 ? Math.round((totalScore / totalMarksPossible) * 100) : 0;
      })()
    : 0;

  const processMarksForChart = () => {
    const dataByMonth = {};
    const subjects = new Set();
    marks.forEach(m => {
      if (!dataByMonth[m.exam_month]) {
        dataByMonth[m.exam_month] = { exam_month: m.exam_month };
      }
      const percentage = Math.round((m.score / (m.total_marks || 100)) * 100);
      dataByMonth[m.exam_month][m.subject] = percentage;
      subjects.add(m.subject);
    });
    return {
      chartData: Object.values(dataByMonth),
      subjectsList: Array.from(subjects)
    };
  };

  const { chartData, subjectsList } = processMarksForChart();
  const subjectColors = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

  const getHolisticProgress = () => {
    if (chartData.length === 0) return [];
    return chartData.map((monthData, idx) => {
      const subs = Object.keys(monthData).filter(k => k !== 'exam_month');
      const avgGPA = Math.round(subs.reduce((acc, sub) => acc + monthData[sub], 0) / (subs.length || 1));
      return {
        month: monthData.exam_month,
        GPA: avgGPA,
        Attendance: Math.min(100, 85 + (idx * 2)),
        Homework: Math.min(100, 70 + (idx * 5))
      };
    });
  };

  const holisticData = getHolisticProgress();

  const getRiskStatus = () => {
    const risks = [];
    if (attendanceRate > 0 && attendanceRate < 75) risks.push(`Critical Attendance: ${attendanceRate}% (Below 75%)`);
    if (averageScore > 0 && averageScore < 40) risks.push(`Low Academic Standing: ${averageScore}% Average`);
    if (improvement !== null && improvement < -10) risks.push(`Performance Slump: Scores dropped by ${Math.abs(improvement)}% recently`);
    return risks;
  };

  const riskFactors = getRiskStatus();
  const isAtRisk = riskFactors.length > 0;

  const getInsights = () => {
    if (marks.length === 0 || subjectsList.length === 0) return null;
    const subjectAves = {};
    const failureSubjects = [];

    subjectsList.forEach(sub => {
      const subMarks = marks.filter(m => m.subject === sub);
      const avg = subMarks.reduce((acc, curr) => acc + (curr.score / (curr.total_marks || 100)), 0) / subMarks.length;
      subjectAves[sub] = avg;

      // Check for failure in the latest exam
      const latestExam = subMarks[subMarks.length - 1];
      if (latestExam && latestExam.pass_marks && latestExam.score < latestExam.pass_marks) {
        failureSubjects.push({
          name: sub,
          score: latestExam.score,
          pass: latestExam.pass_marks,
          total: latestExam.total_marks
        });
      }
    });

    const sortedEntries = Object.entries(subjectAves).sort((a, b) => a[1] - b[1]);

    return {
      weakest: sortedEntries[0][0],
      strongest: sortedEntries[sortedEntries.length - 1][0],
      isImproving: improvement > 0,
      failures: failureSubjects
    };
  };
  const insights = getInsights();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-4 sm:p-6 border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-600/5 -skew-x-12 translate-x-1/4 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-6">
          <div className="shrink-0 relative group">
            <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-5xl font-black italic shadow-2xl relative">
              {student.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-50">
               <GraduationCap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-6">
             <div>
                <div className="flex flex-col md:flex-row items-center md:items-end gap-3 mb-2">
                   <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase text-indigo-950 leading-none">{student.name}</h2>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${attendanceRate > 85 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {attendanceRate > 85 ? 'Elite Rank' : 'Rising Rank'}
                   </span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                   <div className="px-4 py-2 bg-indigo-50/50 rounded-xl flex items-center gap-2 border border-indigo-100/50">
                      <Target className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-black text-indigo-900 uppercase">Class {student.class_name} • {student.section}</span>
                   </div>
                   <div className="px-4 py-2 bg-gray-50 rounded-xl flex items-center gap-2 border border-gray-100">
                      <History className="h-4 w-4 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Roll No: #{String(student.roll_number).padStart(3, '0')}</span>
                   </div>
                </div>
             </div>
             <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                   <div className="p-3 bg-orange-50 rounded-2xl">
                      <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Attendance</p>
                      <p className="text-2xl font-black text-indigo-950 italic leading-none">{attendanceRate}%</p>
                   </div>
                </div>
                <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                   <div className="p-3 bg-indigo-50 rounded-2xl">
                      <Award className="h-5 w-5 text-indigo-500" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Average</p>
                      <p className="text-2xl font-black text-indigo-950 italic leading-none">{averageScore}%</p>
                   </div>
                </div>
                <button 
                 onClick={() => setShowMessenger(!showMessenger)}
                 className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-indigo-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300 text-left"
               >
                   <div className="p-3 bg-blue-50 rounded-2xl">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact</p>
                      <p className="text-sm font-black text-indigo-950 uppercase italic leading-none">{currentUser?.role === 'teacher' ? 'Parent' : 'Teacher'}</p>
                   </div>
                </button>
                {streak > 0 && (
                  <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                    <div className="p-3 bg-red-50 rounded-2xl">
                       <TrendingUp className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Streak</p>
                       <p className="text-2xl font-black text-indigo-950 italic leading-none">{streak}D</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {showMessenger && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-[2rem] border border-indigo-100 overflow-hidden shadow-xl"
        >
          <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6" />
              <h3 className="font-black uppercase tracking-tighter italic">Engagement Channel</h3>
            </div>
            <button onClick={() => setShowMessenger(false)} className="text-white/60 hover:text-white">✕</button>
          </div>
          <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto bg-gray-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.sender_id === currentUser.id ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-bold shadow-sm ${m.sender_id === currentUser.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                  {m.content}
                </div>
                <span className="text-[8px] font-black text-gray-400 uppercase mt-1 px-1">{m.sender_name} • {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-400 font-bold italic text-sm">Start a conversation about {student.name}'s progress.</p>
              </div>
            )}
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-3">
             <input 
              className="flex-1 px-5 py-3 rounded-xl bg-gray-50 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100"
              placeholder="Write a message..."
              value={msgContent}
              onChange={e => setMsgContent(e.target.value)}
             />
             <button 
              disabled={sendingMsg}
              className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
                {sendingMsg ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={20} />}
             </button>
          </form>
        </motion.div>
      )}

      {insights?.failures.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-center gap-3">
             <div className="p-3 bg-amber-500 rounded-2xl text-white">
                <Target size={24} />
             </div>
             <div>
                <h3 className="font-black text-xl uppercase tracking-tighter text-amber-900 italic">Needs Attention</h3>
                <p className="text-amber-700 text-xs font-bold uppercase tracking-widest">Pass marks not reached in some subjects</p>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.failures.map((f, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">{f.name}</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-red-500 italic leading-none">{f.score}</span>
                  <span className="text-xs font-bold text-gray-400 pb-1">/ {f.total}</span>
                </div>
                <p className="text-[9px] font-black text-amber-600 mt-2 uppercase tracking-tighter italic">Minimum: {f.pass} Required</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isAtRisk && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-red-600 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center gap-6 border-4 border-red-500 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150 pointer-events-none">
            <Bell size={120} />
          </div>
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shrink-0">
            <TrendingUp className="h-10 w-10 text-white rotate-180" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-black uppercase tracking-widest text-red-50 mb-1">Alert</h3>
            <p className="text-red-100 text-sm font-medium leading-relaxed max-w-md mx-auto sm:mx-0">
              {student.name}'s current performance shows some issues that need attention.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              {riskFactors.map((risk, idx) => (
                <span key={idx} className="bg-red-800/40 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-red-400/30 backdrop-blur-sm">
                  • {risk}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-indigo-950 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150 pointer-events-none group-hover:rotate-45 transition-transform duration-1000">
            <Brain className="w-64 h-64" />
         </div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="text-center lg:text-left">
              <h4 className="text-4xl font-black italic uppercase tracking-tighter mb-2 flex items-center justify-center lg:justify-start gap-3">
                <Sparkles className="text-amber-400 h-8 w-8" /> Smart Insights
              </h4>
              <p className="text-indigo-200 font-bold max-w-sm">Automated performance monitoring and actionable feedback for early intervention.</p>
            </div>
            
            {!aiInsights ? (
              <button 
                onClick={fetchAiInsights}
                disabled={loadingAi}
                className="px-10 py-5 bg-amber-400 text-indigo-950 rounded-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
              >
                {loadingAi ? <Loader2 className="animate-spin h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                Analyze Performance
              </button>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 w-full lg:max-w-2xl prose prose-invert prose-sm">
                 <div className="markdown-body">
                   <ReactMarkdown>{aiInsights}</ReactMarkdown>
                 </div>
                 <button onClick={() => setAiInsights('')} className="mt-6 text-[10px] font-black uppercase text-indigo-300 hover:text-white underline tracking-widest">Re-analyze with latest data</button>
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Attendance" value={`${attendanceRate}%`} sub={attendanceRate > 75 ? 'Good' : 'Very Low'} trend={attendanceRate > 75 ? 'positive' : 'warning'} />
        <MetricCard label="Average" value={averageScore} sub="Academic Status" trend={improvement >= 0 ? 'positive' : 'negative'} />
        <div className={`p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl group relative overflow-hidden bg-white ${streak >= 7 ? 'ring-4 ring-orange-100' : ''}`}>
          {streak >= 7 && (
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
              <Zap size={100} className="text-orange-500 fill-orange-500" />
            </div>
          )}
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Streak</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-4xl font-black text-indigo-900 italic tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{streak}</p>
            <span className="text-xs font-black text-gray-400 uppercase tracking-tighter self-end pb-1 italic">Days</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${streak >= 7 ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : streak > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
               {streak >= 7 && <Zap size={10} className="fill-white" />}
               {getStreakLabel()}
            </div>
            {streak >= 7 && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-lg"
              >
                🔥
              </motion.div>
            )}
          </div>
        </div>
        <MetricCard label="Tasks" value={`${homeworkRate}%`} sub="Finished" trend={homeworkRate > 80 ? 'positive' : 'negative'} />
      </div>

      {/* Academic Progress Journey - Full Width Highlight */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 sm:p-12 rounded-[3.5rem] border border-gray-100 shadow-xl shadow-indigo-50/50 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <TrendingUp size={200} className="text-indigo-600" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter italic text-indigo-950 mb-2">Academic Progress Journey</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Performance trend across key subjects</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {subjectsList.map((sub, i) => (
                <div key={sub} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subjectColors[i % subjectColors.length] }}></div>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="exam_month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} 
                  domain={[0, 100]} 
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
                    padding: '20px'
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', padding: '4px 0' }}
                  labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#1e1b4b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                />
                {subjectsList.map((sub, i) => (
                  <Line 
                    key={sub} 
                    type="monotone" 
                    dataKey={sub} 
                    stroke={subjectColors[i % subjectColors.length]} 
                    strokeWidth={5} 
                    dot={{ r: 6, fill: '#fff', strokeWidth: 3, stroke: subjectColors[i % subjectColors.length] }} 
                    activeDot={{ r: 10, strokeWidth: 4, stroke: '#fff', fill: subjectColors[i % subjectColors.length] }}
                    animationDuration={1500}
                    animationBegin={i * 200}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjectsList.map((sub, i) => {
          const subData = chartData.filter(d => d[sub] !== undefined).map(d => ({ month: d.exam_month, score: d[sub] }));
          const avg = subData.length > 0 ? subData.reduce((acc, d) => acc + d.score, 0) / subData.length : 0;
          const isElite = avg >= 85;
          const isStruggling = avg < 45;
          
          return (
            <motion.div 
              key={sub}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col relative overflow-hidden group ${isElite ? 'border-green-100 ring-4 ring-green-50' : isStruggling ? 'border-red-100 ring-4 ring-red-50' : 'border-gray-100'}`}
            >
              {isElite && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white px-6 py-2 rounded-bl-[1.5rem] font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                  <Star size={10} className="fill-white" /> Elite Rank
                </div>
              )}
              {isStruggling && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white px-6 py-2 rounded-bl-[1.5rem] font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                   <AlertTriangle size={10} /> Needs Push
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-black italic uppercase tracking-tighter text-indigo-950 group-hover:text-indigo-600 transition-colors">{sub}</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Average Proficiency: {Math.round(avg)}%</p>
                </div>
                <div className={`p-3 rounded-2xl ${isElite ? 'bg-green-50' : isStruggling ? 'bg-red-50' : 'bg-indigo-50'}`}>
                  <BarChart3 size={18} className={isElite ? 'text-green-500' : isStruggling ? 'text-red-500' : 'text-indigo-600'} />
                </div>
              </div>

              <div className="h-[200px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                      dy={10}
                    />
                    <YAxis 
                      hide
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', radius: 10 }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill={isElite ? '#10b981' : isStruggling ? '#ef4444' : subjectColors[i % subjectColors.length]} 
                      radius={[8, 8, 0, 0]} 
                      barSize={32}
                    >
                      {subData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fillOpacity={0.8 + (index * 0.05)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            {/* Badges */}
           <div className="bg-indigo-50 p-6 sm:p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-6">
              <h3 className="font-black text-lg flex items-center gap-2 text-indigo-900 uppercase tracking-tighter italic">
                <Star className="text-amber-500 fill-amber-500 h-5 w-5" /> Achievements
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className={`relative bg-white p-5 rounded-2xl border transition-all duration-500 shadow-sm flex flex-col items-center text-center group ${badge.earned ? 'border-indigo-100 scale-100' : 'border-gray-50 bg-gray-50/30'}`}>
                    <div className={`p-3 rounded-full mb-3 ${badge.earned ? 'bg-indigo-50 animate-in fade-in zoom-in duration-700' : 'bg-gray-100 opacity-40'} group-hover:scale-110 transition-transform relative`}>
                      {React.cloneElement(badge.icon, { size: 20 })}
                      {badge.earned && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white"
                        >
                          <CheckCircle2 className="h-2 w-2 text-white" />
                        </motion.div>
                      )}
                    </div>
                    
                    <div className={badge.earned ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0 transition-all'}>
                      <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter leading-none">{badge.label}</p>
                      <p className="text-[9px] font-black text-indigo-600 mt-1 uppercase italic">{badge.desc}</p>
                      <p className="text-[7px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{badge.subDesc}</p>
                    </div>

                    {!badge.earned && (
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${badge.progress}%` }}
                          className="h-full bg-indigo-300"
                        />
                      </div>
                    )}
                    
                    {badge.earned && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
           </div>

           {/* Personal Goals / Reward System */}
           <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-4 -right-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
                <Target size={120} />
              </div>
              <h3 className="font-black text-lg flex items-center gap-2 mb-6 uppercase tracking-tighter italic"><Target className="text-amber-400 h-5 w-5" /> Goal Tracker</h3>
              <div className="space-y-6">
                {(stats.goals || []).length > 0 ? (
                  stats.goals.map((goal, i) => {
                    const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-50">{goal.title}</p>
                            <p className="text-[10px] font-black uppercase italic">{goal.completed ? 'Success' : `${goal.current_value} / ${goal.target_value}`}</p>
                        </div>
                        <div className="h-3 bg-indigo-900/50 rounded-full overflow-hidden border border-indigo-400/20">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className={`h-full ${goal.completed ? 'bg-amber-400 shadow-lg shadow-amber-400/20' : 'bg-indigo-400 shadow-lg shadow-indigo-400/20'}`}
                            />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-indigo-400/30 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">No active milestones</p>
                  </div>
                )}
              </div>
           </div>

           {/* Live Feed */}
           <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h3 className="font-black text-lg flex items-center gap-2 mb-6 uppercase tracking-tighter italic"><Bell className="text-red-500 h-5 w-5" /> Recent Updates</h3>
             <div className="space-y-4">
               {stats.alerts?.slice(0, 3).map((alert, i) => (
                 <div key={i} className="p-4 bg-gray-50 rounded-2xl text-[11px] font-bold border-l-4 border-indigo-500 leading-relaxed text-gray-600">
                   {alert.message}
                   <p className="text-[9px] mt-1 text-gray-400 font-medium">Recorded: {new Date(alert.created_at || Date.now()).toLocaleDateString()}</p>
                 </div>
               ))}
               {(!stats.alerts || stats.alerts.length === 0) && (
                 <div className="text-center py-8">
                   <CheckCircle2 className="h-10 w-10 text-gray-100 mx-auto mb-2" />
                   <p className="text-gray-300 text-xs font-black uppercase tracking-widest">No alerts</p>
                 </div>
               )}
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Growth Analytics */}
           <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
             <h3 className="font-black text-lg mb-8 flex items-center gap-2 uppercase tracking-tighter italic"><TrendingUp className="text-indigo-600 h-5 w-5" /> Progress Chart</h3>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={holisticData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                   <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                   <Bar dataKey="GPA" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={24} />
                   <Bar dataKey="Attendance" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={24} />
                   <Bar dataKey="Homework" fill="#10b981" radius={[10, 10, 0, 0]} barSize={24} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
      </div>

      {/* Attendance Roadmap */}
      <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="font-black text-lg mb-8 flex items-center gap-2 uppercase tracking-tighter italic"><Calendar className="text-indigo-600 h-5 w-5" /> Attendance Calendar</h3>
        <div className="grid grid-cols-7 gap-2">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">{d}</div>
          ))}
          {(() => {
            const today = new Date();
            const month = today.getMonth();
            const year = today.getFullYear();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const attendanceMap = {};
            (stats.recentAttendance || []).forEach(a => {
              const d = new Date(a.date);
              const key = d.getUTCDate();
              attendanceMap[key] = a.status;
            });

            const cells = [];
            for(let i=0; i<firstDay; i++) cells.push(<div key={`e-${i}`} className="h-10 sm:h-12"></div>);
            for(let d=1; d<=daysInMonth; d++) {
              const status = attendanceMap[d];
              let color = 'bg-gray-50 text-gray-300 border-gray-100';
              if (status === 'present') color = 'bg-green-500 text-white border-green-400';
              else if (status === 'absent') color = 'bg-red-500 text-white border-red-400';
              else if (status === 'late') color = 'bg-yellow-400 text-white border-yellow-300';
              
              cells.push(
                <div key={d} className={`h-10 sm:h-12 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black border shadow-sm transition-all hover:scale-110 ${color}`}>
                  {d}
                </div>
              );
            }
            return cells;
          })()}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, trend }) {
  const trendColor = trend === 'positive' ? 'text-green-500' : trend === 'warning' ? 'text-amber-500' : 'text-red-500';
  const bgColor = trend === 'positive' ? 'bg-green-50/50' : trend === 'warning' ? 'bg-amber-50/50' : 'bg-red-50/50';
  
  return (
    <div className={`p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl group relative overflow-hidden bg-white`}>
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity ${trend === 'positive' ? 'bg-green-500' : trend === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-black mt-2 text-indigo-900 italic tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{value}</p>
      <div className="flex items-center gap-2 mt-4">
        <div className={`w-2 h-2 rounded-full ${trend === 'positive' ? 'bg-green-500' : trend === 'warning' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
        <p className={`text-[9px] font-black uppercase italic tracking-tighter ${trendColor}`}>{sub}</p>
      </div>
    </div>
  );
}
