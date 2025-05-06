import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import API_URL from '../Apiurl';

// Ürün arayüzü
interface Product {
  id: number;
  name: string;
  brand: string;
  description: string;
  isBoycotted: boolean;
  imageUrl: string;
  categoryId: number;
}

// Kategori arayüzü
interface Category {
  id: number;
  name: string;
}

type RouteParams = {
  QueryDetail: {
    productId: number;
  };
};

const QueryDetailScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'QueryDetail'>>();
  const navigation = useNavigation();
  const {productId} = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const viewShotRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Alınan productId:', productId); // ID'yi kontrol etmek için

        // Tüm ürünleri getir ve ID'ye göre filtrele
        const productResponse = await fetch(`${API_URL}/api/Product`);
        if (!productResponse.ok) {
          throw new Error('Ürünler yüklenirken bir hata oluştu');
        }

        const allProducts = await productResponse.json();
        const productItem = allProducts.find(
          (p: Product) => p.id === productId,
        );

        if (!productItem) {
          throw new Error(`ID: ${productId} olan ürün bulunamadı`);
        }

        setProduct(productItem);

        // Kategorileri getir
        const categoryResponse = await fetch(`${API_URL}/api/Category`);
        if (!categoryResponse.ok) {
          throw new Error('Kategoriler yüklenirken bir hata oluştu');
        }

        const categoryData = await categoryResponse.json();
        setCategories(categoryData);

        // Ürünün kategorisini bul
        if (productItem && categoryData) {
          const category = categoryData.find(
            (cat: Category) => cat.id === productItem.categoryId,
          );
          setCategoryName(category ? category.name : 'Bilinmeyen Kategori');
        }

        setLoading(false);
      } catch (err) {
        console.error('API Hatası:', err);
        setError(
          err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu',
        );
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // Ekran görüntüsü alıp paylaşma fonksiyonu
  const shareProductScreenshot = async () => {
    if (!product || !viewShotRef.current) return;

    try {
      // Ekran görüntüsü al - optional chaining kullan
      const uri = await viewShotRef.current?.capture();

      if (!uri) {
        console.error('Ekran görüntüsü alınamadı');
        return;
      }

      // Paylaş
      await Share.share({
        url: uri,
        title: `${product.name} Hakkında Bilgi`,
        message: `${product.name} - ${product.brand}\n${product.description}\n${
          product.isBoycotted
            ? 'Bu ürün boykot edilmektedir!'
            : 'Bu ürün güvenilirdir.'
        }`,
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={styles.loadingText}>Ürün detayları yükleniyor...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={50} color="#c62828" />
        <Text style={styles.errorText}>{error || 'Ürün bulunamadı'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ViewShot
      ref={viewShotRef}
      style={styles.container}
      options={{format: 'jpg', quality: 0.9}}>
      {/* Detay Başlığı */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ürün Detayı</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Ürün Görseli */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                product.imageUrl !== 'string'
                  ? product.imageUrl
                  : 'https://via.placeholder.com/300',
            }}
            style={styles.productImage}
            resizeMode="contain"
          />
          {product.isBoycotted && (
            <View style={styles.boycottBadge}>
              <Text style={styles.boycottBadgeText}>BOYKOT</Text>
            </View>
          )}
        </View>

        {/* Ürün Bilgileri */}
        <View style={styles.productInfoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
            </View>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareProductScreenshot}>
              <Ionicons name="share-social-outline" size={24} color="#FFA500" />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.statusContainer,
              {backgroundColor: product.isBoycotted ? '#ffebee' : '#e8f5e9'},
            ]}>
            <Ionicons
              name={product.isBoycotted ? 'alert-circle' : 'checkmark-circle'}
              size={24}
              color={product.isBoycotted ? '#c62828' : '#2e7d32'}
            />
            <Text
              style={[
                styles.statusText,
                {color: product.isBoycotted ? '#c62828' : '#2e7d32'},
              ]}>
              {product.isBoycotted
                ? 'Bu ürün boykot edilmektedir!'
                : 'Bu ürün güvenilirdir.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ürün Açıklaması</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategori Bilgisi</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/HomeScreenAssets/LOGO.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </ScrollView>
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFA500',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  boycottBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(198, 40, 40, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  boycottBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productInfoContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productBrand: {
    fontSize: 18,
    color: '#666',
  },
  shareButton: {
    padding: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  categoryBadge: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 14,
    color: '#555',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 129,
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 60,
  },
  headerBar: {
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40, // Status bar için ek padding
    paddingBottom: 10,
    paddingHorizontal: 16,
    height: 90,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  backButtonHeader: {
    padding: 8,
  },
  headerRight: {
    width: 40, // Başlığı ortalamak için
  },
});

export default QueryDetailScreen;
