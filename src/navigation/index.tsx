import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';

// Diğer ekranları buraya import edin
// import ScanScreen from '../screens/ScanScreen';
// import ListsScreen from '../screens/ListsScreen';
// import InfoScreen from '../screens/InfoScreen';
// import SettingsScreen from '../screens/SettingsScreen';

import {TabParamList} from '../types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Ana" component={HomeScreen} />
        <Tab.Screen
          name="Tara"
          component={HomeScreen} /* component={ScanScreen} */
        />
        <Tab.Screen
          name="Listeler"
          component={HomeScreen} /* component={ListsScreen} */
        />
        <Tab.Screen
          name="Bilgi"
          component={HomeScreen} /* component={InfoScreen} */
        />
        <Tab.Screen
          name="Ayarlar"
          component={HomeScreen} /* component={SettingsScreen} */
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
