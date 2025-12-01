import { CheckCircle, Calendar, AlertTriangle } from 'lucide-react';

export const AboutSection = () => {
  return (
    <div id='about' className="py-20 my-[8vh] flex items-center justify-center bg-gradient-to-br from-white to-sky-50 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Content */}
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              About BreakFree AI
            </h2>
            
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <p className="text-[16px]">
                BreakFree AI is your compassionate companion on the journey to recovery. 
                Our intelligent journal detects emotions and crafts personalized daily plans.
              </p>
              
              <p className="text-[16px]">
                Track progress, spot patterns, and get gentle relapse alerts. Stay motivated 
                with daily quotes and celebrate every small victory.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-6 pt-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 ">Emotion Detection</h3>
                  <p className="text-gray-600 text-[14px]">AI reads your journal and reveals emotions instantly.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Daily Plans</h3>
                  <p className="text-gray-600 text-[14px]">Receive gentle, achievable tasks tailored to your mood.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 ">Relapse Alerts</h3>
                  <p className="text-gray-600 text-[14px]">Get early warnings when negative patterns emerge.</p>
                </div>
              </div>
            </div>

            <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ">
              Learn More
            </button>
          </div>

          {/* Right Image Grid */}
          <div className="space-y-4">
            {/* Top Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Meditation Image */}
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <div 
                  className="h-[288px] relative"
                >
                <img src="/yogagirl.jpeg" alt="" className="h-[288px] w-full object-cover" />
                </div>
              </div>

              {/* Workspace Image */}
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <div className="h-[288px] bg-gradient-to-br from-amber-100 to-amber-200 relative">
                  <img src="/tea.jpeg" alt="" className='h-[288px] w-full object-cover'/>
                </div>
              </div>
            </div>

            {/* Bottom Large Image */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <div 
                className="h-[192px] relative"
              >
                <img src="/spirit.jpeg" alt="" className='h-[192px] w-full object-cover'/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}