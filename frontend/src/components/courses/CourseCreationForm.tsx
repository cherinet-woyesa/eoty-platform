import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import { 
  BookOpen, 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  Sparkles, 
  Target,
  Users,
  Lock,
  Globe,
  Zap,
  Award,
  Clock
} from 'lucide-react';

const CourseCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<{ title?: string; category?: string }>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'faith',
    level: 'beginner',
    isPublic: true,
    estimatedDuration: '',
    learningObjectives: [''],
    prerequisites: ''
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const categories = [
    { value: 'faith', label: 'Faith & Doctrine', icon: BookOpen, color: 'blue' },
    { value: 'history', label: 'Church History', icon: Clock, color: 'amber' },
    { value: 'spiritual', label: 'Spiritual Development', icon: Sparkles, color: 'purple' },
    { value: 'bible', label: 'Bible Study', icon: BookOpen, color: 'green' },
    { value: 'liturgical', label: 'Liturgical Studies', icon: Award, color: 'red' },
    { value: 'youth', label: 'Youth Ministry', icon: Users, color: 'pink' }
  ];

  const levels = [
    { value: 'beginner', label: 'Beginner', description: 'No prior knowledge required', color: 'green' },
    { value: 'intermediate', label: 'Intermediate', description: 'Basic understanding recommended', color: 'blue' },
    { value: 'advanced', label: 'Advanced', description: 'For experienced learners', color: 'purple' }
  ];

  const durations = [
    { value: '1-2', label: '1-2 weeks', description: 'Short course' },
    { value: '3-4', label: '3-4 weeks', description: 'Standard course' },
    { value: '5-8', label: '5-8 weeks', description: 'Comprehensive course' },
    { value: '9+', label: '9+ weeks', description: 'Extended program' }
  ];

  const validateStep = (step: number) => {
    const stepErrors: typeof errors = {};
    if (step === 1) {
      if (!formData.title.trim()) stepErrors.title = 'Course title is required.';
    }
    if (step === 2) {
      if (!formData.category) stepErrors.category = 'Please choose a category.';
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 3) {
      if (!validateStep(currentStep)) return;
      setCurrentStep(currentStep + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      // Send only backend-supported fields for now
      await coursesApi.createCourse({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        level: formData.level,
        cover_image: coverImage || undefined
      });
      setSuccess(true);
      setTimeout(() => navigate('/courses'), 2000);
    } catch (error) {
      console.error('Failed to create course:', error);
      alert('Failed to create course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addLearningObjective = () => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, '']
    }));
  };

  const updateLearningObjective = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  const removeLearningObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((_, i) => i !== index)
    }));
  };

  const getLevelColor = (level: string) => {
    const levelConfig = levels.find(l => l.value === level);
    return levelConfig?.color || 'gray';
  };

  // Autosave draft to localStorage
  useEffect(() => {
    const key = 'create-course-draft';
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const key = 'create-course-draft';
    const toSave = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      level: formData.level,
      isPublic: formData.isPublic,
      estimatedDuration: formData.estimatedDuration,
      learningObjectives: formData.learningObjectives,
      prerequisites: formData.prerequisites
    };
    try {
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch {}
  }, [formData]);

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">Course Created Successfully! 🎉</h3>
        <p className="text-gray-600 text-lg mb-2">Your new course "<span className="font-semibold text-gray-900">{formData.title}</span>" is ready!</p>
        <p className="text-gray-500 mb-8">You can now start adding lessons and content to your course.</p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onClick={() => navigate('/courses')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            View My Courses
          </button>
          <button
            onClick={() => navigate('/record')}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
          >
            <Upload className="mr-2 h-5 w-5" />
            Record First Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-4 sm:px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold mb-1.5 flex items-center">
              <Sparkles className="h-6 w-6 mr-2" />
              Create New Course
            </h2>
            <p className="text-blue-100 opacity-90 text-sm">
              Build engaging learning experiences for your students
            </p>
          </div>
          <button
            onClick={() => navigate('/courses')}
            className="inline-flex items-center px-3 py-1.5 border border-white/30 text-xs font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Courses
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm transition-all duration-300 ${
                step === currentStep
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : step < currentStep
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-1 mx-1.5 transition-all duration-300 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-xs font-medium text-gray-600 mb-2">
          <div className={currentStep === 1 ? 'text-blue-600 font-semibold' : ''}>Basic Info</div>
          <div className={currentStep === 2 ? 'text-blue-600 font-semibold' : ''}>Course Details</div>
          <div className={currentStep === 3 ? 'text-blue-600 font-semibold' : ''}>Finalize</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Course Foundation
              </h3>
              <p className="text-gray-600">Start with the basic information that describes your course.</p>
            </div>

            {/* Course Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                Course Title *
                {formData.title && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {formData.title.length}/60 characters
                  </span>
                )}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                maxLength={60}
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Introduction to Orthodox Christianity: Foundations of Faith"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg font-medium"
              />
              {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-3">
                Course Description
                <span className="text-gray-400 text-xs ml-2">(What will students learn?)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the key topics, learning outcomes, and value students will gain from this course. Be specific about what makes your course unique..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
              />
            </div>

            {/* Cover Image (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Cover Image (optional)</label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  Upload Image
                </label>
                {coverImage && (
                  <img src={coverImage} alt="Cover preview" className="h-16 w-28 object-cover rounded-lg border" />
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">Recommended 1280x720 or larger. PNG or JPG.</p>
            </div>
          </div>
        )}

        {/* Step 2: Course Details */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Course Structure
              </h3>
              <p className="text-gray-600">Define the course category, level, and learning objectives.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(category => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                        className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                          formData.category === category.value
                            ? `border-${category.color}-500 bg-${category.color}-50 shadow-sm`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-2 text-${category.color}-600`} />
                        <div className="font-medium text-gray-900 text-sm">{category.label}</div>
                      </button>
                    );
                  })}
                </div>
                {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category}</p>}
              </div>

              {/* Level and Duration */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Difficulty Level *
                  </label>
                  <div className="space-y-3">
                    {levels.map(level => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, level: level.value }))}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                          formData.level === level.value
                            ? `border-${level.color}-500 bg-${level.color}-50 shadow-sm`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{level.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{level.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Estimated Duration
                  </label>
                  <select
                    name="estimatedDuration"
                    value={formData.estimatedDuration}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select duration</option>
                    {durations.map(duration => (
                      <option key={duration.value} value={duration.value}>
                        {duration.label} • {duration.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-amber-600" />
                Learning Objectives
                <span className="text-gray-400 text-xs ml-2">(What specific skills will students gain?)</span>
              </label>
              <div className="space-y-3">
                {formData.learningObjectives.map((objective, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => updateLearningObjective(index, e.target.value)}
                        placeholder={`Learning objective ${index + 1}...`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    {formData.learningObjectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLearningObjective(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLearningObjective}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                >
                  + Add another learning objective
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Finalize */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <Award className="h-5 w-5 mr-2 text-purple-600" />
                Finalize Course
              </h3>
              <p className="text-gray-600">Review your course details and set visibility preferences.</p>
            </div>

            {/* Course Preview */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Course Preview</h4>
              <div className="space-y-4">
                {coverImage && (
                  <div>
                    <span className="text-sm text-gray-600">Cover:</span>
                    <div className="mt-2">
                      <img src={coverImage} alt="Cover" className="w-full max-w-md h-40 object-cover rounded-lg border" />
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600">Title:</span>
                  <p className="font-semibold text-gray-900 text-lg">{formData.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Category:</span>
                  <p className="font-medium text-gray-900">
                    {categories.find(c => c.value === formData.category)?.label}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Level:</span>
                  <p className="font-medium text-gray-900">
                    {levels.find(l => l.value === formData.level)?.label}
                  </p>
                </div>
                {formData.description && (
                  <div>
                    <span className="text-sm text-gray-600">Description:</span>
                    <p className="text-gray-700 mt-1">{formData.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Setting */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${formData.isPublic ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {formData.isPublic ? (
                    <Globe className="h-6 w-6 text-green-600" />
                  ) : (
                    <Lock className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {formData.isPublic ? 'Public Course' : 'Private Course'}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">
                        {formData.isPublic 
                          ? 'This course will be visible to all students in the platform'
                          : 'This course will only be visible to students you explicitly invite'
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.isPublic ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Previous
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                Creating Course...
              </>
            ) : currentStep === 3 ? (
              <>
                <BookOpen className="mr-2 h-5 w-5" />
                Create Course
              </>
            ) : (
              <>
                Continue
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseCreationForm;