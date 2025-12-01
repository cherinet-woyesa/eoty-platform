import React, { useEffect, useState } from 'react';
import { journeysApi, coursesApi, resourcesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, BookOpen, FileText, Trash2, Save, Flag, Calendar } from 'lucide-react';

interface Journey {
  id: number;
  title: string;
  description?: string;
  type: string;
  start_date?: string;
  end_date?: string;
}

interface MilestoneInput {
  title: string;
  description: string;
  type: 'content' | 'quiz' | 'action';
  reference_id?: number;
  reference_type?: 'course' | 'resource';
}

const JourneysAdmin: React.FC = () => {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('challenge');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);

  // Milestone Form State
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mType, setMType] = useState<'content' | 'quiz' | 'action'>('content');
  const [mRefId, setMRefId] = useState<number | undefined>(undefined);

  const [courses, setCourses] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [journeysRes, coursesRes, resourcesRes] = await Promise.all([
          journeysApi.getJourneys(),
          coursesApi.getCourses(),
          resourcesApi.getResources({})
        ]);

        if (journeysRes.success && journeysRes.data?.journeys) {
          setJourneys(journeysRes.data.journeys);
        } else if (Array.isArray(journeysRes)) {
           // Handle direct array return if API changed
           setJourneys(journeysRes);
        }

        if (coursesRes.success && coursesRes.data?.courses) {
          setCourses(coursesRes.data.courses);
        } else if (Array.isArray(coursesRes.data)) {
          setCourses(coursesRes.data);
        }

        if (resourcesRes.success && resourcesRes.data?.resources) {
          setResources(resourcesRes.data.resources);
        } else if (Array.isArray(resourcesRes.data)) {
          setResources(resourcesRes.data);
        }
      } catch (e: any) {
        console.error('Failed to load journeys admin data', e);
        setError(e.response?.data?.message || 'Failed to load journeys');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('challenge');
    setStartDate('');
    setEndDate('');
    setMilestones([]);
    resetMilestoneForm();
  };

  const resetMilestoneForm = () => {
    setMTitle('');
    setMDesc('');
    setMType('content');
    setMRefId(undefined);
  };

  const handleAddMilestone = () => {
    if (!mTitle) return;
    setMilestones(prev => [...prev, {
      title: mTitle,
      description: mDesc,
      type: mType,
      reference_id: mRefId
    }]);
    resetMilestoneForm();
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateJourney = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title,
        description,
        type,
        start_date: startDate || null,
        end_date: endDate || null,
        milestones
      };

      await journeysApi.createJourney(payload);
      
      // Reload
      const res = await journeysApi.getJourneys();
      if (res.success && res.data?.journeys) {
        setJourneys(res.data.journeys);
      } else if (Array.isArray(res)) {
        setJourneys(res);
      }
      
      resetForm();
    } catch (e: any) {
      console.error('Failed to create journey', e);
      setError(e.response?.data?.message || 'Failed to create journey');
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteJourney = async (id: number) => {
    if (!window.confirm('Delete this journey? This cannot be undone.')) return;
    try {
      await journeysApi.deleteJourney(id);
      setJourneys((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      console.error('Delete journey error', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-sm px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Spiritual Journeys</h1>
          <p className="text-xs text-slate-600 mt-1">
            Create curated paths of courses and resources for your students.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Create Journey Form */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-900">New Journey</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="Fasting & Prayer Essentials"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              <option value="challenge">Challenge</option>
              <option value="seasonal">Seasonal</option>
              <option value="curriculum">Curriculum</option>
            </select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="Short description to guide learners on this path..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
          </div>
        </div>

        {/* Milestone Creation */}
        <div className="border-t border-slate-100 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-slate-800 mb-3">Add Milestone</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">Milestone Title</label>
              <input
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                placeholder="e.g. Read Chapter 1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500">Type</label>
              <select
                value={mType}
                onChange={(e) => setMType(e.target.value as any)}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="content">Content (Watch/Read)</option>
                <option value="quiz">Quiz</option>
                <option value="action">Action (e.g. Pray)</option>
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-medium text-slate-500">Description</label>
              <input
                value={mDesc}
                onChange={(e) => setMDesc(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                placeholder="Instructions for this step..."
              />
            </div>
            
            {/* Reference Selection */}
            {mType === 'content' && (
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-medium text-slate-500">Link to Content (Optional)</label>
                <select
                  value={mRefId || ''}
                  onChange={(e) => setMRefId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="">-- Select Course or Resource --</option>
                  <optgroup label="Courses">
                    {courses.map(c => <option key={`c-${c.id}`} value={c.id}>{c.title}</option>)}
                  </optgroup>
                  <optgroup label="Resources">
                    {resources.map(r => <option key={`r-${r.id}`} value={r.id}>{r.title}</option>)}
                  </optgroup>
                </select>
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddMilestone}
                disabled={!mTitle}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Milestone
              </button>
            </div>
          </div>
        </div>

        {/* Selected Milestones List */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Journey Path ({milestones.length} steps)
            </span>
          </div>
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No milestones added yet. Add steps above to build the journey.
            </p>
          ) : (
            <div className="space-y-1.5">
              {milestones.map((m, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-900">{m.title}</p>
                      <p className="text-[10px] text-slate-500">{m.type} • {m.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(index)}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleCreateJourney}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-2" />}
            Save Journey
          </button>
        </div>
      </div>

      {/* Existing journeys */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Existing Journeys</h2>
        </div>
        {journeys.length === 0 ? (
          <p className="text-xs text-slate-500">
            No journeys yet. Create your first journey above.
          </p>
        ) : (
          <div className="space-y-2">
            {journeys.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{j.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Audience: {j.audience} • Progress (sample student):{' '}
                    {typeof j.progress === 'number' ? `${j.progress.toFixed(0)}%` : '0%'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteJourney(j.id)}
                  className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-rose-50 text-rose-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneysAdmin;



