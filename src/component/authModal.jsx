import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, Lock, User, ShieldCheck, Type, KeyRound } from "lucide-react";

export default function AuthModal({ isOpen, onClose, isDarkMode, setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Login/Register Form, 2: Registration OTP
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '' });
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isLogin ? "/users/login" : "/users/register";

    try {
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1${endpoint}`, payload, {
        withCredentials: true
      });

      if (isLogin) {
        const loggedInUser = res.data?.data?.user || res.data?.data || res.data;
        setUser(loggedInUser);
        onClose();
      } else {
        setStep(2); // Move to Registration OTP
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/users/verify-otp`, {
        email: formData.email,
        otp: otp
      });
      alert("Email Verified! Please sign in.");
      setStep(1);
      setIsLogin(true);
      setOtp('');
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or Expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300">
      <div className="relative w-full max-w-md p-10 rounded-3xl bg-black border border-red-500/20 shadow-[0_0_60px_-15px_rgba(225,29,72,0.3)] text-white">
        
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-black rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-500/30">
            {(forgotPassword || step === 2) ? <KeyRound className="text-red-500 w-8 h-8" /> : <ShieldCheck className="text-white w-8 h-8" />}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tighter">
            {forgotPassword ? "Reset Access" : step === 2 ? "Verify Email" : isLogin ? "Welcome Back" : "Join Valdora"}
          </h2>
          <p className="text-sm mt-2 text-zinc-400 font-medium">
            {forgotPassword ? "Recover your account password" : step === 2 ? `Enter code sent to ${formData.email}` : "Enter your details to continue"}
          </p>
        </div>

        {/* FORGOT PASSWORD FLOW */}
        {forgotPassword ? (
          <ForgotPasswordForm onBack={() => setForgotPassword(false)} />
        ) : (
          <>
            {/* LOGIN / REGISTER STEP 1 */}
            {step === 1 ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <>
                      <FormInput icon={Type} placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                      <FormInput icon={User} placeholder="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                    </>
                  )}
                  <FormInput icon={Mail} type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  <FormInput icon={Lock} type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 active:scale-[0.98] text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50"
                  >
                    {loading ? "Authenticating..." : isLogin ? "Sign In" : "Register"}
                  </button>
                </form>

                {isLogin && (
                  <div className="text-center mt-5">
                    <button onClick={() => setForgotPassword(true)} className="text-red-500 hover:text-red-400 text-sm font-semibold">Forgot password?</button>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-red-500/10 text-center">
                  <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    {isLogin ? "New to Valdora? " : "Already verified? "}
                    <span className="text-red-500 font-bold">{isLogin ? "Register Now" : "Sign In"}</span>
                  </button>
                </div>
              </>
            ) : (
              /* REGISTRATION OTP STEP 2 */
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="relative group">
                  <input
                    required
                    type="text"
                    maxLength="6"
                    placeholder="000000"
                    className="w-full text-center text-4xl tracking-[1.2rem] font-black py-5 rounded-2xl border-2 border-red-500/20 bg-red-500/5 text-white focus:border-red-600 outline-none transition-all"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(225,29,72,0.3)]"
                >
                  {loading ? "Verifying..." : "Confirm & Activate"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="w-full text-sm font-semibold text-zinc-500 hover:text-white transition-colors"
                >
                  Used wrong email? Go back
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FormInput({ icon: Icon, type = "text", placeholder, value, onChange }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-4 top-4 w-5 h-5 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
      <input
        required
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-4 rounded-xl border border-red-500/10 bg-red-500/5 focus:bg-red-500/10 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
      />
    </div>
  );
}

function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formStep, setFormStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/users/forgot-password`, { email });
      setFormStep(2);
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/users/reset-password`, {
        email,
        otp,
        newPassword
      });
      alert('Password updated! Please login.');
      onBack();
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {formStep === 1 ? (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <FormInput icon={Mail} type="email" placeholder="Registered Email" value={email} onChange={e => setEmail(e.target.value)} />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-700 to-red-600 text-white font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <p className="text-center text-xs text-zinc-500">Enter code sent to {email}</p>
          <FormInput icon={KeyRound} placeholder="6-Digit Code" value={otp} onChange={e => setOtp(e.target.value)} />
          <FormInput icon={Lock} type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white font-bold rounded-xl"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
      <button onClick={onBack} className="w-full mt-2 text-sm text-zinc-500 hover:text-white font-semibold transition-colors">
        Back to Login
      </button>
    </div>
  );
}