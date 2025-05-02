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
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      let mediaLibraryPermission = 'granted';

      if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
        mediaLibraryPermission =
          result === RESULTS.GRANTED ? 'granted' : 'denied';
      } else if (Platform.OS === 'android') {
        // Android için galeri izni isteyelim
        const result =
          (await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES)) ||
          (await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE));
        mediaLibraryPermission =
          result === RESULTS.GRANTED ? 'granted' : 'denied';
      }

      setHasPermission(
        cameraPermission === 'granted' && mediaLibraryPermission === 'granted',
      );
    })();

    const generateDeviceId = async () => {
      let id = await AsyncStorage.getItem('deviceId');
      if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('deviceId', id);
      }
      setDeviceId(id);
    };

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

      setProgressStatus('');
      setProgressPercent(0);
      setIsProcessing(false);
      Alert.alert(
        'Hata',
        'Metin tanıma işlemi başarısız oldu. Lütfen tekrar deneyin.',
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
      );
      return null;
    }
  };

  const queryProduct = async (productName: string) => {
    setIsQueryLoading(true);
    try {
      const canProceed = await checkRequestLimit();
      if (!canProceed) {
        setIsQueryLoading(false);
        return;
      }

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
              <View style={styles.previewContainer}>
                <Image
                  source={{uri: previewImage}}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            )}
            <View style={styles.previewButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePreviewCancel}>
                <Text style={styles.modalButtonText}>Yeniden Çek</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.queryButton]}
                onPress={handlePreviewConfirm}>
                <Text style={styles.modalButtonText}>Onayla</Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Tarama Sonucu</Text>
            <View style={styles.notFoundContainer}>
              <Text style={styles.notFoundText}>
                "{scannedText}" ürününe dair bir kayıt bulunmamaktadır
              </Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Ürün ismi yanlış ise düzenleyip tekrar sorgulayabilirsiniz
            </Text>
            <TextInput
              style={styles.textInput}
              value={editableText}
              onChangeText={setEditableText}
              multiline
              placeholder="Ürün adını düzenleyin..."
              autoFocus={true}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.queryButton]}
                onPress={handleEditSubmit}>
                <Text style={styles.modalButtonText}>Sorgula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={resultModalVisible}
        onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {isProductFound ? (
              <>
                <Text style={styles.modalTitle}>{productResult?.name}</Text>
                <View style={styles.foundContainer}>
                  <Text style={styles.scannedText}>
                    Taranan Metin: {scannedText}
                  </Text>
                  {productResult?.imageUrl && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{uri: productResult.imageUrl}}
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View
                    style={[
                      styles.boycottStatus,
                      productResult?.isBoycotted
                        ? styles.boycottStatusTrue
                        : styles.boycottStatusFalse,
                    ]}>
                    <Text
                      style={
                        productResult?.isBoycotted
                          ? styles.boycottStatusText
                          : styles.boycottStatusTextSafe
                      }>
                      {productResult?.isBoycotted
                        ? '⚠️ Bu ürün boykot listesindedir!'
                        : '✅ Bu ürün güvenli listesindedir'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Ürün Bulunamadı</Text>
                <View style={styles.notFoundContainer}>
                  <Text style={styles.notFoundText}>
                    "{scannedText}" dair bir kayıt bulunmamaktadır
                  </Text>
                </View>
                <Text style={styles.noProductSubText}>
                  Taranan metin doğru mu? Değilse düzenleyebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.editButton]}
                  onPress={handleEditText}>
                  <Text style={styles.modalButtonText}>Metni Düzenle</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.resultButtonRow}>
              <TouchableOpacity
                style={[styles.resultButton, styles.newScanButton]}
                onPress={handleNewScan}>
                <Text style={styles.resultButtonText}>Yeni Tarama</Text>
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
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
  },
  scanFrameCorner: {
    position: 'absolute',
    width: normalize(20),
    height: normalize(20),
    borderColor: '#2196F3',
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
    backgroundColor: '#2196F3',
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
    backgroundColor: '#2196F3',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  scannedTextContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scannedTextLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  scannedTextContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginVertical: 15,
    backgroundColor: '#fff',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  queryButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  productImage: {
    width: '100%',
    height: 200,
    marginVertical: 15,
    borderRadius: 8,
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
  boycottStatus: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  boycottStatusTrue: {
    backgroundColor: '#ffcdd2',
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  boycottStatusFalse: {
    backgroundColor: '#c8e6c9',
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  boycottStatusText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  boycottStatusTextSafe: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2e7d32',
    textAlign: 'center',
  },
  noProductText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  noProductSubText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  resultButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  resultButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  newScanButton: {
    backgroundColor: '#2196F3',
  },
  feedbackButton: {
    backgroundColor: '#4CAF50',
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
    marginVertical: 10,
    width: '100%',
  },
  notFoundContainer: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  notFoundText: {
    fontSize: 16,
    color: '#e65100',
    textAlign: 'center',
    fontWeight: '500',
  },
  foundContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 15,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});
