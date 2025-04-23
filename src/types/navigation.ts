import {NavigatorScreenParams} from '@react-navigation/native';

export type TabParamList = {
  Ana: undefined;
  Tara: undefined;
  Listeler: undefined;
  Bilgi: undefined;
  Ayarlar: undefined;
};

export type RootStackParamList = {
  TabNavigator: NavigatorScreenParams<TabParamList>;
};

export type NewsStackParamList = {
  HaberListesi: undefined;
  HaberDetay: {id: number};
};
