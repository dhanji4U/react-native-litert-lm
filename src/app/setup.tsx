import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { emiEngine } from '@/services/EmiEngine';
import { Feather } from '@expo/vector-icons';

export default function SetupScreen() {
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);
  const [statusText, setStatusText] = useState('Please select the model file to continue.');

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      setIsCopying(true);
      setStatusText('Copying model to application storage (this may take a moment)...');

      const fileUri = result.assets[0].uri;
      const targetUri = `${FileSystem.documentDirectory}gemma.litertlm`;

      // Copy file into secure sandbox
      await FileSystem.copyAsync({
        from: fileUri,
        to: targetUri,
      });

      setStatusText('Model copied. Initializing engine...');

      // Initialize the model in the native engine
      await emiEngine.initModel(targetUri.replace('file://', ''));

      setStatusText('Setup Complete.');

      // Give the user a moment to read the success state
      setTimeout(() => {
        router.replace('/');
      }, 1000);

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusText(`Setup Failed: ${errorMessage}\n\nPlease ensure the file is valid and you have enough storage.`);
      setIsCopying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center p-8">
        <View className="w-full max-w-sm items-center">
        <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-6 shadow-sm">
           <Feather name="cpu" size={32} className="color-foreground" />
        </View>

        <Text className="text-foreground text-3xl font-bold mb-3 text-center tracking-tight">
          Model Setup
        </Text>

        <Text className="text-muted-foreground text-center mb-10 leading-relaxed text-base">
          The local inference model is missing. Please locate your model file to initialize the assistant. Everything runs securely on your device.
        </Text>

        <TouchableOpacity
          className={`w-full py-4 px-6 rounded-2xl items-center flex-row justify-center active:opacity-80 shadow-sm bg-primary`}
          onPress={handlePickFile}
          disabled={isCopying}
        >
          {isCopying ? (
            <ActivityIndicator size="small" className="mr-3 color-primary-foreground" />
          ) : (
            <Feather name="upload" size={20} className="mr-3 color-primary-foreground" />
          )}
          <Text className={`font-semibold text-lg text-primary-foreground`}>
            {isCopying ? 'Setting up...' : 'Select Model File'}
          </Text>
        </TouchableOpacity>

        <Text className="text-muted-foreground text-sm text-center mt-8 px-4">
          {statusText}
        </Text>
      </View>
      </View>
    </SafeAreaView>
  );
}
