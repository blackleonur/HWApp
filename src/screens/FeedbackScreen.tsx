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
} from 'react-native';
import {API_URL} from '../config/api';

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
      const response = await fetch(`${API_URL}/api/Feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: feedback,
        }),
      });

      if (!response.ok) {
        throw new Error('Bir hata oluştu');
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
      Alert.alert(
        'Hata',
        'Geribildiriminiz gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.',
      );
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#808080',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  socialContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logo: {
    width: '100%',
    height: 60,
    alignSelf: 'center',
    marginTop: 100,
    shadowColor: '#fff',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  socialTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  socialButton: {
    padding: 10,
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
});
