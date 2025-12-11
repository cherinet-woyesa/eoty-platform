import React from 'react';
import { useTranslation } from 'react-i18next';
import LoginForm from '@/components/shared/auth/LoginForm';
import AuthLayout from '@/components/shared/auth/AuthLayout';

const Login: React.FC = () => {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;