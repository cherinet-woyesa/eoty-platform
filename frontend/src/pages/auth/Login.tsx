import React from 'react';
import LoginForm from '../../components/auth/LoginForm';
import BetterAuthLoginForm from '../../components/auth/BetterAuthLoginForm';
import AuthLayout from '../../components/auth/AuthLayout';

const Login: React.FC = () => {
  // Feature flag to toggle between old and new auth UI
  const useBetterAuth = import.meta.env.VITE_ENABLE_BETTER_AUTH === 'true';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue your spiritual journey"
    >
      {useBetterAuth ? <BetterAuthLoginForm /> : <LoginForm />}
    </AuthLayout>
  );
};

export default Login;