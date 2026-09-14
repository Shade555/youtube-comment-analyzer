import { X } from "lucide-react";

interface AuthCardProps {
  onClose: () => void;
  onLogin: () => void;
}

export function AuthCard({ onClose, onLogin }: AuthCardProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#14151f] border border-[#262837] rounded-2xl p-8 w-full max-w-md relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-gray-400 mb-6">Enter your email to log in to your account.</p>
        
        <button 
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-2 border border-[#262837] bg-[#1f2130] rounded-lg py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2d40] transition-colors mb-6"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Log in with Google
        </button>
        
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#262837]"></div>
          </div>
          <div className="relative bg-[#14151f] px-4 text-xs text-gray-500 uppercase">
            Or log in with email
          </div>
        </div>
        
        <div className="space-y-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border border-[#262837] bg-[#1f2130] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-600"
              placeholder="merlinsmith@gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border border-[#262837] bg-[#1f2130] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-600"
              placeholder="X22Jk8823HYU"
            />
          </div>
        </div>
        
        <div className="flex justify-end mb-6">
          <button className="text-sm font-medium text-gray-300 hover:text-white hover:underline underline-offset-2">
            Forgot password
          </button>
        </div>
        
        <button 
          onClick={onLogin}
          className="w-full bg-white text-black rounded-full py-3 font-semibold hover:bg-gray-200 transition-colors"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
