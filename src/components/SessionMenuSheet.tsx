import React from 'react';
import { Text, Pressable } from 'react-native';
import BottomSheet from './BottomSheet';

interface SessionMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onRenamePress: () => void;
  onDeletePress: () => void;
}

export default function SessionMenuSheet({ visible, onClose, onRenamePress, onDeletePress }: SessionMenuSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Pressable 
        onPress={onRenamePress} 
        className="py-4 px-6 border-b border-border"
      >
        <Text className="text-lg text-foreground">Rename Chat</Text>
      </Pressable>
      <Pressable 
        onPress={onDeletePress} 
        className="py-4 px-6"
      >
        <Text className="text-lg font-semibold text-red-500">Delete Chat</Text>
      </Pressable>
    </BottomSheet>
  );
}
