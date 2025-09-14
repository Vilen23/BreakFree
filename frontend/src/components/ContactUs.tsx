import React, { useState } from "react"

interface FormData {
  name: string
  email: string
  message: string
}

export const ContactUsSection = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    message: "",
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = () => {
    console.log("Form submitted:", formData)
    alert("Message sent! We'll get back to you soon.")
  }

  return (
    <div className="bg-gray-50 py-20 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Contact</h2>
          <p className="text-xl text-gray-600">
            We're here to support you every step of the way.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left - Contact Form */}
          <div className="max-w-md mx-auto lg:mx-0">
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                placeholder="John Doe"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full focus:outline-none px-4 py-3 border border-gray-200 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  placeholder="john@example.com"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 focus:outline-none py-3 border border-gray-200 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                />
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Tell us how we can help..."
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 focus:outline-none py-3 border border-gray-200 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                className="w-full cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Send Message
              </button>
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
