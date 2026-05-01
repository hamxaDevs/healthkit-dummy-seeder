import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { HealthImportProvider } from './src/features/health-import/HealthImportProvider'
import { RootNavigator } from './src/navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <HealthImportProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </HealthImportProvider>
    </SafeAreaProvider>
  )
}
