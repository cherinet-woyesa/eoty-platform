import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';
import BetterAuthRegisterForm from '../../components/auth/BetterAuthRegisterForm';
import AuthLayout from '../../components/auth/AuthLayout';

const Register: React.FC = () => {
  // Feature flag to toggle between old and new auth UI
  const useBetterAuth = import.meta.env.VITE_ENABLE_BETTER_AUTH === 'true';

  return (
    <AuthLayout
      title="Join our community"
      subtitle="Create your account to start your spiritual teaching journey"
    >
      {useBetterAuth ? <BetterAuthRegisterForm /> : <RegisterForm />}
    </AuthLayout>
  );
};

export default Register;