import { NavigatorScreenParams } from '@react-navigation/native';

export type AdminTabParamList = {
  Today: undefined;
  Medicines: undefined;
  Settings: undefined;
};

export type MemberTabParamList = {
  Today: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  MemberTabs: NavigatorScreenParams<MemberTabParamList> | undefined;
  AddMedicine: undefined;
  EditMedicine: { medicationId: string };
};
