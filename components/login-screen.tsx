'use client';

import { useState } from 'react';
import { Leaf, Droplet, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async () => {
    if (mobileNumber.length < 10) {
      alert('Please enter a valid mobile number');
      return;
    }
    setIsLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 1000);
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      alert('Please enter a valid OTP');
      return;
    }
    setIsLoading(true);
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2E7D32] to-[#1B5E20] flex flex-col pt-12 px-6">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-12">
        <div className="relative">
          <Leaf className="w-10 h-10 text-white" />
          <Droplet className="absolute w-5 h-5 text-blue-400 bottom-0 right-0" />
        </div>
        <h1 className="text-2xl font-bold text-white">Smart Farm</h1>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl shadow-lg p-8 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#263238] mb-2">Welcome</h2>
          <p className="text-[#90A4AE] mb-8">Login to control your farm</p>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#263238] mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center bg-[#F4F8F4] rounded-2xl px-4 py-3">
                  <Phone className="w-5 h-5 text-[#2E7D32] mr-3" />
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.slice(0, 10))}
                    className="flex-1 bg-transparent outline-none text-[#263238] placeholder-[#90A4AE] text-lg"
                  />
                </div>
                {mobileNumber && (
                  <p className="text-xs text-[#90A4AE] mt-2">{mobileNumber.length}/10 digits</p>
                )}
              </div>

              <Button
                onClick={handlePhoneSubmit}
                disabled={isLoading}
                className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white h-12 rounded-2xl text-base font-semibold mt-6"
              >
                {isLoading ? 'Sending OTP...' : 'Login with OTP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#90A4AE]">
                OTP sent to {mobileNumber}
              </p>
              <div>
                <label className="block text-sm font-medium text-[#263238] mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                  className="w-full bg-[#F4F8F4] rounded-2xl px-4 py-3 text-center text-2xl tracking-widest font-semibold text-[#263238] outline-none"
                />
              </div>

              <Button
                onClick={handleOtpSubmit}
                disabled={isLoading}
                className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white h-12 rounded-2xl text-base font-semibold mt-6"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <button
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                }}
                className="text-sm text-[#2E7D32] font-medium mt-2"
              >
                Back to phone number
              </button>
            </div>
          )}
        </div>

        {/* Divider and Google Login */}
        <div className="pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E8EFE8]" />
            <span className="text-sm text-[#90A4AE]">or</span>
            <div className="flex-1 h-px bg-[#E8EFE8]" />
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border-2 border-[#E8EFE8] hover:bg-[#F4F8F4] text-[#263238] h-12 rounded-2xl text-base font-semibold"
          >
            <Mail className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
