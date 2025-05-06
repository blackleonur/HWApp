import React, {useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  ImageStyle,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {TabParamList} from '../types/navigation';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList>;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const DESIGN_WIDTH = 393;
const DESIGN_HEIGHT = 852;

const scale = SCREEN_WIDTH / DESIGN_WIDTH;
const verticalScale = SCREEN_HEIGHT / DESIGN_HEIGHT;

const normalize = (size: number) => Math.round(scale * size);
const normalizeVertical = (size: number) => Math.round(verticalScale * size);

const ASPECT_RATIO = SCREEN_WIDTH / SCREEN_HEIGHT;
const isSmallScreen = ASPECT_RATIO > 0.5;

// Kesikli çizgi bileşeni
const DashedBorder = () => {
  return (
    <View style={styles.dashedBorderContainer}>
      {Array.from({length: 30}).map((_, index) => (
        <View key={index} />
      ))}
    </View>
  );
};

// Noktalı desen bileşeni
const DotPattern = () => {
  // Nokta sayısını 250'ye çıkaralım
  const dots = Array.from({length: 250}).map((_, index) => ({
    id: index,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 4 + 3, // Biraz daha büyük noktalar (3-7px)
  }));

  return (
    <View style={styles.dotPatternContainer}>
      {dots.map(dot => (
        <View
          key={dot.id}
          style={[
            styles.dot,
            {
              top: `${dot.top}%`,
              left: `${dot.left}%`,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const heartbeat = useRef(new Animated.Value(1)).current;
  const containerTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateContainer = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(containerTranslate, {
            toValue: 10,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(containerTranslate, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
    };

    animateContainer();
    return () => {
      containerTranslate.stopAnimation();
    };
  }, [containerTranslate]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        <View style={styles.innerContainer}>
          <DotPattern />
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/HomeScreenAssets/LOGO.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>
                Zulmü Destekleyenleri Karınca Misali Boykot Et
              </Text>
              <DashedBorder />
            </View>
          </View>

          <View style={styles.sloganContainer}>
            <View style={styles.sloganContentContainer}>
              <View style={styles.sloganBackground}>
                <View style={styles.sloganOverlayContainer}>
                  <Image
                    source={require('../../assets/HomeScreenAssets/SloganUnlem.png')}
                    style={styles.sloganIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.sloganTextContainer}>
                    <Text style={styles.sloganText}>
                      Adalet, vicdan ve bilinçli tüketim için bir adım attın.
                      Unutma, karınca misali küçük adımlar büyük değişimlerin
                      başlangıcıdır.
                    </Text>
                    <Text style={styles.sloganSignature}>Kamibo ailesi</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.boykotContainer}>
            <View style={styles.boykotBorder}>
              <Image
                source={require('../../assets/HomeScreenAssets/SloganNew.png')}
                style={styles.boykotImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Animated.View
            style={[
              styles.directionalArrowsContainer,
              {
                transform: [{translateY: containerTranslate}],
              },
            ]}>
            <Image
              source={require('../../assets/HomeScreenAssets/Solok.png')}
              style={styles.directionalArrow}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/HomeScreenAssets/Sağok.png')}
              style={styles.directionalArrowSmall}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </ScrollView>

      <View style={styles.cameraButtonContainer}>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => navigation.navigate('Tara')}>
          <Image
            source={require('../../assets/HomeScreenAssets/Tara.png')}
            style={styles.cameraIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    minHeight: SCREEN_HEIGHT,
  },
  header: {
    width: '100%',
    height: normalizeVertical(isSmallScreen ? 90 : 110),
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    paddingTop:
      Platform.OS === 'ios' ? normalizeVertical(40) : normalizeVertical(30),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - normalize(20),
    height: normalizeVertical(isSmallScreen ? 55 : 65),
    marginLeft: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashedBorderContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'white',
    borderStyle: 'dashed',
    borderRadius: 5,
  },
  logo: {
    width: normalize(isSmallScreen ? 180 : 200),
    height: normalizeVertical(isSmallScreen ? 60 : 70),
    zIndex: 1,
    marginLeft: normalize(-20),
    position: 'absolute',
    left: 0,
  } as ImageStyle,
  logoText: {
    color: '#000',
    fontSize: normalize(isSmallScreen ? 9 : 10),
    fontWeight: '500',
    marginLeft: normalize(isSmallScreen ? 130 : 150),
    marginTop: normalizeVertical(isSmallScreen ? 8 : 10),
    zIndex: 1,
    width: normalize(isSmallScreen ? 280 : 320),
  },
  sloganContainer: {
    paddingHorizontal: normalize(20),
    paddingTop: normalizeVertical(isSmallScreen ? 30 : 40),
    paddingBottom: normalizeVertical(10),
    alignItems: 'center',
  },
  sloganContentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sloganBackground: {
    borderRadius: 15,
    padding: normalize(10),
    width: '100%',
    alignItems: 'center',
  },
  sloganOverlayContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - normalize(40),
    height: normalizeVertical(isSmallScreen ? 200 : 240),
    alignItems: 'center',
    marginLeft: 0,
  },
  sloganIcon: {
    width: normalize(isSmallScreen ? 240 : 280),
    height: normalizeVertical(isSmallScreen ? 200 : 240),
    position: 'absolute',
    zIndex: 1,
  } as ImageStyle,
  sloganTextContainer: {
    position: 'absolute',
    width: '80%',
    paddingLeft: normalize(isSmallScreen ? 60 : 80),
    paddingTop: normalizeVertical(isSmallScreen ? 30 : 40),
    zIndex: 2,
  },
  sloganText: {
    fontSize: normalize(isSmallScreen ? 14 : 16),
    color: '#333',
    fontStyle: 'italic',
    marginBottom: normalizeVertical(5),
    lineHeight: normalizeVertical(isSmallScreen ? 18 : 22),
  },
  sloganSignature: {
    fontSize: normalize(isSmallScreen ? 12 : 14),
    color: '#666',
    alignSelf: 'flex-end',
    fontStyle: 'italic',
    marginRight: normalize(20),
  },
  boykotContainer: {
    alignItems: 'center',
    marginTop: normalizeVertical(-35),
  },
  boykotBorder: {
    padding: normalize(10),
    width: '45%',
    alignItems: 'center',
  },
  boykotImage: {
    width: normalize(isSmallScreen ? 120 : 140),
    height: normalizeVertical(isSmallScreen ? 160 : 180),
  } as ImageStyle,
  cameraButtonContainer: {
    position: 'absolute',
    bottom: normalizeVertical(isSmallScreen ? 45 : 65),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cameraButton: {
    width: normalize(130),
    height: normalize(130),
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 10,
    shadowRadius: 200,
    elevation: 250,
  },
  cameraIcon: {
    width: '100%',
    height: '100%',
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 1,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 200,
  } as ImageStyle,
  dotPatternContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },

  dot: {
    position: 'absolute',
    backgroundColor: '#edf0ee', // Daha açık gri-yeşil noktalar
  },
  directionalArrowsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '20%',
    alignSelf: 'center',
    marginBottom: normalizeVertical(isSmallScreen ? 35 : 45),
    gap: normalize(-25),
    alignItems: 'center',
    marginTop: normalizeVertical(isSmallScreen ? -10 : -15),
  },
  directionalArrow: {
    width: normalize(isSmallScreen ? 65 : 75),
    height: normalizeVertical(isSmallScreen ? 90 : 105),
  } as ImageStyle,
  directionalArrowSmall: {
    width: normalize(isSmallScreen ? 45 : 55),
    height: normalizeVertical(isSmallScreen ? 65 : 75),
    marginTop: normalizeVertical(isSmallScreen ? 10 : 15),
  } as ImageStyle,
});
