import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '~/components/ui/button';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { FormInput } from '~/components/ui/form-input';
import * as schema from '~/db/schema';
import { userProfileSchema, type UserProfileFormData } from '~/lib/validations/user';

export default function Setup() {
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useUnistyles();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
    },
  });

  const onSubmit = async (data: UserProfileFormData) => {
    setIsSubmitting(true);

    try {
      // Update the app settings
      await drizzleDb
        .update(schema.appSettings)
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          updatedAt: new Date(),
        })
        .where(eq(schema.appSettings.id, 1));

      // Navigate to home screen
      router.replace('/home');
    } catch (error) {
      console.error('Error saving user profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="always">
            <View style={styles.content}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>Set up your profile to get started</Text>

              <View style={styles.form}>
                <FormInput
                  name="firstName"
                  control={control}
                  label="First Name"
                  placeholder="Enter your first name"
                  error={errors.firstName}
                  autoCorrect={false}
                />

                <FormInput
                  name="lastName"
                  control={control}
                  label="Last Name"
                  placeholder="Enter your last name"
                  error={errors.lastName}
                  autoCorrect={false}
                />

                <FormInput
                  name="username"
                  control={control}
                  label="Username (Optional)"
                  placeholder="Enter a username"
                  error={errors.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
              ) : (
                <Button
                  title="Save Profile"
                  style={styles.button}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                />
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: theme.margins.screen,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.typography,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.typography,
    opacity: 0.6,
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  loadingContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    padding: 16,
  },
  button: {
    marginTop: 'auto',
  },
}));
