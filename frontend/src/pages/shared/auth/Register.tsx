import React from 'react';
import { useTranslation } from 'react-i18next';
import RegisterForm from '@/components/shared/auth/RegisterForm';
import AuthLayout from '@/components/shared/auth/AuthLayout';

const Register: React.FC = () => {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;