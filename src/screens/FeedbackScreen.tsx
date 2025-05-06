import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import API_URL from '../Apiurl';

export default function FeedbackScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    if (!name || !email || !feedback) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      console.log('İstek atılıyor:', `${API_URL}/api/Feedback`);
      const response = await fetch(`${API_URL}/api/Feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: feedback,
          id: 0,
          isRead: false,
          isReplied: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Sunucu hatası:', errorData);
        throw new Error(`Sunucu hatası: ${response.status}`);
      }

      Alert.alert(
        'Başarılı',
        'Geribildiriminiz için teşekkürler! En kısa sürede değerlendireceğiz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              setName('');
              setEmail('');
              setFeedback('');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Hata detayı:', error);
      Alert.alert(
        'Hata',
        error instanceof Error
          ? `Geribildiriminiz gönderilirken bir hata oluştu: ${error.message}. Lütfen tekrar deneyiniz.`
          : 'Geribildiriminiz gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Geribildirim Formu</Text>

        <View style={styles.form}>
          <Text style={styles.label}>İsim Soyisim</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="İsim soyisim giriniz"
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="E-posta adresinizi girin"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Geribildiriminiz</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Geribildiriminizi yazın"
            multiline
            numberOfLines={5}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Bizi Sosyal Medyada Takip Edin</Text>
          <View style={styles.socialIconsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://x.com/kamiboykot')}>
              <Image
                source={require('../../assets/twitter.png')}
                style={styles.socialIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL('https://www.instagram.com/kamiboykot')
              }>
              <Image
                source={require('../../assets/instagram.png')}
                style={styles.socialIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() =>
                Linking.openURL(
                  'https://www.facebook.com/profile.php?id=61575997312971',
                )
              }>
              <Image
                source={require('../../assets/facebook.png')}
                style={styles.socialIcon}
              />
            </TouchableOpacity>
          </View>

          <Image
            source={require('../../assets/HomeScreenAssets/LOGO.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: windowWidth * 0.05,
    paddingTop: windowHeight * 0.08,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: windowWidth * 0.06,
    fontWeight: 'bold',
    marginBottom: windowHeight * 0.02,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: windowWidth * 0.04,
    marginBottom: windowHeight * 0.01,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: Math.min(windowWidth * 0.03, 15),
    marginBottom: Math.min(windowHeight * 0.02, 15),
    fontSize: Math.min(windowWidth * 0.04, 16),
    width: '100%',
  },
  textArea: {
    height: Math.min(windowHeight * 0.15, 150),
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#808080',
    padding: windowWidth * 0.04,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: windowHeight * 0.02,
    marginBottom: windowHeight * 0.03,
  },
  submitButtonText: {
    color: 'white',
    fontSize: windowWidth * 0.04,
    fontWeight: '600',
  },
  socialContainer: {
    paddingTop: windowHeight * 0.02,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logo: {
    width: Math.min(windowWidth * 0.8, 400),
    height: Math.min(windowHeight * 0.08, 60),
    alignSelf: 'center',
    marginTop: Math.min(windowHeight * 0.02, 20),
    shadowColor: '#fff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  socialTitle: {
    textAlign: 'center',
    fontSize: windowWidth * 0.04,
    fontWeight: '500',
    marginBottom: windowHeight * 0.02,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Math.min(windowWidth * 0.1, 40),
  },
  socialButton: {
    padding: windowWidth * 0.02,
  },
  socialIcon: {
    width: Math.min(windowWidth * 0.07, 30),
    height: Math.min(windowWidth * 0.07, 30),
  },
});
