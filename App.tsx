import React from 'react';
import {
  View,
  Platform,
  Image,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import NewsScreen from './src/screens/NewsScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
import ScanScreen from './src/screens/ScanScreen';
import QueryScreen from './src/screens/QueryScreen';
import QueryDetailScreen from './src/screens/QueryDetailScreen';
import {TabParamList} from './src/types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const NewsStack = createNativeStackNavigator();
const QueryStack = createNativeStackNavigator();
const ScanStack = createNativeStackNavigator();

const windowWidth = Dimensions.get('window').width;

function NewsStackNavigator() {
  return (
    <NewsStack.Navigator>
      <NewsStack.Screen
        name="HaberlerListesi"
        component={NewsScreen}
        options={{headerShown: false}}
      />
      <NewsStack.Screen
        name="HaberDetay"
        component={NewsDetailScreen}
        options={{headerShown: false}}
      />
    </NewsStack.Navigator>
  );
}

function QueryStackNavigator() {
  return (
    <QueryStack.Navigator>
      <QueryStack.Screen
        name="SorgulaListesi"
        component={QueryScreen}
        options={{headerShown: false}}
      />
      <QueryStack.Screen
        name="QueryDetail"
        component={QueryDetailScreen}
        options={{headerShown: false}}
      />
    </QueryStack.Navigator>
  );
}

function ScanStackNavigator() {
  return (
    <ScanStack.Navigator>
      <ScanStack.Screen
        name="Tara"
        component={ScanScreen}
        options={{headerShown: false}}
      />
    </ScanStack.Navigator>
  );
}

export default function App() {
  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused}) => {
              if (route.name === 'Ana Sayfa') {
                return (
                  <Image
                    source={require('./assets/HomeScreenAssets/Anasayfa.png')}
                    style={{
                      width: 55,
                      height: 55,
                      opacity: focused ? 1 : 0.7,
                      marginRight: windowWidth * 0.02,
                    }}
                    resizeMode="contain"
                  />
                );
              } else if (route.name === 'Haberler') {
                return (
                  <Image
                    source={require('./assets/HomeScreenAssets/Haberler.png')}
                    style={{
                      width: 53,
                      height: 53,
                      opacity: focused ? 1 : 0.7,
                      marginLeft: windowWidth * 0.15,
                    }}
                    resizeMode="contain"
                  />
                );
              } else if (route.name === 'Geribildirim') {
                return (
                  <Image
                    source={require('./assets/HomeScreenAssets/Geribildirim.png')}
                    style={{
                      width: 53,
                      height: 53,
                      opacity: focused ? 1 : 0.7,
                      marginLeft: windowWidth * 0.22,
                    }}
                    resizeMode="contain"
                  />
                );
              } else if (route.name === 'Sorgula') {
                return (
                  <Image
                    source={require('./assets/HomeScreenAssets/Ara.png')}
                    style={{
                      width: 53,
                      height: 53,
                      opacity: focused ? 1 : 0.7,
                      marginLeft: windowWidth * 0.38,
                    }}
                    resizeMode="contain"
                  />
                );
              }

              return null;
            },
            tabBarActiveTintColor: 'tomato',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              height: 75,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              position: 'absolute',
              bottom: 35,
              left: 0,
              right: 0,
              justifyContent: 'space-between',
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarBackground: () => (
              <View
                style={{
                  height: 75,
                  width: '100%',
                  backgroundColor: 'transparent',
                }}>
                <ImageBackground
                  source={require('./assets/HomeScreenAssets/AltBar.png')}
                  style={{
                    height: 130,
                    width: '100%',
                    backgroundColor: 'transparent',
                    opacity: 1,
                  }}
                  resizeMode="cover"
                />
              </View>
            ),
            tabBarLabelStyle: {
              fontSize: 10,
              marginBottom: 8,
              marginTop: 2,
              fontWeight: '500',
            },
            tabBarItemStyle: {
              padding: 5,
              marginTop: 35,
            },
          })}>
          <Tab.Screen
            name="Ana Sayfa"
            component={HomeScreen}
            options={{headerShown: false, tabBarLabel: ''}}
          />
          <Tab.Screen
            name="Haberler"
            component={NewsStackNavigator}
            options={{headerShown: false, tabBarLabel: ''}}
          />
          <Tab.Screen
            name="GörünmezButon"
            component={View}
            options={{
              headerShown: false,
              tabBarLabel: '',
              tabBarIcon: () => null,
              tabBarButton: () => <View style={{width: 50}} />,
            }}
          />
          <Tab.Screen
            name="Geribildirim"
            component={FeedbackScreen}
            options={{headerShown: false, tabBarLabel: ''}}
          />
          <Tab.Screen
            name="Sorgula"
            component={QueryStackNavigator}
            options={{headerShown: false, tabBarLabel: ''}}
          />
          <Tab.Screen
            name="Tara"
            component={ScanStackNavigator}
            options={{
              headerShown: false,
              tabBarLabel: '',
              tabBarButton: () => null,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="rgba(0,0,0,0.05)"
        translucent
      />
    </>
  );
}
