import React, { useCallback } from 'react';
import { Clock, CheckCircle, Users, AlertCircle, Calendar, FileText, MessageCircle, Video } from 'lucide-react';

interface Task {
  id: string;
  type: 'assignment' | 'video' | 'discussion' | 'review' | 'meeting';
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
  studentCount?: number;
  completed: boolean;
}

interface UpcomingTasksProps {
  tasks: Task[];
}

const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ tasks }) => {
  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'discussion':
        return <MessageCircle className="h-4 w-4" />;
      case 'review':
        return <CheckCircle className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.ceil(days / 7)} weeks`;
    return due.toLocaleDateString();
  };

  const handleTaskComplete = useCallback((taskId: string) => {
    // Mark task as complete
    console.log('Task completed:', taskId);
  }, []);

  const sortedTasks = tasks
    .filter(task => !task.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-blue-500" />
        Upcoming Tasks
      </h3>

      <div className="space-y-3">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            className={`p-3 rounded-lg border transition-all duration-150 ${
              task.priority === 'high' ? 'bg-red-50 border-red-200' :
              task.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded ${
                  task.priority === 'high' ? 'bg-red-200 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                  'bg-green-200 text-green-700'
                }`}>
                  {getTaskIcon(task.type)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                  <p className="text-xs text-gray-600">{task.course}</p>
                </div>
              </div>
              <button
                onClick={() => handleTaskComplete(task.id)}
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{formatDueDate(task.dueDate)}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority} priority
              </span>
            </div>

            {task.studentCount && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
                <Users className="h-3 w-3" />
                <span>{task.studentCount} students</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedTasks.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming tasks</p>
          <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
        </div>
      )}

      {/* View All Tasks */}
      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Tasks
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(UpcomingTasks);