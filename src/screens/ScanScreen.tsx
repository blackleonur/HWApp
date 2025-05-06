import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
} from 'react-native-vision-camera';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import API_URL from '../Apiurl';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Google Cloud Vision API anahtarınız - ürün etiketleri için daha iyi çalışır
const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyD3TNvnNlCMR1yP4S1m6bykN6venCY91sw';

// Azure API anahtarı ve endpoint
const AZURE_API_KEY = 'YOUR_AZURE_API_KEY';
const AZURE_ENDPOINT =
  'https://your-resource-name.cognitiveservices.azure.com/';

// OCR.space API anahtarı - yedek olarak tutuyoruz
const OCR_SPACE_API_KEY = 'K89647579688957';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const DESIGN_WIDTH = 393;
const DESIGN_HEIGHT = 852;

const scale = SCREEN_WIDTH / DESIGN_WIDTH;
const verticalScale = SCREEN_HEIGHT / DESIGN_HEIGHT;

const normalize = (size: number) => Math.round(scale * size);
const normalizeVertical = (size: number) => Math.round(verticalScale * size);

export default function ScanScreen() {
  const navigation = useNavigation();
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editableText, setEditableText] = useState<string>('');
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [productResult, setProductResult] = useState<any>(null);
  const [isProductFound, setIsProductFound] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const [scannedText, setScannedText] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  useEffect(() => {
    console.log('ScanScreen yükleniyor...');
    const requestPermissions = async () => {
      try {
        // Kamera izni
        const cameraPermission = await Camera.requestCameraPermission();
        console.log('Kamera izni:', cameraPermission);

        // Android için medya izinleri
        let mediaLibraryPermission = 'denied';
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            // Android 13 ve üzeri için
            mediaLibraryPermission = await request(
              PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            );
          } else {
            // Android 13 altı için
            mediaLibraryPermission = await request(
              PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            );
          }
          console.log('Medya izni:', mediaLibraryPermission);
        } else if (Platform.OS === 'ios') {
          // iOS için foto izni
          mediaLibraryPermission = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
          console.log('iOS Foto izni:', mediaLibraryPermission);
        }

        // İzinleri kontrol et ve state'i güncelle
        const hasAllPermissions =
          cameraPermission === 'granted' &&
          (mediaLibraryPermission === 'granted' ||
            mediaLibraryPermission === RESULTS.GRANTED);

        setHasPermission(hasAllPermissions);

        // Eğer izinler reddedildiyse kullanıcıyı bilgilendir
        if (!hasAllPermissions) {
          Alert.alert(
            'İzin Gerekli',
            'Uygulamanın düzgün çalışması için kamera ve galeri izinleri gereklidir. Lütfen ayarlardan izinleri veriniz.',
            [
              {
                text: 'Ayarlara Git',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
              {
                text: 'İptal',
                style: 'cancel',
              },
            ],
          );
        }
      } catch (error) {
        console.error('İzin isteme hatası:', error);
        setHasPermission(false);
      }
    };

    const generateDeviceId = async () => {
      let id = await AsyncStorage.getItem('deviceId');
      if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('deviceId', id);
      }
      setDeviceId(id);
    };

    requestPermissions();
    generateDeviceId();
  }, []);

  const checkRequestLimit = async (): Promise<boolean> => {
    try {
      const requestUrl = `${API_URL}/api/Product/request-limit-status`;
      console.log('Limit Kontrol İsteği:', {
        url: requestUrl,
        headers: {
          DeviceId: deviceId,
        },
      });

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          DeviceId: deviceId,
        },
      });
      const data = await response.json();

      console.log('Limit Kontrol Yanıtı:', {
        status: response.status,
        data: data,
        deviceId: deviceId,
      });

      if (data.limitExceeded) {
        Alert.alert(
          'Limit Aşıldı',
          'Günlük sorgulama sınırınız dolmuştur. Lütfen 24 saat sonra tekrar deneyiniz.',
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Limit kontrolü sırasında hata:', error);
      return true;
    }
  };

  const takePicture = async () => {
    const canProceed = await checkRequestLimit();
    if (!canProceed) {
      return;
    }

    if (cameraRef.current && cameraReady && device) {
      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
        });

        const imageUri = `file://${photo.path}`;
        setPreviewImage(imageUri);
        setPreviewModalVisible(true);
      } catch (error) {
        console.error('Fotoğraf çekilirken hata oluştu:', error);
      }
    }
  };

  const handlePreviewConfirm = async () => {
    if (previewImage) {
      setPreviewModalVisible(false);
      setIsProcessing(true);
      const text = await processImage(previewImage);
      if (text) {
        await queryProduct(text);
      }
    }
  };

  const handlePreviewCancel = () => {
    setPreviewModalVisible(false);
    setPreviewImage(null);
  };

  const pickImage = async () => {
    const canProceed = await checkRequestLimit();
    if (!canProceed) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        await processImage(result.assets[0].uri || '');
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Görsel seçilirken hata oluştu:', error);
      setIsProcessing(false);
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      // Önce limit kontrolü yapalım
      const canProceed = await checkRequestLimit();
      if (!canProceed) {
        setIsProcessing(false);
        return null;
      }

      const resizedImage = await ImageResizer.createResizedImage(
        imageUri,
        1000,
        1000,
        'JPEG',
        80,
      );

      setProgressStatus('Görüntü işleniyor...');
      setProgressPercent(30);

      const base64Image = await RNFS.readFile(resizedImage.uri, 'base64');

      setProgressStatus('Google Vision API ile metin tanınıyor...');
      setProgressPercent(60);

      try {
        const googleVisionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  image: {
                    content: base64Image,
                  },
                  features: [
                    {
                      type: 'TEXT_DETECTION',
                      maxResults: 10,
                    },
                  ],
                  imageContext: {
                    languageHints: ['tr'],
                  },
                },
              ],
            }),
          },
        );

        const googleVisionResult = await googleVisionResponse.json();

        if (
          googleVisionResult.responses?.[0]?.textAnnotations?.[0]?.description
        ) {
          // Google Vision başarılı olduğunda sorgu sayısını artır
          const requestUrl = `${API_URL}/api/Product/increment-request-count`;
          await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              DeviceId: deviceId,
            },
          });

          const text =
            googleVisionResult.responses[0].textAnnotations[0].description;
          setScannedText(text);
          await queryProduct(text);
          setProgressStatus('');
          setProgressPercent(0);
          setIsProcessing(false);
          return text;
        }
      } catch (error) {
        console.error('Google Vision API hatası:', error);
      }

      // Google Vision başarısız olduğunda OCR.space'i dene
      setProgressStatus('Alternatif OCR hizmeti kullanılıyor...');
      setProgressPercent(70);

      try {
        const formData = new FormData();
        formData.append('apikey', OCR_SPACE_API_KEY);
        formData.append('language', 'tur');
        formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
        formData.append('isOverlayRequired', 'false');
        formData.append('scale', 'true');
        formData.append('detectOrientation', 'true');
        formData.append('OCREngine', '2');
        formData.append('filetype', 'jpg');

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.ParsedResults?.[0]?.ParsedText) {
          const text = result.ParsedResults[0].ParsedText;
          setScannedText(text);
          await queryProduct(text);
          setProgressStatus('');
          setProgressPercent(0);
          setIsProcessing(false);
          return text;
        }
      } catch (error) {
        console.error('OCR.space API hatası:', error);
      }

      // Her iki OCR servisi de metin bulamadığında
      setProgressStatus('');
      setProgressPercent(0);
      setIsProcessing(false);
      Alert.alert(
        'Metin Bulunamadı',
        'Görüntüde okunabilir bir metin bulunamadı. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Sayfayı yeniden yükle
              setScannedText('');
              setProductResult(null);
              setPreviewImage(null);
              setPreviewModalVisible(false);
              setCameraReady(false);
              setTimeout(() => {
                setCameraReady(true);
              }, 100);
            },
          },
        ],
      );
      return null;
    } catch (error) {
      console.error('Görüntü işlenirken hata oluştu:', error);
      setProgressStatus('');
      setProgressPercent(0);
      setIsProcessing(false);
      Alert.alert(
        'Hata',
        'Metin tanıma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Hata durumunda da sayfayı yeniden yükle
              setScannedText('');
              setProductResult(null);
              setPreviewImage(null);
              setPreviewModalVisible(false);
              setCameraReady(false);
              setTimeout(() => {
                setCameraReady(true);
              }, 100);
            },
          },
        ],
      );
      return null;
    }
  };

  const queryProduct = async (productName: string) => {
    setIsQueryLoading(true);
    try {
      // Artık burada limit kontrolü yapmaya gerek yok çünkü
      // processImage fonksiyonunda yapılıyor ve sorgu sayısı artırılıyor

      const response = await fetch(
        `${API_URL}/api/Product/search-by-name/${encodeURIComponent(
          productName,
        )}`,
        {
          method: 'GET',
          headers: {
            DeviceId: deviceId,
          },
        },
      );
      const data = await response.json();

      console.log('Backend Yanıtı:', {
        url: `${API_URL}/api/Product/search-by-name/${encodeURIComponent(
          productName,
        )}`,
        response: data,
      });

      if (data.message && data.message.includes('bulunamadı')) {
        setIsProductFound(false);
        setProductResult(null);
        setEditModalVisible(true);
      } else {
        const productData = Array.isArray(data) ? data[0] : data;
        setIsProductFound(true);
        setProductResult(productData);
        setResultModalVisible(true);
      }
    } catch (error) {
      console.error('Ürün sorgulanırken hata oluştu:', error);
      Alert.alert(
        'Hata',
        'Ürün sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.',
      );
    } finally {
      setIsQueryLoading(false);
    }
  };

  const handleNewScan = () => {
    setResultModalVisible(false);
    setRecognizedText('');
    setProductResult(null);
  };

  const handleEditText = () => {
    setEditableText(scannedText);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    setEditModalVisible(false);
    if (editableText.trim()) {
      await queryProduct(editableText.trim());
    }
  };

  const handleFeedback = () => {
    // Geri bildirim gönderme işlemi burada yapılacak
    Alert.alert(
      'Geri Bildirim',
      'Geri bildirim özelliği yakında eklenecektir.',
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>İzinler isteniyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Kamera ve medya erişim izni verilmedi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.processingText}>
            {progressStatus || 'Metin tanınıyor...'}
          </Text>
          {progressPercent > 0 && (
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, {width: `${progressPercent}%`}]}
              />
              <Text style={styles.progressText}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={styles.cameraContainer}>
            <View style={styles.overlay}>
              <View style={styles.scanFrameContainer}>
                <TouchableOpacity
                  style={styles.scanFrameWrapper}
                  onPress={takePicture}
                  disabled={!cameraReady || !device}>
                  {device ? (
                    <Camera
                      ref={cameraRef}
                      style={styles.camera}
                      device={device}
                      isActive={true}
                      photo={true}
                      onInitialized={() => setCameraReady(true)}
                    />
                  ) : (
                    <View style={styles.camera}>
                      <Text style={{color: 'white', textAlign: 'center'}}>
                        Kamera yükleniyor...
                      </Text>
                    </View>
                  )}
                  <View style={styles.scanFrame}>
                    <View style={styles.scanFrameCorner} />
                    <View style={[styles.scanFrameCorner, {right: 0}]} />
                    <View style={[styles.scanFrameCorner, {bottom: 0}]} />
                    <View
                      style={[styles.scanFrameCorner, {bottom: 0, right: 0}]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Text style={styles.buttonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={previewModalVisible}
        onRequestClose={handlePreviewCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Fotoğraf Önizleme</Text>
            {previewImage && (
              <View style={styles.previewWrapper}>
                <Image
                  source={{uri: previewImage}}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewHint}>
                    Fotoğraf net ve okunaklı görünüyor mu?
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.previewButtonRow}>
              <TouchableOpacity
                style={[styles.previewButton, styles.retakeButton]}
                onPress={handlePreviewCancel}>
                <Text style={styles.previewButtonText}>Yeniden Çek</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewButton, styles.confirmButton]}
                onPress={handlePreviewConfirm}>
                <Text style={styles.previewButtonText}>Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Tarama Sonucu</Text>
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}>
              <View style={styles.notFoundContainer}>
                <Text style={styles.notFoundText}>
                  "{scannedText}" ürününe dair bir kayıt bulunmamaktadır
                </Text>
              </View>
              <Text style={styles.editHintText}>
                Ürün ismini düzenleyip tekrar sorgulayabilirsiniz
              </Text>
              <TextInput
                style={styles.editInput}
                value={editableText}
                onChangeText={setEditableText}
                multiline
                placeholder="Ürün adını düzenleyin..."
                placeholderTextColor="#999"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}>
                <Text style={styles.actionButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleEditSubmit}>
                <Text style={styles.actionButtonText}>Sorgula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={resultModalVisible}
        onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setResultModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tarama Sonucu</Text>
              <View style={styles.closeButtonPlaceholder} />
            </View>

            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.scannedTextLabel}>Taranan Metin:</Text>
              <View style={styles.scannedTextBox}>
                <Text style={styles.scannedText}>{scannedText}</Text>
              </View>

              {isProductFound ? (
                <View style={styles.foundContainer}>
                  {productResult?.imageUrl && (
                    <Image
                      source={{uri: productResult.imageUrl}}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  )}
                  <View
                    style={[
                      styles.boycottStatus,
                      productResult?.isBoycotted
                        ? styles.boycottStatusTrue
                        : styles.boycottStatusFalse,
                    ]}>
                    <View style={styles.boycottStatusIconContainer}>
                      {productResult?.isBoycotted ? (
                        <Icon name="alert-circle" size={24} color="#D32F2F" />
                      ) : (
                        <Icon name="shield-check" size={24} color="#2E7D32" />
                      )}
                      <Text
                        style={
                          productResult?.isBoycotted
                            ? styles.boycottStatusText
                            : styles.boycottStatusTextSafe
                        }>
                        {productResult?.isBoycotted
                          ? 'Bu ürün boykot listesindedir!'
                          : 'Bu ürün güvenli listesindedir'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.notFoundContainer}>
                  <Text style={styles.notFoundText}>
                    "{scannedText}" için kayıt bulunamadı
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEditText}>
                    <Icon name="pencil" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Metni Düzenle</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.newScanButton]}
                onPress={handleNewScan}>
                <Icon name="camera" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Yeni Tarama</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#333333',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  scanFrameContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameWrapper: {
    width: normalize(300),
    height: normalizeVertical(400),
    overflow: 'hidden',
    position: 'relative',
  },
  scanFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  scanFrameCorner: {
    position: 'absolute',
    width: normalize(20),
    height: normalize(20),
    borderColor: '#E0E0E0',
    borderWidth: 3,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: normalizeVertical(100),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  button: {
    backgroundColor: '#FFA726',
    padding: normalize(15),
    borderRadius: normalize(5),
    alignItems: 'center',
    width: normalize(200),
  },
  buttonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: 'bold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  textScrollView: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
  },
  progressContainer: {
    width: '80%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFA726',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: normalize(20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: normalize(20),
    paddingHorizontal: normalize(5),
  },
  closeButton: {
    width: normalize(24),
    height: normalize(24),
  },
  closeButtonPlaceholder: {
    width: normalize(24),
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  previewWrapper: {
    position: 'relative',
    width: '100%',
    height: normalize(400),
    backgroundColor: '#F5F5F5',
    borderRadius: normalize(12),
    overflow: 'hidden',
    marginBottom: normalize(20),
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: normalize(15),
  },
  previewHint: {
    color: '#FFFFFF',
    fontSize: normalize(14),
    textAlign: 'center',
    fontWeight: '500',
  },
  previewButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: normalize(10),
  },
  previewButton: {
    flex: 1,
    padding: normalize(15),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButton: {
    backgroundColor: '#FF5252',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  boycottStatus: {
    padding: normalize(15),
    borderRadius: normalize(12),
    marginVertical: normalize(10),
    width: '100%',
  },
  boycottStatusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(8),
  },
  boycottStatusText: {
    fontWeight: '600',
    fontSize: normalize(16),
    color: '#D32F2F',
    textAlign: 'center',
  },
  boycottStatusTextSafe: {
    fontWeight: '600',
    fontSize: normalize(16),
    color: '#2E7D32',
    textAlign: 'center',
  },
  resultButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  resultButton: {
    width: '100%',
    padding: normalize(15),
    borderRadius: normalize(12),
    backgroundColor: '#FFA726',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newScanButton: {
    backgroundColor: '#FFA726',
  },
  feedbackButton: {
    backgroundColor: '#4CAF50',
  },
  resultButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  scannedText: {
    fontSize: normalize(14),
    color: '#757575',
    marginBottom: normalize(10),
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: normalize(20),
  },
  editButton: {
    backgroundColor: '#42A5F5',
    marginTop: normalize(15),
  },
  notFoundContainer: {
    backgroundColor: '#FFF8E1',
    padding: normalize(15),
    borderRadius: normalize(12),
    marginBottom: normalize(15),
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  notFoundText: {
    fontSize: normalize(16),
    color: '#FF6F00',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: normalize(24),
  },
  foundContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
  imageContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: normalize(12),
    padding: normalize(10),
    marginVertical: normalize(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: normalize(200),
    borderRadius: normalize(8),
  },
  productBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalSubtitle: {
    fontSize: normalize(14),
    color: '#666666',
    marginBottom: normalize(10),
    textAlign: 'center',
    lineHeight: normalize(20),
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: normalize(12),
    padding: normalize(15),
    minHeight: normalize(100),
    textAlignVertical: 'top',
    fontSize: normalize(16),
    marginVertical: normalize(15),
    backgroundColor: '#FAFAFA',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: normalize(15),
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    padding: normalize(15),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: normalize(5),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
  },
  queryButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: normalize(16),
  },
  noProductSubText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  boycottStatusTrue: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  boycottStatusFalse: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  modalScrollView: {
    maxHeight: normalize(400),
    marginBottom: normalize(20),
  },
  scannedTextLabel: {
    fontSize: normalize(14),
    color: '#666666',
    marginBottom: normalize(8),
    fontWeight: '500',
  },
  scannedTextBox: {
    backgroundColor: '#F5F5F5',
    padding: normalize(15),
    borderRadius: normalize(12),
    marginBottom: normalize(20),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: normalize(15),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: normalize(10),
  },
  actionButton: {
    flex: 1,
    height: normalize(50),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: normalize(10),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: normalize(15),
  },
  editHintText: {
    fontSize: normalize(14),
    color: '#666666',
    textAlign: 'center',
    marginBottom: normalize(15),
    lineHeight: normalize(20),
  },
  editInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: normalize(12),
    padding: normalize(15),
    minHeight: normalize(100),
    fontSize: normalize(16),
    color: '#1A1A1A',
    textAlignVertical: 'top',
    marginBottom: normalize(20),
  },
});
