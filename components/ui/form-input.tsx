import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> extends Omit<TextInputProps, 'style'> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  error?: FieldError;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

function FormInputComponent<T extends FieldValues>(
  { name, control, label, error, containerStyle, inputStyle, ...inputProps }: FormInputProps<T>,
  ref: React.ForwardedRef<TextInput>
) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle, error && styles.inputError]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            placeholderTextColor="#999"
            {...inputProps}
          />
        )}
      />
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
}

export const FormInput = forwardRef(FormInputComponent) as <T extends FieldValues>(
  props: FormInputProps<T> & { ref?: React.ForwardedRef<TextInput> }
) => React.ReactElement;

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
}));
