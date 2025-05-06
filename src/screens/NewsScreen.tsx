import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import API_URL from '../Apiurl';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

type NewsStackParamList = {
  HaberlerListesi: undefined;
  HaberDetay: {id: number};
};

export default function NewsScreen() {
  const navigation =
    useNavigation<StackNavigationProp<NewsStackParamList, 'HaberlerListesi'>>();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch(`${API_URL}/api/News`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setNews(data);
    } catch (error) {
      console.error('Haberler yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={styles.loadingText}>Haberler Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Haberler</Text>
      </View>

      {news.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Gösterilecek haber bulunamadı.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={news}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('HaberDetay', {id: item.id});
                }}>
                <View style={styles.newsItem}>
                  {item.imageUrl && (
                    <Image
                      source={{uri: item.imageUrl}}
                      style={styles.newsImage}
                    />
                  )}
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <Text style={styles.newsContent}>
                    {item.content.length > 40
                      ? `${item.content.substring(0, 40)}...`
                      : item.content}
                  </Text>
                  <Text style={styles.detailsText}>Detaylar için tıklayın</Text>
                  <Text style={styles.newsDate}>
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FFA500']}
                tintColor="#FFA500"
              />
            }
            contentContainerStyle={styles.listContainer}
          />
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/HomeScreenAssets/LOGO.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 0,
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  newsItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    marginHorizontal: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  newsContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  newsImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  newsDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  detailsText: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 3,
  },
  listContainer: {
    paddingBottom: 170,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
  },
});
