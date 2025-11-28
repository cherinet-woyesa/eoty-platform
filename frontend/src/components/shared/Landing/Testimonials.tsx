import { forwardRef } from 'react';
import { Star, Quote } from 'lucide-react';

interface TestimonialsProps {
  testimonials: any[];
  visibleSections: Set<string>;
}

const Testimonials = forwardRef<HTMLElement, TestimonialsProps>(({ testimonials, visibleSections }, ref) => {
  return (
    <section
      ref={ref}
      id="testimonials"
      data-section-id="testimonials"
      className={`relative py-32 overflow-hidden z-10 transition-all duration-1000 ${
        visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 248, 220, 0.95) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(245, 245, 220, 0.85) 100%)'
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-16 w-96 h-96 bg-gradient-to-br from-[#FFD700]/6 to-[#FFA500]/4 rounded-full blur-3xl animate-float" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-24 right-16 w-80 h-80 bg-gradient-to-br from-[#27AE60]/5 to-[#16A085]/3 rounded-full blur-3xl animate-float" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-[#00FFC6]/4 to-[#00D4FF]/2 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '8s' }} />
      </div>
      <div className="w-full px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className={`inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-[#27AE60]/20 to-[#16A085]/20 rounded-full border border-[#27AE60]/40 backdrop-blur-xl shadow-lg mb-8 transition-all duration-700 delay-200 ${
              visibleSections.has('testimonials') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
              <Star className="h-5 w-5 text-[#27AE60] animate-pulse" />
              <span className="text-sm font-semibold text-gray-700">Student Reviews</span>
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold text-gray-900 mb-6 transition-all duration-700 delay-300 ${
              visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              What Our Students Say
            </h2>
            <p className={`text-xl text-gray-700 max-w-3xl mx-auto transition-all duration-700 delay-400 ${
              visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}>
              Hear from our community about their transformative learning experiences
            </p>
          </div>

          {testimonials.length === 0 ? (
            <div className={`text-center py-12 transition-all duration-700 delay-500 ${
              visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              <Quote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Reviews Coming Soon</h3>
              <p className="text-gray-600">Students are sharing their experiences - check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 6).map((testimonial, index) => (
                <div
                  key={testimonial.id || index}
                  className={`group bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-xl hover:shadow-3xl hover:shadow-[#27AE60]/20 transition-all duration-500 border border-gray-200/50 transform hover:-translate-y-3 hover:scale-[1.03] relative overflow-hidden ${
                    visibleSections.has('testimonials')
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Animated background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#27AE60]/5 via-transparent to-[#16A085]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                  <div className="relative z-10 flex items-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#27AE60] via-[#16A085] to-[#2ECC71] rounded-full flex items-center justify-center mr-5 shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {(testimonial.name || 'Student')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{testimonial.name || 'Anonymous Student'}</h4>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < (testimonial.rating || 5) ? 'text-[#FFD700] fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <Quote className="h-10 w-10 text-[#27AE60]/40 mb-4 absolute -top-2 -left-2" />
                    <p className="text-gray-700 leading-relaxed text-base italic pl-8">
                      "{testimonial.content || testimonial.message || 'This platform has transformed my learning experience with its faith-centered approach and excellent content.'}"
                    </p>
                  </div>

                  <div className="border-t border-gray-200/60 pt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#27AE60] rounded-full"></div>
                        <span className="text-gray-600 font-medium">{testimonial.role || 'Student'}</span>
                      </div>
                      <span className="text-gray-500 text-sm">
                        {testimonial.created_at ? new Date(testimonial.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

export default Testimonials;
