import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { EventCategory } from '~/db/schema';

interface CategorySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: EventCategory | null) => void;
  categories: EventCategory[];
  selectedCategory?: EventCategory | null;
  onCreateCategory?: (category: Omit<EventCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#64748B', // Slate
];

const PRESET_ICONS = [
  { name: 'book', label: 'Book' },
  { name: 'graduation-cap', label: 'Education' },
  { name: 'clipboard', label: 'Task' },
  { name: 'alert-circle', label: 'Important' },
  { name: 'users', label: 'Meeting' },
  { name: 'user', label: 'Personal' },
  { name: 'coffee', label: 'Break' },
  { name: 'calendar', label: 'Event' },
  { name: 'clock', label: 'Time' },
  { name: 'star', label: 'Favorite' },
  { name: 'briefcase', label: 'Work' },
  { name: 'heart', label: 'Health' },
];

export default function CategorySelector({
  visible,
  onClose,
  onSelect,
  categories,
  selectedCategory,
  onCreateCategory,
}: CategorySelectorProps) {
  const { theme } = useUnistyles();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(PRESET_ICONS[0].name);

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (onCreateCategory) {
      onCreateCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        isDefault: false,
      });
    }

    // Reset form
    setNewCategoryName('');
    setNewCategoryColor(PRESET_COLORS[0]);
    setNewCategoryIcon(PRESET_ICONS[0].name);
    setShowCreateForm(false);
  };

  const handleSelectCategory = (category: EventCategory | null) => {
    onSelect(category);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Category</Text>
          <TouchableOpacity onPress={() => setShowCreateForm(!showCreateForm)}>
            <Icons.Feather name="plus" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* No Category Option */}
          <TouchableOpacity
            style={[styles.categoryOption, !selectedCategory && styles.categoryOptionSelected]}
            onPress={() => handleSelectCategory(null)}>
            <View style={[styles.categoryColor, { backgroundColor: '#e0e0e0' }]} />
            <Text style={styles.categoryName}>No Category</Text>
            {!selectedCategory && (
              <Icons.Feather name="check" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          {/* Existing Categories */}
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                selectedCategory?.id === category.id && styles.categoryOptionSelected,
              ]}
              onPress={() => handleSelectCategory(category)}>
              <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.isDefault && <Text style={styles.defaultLabel}>Default</Text>}
              </View>
              {category.icon && (
                <Icons.Feather name={category.icon as any} size={16} color={category.color} />
              )}
              {selectedCategory?.id === category.id && (
                <Icons.Feather name="check" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          {/* Create New Category Form */}
          {showCreateForm && (
            <View style={styles.createForm}>
              <Text style={styles.createFormTitle}>Create New Category</Text>

              {/* Category Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Category name"
                  maxLength={30}
                />
              </View>

              {/* Color Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newCategoryColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setNewCategoryColor(color)}>
                      {newCategoryColor === color && (
                        <Icons.Feather name="check" size={16} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Icon Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.iconScroll}>
                  <View style={styles.iconGrid}>
                    {PRESET_ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon.name}
                        style={[
                          styles.iconOption,
                          newCategoryIcon === icon.name && styles.iconOptionSelected,
                        ]}
                        onPress={() => setNewCategoryIcon(icon.name)}>
                        <Icons.Feather
                          name={icon.name as any}
                          size={20}
                          color={
                            newCategoryIcon === icon.name
                              ? theme.colors.white
                              : theme.colors.typography
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Preview */}
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.previewCategory}>
                  <View style={[styles.categoryColor, { backgroundColor: newCategoryColor }]} />
                  <Text style={styles.categoryName}>{newCategoryName || 'Category name'}</Text>
                  <Icons.Feather name={newCategoryIcon as any} size={16} color={newCategoryColor} />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateForm(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createButton} onPress={handleCreateCategory}>
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: theme.spacing(3),
  },
  categoryOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  categoryColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.typography,
  },
  defaultLabel: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
    marginTop: 2,
  },
  createForm: {
    marginTop: theme.spacing(6),
    padding: theme.spacing(4),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  createFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  formGroup: {
    marginBottom: theme.spacing(4),
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(2),
  },
  formInput: {
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
    fontSize: 16,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: theme.colors.typography,
  },
  iconScroll: {
    maxHeight: 60,
  },
  iconGrid: {
    flexDirection: 'row',
    gap: theme.spacing(2),
    paddingRight: theme.spacing(4),
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: theme.spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  preview: {
    marginBottom: theme.spacing(4),
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(2),
  },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
    gap: theme.spacing(3),
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing(3),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing(3),
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    paddingVertical: theme.spacing(3),
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing(2),
  },
  createButtonText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '600',
  },
}));
