import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail } from 'lucide-react';
import { brandColors } from '@/theme/brand';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
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
              <h3 className="text-lg font-semibold mb-6 text-white">{t('landing.footer.quick_links')}</h3>
              <div className="space-y-3">
                <a href="#hero" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.nav.home')}
                </a>
                <a href="#featured-courses" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.nav.courses')}
                </a>
                <a href="#about" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.nav.about')}
                </a>
                <Link to="/contact" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.footer.contact')}
                </Link>
              </div>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">{t('landing.footer.community')}</h3>
              <div className="space-y-3">
                <Link to="/register" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.footer.join')}
                </Link>
                <Link to="/login" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.footer.sign_in')}
                </Link>
                <Link to="/resources" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.footer.resources')}
                </Link>
                <Link to="/support" className="block text-gray-300 hover:text-[#cfa15a] transition-colors">
                  {t('landing.footer.support')}
                </Link>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">{t('landing.footer.newsletter')}</h3>
              <p className="text-gray-400 text-sm mb-4">{t('landing.footer.newsletter_copy')}</p>
              <div className="flex flex-col space-y-3">
                <input
                  type="email"
                  placeholder={t('landing.footer.email_placeholder')}
                  className="px-4 py-2 bg-[#111827] border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors"
                  style={{ borderColor: brandColors.primaryHex }}
                  disabled
                />
                <button className="px-4 py-2 text-white font-medium rounded-lg transition-colors opacity-70 cursor-not-allowed"
                  style={{ backgroundColor: brandColors.primaryHex }}>
                  {t('landing.footer.coming_soon')}
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
