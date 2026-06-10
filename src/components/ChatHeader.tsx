import React from 'react';
import { View, Pressable, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ChatHeaderProps {
  onMenuPress: () => void;
  onNewChatPress?: () => void;
}

export default function ChatHeader({ onMenuPress, onNewChatPress }: ChatHeaderProps) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-background z-10 shadow-sm">
      <Pressable 
        onPress={onMenuPress} 
        className="p-2 -ml-2"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="menu" size={26} color={iconColor} />
      </Pressable>
     
      {onNewChatPress ? (
        <Pressable 
          onPress={onNewChatPress}
          className="p-2 -mr-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="add-circle" size={26} color={iconColor} />
        </Pressable>
      ) : (
        <View className="w-8" />
      )}
    </View>
  );
}
