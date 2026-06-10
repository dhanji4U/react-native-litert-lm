import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, useColorScheme } from 'react-native';

interface RenameModalProps {
  visible: boolean;
  onClose: () => void;
  renameText: string;
  setRenameText: (text: string) => void;
  onSave: () => void;
}

export default function RenameModal({ visible, onClose, renameText, setRenameText, onSave }: RenameModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View 
          style={{
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Text 
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: isDark ? '#ffffff' : '#1c1c1e',
              marginBottom: 16,
            }}
          >
            Rename Chat
          </Text>
          <TextInput
            value={renameText}
            onChangeText={setRenameText}
            style={{
              backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: isDark ? '#ffffff' : '#1c1c1e',
              fontSize: 16,
              marginBottom: 24,
            }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <View 
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: isDark ? '#a1a1aa' : '#71717a', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onSave} 
              style={{ 
                backgroundColor: isDark ? '#ffffff' : '#1c1c1e', 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                borderRadius: 12 
              }}
            >
              <Text style={{ color: isDark ? '#1c1c1e' : '#ffffff', fontWeight: '600', fontSize: 15 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
