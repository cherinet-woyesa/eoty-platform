import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';
import AuthLayout from '../../components/auth/AuthLayout';

const Register: React.FC = () => {
  return (
    <AuthLayout
      title="Join our community"
      subtitle="Create your account to start your spiritual teaching journey"
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;