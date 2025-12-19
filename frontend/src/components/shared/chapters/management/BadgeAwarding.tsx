import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Loader2 } from 'lucide-react';

interface Member {
  id: number;
  first_name: string;
  last_name: string;
}

interface Badge {
  id: number;
  name: string;
  icon_url?: string;
  description?: string;
}

interface BadgeAwardingProps {
  members: Member[];
  badges: Badge[];
  selectedMember: number | null;
  selectedBadge: number | null;
  onSelectMember: (id: number) => void;
  onSelectBadge: (id: number) => void;
  onAward: () => void;
  isAwarding: boolean;
}

const BadgeAwarding: React.FC<BadgeAwardingProps> = ({
  members,
  badges,
  selectedMember,
  selectedBadge,
  onSelectMember,
  onSelectBadge,
  onAward,
  isAwarding
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('chapters.manage.badges.title', 'Award Badges')}</h3>
          <p className="text-sm text-slate-500">{t('chapters.manage.badges.subtitle', 'Recognize member achievements')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('chapters.manage.badges.select_member', 'Select Member')}</label>
          <select
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
            value={selectedMember || ''}
            onChange={(e) => onSelectMember(Number(e.target.value))}
          >
            <option value="">{t('chapters.manage.badges.choose_member', 'Choose a member...')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('chapters.manage.badges.select_badge', 'Select Badge')}</label>
          <div className="grid grid-cols-3 gap-2">
            {badges.map((badge) => (
              <button
                key={badge.id}
                onClick={() => onSelectBadge(badge.id)}
                className={`
                  p-3 rounded-xl border text-center transition-all
                  ${selectedBadge === badge.id
                    ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <div className="h-8 w-8 mx-auto mb-2 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                  {badge.icon_url ? <img src={badge.icon_url} alt="" className="h-full w-full rounded-full" /> : '🏆'}
                </div>
                <span className="block text-xs font-bold text-slate-700 truncate">{badge.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onAward}
          disabled={!selectedMember || !selectedBadge || isAwarding}
          className="w-full py-4 mt-2 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isAwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : t('chapters.manage.badges.award_btn', 'Award Badge')}
        </button>
      </div>
    </div>
  );
};

export default BadgeAwarding;
