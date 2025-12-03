import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../constant/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { code, type } = useLocalSearchParams();

  useEffect(() => {
    handleEmailVerification();
  }, []);

  const handleEmailVerification = async () => {
    try {
      if (!code) {
        throw new Error('No verification code found');
      }
      // Handle code as string (it might come as array from URL params)
      const codeString = Array.isArray(code) ? code[0] : code;
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(codeString);

      if (error) {
        console.error('Email verification error:', error.message);
        // Redirect to signup with error
        router.replace({
          pathname: '/signup',
          params: { error: 'Email verification failed. Please try again.' },
        });
        return;
      }

      if (data.session) {
        console.log('Email verified successfully!');
        // User is now logged in, redirect to home
        router.replace('/home');
      }
    } catch (error) {
      console.error('Unexpected error during verification:', error);
      router.replace({
        pathname: '/signup',
        params: { error: 'An unexpected error occurred.' },
      });
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16, fontSize: 16 }}>Verifying your email...</Text>
    </View>
  );
}