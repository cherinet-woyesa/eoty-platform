import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Check, X, Trash2, Loader2 } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface Member {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
}

interface ChapterMemberManagementProps {
  members: Member[];
  onApprove: (memberId: number) => void;
  onReject: (memberId: number) => void;
  onRemove: (memberId: number) => void;
  isLoading: boolean;
}

const ChapterMemberManagement: React.FC<ChapterMemberManagementProps> = ({
  members,
  onApprove,
  onReject,
  onRemove,
  isLoading
}) => {
  const { t } = useTranslation();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">{t('chapters.manage.members.title', 'Members')}</h3>
        <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
          {members.length} {t('common.total')}
        </span>
      </div>
      
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {members.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {t('chapters.manage.members.no_members', 'No members found')}
          </div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{member.first_name} {member.last_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{member.role} • {member.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {member.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApprove(member.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={t('common.approve')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onReject(member.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={t('common.reject')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {member.status === 'approved' && (
                  <button
                    onClick={() => onRemove(member.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title={t('common.remove')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChapterMemberManagement;
