import React from 'react';
import { View, Text, TouchableOpacity, Modal, useColorScheme } from 'react-native';

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  sessionTitle?: string;
  onDelete: () => void;
}

export default function DeleteModal({ visible, onClose, sessionTitle, onDelete }: DeleteModalProps) {
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
              marginBottom: 8,
            }}
          >
            Delete Chat
          </Text>
          <Text 
            style={{
              fontSize: 16,
              color: isDark ? '#d4d4d8' : '#3f3f46',
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            Are you sure you want to delete &quot;{sessionTitle}&quot;? This cannot be undone.
          </Text>
          
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
              onPress={onDelete} 
              style={{ 
                backgroundColor: '#ef4444', 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                borderRadius: 12 
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
