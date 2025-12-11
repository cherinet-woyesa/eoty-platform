import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-br from-[#0f172a] via-[#2f3f82] to-[#0f172a] text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#cfa15a] rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#2f3f82] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#d8b26d] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 lg:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 rounded-lg overflow-hidden">
                  <img src="/eoc.jpg" alt="Logo" className="h-full w-full object-cover" />
                </div>
                <span className="text-2xl font-bold">EOTY Platform</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
                Empowering Ethiopian Orthodox youths through faith-centered education.
                Join our community and grow in your spiritual journey with quality learning resources.
              </p>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">contact@eotyplatform.com</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Home
                </Link>
                <Link to="/courses" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Courses
                </Link>
                <Link to="/about" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  About
                </Link>
                <Link to="/contact" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Contact
                </Link>
              </div>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Community</h3>
              <div className="space-y-3">
                <Link to="/register" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Join Us
                </Link>
                <Link to="/login" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Sign In
                </Link>
                <Link to="/resources" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Resources
                </Link>
                <Link to="/support" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  Support
                </Link>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Stay Updated</h3>
              <p className="text-gray-400 text-sm mb-4">Subscribe to our newsletter for the latest updates and courses.</p>
              <div className="flex flex-col space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-2 bg-[#111827] border border-[#2f3f82] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#cfa15a] transition-colors"
                />
                <button className="px-4 py-2 bg-[#2f3f82] hover:bg-[#3a4c94] text-white font-medium rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 text-gray-400 mb-4 md:mb-0">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500 fill-current" />
                <span>for the Ethiopian Orthodox Community</span>
              </div>
              <div className="text-gray-400 text-sm">
                © 2024 EOTY Platform. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
