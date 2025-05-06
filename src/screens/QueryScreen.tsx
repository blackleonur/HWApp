import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import API_URL from '../Apiurl';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  brand: string;
  description: string;
  isBoycotted: boolean;
  imageUrl: string;
  categoryId: number;
}

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

// Ekran boyutlarını al
const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Dinamik değerler için yardımcı fonksiyonlar
const scale = (size: number) => (screenWidth / 375) * size; // 375 iPhone 6/7/8 genişliği baz alınarak
const verticalScale = (size: number) => (screenHeight / 812) * size; // 812 iPhone X yüksekliği baz alınarak

const QueryScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Veri çekme fonksiyonu
  const fetchData = async () => {
    try {
      // Kategorileri getir
      const categoryResponse = await fetch(`${API_URL}/api/Category`);
      if (!categoryResponse.ok) {
        throw new Error('Kategoriler yüklenirken bir hata oluştu');
      }
      const categoryData = await categoryResponse.json();
      setCategories(categoryData);

      // Ürünleri getir
      const productResponse = await fetch(`${API_URL}/api/Product`);
      if (!productResponse.ok) {
        throw new Error('Ürünler yüklenirken bir hata oluştu');
      }
      const productData = await productResponse.json();
      setProducts(productData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu',
      );
      return false;
    }
    return true;
  };

  // İlk yükleme
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Yenileme işlemi
  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    const success = await fetchData();
    setRefreshing(false);

    // Başarısız olursa ve hata mesajı yoksa genel bir hata mesajı göster
    if (!success && !error) {
      setError('Veriler yenilenirken bir hata oluştu');
    }
  };

  // Arama sonuçlarını filtreleme
  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) {
      return categories; // Arama yoksa tüm kategorileri göster
    }

    const searchLower = searchText.toLowerCase().trim();

    // Arama kriterine uyan ürünleri bul
    const matchingProducts = products.filter(
      product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower),
    );

    if (matchingProducts.length === 0) {
      return []; // Eşleşen ürün yoksa boş dizi döndür
    }

    // Eşleşen ürünlerin kategorilerini bul
    const matchingCategoryIds = [
      ...new Set(matchingProducts.map(p => p.categoryId)),
    ];

    // Sadece eşleşen ürünleri içeren kategorileri döndür
    return categories
      .filter(category => matchingCategoryIds.includes(category.id))
      .map(category => ({
        ...category,
        // Kategori ID'sine göre filtrelenmiş ürünleri sakla
        filteredProducts: matchingProducts.filter(
          p => p.categoryId === category.id,
        ),
      }));
  }, [categories, products, searchText]);

  // Belirli bir kategoriye ait ürünleri filtrele
  const getProductsByCategory = (
    categoryId: number,
    filteredProducts?: Product[],
  ) => {
    // Eğer filtrelenmiş ürünler varsa onları kullan, yoksa tüm ürünleri filtrele
    if (filteredProducts) {
      return filteredProducts;
    }
    return products.filter(product => product.categoryId === categoryId);
  };

  // Ürün kartı bileşeni - modernize edilmiş ve tıklanabilir
  const renderProductItem = ({item}: {item: Product}) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('QueryDetail', {productId: item.id})}>
      <View style={styles.productImageContainer}>
        <Image
          source={{
            uri:
              item.imageUrl !== 'string'
                ? item.imageUrl
                : 'https://via.placeholder.com/100',
          }}
          style={styles.productImage}
        />
        {item.isBoycotted && (
          <View style={styles.boycottBadge}>
            <Text style={styles.boycottBadgeText}>Boykot</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        <Text
          style={styles.productBrand}
          numberOfLines={1}
          ellipsizeMode="tail">
          {item.brand}
        </Text>
        <View
          style={[
            styles.statusIndicator,
            {backgroundColor: item.isBoycotted ? '#ffebee' : '#e8f5e9'},
          ]}>
          <Text
            style={[
              styles.statusText,
              {color: item.isBoycotted ? '#c62828' : '#2e7d32'},
            ]}>
            {item.isBoycotted ? '⚠️ Boykot Edilmekte' : '✅ Güvenilir'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Kategori bileşeni - modernize edilmiş
  const renderCategory = (category: any) => {
    // Filtrelenmiş ürünler varsa onları kullan
    const categoryProducts = getProductsByCategory(
      category.id,
      category.filteredProducts,
    );

    return (
      <View style={styles.categoryContainer} key={category.id}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category.name}</Text>
          <Text style={styles.productCount}>
            {categoryProducts.length} ürün
          </Text>
        </View>
        {categoryProducts.length > 0 ? (
          <FlatList
            data={categoryProducts}
            renderItem={renderProductItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        ) : (
          <View style={styles.noProductsContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#999" />
            <Text style={styles.noProductsText}>
              Bu kategoride ürün bulunamadı
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Ekran yönü değişikliğini dinlemek için useEffect ekleyelim
  useEffect(() => {
    const onChange = () => {
      const {width, height} = Dimensions.get('window');
      // Ekran boyutları değiştiğinde gerekli güncellemeleri yap
    };

    Dimensions.addEventListener('change', onChange);

    return () => {
      // React Native'in yeni versiyonlarında removeEventListener kullanılmıyor
      // Eski versiyonlarda gerekirse bu kısmı ekleyebilirsiniz
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Kısmı */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.searchBarContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchBar}
                placeholder="Ürün veya marka ara..."
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <DashedBorder />
          </View>
          <Image
            source={require('../../assets/HomeScreenAssets/LOGO.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* İçerik Kısmı */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFA500']}
            tintColor="#FFA500"
            title="Yenileniyor..."
            titleColor="#666"
          />
        }>
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#c62828" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {searchText.trim() !== '' &&
          filteredCategories.length === 0 &&
          !loading && (
            <View style={styles.emptySearchContainer}>
              <Ionicons name="search-outline" size={40} color="#666" />
              <Text style={styles.emptyText}>
                "{searchText}" ile eşleşen ürün bulunamadı
              </Text>
              <Text style={styles.emptySubText}>
                Farklı bir arama terimi deneyin
              </Text>
            </View>
          )}

        {filteredCategories.map(category => renderCategory(category))}

        {filteredCategories.length === 0 &&
          searchText.trim() === '' &&
          !loading &&
          !error && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="information-circle-outline"
                size={40}
                color="#666"
              />
              <Text style={styles.emptyText}>Henüz kategori bulunmuyor</Text>
              <Text style={styles.emptySubText}>
                Yenilemek için aşağı çekin
              </Text>
            </View>
          )}
      </ScrollView>

      {/* Yükleniyor göstergesi */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA500" />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingBottom: verticalScale(100), // Footer için daha dinamik padding
    paddingHorizontal: scale(16),
  },
  header: {
    width: '100%',
    height: verticalScale(110),
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    paddingTop: verticalScale(30),
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: verticalScale(10),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(15),
  },
  searchBarContainer: {
    position: 'relative',
    flex: 1,
    height: verticalScale(40),
    marginRight: scale(10),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: scale(5),
    height: verticalScale(40),
    zIndex: 1,
  },
  searchIcon: {
    marginLeft: scale(10),
    marginRight: scale(5),
  },
  searchBar: {
    flex: 1,
    height: verticalScale(40),
    paddingRight: scale(10),
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
    width: scale(100),
    height: verticalScale(50),
    zIndex: 1,
  },
  categoryContainer: {
    marginBottom: verticalScale(24),
    backgroundColor: 'white',
    borderRadius: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryTitle: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#333',
  },
  productCount: {
    fontSize: scale(14),
    color: '#888',
  },
  productList: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(12),
  },
  productCard: {
    width: screenWidth * 0.4, // Ekran genişliğinin %40'ı
    maxWidth: scale(160),
    backgroundColor: 'white',
    borderRadius: scale(12),
    marginRight: scale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: verticalScale(120),
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: scale(12),
    borderTopRightRadius: scale(12),
    backgroundColor: '#f5f5f5',
    resizeMode: 'contain',
  },
  boycottBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
  },
  boycottBadgeText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: 'bold',
  },
  productInfo: {
    padding: scale(12),
  },
  productName: {
    fontSize: scale(16),
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
    color: '#333',
  },
  productBrand: {
    fontSize: scale(14),
    color: '#666',
    marginBottom: verticalScale(8),
  },
  statusIndicator: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
    alignItems: 'center',
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  noProductsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noProductsText: {
    fontStyle: 'italic',
    color: '#999',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
    marginRight: 5,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default QueryScreen;
