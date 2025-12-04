import React from 'react';
import { Link } from 'react-router-dom';

const TailwindHeader = () => {
  return (
    <header className="bg-blue-50 shadow-md border-b-4 border-blue-600 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap sm:flex-nowrap">
        
        <h1 className="text-xl sm:text-2xl font-extrabold text-blue-900 mb-2 sm:mb-0">
          User Management Note App
        </h1>
        
        <nav className="flex items-center space-x-3 sm:space-x-5">
          
          <Link 
            to="/home" 
            className="text-blue-600 hover:text-blue-800 font-semibold transition duration-150 ease-in-out py-2 px-3 rounded-lg"
          >
            Home
          </Link>

          <Link 
            to="/register" 
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg 
                       hover:bg-blue-700 transition duration-150 ease-in-out 
                       shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Register User
          </Link>
          
        </nav>
      </div>
    </header>
  );
};

export default TailwindHeader;