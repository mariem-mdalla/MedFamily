import { NavigatorScreenParams } from '@react-navigation/native';

export type AdminTabParamList = {
  Today: undefined;
  Medicines: undefined;
  People: undefined;
  History: undefined;
  Settings: undefined;
};

export type MemberTabParamList = {
  Today: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  JoinWithCode: undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  MemberTabs: NavigatorScreenParams<MemberTabParamList> | undefined;
  AddMedicine: undefined;
  EditMedicine: { medicationId: string };
  AddPerson: undefined;
  EditPerson: { careProfileId: string };
  ManageInvites: undefined;
  History: undefined;
};
