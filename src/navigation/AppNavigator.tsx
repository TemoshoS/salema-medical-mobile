
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProviderRegistrationScreen from "../screens/ProviderRegistrationScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import HomeScreen from "../screens/HomeScreen";

import EmergencyScreen from "../screens/medical/EmergencyScreen";
import TransportScreen from "../screens/medical/TransportScreen";
import LocationScreen from "../screens/medical/LocationScreen";
import ControlRoomScreen from "../screens/medical/ControlRoomScreen";
import ControlRoomDashboardScreen from "../screens/medical/ControlRoomDashboardScreen";
import ProviderApplicationsScreen from "../screens/medical/ProviderApplicationsScreen";
import MedicalRequestsScreen from "../screens/medical/MedicalRequestsScreen";
import MedicalAccountScreen from "../screens/medical/MedicalAccountScreen";
import ProviderDashboardScreen from "../screens/medical/ProviderDashboardScreen";
import CallScreen from "../screens/medical/CallScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProviderRegister: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { email: string };

  Home: undefined;
  Emergency: undefined;
  Transport: undefined;
  Location: undefined;
  ControlRoom: undefined;
  ControlRoomDashboard: undefined;
  ProviderApplications: undefined;
  MedicalRequests: undefined;
  MedicalAccount: undefined;
  ProviderDashboard: undefined;
  Call: { callSessionId: string; callType: "AUDIO" | "VIDEO" };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#461477" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    >
      {token ? (
        user?.role === "CONTROL_ROOM" ? (
          <>
            <Stack.Screen
              name="ControlRoomDashboard"
              component={ControlRoomDashboardScreen}
            />
            <Stack.Screen
              name="ProviderApplications"
              component={ProviderApplicationsScreen}
            />
            <Stack.Screen name="Call" component={CallScreen} />
          </>
        ) : user?.role === "PROVIDER" ? (
          <>
            <Stack.Screen
              name="ProviderDashboard"
              component={ProviderDashboardScreen}
            />
            <Stack.Screen name="Call" component={CallScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />

            <Stack.Screen name="Emergency" component={EmergencyScreen} />

            <Stack.Screen name="Transport" component={TransportScreen} />

            <Stack.Screen name="Location" component={LocationScreen} />

            <Stack.Screen
              name="ControlRoom"
              component={ControlRoomScreen}
            />

            <Stack.Screen
              name="MedicalRequests"
              component={MedicalRequestsScreen}
            />

            <Stack.Screen
              name="MedicalAccount"
              component={MedicalAccountScreen}
            />

            <Stack.Screen name="Call" component={CallScreen} />
          </>
        )
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
          />
          <Stack.Screen
            name="ProviderRegister"
            component={ProviderRegistrationScreen}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
