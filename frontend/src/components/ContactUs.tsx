export const ContactUsSection = () => {
  return (
    <div id='contact' className="bg-gray-50 py-20 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Contact</h2>
          <p className="text-xl text-gray-600">
            We're here to support you every step of the way.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Contact Information */}
          <div className="max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  Get in Touch
                </h3>
                <p className="text-gray-600 mb-6">
                  Have questions or need support? Reach out to us via email.
                </p>
                <a
                  href="mailto:breakfree337@gmail.com"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  breakfree337@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Right - Image Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top Left - Helping Hand */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <div className="h-[256px] relative">
                <img
                  src="/contact1.jpeg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Top Right - Hands Together */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <div className="h-[256px] relative">
                <img
                  src="/contact2.jpeg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Bottom - Supportive Hands */}
            <div className="col-span-2 rounded-2xl overflow-hidden shadow-lg">
              <div className="h-48 relative">
                <img
                  src="/contact3.jpeg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
