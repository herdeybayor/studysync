import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import { Button } from '~/components/ui/button';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import * as schema from '~/db/schema';

export default function Setup() {
  const db = useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      // Simple validation
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the app settings
      await drizzleDb
        .update(schema.appSettings)
        .set({
          firstName,
          lastName,
          username: username.trim() || null,
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
              <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter a username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#2F80ED" size="large" />
                </View>
              ) : (
                <Button
                  title="Save Profile"
                  style={styles.button}
                  onPress={handleSubmit}
                  disabled={!firstName.trim() || !lastName.trim() || isSubmitting}
                />
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    padding: 16,
  },
  button: {
    marginTop: 'auto',
  },
});
