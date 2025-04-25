import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Typo from "@/components/Typo";
import { colors } from "@/constants/theme";
import Button from "@/components/Button";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import ScreenWrapper from "@/components/ScreenWrapper";

const Home = () => {
  const { user } = useAuth();
  console.log("🚀 ~ Home ~ const:", user);

  const handleLogout = async () => {
    await signOut(auth);
  };
  return (
    <ScreenWrapper>
      <Typo>index</Typo>
      <Button onPress={handleLogout}>
        <Typo color={colors.black}>Logout</Typo>
      </Button>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({});
