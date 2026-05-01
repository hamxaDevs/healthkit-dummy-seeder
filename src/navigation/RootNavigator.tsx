import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AppleExportScreen } from '../screens/AppleExportScreen'
import { DummyDataScreen } from '../screens/DummyDataScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { colors } from '../theme/colors'

import type { RootStackParamList } from '../types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const screenOptions = {
  headerShadowVisible: false,
  headerShown: false,
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DummyData" component={DummyDataScreen} />
        <Stack.Screen name="AppleExport" component={AppleExportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
