import React from 'react';
import LoginForm from '../../components/auth/LoginForm';
import AuthLayout from '../../components/auth/AuthLayout';

const Login: React.FC = () => {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue your spiritual journey"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;