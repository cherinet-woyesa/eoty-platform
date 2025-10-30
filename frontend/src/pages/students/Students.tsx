import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Search, RefreshCw, Filter, SortAsc, SortDesc, 
  BookOpen, Clock, TrendingUp, Mail, MessageSquare, 
  UserCheck, UserX, GraduationCap, ShieldCheck
} from 'lucide-react';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  enrolled_courses: number;
  progress_percent: number;
  last_active_at: string;
  status: 'active' | 'invited' | 'inactive';
}

import { studentsApi } from '../../services/api/students';

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_active_at' | 'progress_percent'>('last_active_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token');
    // Build SSE URL with current filters
    const base = `${window.location.protocol}//${window.location.hostname}:5000/api/students/stream`;
    const params = new URLSearchParams({
      token: token || '',
      q: searchTerm,
      status: statusFilter,
      sort: sortBy,
      order: sortOrder
    });
    // Fallback to HTTP fetch if no token
    if (!token) {
      (async () => {
        setLoading(true);
        try {
          const res = await studentsApi.getStudents({ q: searchTerm, status: statusFilter, sort: sortBy, order: sortOrder });
          if (mounted && res.success) setStudents(res.data.students || []);
        } finally { if (mounted) setLoading(false); }
      })();
      return () => { mounted = false; };
    }
    setLoading(true);
    const es = new EventSource(`${base}?${params.toString()}`);
    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload?.students && mounted) {
          setStudents(payload.students);
          setLoading(false);
        }
      } catch {}
    };
    es.onerror = () => {
      // On error, close and fallback to one-time fetch
      es.close();
      (async () => {
        try {
          const res = await studentsApi.getStudents({ q: searchTerm, status: statusFilter, sort: sortBy, order: sortOrder });
          if (mounted && res.success) setStudents(res.data.students || []);
        } finally { if (mounted) setLoading(false); }
      })();
    };
    return () => { mounted = false; es.close(); };
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const filtered = useMemo(() => {
    const list = students.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesQ = `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesQ && matchesStatus;
    });
    const sorted = [...list].sort((a,b) => {
      let av: any; let bv: any;
      if (sortBy === 'name') { av = `${a.first_name} ${a.last_name}`.toLowerCase(); bv = `${b.first_name} ${b.last_name}`.toLowerCase(); }
      if (sortBy === 'last_active_at') { av = new Date(a.last_active_at).getTime(); bv = new Date(b.last_active_at).getTime(); }
      if (sortBy === 'progress_percent') { av = a.progress_percent; bv = b.progress_percent; }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return sorted;
  }, [students, searchTerm, statusFilter, sortBy, sortOrder]);

  const formatTimeAgo = (iso: string) => {
    const diffH = Math.floor((Date.now() - new Date(iso).getTime())/3600_000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH/24)}d ago`;
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header - match style */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-3 sm:p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Students</h1>
              <p className="text-blue-100 text-xs sm:text-sm">Manage your classroom and monitor progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors">
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Invite
            </button>
            <button className="inline-flex items-center px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Message
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="sm:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:w-40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
              >
                <option value="last_active_at">Last Active</option>
                <option value="name">Name</option>
                <option value="progress_percent">Progress</option>
              </select>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[{label:'Total Students',value:students.length,icon:Users,color:'from-blue-500 to-blue-600'},
          {label:'Avg. Progress',value:Math.round(students.reduce((s,c)=>s+c.progress_percent,0)/Math.max(1,students.length))+'%',icon:TrendingUp,color:'from-green-500 to-green-600'},
          {label:'Avg. Courses',value:(students.reduce((s,c)=>s+c.enrolled_courses,0)/Math.max(1,students.length)).toFixed(1),icon:BookOpen,color:'from-purple-500 to-purple-600'},
          {label:'Active Today',value:students.filter(s=>new Date(s.last_active_at)>new Date(Date.now()-24*3600_000)).length,icon:Clock,color:'from-orange-500 to-orange-600'}]
          .map((s,idx)=>(
          <div key={idx} className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 sm:p-3 border border-white/50 shadow-sm`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-md bg-gradient-to-r ${s.color} shadow-sm`}>
                <s.icon className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{s.value}</p>
              <p className="text-xs text-gray-600 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Students list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map(st => (
          <div key={st.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">{st.first_name} {st.last_name}</div>
                <div className="text-sm text-gray-500 mb-2">{st.email}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{st.enrolled_courses} courses</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{st.progress_percent}% progress</span>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">{formatTimeAgo(st.last_active_at)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {st.status === 'active' && <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs"><UserCheck className="h-3.5 w-3.5 mr-1"/>Active</span>}
                {st.status === 'invited' && <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs"><ShieldCheck className="h-3.5 w-3.5 mr-1"/>Invited</span>}
                {st.status === 'inactive' && <span className="inline-flex items-center text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs"><UserX className="h-3.5 w-3.5 mr-1"/>Inactive</span>}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Message</button>
                <Link to={`/courses`} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">View</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Students;


