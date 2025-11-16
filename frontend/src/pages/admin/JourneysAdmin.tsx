import React, { useEffect, useState } from 'react';
import { journeysApi, coursesApi, resourcesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, BookOpen, FileText, Trash2, Save } from 'lucide-react';

interface Journey {
  id: number;
  title: string;
  description?: string;
  audience: string;
  chapter_id: number | null;
  progress?: number;
}

interface JourneyItemInput {
  itemType: 'course' | 'resource';
  itemId: number;
  orderIndex?: number;
}

const JourneysAdmin: React.FC = () => {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<'student' | 'teacher' | 'admin' | 'all'>('student');
  const [items, setItems] = useState<JourneyItemInput[]>([]);

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
    setAudience('student');
    setItems([]);
  };

  const handleAddItem = (type: 'course' | 'resource', id: number) => {
    setItems((prev) => [
      ...prev,
      {
        itemType: type,
        itemId: id,
        orderIndex: prev.length
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateJourney = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        audience,
        chapterId: user?.chapterId || null,
        items
      };
      const res = await journeysApi.createJourney(payload);
      if (!res.success) {
        setError(res.message || 'Failed to create journey');
        return;
      }
      resetForm();
      // Reload journeys
      const journeysRes = await journeysApi.getJourneys();
      if (journeysRes.success && journeysRes.data?.journeys) {
        setJourneys(journeysRes.data.journeys);
      }
    } catch (e: any) {
      console.error('Create journey error', e);
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
            <label className="text-xs font-medium text-slate-700">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
              <option value="all">All roles</option>
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
        </div>

        {/* Item selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-800">Courses</span>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleAddItem('course', course.id)}
                  className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-md text-xs border border-transparent hover:border-indigo-200 hover:bg-indigo-50/70"
                >
                  <span className="truncate text-slate-800">{course.title}</span>
                  <Plus className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold text-slate-800">Resources</span>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => handleAddItem('resource', resource.id)}
                  className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-md text-xs border border-transparent hover:border-emerald-200 hover:bg-emerald-50/70"
                >
                  <span className="truncate text-slate-800">{resource.title}</span>
                  <Plus className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected items */}
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Journey Items ({items.length})
            </span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-slate-500">
              Select some courses or resources above to add them to this journey.
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, index) => (
                <div
                  key={`${item.itemType}-${item.itemId}-${index}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-1.5 bg-slate-50/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Step {index + 1}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-white">
                      {item.itemType === 'course' ? 'Course' : 'Resource'}
                    </span>
                    <span className="text-xs text-slate-800">ID: {item.itemId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-rose-50 text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
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



