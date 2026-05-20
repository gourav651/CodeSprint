'use client';

import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {isSignIn ? 'Welcome Back' : 'Join CodeSprint'}
          </h1>
          <p className="text-gray-600 text-lg">
            {isSignIn ? 'Sign in to continue to CodeSprint' : 'Create your account to get started'}
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => setIsSignIn(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSignIn
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignIn(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isSignIn
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign Up
          </button>
        </div>
        
        <div className="flex justify-center">
          {isSignIn ? (
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full max-w-sm",
                  headerTitle: "text-gray-900 font-bold text-lg",
                  headerSubtitle: "text-gray-600 text-sm",
                  formButtonPrimary: "bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm",
                  formFieldInput: "bg-white border-2 border-gray-400 text-gray-900 focus:border-blue-500 placeholder-gray-500 text-sm",
                  formFieldLabel: "text-gray-700 font-medium text-sm",
                  footerActionLink: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  dividerLine: "bg-gray-400",
                  dividerText: "text-gray-500 font-medium text-sm",
                  socialButtonsBlockButton: "bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50 font-medium text-sm",
                  formResendCodeLink: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  identityPreviewEditButton: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  formFieldAction: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  footerAction: "text-gray-600 font-medium text-sm",
                  formFieldError: "text-red-600 font-medium text-sm",
                  formFieldHintText: "text-gray-500 font-medium text-sm",
                }
              }}
            />
          ) : (
            <SignUp 
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full max-w-sm",
                  headerTitle: "text-gray-900 font-bold text-lg",
                  headerSubtitle: "text-gray-600 text-sm",
                  formButtonPrimary: "bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm",
                  formFieldInput: "bg-white border-2 border-gray-400 text-gray-900 focus:border-blue-500 placeholder-gray-500 text-sm",
                  formFieldLabel: "text-gray-700 font-medium text-sm",
                  footerActionLink: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  dividerLine: "bg-gray-400",
                  dividerText: "text-gray-500 font-medium text-sm",
                  socialButtonsBlockButton: "bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50 font-medium text-sm",
                  formResendCodeLink: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  identityPreviewEditButton: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  formFieldAction: "text-blue-600 hover:text-blue-700 font-medium text-sm",
                  footerAction: "text-gray-600 font-medium text-sm",
                  formFieldError: "text-red-600 font-medium text-sm",
                  formFieldHintText: "text-gray-500 font-medium text-sm",
                }
              }}
            />
          )}
        </div>
        
        <div className="text-center mt-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-lg"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 