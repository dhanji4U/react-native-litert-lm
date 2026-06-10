import React, { useState } from 'react';
import { View, TextInput, type LayoutChangeEvent, Pressable, useColorScheme, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';

interface ChatComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
  isGenerating: boolean;
  onSend: () => void;
  onStop: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  animatedStyle: any;
}

export default function ChatComposer({
  inputText,
  setInputText,
  isGenerating,
  onSend,
  onStop,
  onLayout,
  animatedStyle,
}: ChatComposerProps) {
  const [inputHeight, setInputHeight] = useState(24);
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';
  const pillBorderColor = colorScheme === 'dark' ? '#27272a' : '#e4e4e7';
  
  // Allow the input to grow above half the screen height (approx 55%)
  const MAX_INPUT_HEIGHT = Dimensions.get('window').height * 0.55;

  return (
    <Animated.View
      className="absolute inset-x-0 bottom-0 bg-background pt-2"
      onLayout={onLayout}
      style={[animatedStyle, { zIndex: 100, elevation: 10 }]}
    >
      <View className="px-4 pb-3">
        {/* Unified Premium Pill Container */}
        <View
          className="flex-row items-end bg-pill shadow-sm"
          style={{
            borderWidth: 1,
            borderColor: pillBorderColor,
            borderRadius: 10, // Perfect pill curve
            minHeight: 52, // Slightly taller for premium feel
            paddingLeft: 4,
            paddingRight: 6,
            paddingBottom: 4,
            paddingTop: 4,
          }}
        >
          {/* Attachment Button (Left) */}
          {/* <View style={{ alignSelf: 'flex-end', marginBottom: 4, marginRight: 4 }}>
            <Pressable
              className="w-10 h-10 items-center justify-center rounded-full"
            >
              <Feather name="plus" size={24} color={textColor} style={{ opacity: 0.7 }} />
            </Pressable>
          </View> */}

          {/* Input Area (Center) */}
          <TextInput
            className="flex-1"
            style={{
              color: textColor,
              height: Math.max(24, inputHeight),
              maxHeight: MAX_INPUT_HEIGHT,
              fontSize: 16,
              lineHeight: 22,
              paddingTop: 10,
              paddingBottom: 10,
              paddingRight: 8,
            }}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything"
            placeholderTextColor={placeholderColor}
            editable={!isGenerating}
            multiline={true}
            scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
            onContentSizeChange={(e) => {
              setInputHeight(e.nativeEvent.contentSize.height);
            }}
          />

          {/* Action Button Container (Right) */}
          <View style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
            {/* {inputText.trim() || isGenerating ? ( */}
              <Pressable
                onPress={isGenerating ? onStop : (inputText.trim() ? onSend : undefined)}
                className="w-10 h-10 rounded-full items-center justify-center bg-primary"
                style={{
                  elevation: 2
                }}
              >
                {isGenerating ? (
                  <Ionicons name="stop" size={16} color={colorScheme === 'dark' ? '#000000' : '#ffffff'} />
                ) : (
                  <Feather name="arrow-up" size={22} color={colorScheme === 'dark' ? '#000000' : '#ffffff'} />
                )}
              </Pressable>
            {/* ) : (
              <Pressable
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="mic-outline" size={22} color={textColor} style={{ opacity: 0.7 }} />
              </Pressable>
            )} */}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}