import { Check } from 'lucide-react';

interface ServicesCardProps {
  title: string;
  description: string;
  features: string[];
  buttonText: string;
  image: string;
}
export const ServicesCard = ({ title, description, features, buttonText, image }: ServicesCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
    {/* Image */}
    <div>
        <img src={image} alt="" className='h-[160px] w-full object-cover'/>
    </div>
    
    {/* Content */}
    <div className="p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
      <p className="text-gray-600 mb-4">
        {description}
      </p>
      
      {/* Features */}
      <div className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <div className="flex items-center space-x-2" key={index}>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">{feature}</span>
          </div>
        ))}
      </div>
      
      <button className="bg-blue-500 cursor-pointer hover:bg-blue-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
        {buttonText}
      </button>
    </div>
  </div>
  )
}