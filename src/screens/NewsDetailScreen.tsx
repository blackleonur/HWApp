import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {NewsStackParamList} from '../types/navigation';
import API_URL from '../Apiurl';
import Icon from 'react-native-vector-icons/Ionicons';

interface NewsDetail {
  id: number;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

export default function NewsDetailScreen() {
  const route = useRoute<RouteProp<NewsStackParamList, 'HaberDetay'>>();
  const navigation = useNavigation();
  const [newsDetail, setNewsDetail] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetail();
  }, []);

  const fetchNewsDetail = async () => {
    try {
      const response = await fetch(`${API_URL}/api/News/${route.params.id}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setNewsDetail(data);
    } catch (error) {
      console.error('Haber detayı yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="tomato" />
      </View>
    );
  }

  if (!newsDetail) {
    return (
      <View style={styles.container}>
        <Text>Haber bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Haber Detayı</Text>
      </View>

      <ScrollView style={styles.container}>
        {newsDetail.imageUrl && (
          <Image source={{uri: newsDetail.imageUrl}} style={styles.image} />
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{newsDetail.title}</Text>
          <Text style={styles.date}>
            {new Date(newsDetail.createdAt).toLocaleDateString('tr-TR')}
          </Text>
          <Text style={styles.text}>{newsDetail.content}</Text>
        </View>
      </ScrollView>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/HomeScreenAssets/LOGO.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FFA500',
    padding: 15,
    paddingTop: 40,
    marginBottom: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 40,
    zIndex: 10,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 10,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 140,
    height: 50,
    opacity: 15,
  },
});
