import React from 'react';
import { Link } from 'react-router-dom';

const ServerErrorPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">500</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Server Error</h2>
          <p className="text-gray-600 mb-8">
            Something went wrong on our end. Please try again later.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;