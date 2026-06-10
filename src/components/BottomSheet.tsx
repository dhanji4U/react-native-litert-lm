import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [showModal, setShowModal] = useState(visible);
  
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowModal(true);
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });
    } else if (showModal) {
      translateY.value = withTiming(500, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Modal visible={showModal} animationType="none" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* Dark overlay */}
        <Animated.View style={[animatedOverlayStyle, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }]}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={onClose} 
            className="flex-1 bg-black/40 dark:bg-black/70" 
          />
        </Animated.View>
        
        {/* Sheet Content */}
        <Animated.View 
          style={[animatedSheetStyle]} 
          className="bg-background rounded-t-3xl shadow-2xl pt-2 pb-10"
        >
          <SafeAreaView>
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 rounded-full bg-border" />
            </View>
            {children}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
