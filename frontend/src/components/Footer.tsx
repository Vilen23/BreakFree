import { Heart, Mail } from 'lucide-react';

export const BreakFreeFooter = () => {
  return (
    <footer className="bg-slate-800 text-white py-16 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* BreakFree AI Section */}
          <div className="col-span-1">
            <h3 className="text-[16px] font-bold mb-4">BreakFree AI</h3>
            <p className="text-gray-300 text-[14px] leading-relaxed">
              Empathetic support for your recovery journey.
            </p>
          </div>

          {/* Quick Links Section */}
          <div className="col-span-1">
            <h4 className="text-[16px] font-semibold mb-4">Quick Links</h4>
            <div className="space-y-1">
              <a href="#" className="block text-[14px] text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="block text-[14px] text-gray-300 hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>

          {/* Support Section */}
          <div className="col-span-1">
            <h4 className="text-[16px] font-semibold mb-4">Support</h4>
            <div className="space-y-1">
              <a href="#" className="block text-[14px] text-gray-300 hover:text-white transition-colors">
                Contact Us
              </a>
              <a href="#" className="block text-[14px] text-gray-300 hover:text-white transition-colors">
                About
              </a>
            </div>
          </div>

          {/* Follow Us Section */}
          <div className="col-span-1">
            <h4 className="text-[16px] font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              {/* Heart Icon (representing care/support) */}
              <a href="#" className="text-pink-400 hover:text-pink-300 transition-colors">
                <Heart className="w-6 h-6 fill-current" />
              </a>
              {/* Mail Icon */}
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-slate-700 pt-8">
          <div className="text-center">
            <p className="text-gray-400 text-[12px]">
              © 2025 BreakFree AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}