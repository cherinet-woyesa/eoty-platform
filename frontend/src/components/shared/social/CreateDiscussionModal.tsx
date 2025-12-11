import React, { useState } from 'react';
import { X, Upload, Lock, Globe2, Users, Sparkles, Loader2 } from 'lucide-react';
import { forumApi } from '@/services/api/forums';
import { brandButtons } from '@/theme/brand';

const primaryButton = brandButtons.accent;
const secondaryButton = brandButtons.primaryGhost;

type Visibility = 'public' | 'chapter' | 'private';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  forums?: { id: string | number; title: string; name?: string }[];
  onSubmit?: (payload: {
    title: string;
    content: string;
    tags: string[];
    visibility: Visibility;
    teacherOnly: boolean;
    invites: string[];
    forumId?: string;
    attachments?: string[];
  }) => void;
}

const CreateDiscussionModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, forums }) => {
  const availableForums = forums || [];
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [teacherOnly, setTeacherOnly] = useState(false);
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [forumId, setForumId] = useState<string>('');
  const [attachments, setAttachments] = useState<
    { id: string; name: string; status: 'uploaded' | 'uploading' | 'error'; preview?: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  // default forum selection when available
  React.useEffect(() => {
    if (!forumId && forums && forums.length > 0) {
      setForumId(String(forums[0].id));
    }
  }, [forumId, forums]);

  if (!isOpen) return null;

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!tags.includes(value)) {
      setTags([...tags, value]);
    }
    setTagInput('');
  };

  const addInvite = () => {
    const value = inviteInput.trim();
    if (!value) return;
    if (!invites.includes(value)) {
      setInvites([...invites, value]);
    }
    setInviteInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedForumId = forumId || (availableForums[0] ? String(availableForums[0].id) : undefined);
    if (availableForums.length > 0 && !selectedForumId) {
      return;
    }
    onSubmit?.({
      title,
      content,
      tags,
      visibility,
      teacherOnly,
      invites,
      forumId: selectedForumId,
      attachments: attachments.filter(a => a.status === 'uploaded').map(a => a.id)
    });
    onClose();
    setTitle('');
    setContent('');
    setTags([]);
    setInvites([]);
    setTeacherOnly(false);
    setVisibility('public');
    setAttachments([]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const tempId = `${file.name}-${Date.now()}`;
      const preview = file.type.startsWith('image') ? URL.createObjectURL(file) : undefined;
      setAttachments(prev => [...prev, { id: tempId, name: file.name, status: 'uploading', preview }]);
      try {
        const res = await forumApi.uploadAttachment(file);
        const id = res?.data?.attachment?.id || res?.attachmentId || res?.id;
        if (!id) throw new Error('Upload failed');
        setAttachments(prev =>
          prev.map(att => att.id === tempId ? { id, name: file.name, status: 'uploaded', preview } : att)
        );
      } catch (err) {
        console.error('Upload error', err);
        setAttachments(prev =>
          prev.map(att => att.id === tempId ? { ...att, status: 'error' } : att)
        );
      }
    }
    setUploading(false);
  };

  const removeAttachment = async (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
    try {
      await forumApi.deleteAttachment(id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Create Discussion</h2>
            <p className="text-sm text-slate-600">Start a new conversation with your community</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto bg-white">
          <div className="space-y-2">
            {forums && forums.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Forum</label>
                <select
                  value={forumId}
                  onChange={(e) => setForumId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select a forum</option>
                  {forums.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.title || f.name || `Forum ${f.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="text-sm font-semibold text-slate-800">Discussion Title</label>
            <input
              type="text"
              required
              placeholder="Enter a clear and concise title for your discussion."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
                >
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-slate-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tags (e.g., Education, Science)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button type="button" onClick={addTag} className={`px-4 py-2 rounded-lg font-semibold ${brandButtons.primaryGhost}`}>
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Discussion Content</label>
            <div className="border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 text-slate-500">
                <button type="button" className="hover:text-indigo-700 font-semibold">B</button>
                <button type="button" className="hover:text-indigo-700 italic font-semibold">I</button>
                <button type="button" className="hover:text-indigo-700 underline font-semibold">U</button>
                <span className="text-slate-300">|</span>
                <button type="button" className="hover:text-indigo-700 text-xs">• List</button>
                <button type="button" className="hover:text-indigo-700 text-xs">1. List</button>
                <span className="text-slate-300">|</span>
                <button type="button" className="hover:text-indigo-700 text-xs">Link</button>
                <button type="button" className="hover:text-indigo-700 text-xs">Quote</button>
                <button type="button" className="hover:text-indigo-700 text-xs">Image</button>
              </div>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[180px] p-3 focus:outline-none text-sm text-slate-800"
                placeholder="Share details, context, or questions for your discussion."
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800">Attachments / Media</label>
            <div
              className="border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 text-sm cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById('discussion-attachments')?.click()}
            >
              <Upload className="h-8 w-8 mb-2 text-indigo-500" />
              <p>Drag &amp; drop files here or click to upload.</p>
              <input
                id="discussion-attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploading && (
                <div className="mt-2 inline-flex items-center gap-2 text-indigo-700 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full border border-slate-200"
                  >
                    {att.preview ? (
                      <img src={att.preview} alt={att.name} className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <Upload className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="max-w-[180px] truncate">{att.name}</span>
                    <span className={`text-xs ${att.status === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>
                      {att.status === 'uploading' ? 'Uploading...' : att.status === 'error' ? 'Error' : 'Ready'}
                    </span>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="text-slate-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Privacy Settings</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-700">
              <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${visibility === 'public' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                <input type="radio" name="visibility" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                <Globe2 className="h-4 w-4 text-indigo-600" />
                Public
              </label>
              <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${visibility === 'chapter' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                <input type="radio" name="visibility" checked={visibility === 'chapter'} onChange={() => setVisibility('chapter')} />
                <Users className="h-4 w-4 text-indigo-600" />
                Chapter-only
              </label>
              <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${visibility === 'private' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                <input type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                <Lock className="h-4 w-4 text-indigo-600" />
                Private (Friends)
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Invite Friends</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search or enter friend emails"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInvite();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button type="button" onClick={addInvite} className={`px-4 py-2 rounded-lg font-semibold ${secondaryButton}`}>
                Add
              </button>
            </div>
            {invites.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {invites.map((inv) => (
                  <span key={inv} className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                    {inv}
                    <button type="button" onClick={() => setInvites(invites.filter((i) => i !== inv))} className="text-slate-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="teacherOnly"
              checked={teacherOnly}
              onChange={(e) => setTeacherOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="teacherOnly" className="text-sm font-medium text-slate-800">
              Teacher-only Post
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">Community Guidelines</label>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Respectful Feedback</li>
              <li>Avoid Personal Attacks</li>
              <li>Keep Discussions Focused</li>
              <li>Protect Personal Information</li>
              <li>Report Violations</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg font-semibold ${secondaryButton}`}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || (forums && forums.length > 0 && !forumId)}
              className={`px-4 py-2 rounded-lg font-semibold shadow-sm ${primaryButton} disabled:opacity-60`}
            >
              Post Discussion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDiscussionModal;

