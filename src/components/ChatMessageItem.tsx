import { useEffect } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { ChatMessage } from '../services/Database';

interface ChatMessageItemProps {
  item: ChatMessage;
  markdownStyles: any;
}

export default function ChatMessageItem({ item, markdownStyles }: ChatMessageItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (item.text === '') {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [item.text, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (item.sender === 'user') {
    return (
      <View className="w-full mb-6 mt-2" style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}>
        <View 
          style={{
            maxWidth: '85%',
            backgroundColor: isDark ? '#27272a' : '#f4f4f5',
            borderRadius: 22,
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <Text 
            style={{ 
              fontSize: 16, 
              lineHeight: 24, 
              color: isDark ? '#ffffff' : '#000000',
              fontWeight: '400',
            }}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  // AI Message
  return (
    <View className="px-4 py-2 flex-row w-full mb-4 items-start max-w-[95%]">
      <View className="flex-1 pt-1">
        {item.text === '' ? (
          <Animated.Text style={[animatedStyle]} className="text-[15px] font-medium leading-relaxed text-muted-foreground">
            Thinking...
          </Animated.Text>
        ) : (
          <Markdown style={markdownStyles}>
            {item.text}
          </Markdown>
        )}
      </View>
    </View>
  );
}
