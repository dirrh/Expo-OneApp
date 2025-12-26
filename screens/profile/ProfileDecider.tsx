import React, { useState } from "react";
import { View } from "react-native";
import LoginScreen from "../LoginRegister/LoginScreen";
import ProfileScreen from "./ProfileScreen";

export default function ProfileDecider() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {isLoggedIn ? (
        <ProfileScreen/>
      ) : (
        <LoginScreen/>
      )}
    </View>
  );
}
