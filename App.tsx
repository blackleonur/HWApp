import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar} from 'react-native';

// Gerekli ekranları içe aktarın
import NewsScreen from './src/screens/NewsScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
// ... Diğer ekranlarınız

// Stack Navigator için tip tanımlaması
export type NewsStackParamList = {
  HaberlerListesi: undefined;
  HaberDetay: {id: number};
  // ... Diğer rotalarınız
};

const Stack = createStackNavigator<NewsStackParamList>();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFA500" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="HaberlerListesi"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen name="HaberlerListesi" component={NewsScreen} />
          <Stack.Screen name="HaberDetay" component={NewsDetailScreen} />
          {/* Diğer ekranlarınız */}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
