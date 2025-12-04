import React, { useState } from "react";
import { registerUser } from "../api/userApi";

const RegisterUser = ({ onUserRegistered }) => {
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    setMessage("");
    try {
      console.log(form);
      
      const data = await registerUser(form);
      setMessage("User registered successfully!");
      onUserRegistered && onUserRegistered();
      setForm({ email: "", password: "", full_name: "" });
    } catch (err) {
      setMessage(err.response?.data?.error || "Error registering user");
    } finally {
      setLoading(false);
    }
  };

  const isError = message.includes("Error");

  return (
    <div className="flex justify-center items-center p-4 sm:p-6 lg:p-8 min-h-[80vh]">
      
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-blue-100">
        
        <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">
          <span role="img" aria-label="register-icon">📝</span> Register New User
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <input 
            name="email" 
            type="email"
            placeholder="Email Address" 
            value={form.email} 
            onChange={handleChange} 
            required
            // Tailwind Input Styles: Full width, border, padding, blue focus ring
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 placeholder-gray-400 text-black"
          />
          
          {/* Password Input */}
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={form.password} 
            onChange={handleChange} 
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 placeholder-gray-400 text-black"
          />
          
          {/* Full Name Input */}
          <input 
            name="full_name" 
            placeholder="Full Name" 
            value={form.full_name} 
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 placeholder-gray-400 text-black"
          />
          
          {/* Submit Button: Primary Blue Style, Disabled state for loading */}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 mt-4 rounded-lg font-bold text-white transition duration-200 
                        ${loading 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        
        {/* Message/Notification */}
        {message && (
          <div 
            className={`p-3 mt-4 rounded-lg text-center font-medium 
                        ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterUser;