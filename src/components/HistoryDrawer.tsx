/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Pressable, useColorScheme, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChatSession } from '../services/Database';
import { MaterialIcons } from '@expo/vector-icons';

interface HistoryDrawerProps {
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (session: ChatSession) => void;
  onDeleteSession: (session: ChatSession) => void;
}

export default function HistoryDrawer({
  visible,
  onOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
}: HistoryDrawerProps) {
  const [showModal, setShowModal] = useState(visible);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const mutedIconColor = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';
  const insets = useSafeAreaInsets();

  const screenWidth = Dimensions.get('window').width;
  // Make drawer take up 85% of screen width
  const DRAWER_WIDTH = screenWidth * 0.85;
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible && !isSwiping) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowModal(true);
      translateX.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });
    } else if (!visible && !isSwiping) {
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setShowModal)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isSwiping, DRAWER_WIDTH]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      runOnJS(setIsSwiping)(true);
      if (!showModal) {
        runOnJS(setShowModal)(true);
      }
    })
    .onUpdate((e) => {
      const startX = visible ? 0 : -DRAWER_WIDTH;
      const newTranslateX = startX + e.translationX;
      translateX.value = Math.max(-DRAWER_WIDTH, Math.min(0, newTranslateX));
      // Opacity goes from 0 to 1 based on drawer position
      opacity.value = (translateX.value + DRAWER_WIDTH) / DRAWER_WIDTH;
    })
    .onEnd((e) => {
      runOnJS(setIsSwiping)(false);
      // Snap logic based on velocity or halfway threshold
      if (e.velocityX > 500 || translateX.value > -DRAWER_WIDTH / 2) {
        // Open
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 200 });
        runOnJS(onOpen)();
      } else {
        // Close
        translateX.value = withTiming(-DRAWER_WIDTH, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(setShowModal)(false);
          }
        });
        runOnJS(onClose)();
      }
    });

  const animatedDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // If not visible and not animating, only render the edge hit zone
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[
          StyleSheet.absoluteFill,
          { top: -insets.top, zIndex: 100, elevation: 100 },
        ]}
        pointerEvents={showModal ? 'auto' : 'box-none'}
      >
        {showModal && (
          <View className="flex-1 flex-row">
            {/* Dark overlay */}
            <Animated.View style={[animatedOverlayStyle, StyleSheet.absoluteFill]}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="flex-1 bg-black/40 dark:bg-black/60"
              />
            </Animated.View>

            {/* Drawer Panel */}
            <Animated.View
              style={[animatedDrawerStyle, { width: DRAWER_WIDTH }]}
              className="bg-background h-full shadow-2xl"
            >
              {menuVisibleId && (
                 <Pressable 
                   style={[StyleSheet.absoluteFill, { zIndex: 40 }]}
                   onPress={() => setMenuVisibleId(null)}
                 />
              )}
              <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                <View className="px-6 py-4 flex-row items-center justify-between">
                  <Text className="text-xl font-semibold text-foreground tracking-tight">Emi</Text>
                  <Pressable
                    onPress={onClose}
                    className="p-2 -mr-2 rounded-full active:bg-pill"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="close" size={24} color={iconColor} />
                  </Pressable>
                </View>

                <View className="flex-1 px-3">
                  <Text className="px-4 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Recent
                  </Text>
                  <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const isActive = item.id === currentSessionId;
                      return (
                        <View className={`mb-1 rounded-[20px] ${isActive ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-transparent'} ${menuVisibleId === item.id ? 'z-50' : 'z-0'}`}>
                          <Pressable
                            onPress={() => { onSelectSession(item.id); onClose(); }}
                            className="flex-1 flex-row items-center py-3.5 px-4 active:bg-zinc-300 dark:active:bg-zinc-700"
                          >
                            <View className="flex-1 mx-3 ml-2 justify-center">
                              <Text
                                numberOfLines={1}
                                className={`text-[15px] ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground font-normal'}`}
                              >
                                {item.title}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => setMenuVisibleId(menuVisibleId === item.id ? null : item.id)}
                              className="p-2 -mr-2 rounded-full active:bg-border/50"
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <MaterialIcons name="more-vert" size={20} color={mutedIconColor} />
                            </Pressable>
                          </Pressable>
                          {menuVisibleId === item.id && (
                            <View 
                              className="absolute right-12 top-10 w-44 bg-background border border-pill-border rounded-2xl shadow-xl z-50 p-1.5" 
                              style={{ 
                                elevation: 8, 
                                shadowColor: '#000', 
                                shadowOffset: { width: 0, height: 4 }, 
                                shadowOpacity: 0.3, 
                                shadowRadius: 8 
                              }}
                            >
                              <Pressable 
                                onPress={() => { 
                                  setMenuVisibleId(null); 
                                  onClose(); 
                                  setTimeout(() => onRenameSession(item), 250);
                                }}
                                className="flex-row items-center px-3 py-3 rounded-xl mb-1 active:bg-pill"
                              >
                                <MaterialIcons name="edit" size={18} color={iconColor} />
                                <Text className="ml-3 text-foreground font-medium text-[15px]">Rename</Text>
                              </Pressable>
                              <Pressable 
                                onPress={() => { 
                                  setMenuVisibleId(null); 
                                  onClose(); 
                                  setTimeout(() => onDeleteSession(item), 250);
                                }}
                                className="flex-row items-center px-3 py-3 rounded-xl active:bg-red-500/10"
                              >
                                <MaterialIcons name="delete-outline" size={19} color="#ef4444" />
                                <Text className="ml-3 text-red-500 font-medium text-[15px]">Delete</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    }}
                    ListEmptyComponent={
                      <Text className="px-4 py-4 text-sm text-muted-foreground text-center mt-4">
                        No recent chats.
                      </Text>
                    }
                  />
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        )}
        
        {/* Invisible edge hit zone for opening the drawer */}
        {!showModal && (
          <View 
            style={{ 
              position: 'absolute', 
              left: 0, 
              top: 0, 
              bottom: 0, 
              width: 30, 
              zIndex: 100,
              backgroundColor: 'transparent' // Required for Android to register touches on empty views
            }} 
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}
