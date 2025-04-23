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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {TabParamList} from '../types/navigation';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList>;

// Ekran boyutlarını al
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Ölçeklendirme faktörleri
const scale = SCREEN_WIDTH / 393; // 393 tasarım genişliği referans alındı
const verticalScale = SCREEN_HEIGHT / 852; // 852 tasarım yüksekliği referans alındı

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

  // Kalp atışı animasyonu için değer
  const heartbeat = useRef(new Animated.Value(1)).current;

  // Sol ve sağ ok için değil, container için animasyon değeri
  const containerTranslate = useRef(new Animated.Value(0)).current;

  // Animasyonu başlatan useEffect
  useEffect(() => {
    // Container için düşme animasyonu
    const animateContainer = () => {
      Animated.loop(
        Animated.sequence([
          // Container aşağı düşer
          Animated.timing(containerTranslate, {
            toValue: 10, // 10 birim aşağı
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          // Container yukarı çıkar
          Animated.timing(containerTranslate, {
            toValue: 0, // başlangıç pozisyonuna
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
    };

    // İlk animasyonu başlat
    animateContainer();

    // Temizleme fonksiyonu
    return () => {
      containerTranslate.stopAnimation();
    };
  }, [containerTranslate]);

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.innerContainer}>
        {/* Noktalı desen arka planı */}
        <DotPattern />

        {/* Üst kısım - Logo */}
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

        {/* Orta kısım - Slogan ve Açıklama */}
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

        {/* Boykot Görseli */}
        <View style={styles.boykotContainer}>
          <View style={styles.boykotBorder}>
            <Image
              source={require('../../assets/HomeScreenAssets/SloganNew.png')}
              style={styles.boykotImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Sol ve Sağ Ok Görselleri - Container Düşme Animasyonu */}
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

        {/* Kamera Butonu */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerContainer: {
    flex: 1,
    minHeight: SCREEN_HEIGHT,
  },
  header: {
    width: '100%',
    height: verticalScale * 110,
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    paddingTop: verticalScale * 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - 20,
    height: verticalScale * 65,
    marginLeft: scale * 10,
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
    width: scale * 200,
    height: verticalScale * 70,
    zIndex: 1,
    marginLeft: scale * -20,
    position: 'absolute',
    left: 0,
  } as ImageStyle,
  logoText: {
    color: '#000',
    fontSize: scale * 10,
    fontWeight: '500',
    marginLeft: scale * 150,
    marginTop: verticalScale * 10,
    zIndex: 1,
    width: scale * 320,
  },
  sloganContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
    alignItems: 'center',
  },
  sloganContentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sloganBackground: {
    borderRadius: 15,
    padding: 10,
    width: '100%',
    alignItems: 'center',
  },
  sloganOverlayContainer: {
    position: 'relative',
    width: SCREEN_WIDTH - 40,
    height: verticalScale * 240,
    alignItems: 'center',
    marginLeft: 0,
  },
  sloganIcon: {
    width: scale * 280,
    height: verticalScale * 240,
    position: 'absolute',
    zIndex: 1,
  } as ImageStyle,
  sloganTextContainer: {
    position: 'absolute',
    width: '80%',
    paddingLeft: scale * 80,
    paddingTop: verticalScale * 40,
    zIndex: 2,
  },
  sloganText: {
    fontSize: scale * 16,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: verticalScale * 5,
    lineHeight: verticalScale * 22,
  },
  sloganSignature: {
    fontSize: 14,
    color: '#666',
    alignSelf: 'flex-end',
    fontStyle: 'italic',
    marginRight: 20,
  },
  boykotContainer: {
    alignItems: 'center',
    marginTop: -35,
  },
  boykotBorder: {
    padding: scale * 10,
    width: '45%',
    alignItems: 'center',
  },
  boykotImage: {
    width: scale * 140,
    height: verticalScale * 180,
  } as ImageStyle,
  cameraButtonContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 2,
  },
  cameraButton: {
    width: scale * 130,
    height: scale * 130,
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
    marginBottom: verticalScale * 10,
    gap: scale * -15,
    alignItems: 'center',
    marginTop: verticalScale * 10,
  },
  directionalArrow: {
    width: scale * 75,
    height: verticalScale * 105,
  } as ImageStyle,
  directionalArrowSmall: {
    width: scale * 55,
    height: verticalScale * 75,
    marginTop: verticalScale * 15,
  } as ImageStyle,
});
