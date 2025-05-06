import {NavigatorScreenParams} from '@react-navigation/native';

export type TabParamList = {
  'Ana Sayfa': undefined;
  Haberler: undefined;
  Geribildirim: undefined;
  GörünmezButon: undefined;
  Sorgula: undefined;
  Tara: undefined;
};

export type RootStackParamList = {
  TabNavigator: NavigatorScreenParams<TabParamList>;
};

export type NewsStackParamList = {
  HaberListesi: undefined;
  HaberDetay: {id: number};
};
