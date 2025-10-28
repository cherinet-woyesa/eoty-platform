import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Coffee, Github, Twitter, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                EOTY Platform
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4 max-w-md">
              Empowering education through technology. Join thousands of learners and educators in our vibrant community.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/forums" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link to="/ai-assistant" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  AI Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                  Feedback
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-gray-200/60 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center text-sm text-gray-600 mb-4 md:mb-0">
            <span>© {currentYear} EOTY Platform. Made with</span>
            <Heart className="h-4 w-4 text-red-500 mx-1" />
            <span>and</span>
            <Coffee className="h-4 w-4 text-yellow-600 mx-1" />
          </div>
          <div className="flex space-x-6 text-sm text-gray-600">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;