import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Keyboard,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { emiEngine } from '../services/EmiEngine';
import { database, ChatMessage, ChatSession } from '../services/Database';
import HistoryDrawer from '../components/HistoryDrawer';
import ChatHeader from '../components/ChatHeader';
import ChatMessageItem from '../components/ChatMessageItem';
import ChatComposer from '../components/ChatComposer';
import RenameModal from '../components/RenameModal';
import DeleteModal from '../components/DeleteModal';

const AUTO_SCROLL_THRESHOLD = 72;
const COMPOSER_OPEN_PADDING = 16;

export default function IndexScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Increased padding to separate from the system navigation bar
  const closedComposerPadding = insets.bottom + 16;
  const { height: keyboardHeight, progress: keyboardProgress } = useReanimatedKeyboardAnimation();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [composerHeight, setComposerHeight] = useState(96);
  const [listHeight, setListHeight] = useState(500);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMenuSession, setSelectedMenuSession] = useState<ChatSession | null>(null);

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = (animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

  const shouldAutoScrollRef = useRef(true);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const prevMessagesCountRef = useRef(0);
  const activeResponseIdRef = useRef<string | null>(null);
  const activeResponseTextRef = useRef<string>('');

  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      if (messages[0]?.sender === 'user') {
        scrollToBottom(true);
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  const loadSessions = async (isInitialLoad: boolean = false, activeSessionId?: string) => {
    let loadedSessions = await database.getSessions();

    const currentActiveId = activeSessionId || currentSessionId;

    // Clean up empty sessions
    for (const s of loadedSessions) {
      if (!isInitialLoad && s.id === currentActiveId) {
        continue; // Keep the active session even if it is currently empty
      }
      const history = await database.loadHistory(s.id);
      if (history.length === 0) {
        await database.deleteSession(s.id);
      }
    }

    // Re-fetch sessions after cleanup
    loadedSessions = await database.getSessions();

    // Filter sessions to only show those that are NOT empty under "Recent"
    const filteredSessions: ChatSession[] = [];
    for (const s of loadedSessions) {
      const history = await database.loadHistory(s.id);
      if (history.length > 0) {
        filteredSessions.push(s);
      }
    }
    setSessions(filteredSessions);

    if (isInitialLoad) {
      // Start a fresh in-memory session (do NOT write to DB yet)
      const newId = Math.random().toString();
      setCurrentSessionId(newId);
      return;
    }

    if (loadedSessions.length > 0) {
      if (currentActiveId && !loadedSessions.find(s => s.id === currentActiveId)) {
        setCurrentSessionId(loadedSessions[0].id);
      }
    } else {
      if (!currentActiveId) {
        const newId = Math.random().toString();
        setCurrentSessionId(newId);
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions(true);
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;

    const switchContext = async () => {
      if (activeResponseIdRef.current) {
        await handleStopMessage();
      }

      const prevId = previousSessionIdRef.current;
      if (prevId && prevId !== 'default' && prevId !== currentSessionId) {
        await emiEngine.saveSessionMemory(`chat_${prevId}.bin`);
      }
      if (currentSessionId !== 'default') {
        await emiEngine.restoreSessionMemory(`chat_${currentSessionId}.bin`);
      }
      previousSessionIdRef.current = currentSessionId;

      setInputText('');
      const history = await database.loadHistory(currentSessionId);
      setMessages(history);
      shouldAutoScrollRef.current = true;
      setShowScrollDown(false);
    };

    switchContext();
  }, [currentSessionId]);

  const handleNewChat = async () => {
    const newId = Math.random().toString();
    // Do NOT write to database here. It will only be created on first message.
    await loadSessions(false, newId);
    setCurrentSessionId(newId);
    setMessages([]);
    setShowScrollDown(false);
    Keyboard.dismiss();
  };

  const handleDeleteSession = async () => {
    if (!selectedMenuSession) return;

    // Actually delete the session from the DB
    await database.deleteSession(selectedMenuSession.id);
    setIsDeleteModalVisible(false);

    // If we deleted the active chat, find a new one to show
    if (currentSessionId === selectedMenuSession.id) {
      const remaining = sessions.filter(s => s.id !== selectedMenuSession.id);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        await loadSessions(false, remaining[0].id);
      } else {
        await handleNewChat();
      }
    } else {
      await loadSessions();
    }
  };

  const handleRenameSession = async () => {
    if (!selectedMenuSession || !renameText.trim()) return;
    await database.updateSessionTitle(selectedMenuSession.id, renameText.trim());
    setIsRenameModalVisible(false);
    setRenameText('');
    loadSessions();
  };

  const markdownStyles = {
    body: { color: isDark ? '#f4f4f5' : '#18181b', fontSize: 16, lineHeight: 24 },
    heading1: { color: isDark ? '#ffffff' : '#000000', fontWeight: 'bold' as const, marginTop: 10, marginBottom: 5, fontSize: 18 },
    heading2: { color: isDark ? '#ffffff' : '#000000', fontWeight: 'bold' as const, marginTop: 10, marginBottom: 5, fontSize: 16 },
    heading3: { color: isDark ? '#ffffff' : '#000000', fontWeight: 'bold' as const, marginTop: 10, marginBottom: 5, fontSize: 15 },
    strong: { color: isDark ? '#ffffff' : '#000000', fontWeight: 'bold' as const },
    paragraph: { marginTop: 0, marginBottom: 10 },
    list_item: { marginBottom: 5 },
    code_inline: { backgroundColor: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#a3e635' : '#059669', fontFamily: 'monospace', borderRadius: 4 },
    code_block: { backgroundColor: isDark ? '#18181b' : '#f4f4f5', color: isDark ? '#d4d4d8' : '#3f3f46', fontFamily: 'monospace', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#3f3f46' : '#e4e4e7', marginBottom: 10 },
  };

  const composerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardHeight.value }],
    paddingBottom: interpolate(
      keyboardProgress.value,
      [0, 1],
      [closedComposerPadding, COMPOSER_OPEN_PADDING]
    ),
  }));

  const scrollDownAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardHeight.value }],
  }));

  const handleListScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const { contentOffset } = event.nativeEvent;
    // Show scroll-down button if user is scrolled up by more than 150px
    const isScrolledUp = contentOffset.y > 150;
    setShowScrollDown(isScrolledUp);
    shouldAutoScrollRef.current = contentOffset.y < AUTO_SCROLL_THRESHOLD;
  };

  const handleComposerLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setComposerHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  };

  const clearWatchdog = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  const triggerAIInference = (prompt: string) => {
    setIsGenerating(true);
    setNativeError(null);

    const responseMessageId = Math.random().toString();
    const newAIMessage: ChatMessage = { id: responseMessageId, session_id: currentSessionId, sender: 'ai', text: '', timestamp: Date.now() };

    // Prepend to array because the list is inverted
    setMessages((prev) => [newAIMessage, ...prev]);
    database.saveMessage(newAIMessage);

    activeResponseIdRef.current = responseMessageId;
    activeResponseTextRef.current = '';

    let currentText = '';

    watchdogTimerRef.current = setTimeout(async () => {
      setNativeError("Inference timeout - check native logs.");
      setIsGenerating(false);
      const responseId = activeResponseIdRef.current;
      const currentTextVal = activeResponseTextRef.current;
      if (responseId) {
        if (currentTextVal.trim() === '') {
          setMessages((prev) => prev.filter((msg) => msg.id !== responseId));
          await database.deleteMessage(responseId);
        } else {
          await database.updateMessageText(responseId, currentTextVal);
        }
      }
      activeResponseIdRef.current = null;
      activeResponseTextRef.current = '';
    }, 35000); // 35s to account for 3s delay

    // Fake 3-second thinking delay to show UI animation
    thinkingTimeoutRef.current = setTimeout(() => {
      emiEngine.inference(
        prompt,
        responseMessageId,
        (token) => {
          clearWatchdog();

          if (token.includes('[JS CATCH ERROR]') || token.includes('[SYNC NATIVE ERROR]') || token.includes('[NATIVE ERROR]')) {
            setNativeError(token.trim());
            return;
          }
          if (token.includes('[JS SYSTEM]') || token.includes('[NATIVE INIT]') || token.includes('[NATIVE SCOPE]') || token.includes('[NATIVE DEBUG]')) {
            return;
          }

          currentText += token;
          activeResponseTextRef.current = currentText;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === responseMessageId ? { ...msg, text: currentText } : msg
            )
          );
          // Disabled auto-scroll during AI response streaming as requested
          /*
          if (shouldAutoScrollRef.current) {
            scrollToBottom(false);
          }
          */
        },
        async () => {
          clearWatchdog();
          setIsGenerating(false);
          await database.updateMessageText(responseMessageId, currentText);

          activeResponseIdRef.current = null;
          activeResponseTextRef.current = '';

          // Auto-generate title for new sessions
          const allSessions = await database.getSessions();
          const currentSession = allSessions.find(s => s.id === currentSessionId);
          if (currentSession && (currentSession.title === 'New Chat' || currentSession.title === 'Previous Chat' || currentSession.title.trim() === '')) {
            const newTitle = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
            await database.updateSessionTitle(currentSessionId, newTitle);
            loadSessions(); // refresh title in drawer
          }
        }
      );
    }, 3000);
  };

  const handleStopMessage = async () => {
    emiEngine.stopInference();
    setIsGenerating(false);
    clearWatchdog();
    if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);

    const responseId = activeResponseIdRef.current;
    const currentText = activeResponseTextRef.current;

    if (responseId) {
      if (currentText.trim() === '') {
        // No tokens were generated. Remove the empty message from UI and DB.
        setMessages((prev) => prev.filter((msg) => msg.id !== responseId));
        await database.deleteMessage(responseId);
      } else {
        // Some tokens were generated. Save the partial response to the database.
        await database.updateMessageText(responseId, currentText);
      }
    }

    activeResponseIdRef.current = null;
    activeResponseTextRef.current = '';
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isGenerating) return;

    setNativeError(null);

    // Ensure session exists in database before saving the first message
    const allSessions = await database.getSessions();
    const sessionExists = allSessions.some(s => s.id === currentSessionId);
    if (!sessionExists) {
      await database.createSession(currentSessionId, 'New Chat');
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      session_id: currentSessionId,
      sender: 'user',
      text: trimmedInput,
      timestamp: Date.now(),
    };

    shouldAutoScrollRef.current = true;
    // Prepend to array because the list is inverted
    setMessages((prev) => [userMessage, ...prev]);
    setInputText('');

    await database.saveMessage(userMessage);

    // Refresh the sessions list to show this session in the sidebar
    await loadSessions(false, currentSessionId);

    setTimeout(() => {
      triggerAIInference(trimmedInput);
    }, 400);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* HEADER */}
      <ChatHeader onMenuPress={() => setIsDrawerOpen(true)} onNewChatPress={handleNewChat} />

      {nativeError ? (
        <View className="bg-red-100 dark:bg-red-900/40 px-4 py-3 border-b border-red-200 dark:border-red-800 flex-row justify-between items-center z-50">
          <Text className="text-red-800 dark:text-red-200 font-mono text-xs flex-1 mr-4">{nativeError}</Text>
          <TouchableOpacity onPress={() => setNativeError(null)} className="bg-red-200 dark:bg-red-950 px-3 py-1.5 rounded">
            <Text className="text-red-900 dark:text-red-100 font-bold text-xs uppercase">Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <HistoryDrawer
        visible={isDrawerOpen}
        onOpen={() => setIsDrawerOpen(true)}
        onClose={() => setIsDrawerOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onNewChat={handleNewChat}
        onRenameSession={(session) => {
          setSelectedMenuSession(session);
          setRenameText(session.title || '');
          setIsRenameModalVisible(true);
        }}
        onDeleteSession={(session) => {
          setSelectedMenuSession(session);
          setIsDeleteModalVisible(true);
        }}
      />

      {/* SESSION MANAGEMENT UI */}
      <RenameModal
        visible={isRenameModalVisible}
        onClose={() => setIsRenameModalVisible(false)}
        renameText={renameText}
        setRenameText={setRenameText}
        onSave={handleRenameSession}
      />

      <DeleteModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        sessionTitle={selectedMenuSession?.title}
        onDelete={handleDeleteSession}
      />

      <View className="flex-1">
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-3xl font-bold text-foreground mb-4 text-center">How can I help you today?</Text>
            <Text className="text-base text-muted-foreground text-center">Start a new secure conversation. Everything runs locally on your device.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
            }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessageItem item={item} markdownStyles={markdownStyles} />
            )}
            className="flex-1"
            contentContainerStyle={{
              // For inverted list, paddingBottom pushes the top items down, paddingTop pushes the bottom items up
              paddingBottom: 16,
              paddingTop: listHeight * 0.8,
            }}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              if (height > 0) {
                setListHeight(height);
              }
            }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              // Disabled auto-scroll during AI response streaming as requested
              /*
              if (shouldAutoScrollRef.current) {
                scrollToBottom(false);
              }
              */
            }}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        )}

        {showScrollDown && (
          <Animated.View
            style={[
              scrollDownAnimatedStyle,
              {
                position: 'absolute',
                left: 0,
                right: 0,
                alignItems: 'center',
                bottom: composerHeight + 16,
                zIndex: 90,
              }
            ]}
          >
            <TouchableOpacity
              onPress={() => scrollToBottom(true)}
              className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center shadow-lg border border-zinc-300 dark:border-zinc-700"
              activeOpacity={0.8}
            >
              <Feather name="arrow-down" size={22} color={isDark ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <ChatComposer
          inputText={inputText}
          setInputText={setInputText}
          isGenerating={isGenerating}
          onSend={handleSendMessage}
          onStop={handleStopMessage}
          onLayout={handleComposerLayout}
          animatedStyle={composerAnimatedStyle}
        />
      </View>
    </View>
  );
}
