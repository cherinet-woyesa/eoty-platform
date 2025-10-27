import React from 'react';
import { useAuth } from '../../context/AuthContext';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Welcome, {user?.firstName}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Student-specific dashboard cards */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">My Courses</h3>
          <p className="text-gray-600">View and continue your learning journey</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Progress</h3>
          <p className="text-gray-600">Track your learning progress</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Discussions</h3>
          <p className="text-gray-600">Join community discussions</p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;