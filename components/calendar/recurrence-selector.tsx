import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import {
  RecurrenceRule,
  RecurrenceFrequency,
  RecurrenceByWeekday,
  RecurrencePatterns,
  getRecurrenceDescription,
} from '~/lib/recurrence';

interface RecurrenceSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (rule: RecurrenceRule | null) => void;
  initialRule?: RecurrenceRule | null;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const WEEKDAY_OPTIONS: { value: RecurrenceByWeekday; label: string; short: string }[] = [
  { value: 'SU', label: 'Sunday', short: 'S' },
  { value: 'MO', label: 'Monday', short: 'M' },
  { value: 'TU', label: 'Tuesday', short: 'T' },
  { value: 'WE', label: 'Wednesday', short: 'W' },
  { value: 'TH', label: 'Thursday', short: 'T' },
  { value: 'FR', label: 'Friday', short: 'F' },
  { value: 'SA', label: 'Saturday', short: 'S' },
];

export default function RecurrenceSelector({
  visible,
  onClose,
  onSelect,
  initialRule,
}: RecurrenceSelectorProps) {
  const { theme } = useUnistyles();

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initialRule?.frequency || 'WEEKLY'
  );
  const [interval, setInterval] = useState<string>(String(initialRule?.interval || 1));
  const [selectedWeekdays, setSelectedWeekdays] = useState<RecurrenceByWeekday[]>(
    initialRule?.byWeekday || []
  );
  const [count, setCount] = useState<string>(initialRule?.count ? String(initialRule.count) : '');
  const [endDate, setEndDate] = useState<Date | null>(initialRule?.until || null);
  const [endType, setEndType] = useState<'never' | 'count' | 'date'>(() => {
    if (initialRule?.count) return 'count';
    if (initialRule?.until) return 'date';
    return 'never';
  });

  const handleFrequencyChange = (newFrequency: RecurrenceFrequency) => {
    setFrequency(newFrequency);
    // Reset weekdays when changing frequency
    if (newFrequency !== 'WEEKLY') {
      setSelectedWeekdays([]);
    }
  };

  const toggleWeekday = (weekday: RecurrenceByWeekday) => {
    setSelectedWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((w) => w !== weekday) : [...prev, weekday]
    );
  };

  const getCurrentRule = (): RecurrenceRule => {
    const rule: RecurrenceRule = {
      frequency,
      interval: parseInt(interval) || 1,
    };

    if (endType === 'count' && count) {
      rule.count = parseInt(count);
    } else if (endType === 'date' && endDate) {
      rule.until = endDate;
    }

    if (frequency === 'WEEKLY' && selectedWeekdays.length > 0) {
      rule.byWeekday = selectedWeekdays;
    }

    return rule;
  };

  const handleSave = () => {
    const rule = getCurrentRule();
    onSelect(rule);
    onClose();
  };

  const handleRemoveRecurrence = () => {
    onSelect(null);
    onClose();
  };

  const getPreviewText = () => {
    try {
      const rule = getCurrentRule();
      return getRecurrenceDescription(rule);
    } catch {
      return 'Custom recurrence pattern';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Repeat</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Options</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={() => onSelect(RecurrencePatterns.daily())}>
              <Text style={styles.optionText}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => onSelect(RecurrencePatterns.weekdays())}>
              <Text style={styles.optionText}>Every weekday (Mon-Fri)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => onSelect(RecurrencePatterns.weekly())}>
              <Text style={styles.optionText}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => onSelect(RecurrencePatterns.monthly())}>
              <Text style={styles.optionText}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => onSelect(RecurrencePatterns.yearly())}>
              <Text style={styles.optionText}>Yearly</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom</Text>

            {/* Frequency */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      frequency === option.value && styles.frequencyOptionSelected,
                    ]}
                    onPress={() => handleFrequencyChange(option.value)}>
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        frequency === option.value && styles.frequencyOptionTextSelected,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Interval */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Every</Text>
              <View style={styles.intervalContainer}>
                <TextInput
                  style={styles.intervalInput}
                  value={interval}
                  onChangeText={setInterval}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <Text style={styles.intervalLabel}>
                  {frequency === 'DAILY'
                    ? parseInt(interval) === 1
                      ? 'day'
                      : 'days'
                    : frequency === 'WEEKLY'
                      ? parseInt(interval) === 1
                        ? 'week'
                        : 'weeks'
                      : frequency === 'MONTHLY'
                        ? parseInt(interval) === 1
                          ? 'month'
                          : 'months'
                        : parseInt(interval) === 1
                          ? 'year'
                          : 'years'}
                </Text>
              </View>
            </View>

            {/* Weekdays (for weekly frequency) */}
            {frequency === 'WEEKLY' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>On days</Text>
                <View style={styles.weekdaysContainer}>
                  {WEEKDAY_OPTIONS.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.weekdayButton,
                        selectedWeekdays.includes(day.value) && styles.weekdayButtonSelected,
                      ]}
                      onPress={() => toggleWeekday(day.value)}>
                      <Text
                        style={[
                          styles.weekdayButtonText,
                          selectedWeekdays.includes(day.value) && styles.weekdayButtonTextSelected,
                        ]}>
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* End Options */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ends</Text>

              <TouchableOpacity
                style={[styles.endOption, endType === 'never' && styles.endOptionSelected]}
                onPress={() => setEndType('never')}>
                <View style={styles.radioButton}>
                  {endType === 'never' && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.endOptionText}>Never</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.endOption, endType === 'count' && styles.endOptionSelected]}
                onPress={() => setEndType('count')}>
                <View style={styles.radioButton}>
                  {endType === 'count' && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.endOptionText}>After</Text>
                <TextInput
                  style={[styles.countInput, endType === 'count' && styles.countInputActive]}
                  value={count}
                  onChangeText={setCount}
                  keyboardType="numeric"
                  placeholder="10"
                  editable={endType === 'count'}
                />
                <Text style={styles.endOptionText}>occurrences</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.endOption, endType === 'date' && styles.endOptionSelected]}
                onPress={() => setEndType('date')}>
                <View style={styles.radioButton}>
                  {endType === 'date' && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.endOptionText}>On date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, endType === 'date' && styles.dateButtonActive]}
                  disabled={endType !== 'date'}>
                  <Text
                    style={[
                      styles.dateButtonText,
                      endType === 'date' && styles.dateButtonTextActive,
                    ]}>
                    {endDate ? endDate.toLocaleDateString() : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Text style={styles.previewText}>{getPreviewText()}</Text>
            </View>
          </View>

          {/* Remove Recurrence */}
          {initialRule && (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveRecurrence}>
              <Icons.Feather name="x-circle" size={20} color="#EF4444" />
              <Text style={styles.removeButtonText}>Remove Recurrence</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  saveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
  },
  section: {
    marginTop: theme.spacing(6),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  option: {
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  formGroup: {
    marginBottom: theme.spacing(5),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(3),
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  frequencyOptionText: {
    fontSize: 14,
    color: theme.colors.typography,
    fontWeight: '500',
  },
  frequencyOptionTextSelected: {
    color: theme.colors.white,
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  intervalInput: {
    width: 60,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    textAlign: 'center',
  },
  intervalLabel: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  weekdayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  weekdayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  weekdayButtonTextSelected: {
    color: theme.colors.white,
  },
  endOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(3),
  },
  endOptionSelected: {
    // Add visual feedback if needed
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  endOptionText: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  countInput: {
    width: 60,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(1),
    fontSize: 16,
    textAlign: 'center',
  },
  countInputActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dateButton: {
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
  },
  dateButtonActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  dateButtonTextActive: {
    color: theme.colors.primary,
  },
  preview: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(4),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(2),
  },
  previewText: {
    fontSize: 16,
    color: theme.colors.typography,
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(4),
    marginVertical: theme.spacing(6),
    gap: theme.spacing(2),
  },
  removeButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
}));
