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
  AppState,
  AppStateStatus,
  Linking,
  Dimensions,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import API_URL from '../Apiurl';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import ImageCropPicker from 'react-native-image-crop-picker';

// Google Cloud Vision API anahtarınız - ürün etiketleri için daha iyi çalışır
const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyD3TNvnNlCMR1yP4S1m6bykN6venCY91sw';

// Azure API anahtarı ve endpoint
const AZURE_API_KEY = 'YOUR_AZURE_API_KEY';
const AZURE_ENDPOINT =
  'https://your-resource-name.cognitiveservices.azure.com/';

// OCR.space API anahtarı - yedek olarak tutuyoruz
const OCR_SPACE_API_KEY = 'K89647579688957';

export default function ScanScreen() {
  const navigation = useNavigation();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Application states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editableText, setEditableText] = useState<string>('');
  const [resultModalVisible, setResultModalVisible] = useState<boolean>(false);
  const [productResult, setProductResult] = useState<any>(null);
  const [isProductFound, setIsProductFound] = useState<boolean>(false);
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);
  const [scannedText, setScannedText] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropModalVisible, setCropModalVisible] = useState<boolean>(false);
  const appState = useRef(AppState.currentState);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground');
    }

    appState.current = nextAppState;
  };

  // Check current permissions without requesting
  const checkPermissions = async () => {
    try {
      let cameraPermissionStatus;
      let mediaPermissionStatus;

      // Check camera permission
      if (Platform.OS === 'android') {
        cameraPermissionStatus = await check(PERMISSIONS.ANDROID.CAMERA);
      } else {
        cameraPermissionStatus = await check(PERMISSIONS.IOS.CAMERA);
      }

      // Check media permission
      if (Platform.OS === 'ios') {
        mediaPermissionStatus = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      } else {
        try {
          // Try to check Android 13+ permission first
          mediaPermissionStatus = await check(
            PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
          );
        } catch (err) {
          // Fall back to older permission
          mediaPermissionStatus = await check(
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
          );
        }
      }

      console.log('Current permission status:', {
        camera: cameraPermissionStatus,
        media: mediaPermissionStatus,
      });

      return {
        camera: cameraPermissionStatus === RESULTS.GRANTED,
        media: mediaPermissionStatus === RESULTS.GRANTED,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {camera: false, media: false};
    }
  };

  // Request camera and storage permissions
  const requestPermissions = async () => {
    try {
      // First check current status
      const currentStatus = await checkPermissions();

      // Only request permissions that aren't already granted
      let cameraPermission = currentStatus.camera;
      let mediaPermission = currentStatus.media;

      console.log('Requesting camera permission...');
      if (!currentStatus.camera) {
        if (Platform.OS === 'android') {
          const result = await request(PERMISSIONS.ANDROID.CAMERA);
          cameraPermission = result === RESULTS.GRANTED;
        } else {
          const result = await request(PERMISSIONS.IOS.CAMERA);
          cameraPermission = result === RESULTS.GRANTED;
        }
      } else {
        console.log('Camera permission already granted');
      }

      // Request storage permissions based on platform
      console.log('Requesting media permissions...');
      if (!currentStatus.media) {
        if (Platform.OS === 'ios') {
          const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
          mediaPermission = result === RESULTS.GRANTED;
        } else if (Platform.OS === 'android') {
          // Android 13+ uses READ_MEDIA_IMAGES, older versions use READ_EXTERNAL_STORAGE
          try {
            console.log('Requesting READ_MEDIA_IMAGES permission...');
            const newPermissionResult = await request(
              PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            );

            if (newPermissionResult === RESULTS.GRANTED) {
              mediaPermission = true;
            } else {
              // For older Android versions
              console.log('Requesting READ_EXTERNAL_STORAGE permission...');
              const oldPermissionResult = await request(
                PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
              );
              mediaPermission = oldPermissionResult === RESULTS.GRANTED;
            }
          } catch (permErr) {
            console.error('Media permission error:', permErr);
            // Fallback to old permission as last resort
            try {
              const fallbackResult = await request(
                PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
              );
              mediaPermission = fallbackResult === RESULTS.GRANTED;
            } catch (fallbackErr) {
              console.error('Fallback permission error:', fallbackErr);
            }
          }
        }
      } else {
        console.log('Media permission already granted');
      }

      console.log('Final permission results:', {
        camera: cameraPermission,
        media: mediaPermission,
      });

      const hasAllPermissions = cameraPermission && mediaPermission;

      console.log('Has all permissions:', hasAllPermissions);

      setHasPermission(hasAllPermissions);

      if (!hasAllPermissions) {
        if (!cameraPermission) {
          Alert.alert(
            'Kamera İzni Gerekli',
            'Uygulamanın düzgün çalışması için kamera izni vermeniz gerekiyor.',
            [{text: 'Tamam'}],
          );
        } else if (!mediaPermission) {
          Alert.alert(
            'Medya İzni Gerekli',
            'Galeriden fotoğraf seçebilmek için medya erişim izni vermeniz gerekiyor.',
            [{text: 'Tamam'}],
          );
        }
      }

      return hasAllPermissions;
    } catch (error) {
      console.error('Permissions request error:', error);
      setHasPermission(false);
      return false;
    }
  };

  // Generate and store device ID
  const generateDeviceId = async () => {
    try {
      let id = await AsyncStorage.getItem('deviceId');
      if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('deviceId', id);
      }
      setDeviceId(id);
    } catch (error) {
      console.error('Device ID generation error:', error);
    }
  };

  // Initialize app and request permissions on startup
  useEffect(() => {
    console.log('ScanScreen yükleniyor...');
    let mounted = true;

    const init = async () => {
      if (!mounted) return;

      // Set initial state
      setHasPermission(null);

      // Check and request permissions
      const permissionsGranted = await requestPermissions();
      if (!mounted) return;

      if (permissionsGranted) {
        console.log('All permissions granted, initializing app');
        await generateDeviceId();
        if (!mounted) return;
      } else {
        console.log('Some permissions were denied');
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Check request limits before processing
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

      if (!response.ok) {
        console.warn('Limit kontrol yanıtı başarısız:', response.status);
        return true; // Assume we can proceed if the request failed
      }

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
      return true; // Assume we can proceed if there was an error
    }
  };

  // Take a picture using the absolute simplest approach - directly use system camera
  const takePicture = async () => {
    try {
      setIsProcessing(true);

      // Check request limit
      const canProceed = await checkRequestLimit();
      if (!canProceed) {
        setIsProcessing(false);
        return;
      }

      // Skip camera reference check since we now use native camera UI
      // Just launch system camera directly - most reliable approach
      launchCamera(
        {
          mediaType: 'photo',
          quality: 0.8,
          includeBase64: false,
          saveToPhotos: false,
        },
        async response => {
          try {
            if (response.didCancel) {
              console.log('User cancelled camera');
              setIsProcessing(false);
              return;
            }

            if (response.errorCode) {
              console.error('ImagePicker error:', response.errorMessage);
              throw new Error(
                'Kamera hatası: ' +
                  (response.errorMessage || 'Bilinmeyen hata'),
              );
            }

            if (
              response.assets &&
              response.assets.length > 0 &&
              response.assets[0].uri
            ) {
              console.log(
                'Photo captured using native camera UI:',
                response.assets[0].uri,
              );
              // Instead of processing image directly, show the crop modal
              setSelectedImage(response.assets[0].uri);
              setIsProcessing(false);
              setCropModalVisible(true);
            } else {
              throw new Error('Fotoğraf alınamadı');
            }
          } catch (error) {
            console.error('Image processing error:', error);
            Alert.alert(
              'İşlem Hatası',
              'Fotoğraf işlenirken bir hata oluştu. Lütfen tekrar deneyin.',
              [{text: 'Tamam'}],
            );
            setIsProcessing(false);
          }
        },
      );
    } catch (error) {
      console.error('Camera launch error:', error);
      setIsProcessing(false);
      Alert.alert(
        'Kamera Hatası',
        'Fotoğraf çekilemedi. Lütfen galeriden bir fotoğraf seçmeyi deneyin.',
        [{text: 'Tamam'}],
      );
    }
  };

  // Pick an image from gallery
  const pickImage = async () => {
    try {
      setIsProcessing(true);

      // Check request limit
      const canProceed = await checkRequestLimit();
      if (!canProceed) {
        setIsProcessing(false);
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        setIsProcessing(false);
        return;
      }

      if (result.errorCode) {
        console.error('Gallery error:', result.errorMessage);
        Alert.alert(
          'Hata',
          'Galeri açılırken bir hata oluştu: ' +
            (result.errorMessage || 'Bilinmeyen hata'),
        );
        setIsProcessing(false);
        return;
      }

      if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        console.log('Image selected from gallery:', result.assets[0].uri);
        // Instead of processing image directly, show the crop modal
        setSelectedImage(result.assets[0].uri);
        setIsProcessing(false);
        setCropModalVisible(true);
      } else {
        Alert.alert('Hata', 'Resim seçilirken bir sorun oluştu');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert(
        'Galeri Hatası',
        'Resim seçilirken bir hata oluştu. Lütfen tekrar deneyin.',
        [{text: 'Tamam'}],
      );
      setIsProcessing(false);
    }
  };

  // Crop the image
  const cropImage = async () => {
    if (!selectedImage) return;

    try {
      setIsProcessing(true);
      setCropModalVisible(false);

      const croppedImage = await ImageCropPicker.openCropper({
        path: selectedImage,
        mediaType: 'photo',
        freeStyleCropEnabled: true,
        cropperToolbarTitle: 'Görüntüyü Kırp',
        cropperActiveWidgetColor: '#2196F3',
        cropperStatusBarColor: '#2196F3',
        cropperToolbarColor: '#2196F3',
        cropperToolbarWidgetColor: '#ffffff',
        enableRotationGesture: true,
      });

      console.log('Cropped image:', croppedImage);

      const text = await processImage(croppedImage.path);
      if (text) {
        await queryProduct(text);
      }
    } catch (error: any) {
      console.error('Image cropping error:', error);

      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert(
          'Kırpma Hatası',
          'Görüntü kırpılırken bir hata oluştu. Lütfen tekrar deneyin.',
          [{text: 'Tamam'}],
        );
      } else {
        console.log('User cancelled cropping');
      }

      // If cropping fails or is cancelled, process the original image
      if (selectedImage) {
        const text = await processImage(selectedImage);
        if (text) {
          await queryProduct(text);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Skip cropping and use original image
  const skipCropping = async () => {
    setCropModalVisible(false);

    if (selectedImage) {
      setIsProcessing(true);
      try {
        const text = await processImage(selectedImage);
        if (text) {
          await queryProduct(text);
        }
      } catch (error) {
        console.error('Image processing error:', error);
        Alert.alert(
          'İşlem Hatası',
          'Fotoğraf işlenirken bir hata oluştu. Lütfen tekrar deneyin.',
          [{text: 'Tamam'}],
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Process the image using OCR
  const processImage = async (imageUri: string): Promise<string | null> => {
    try {
      setProgressStatus('Görüntü işleniyor...');
      setProgressPercent(30);

      const resizedImage = await ImageResizer.createResizedImage(
        imageUri,
        1000,
        1000,
        'JPEG',
        80,
      );

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
          setProgressStatus('');
          setProgressPercent(0);
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
          setProgressStatus('');
          setProgressPercent(0);
          return text;
        }
      } catch (error) {
        console.error('OCR.space API hatası:', error);
      }

      setProgressStatus('');
      setProgressPercent(0);
      Alert.alert(
        'Hata',
        'Metin tanıma işlemi başarısız oldu. Lütfen tekrar deneyin.',
      );
      return null;
    } catch (error) {
      console.error('Görüntü işlenirken hata oluştu:', error);
      setProgressStatus('');
      setProgressPercent(0);
      Alert.alert(
        'Hata',
        'Metin tanıma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      );
      return null;
    }
  };

  // Query product from backend
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
    setScannedText('');
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

  // Render loading screen while checking permissions
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.permissionTitle}>İzinler Kontrol Ediliyor</Text>
          <Text style={styles.permissionText}>
            Uygulamanın çalışması için kamera ve galeri izinleri gereklidir.
          </Text>
        </View>
      </View>
    );
  }

  // Render permission denied screen
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Text style={styles.permissionIconText}>📸</Text>
          </View>
          <Text style={styles.permissionTitle}>İzinler Gerekli</Text>
          <Text style={styles.permissionText}>
            Bu uygulama, kamera ile fotoğraf çekmek ve galeriden fotoğraf seçmek
            için izinlere ihtiyaç duyar.
          </Text>
          <View style={{height: 20}} />
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermissions}>
            <Text style={styles.buttonText}>İzinleri Yeniden İste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              {marginTop: 10, backgroundColor: '#4CAF50'},
            ]}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}>
            <Text style={styles.buttonText}>Ayarlara Git</Text>
          </TouchableOpacity>
        </View>
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
                  disabled={isProcessing}>
                  <View style={styles.cameraPlaceholder}>
                    <Text style={styles.cameraInstructionText}>
                      Fotoğraf çekmek için dokunun
                    </Text>
                  </View>
                  <View style={styles.scanFrame}>
                    <View style={styles.scanFrameCorner} />
                    <View style={[styles.scanFrameCorner, {right: 0}]} />
                    <View style={[styles.scanFrameCorner, {bottom: 0}]} />
                    <View
                      style={[styles.scanFrameCorner, {bottom: 0, right: 0}]}
                    />
                  </View>
                </TouchableOpacity>
                <View style={[styles.scanFrameMask, {bottom: 0}]} />
              </View>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={pickImage}
              disabled={isProcessing}>
              <Text style={styles.buttonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Crop Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cropModalVisible}
        onRequestClose={() => setCropModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.cropModalView}>
            <Text style={styles.modalTitle}>Görüntüyü Kırp</Text>

            {selectedImage && (
              <View style={styles.cropImagePreview}>
                <Image
                  source={{uri: selectedImage}}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <Text style={styles.cropInstructionText}>
              Görüntüyü kırpmak işlemin doğruluğunu artırabilir. Kırpma işlemi
              yapmak istiyor musunuz?
            </Text>

            <View style={styles.cropButtonRow}>
              <TouchableOpacity
                style={[styles.cropButton, styles.skipButton]}
                onPress={skipCropping}>
                <Text style={styles.cropButtonText}>Kırpmadan Devam Et</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cropButton, styles.cropConfirmButton]}
                onPress={cropImage}>
                <Text style={styles.cropButtonText}>Görüntüyü Kırp</Text>
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
    paddingTop: 0,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 0,
    backgroundColor: '#333333',
    justifyContent: 'flex-end',
    paddingBottom: -100,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: -400,
    marginTop: 250,
  },
  scanFrameWrapper: {
    width: '90%',
    height: '40%',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 0,
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
  scanFrameMask: {
    flex: 1,
    backgroundColor: 'rgba(51, 51, 51, 0.97)',
    width: '100%',
  },
  scanFrameCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2196F3',
    borderWidth: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    position: 'relative',
    bottom: 75,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
  cropModalView: {
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
  cropImagePreview: {
    width: '100%',
    height: 300,
    marginVertical: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cropInstructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 15,
  },
  cropButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cropButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  skipButton: {
    backgroundColor: '#757575',
  },
  cropConfirmButton: {
    backgroundColor: '#2196F3',
  },
  cropButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
  cameraPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInstructionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
  cameraIcon: {
    width: 60,
    height: 60,
    marginBottom: 10,
    tintColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionIconText: {
    fontSize: 50,
  },
});
