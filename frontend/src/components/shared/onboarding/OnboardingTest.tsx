import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import OnboardingModal from './OnboardingModal';
import WelcomeMessage from './WelcomeMessage';

const OnboardingTest: React.FC = () => {
  const { hasOnboarding, flow, progress, isCompleted, isLoading, error } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showWelcome, setShowWelcome] = React.useState(true);

  if (isLoading) {
    return <div>Loading onboarding data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Onboarding Test</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Onboarding Status</h2>
        <div className="space-y-2">
          <p><strong>Has Onboarding:</strong> {hasOnboarding ? 'Yes' : 'No'}</p>
          <p><strong>Is Completed:</strong> {isCompleted ? 'Yes' : 'No'}</p>
          {flow && (
            <div>
              <p><strong>Flow Name:</strong> {flow.name}</p>
              <p><strong>Flow Description:</strong> {flow.description}</p>
            </div>
          )}
          {progress && (
            <div>
              <p><strong>Progress:</strong> {progress.progress}%</p>
              <p><strong>Status:</strong> {progress.status}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setShowWelcome(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Show Welcome Message
        </button>
        
        <button
          onClick={() => setShowOnboarding(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          disabled={!hasOnboarding}
        >
          Show Onboarding Modal
        </button>
      </div>

      {showWelcome && (
        <WelcomeMessage 
          userName="Test User"
          onDismiss={() => setShowWelcome(false)}
          onStartOnboarding={() => {
            setShowWelcome(false);
            setShowOnboarding(true);
          }}
        />
      )}
      
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
};

export default OnboardingTest;