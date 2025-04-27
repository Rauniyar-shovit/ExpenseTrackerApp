import { Modal, StyleSheet, View } from "react-native";
import React, { Dispatch, useState } from "react";
import Typo from "./Typo";
import { colors } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import Button from "./Button";

type LogoutModalProps = {
  modalVisible: boolean;
  setModalVisible: Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => void;
};

const LogoutModal = ({
  modalVisible,
  setModalVisible,
  handleLogout,
}: LogoutModalProps) => {
  // needs backdropper to be added
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(!modalVisible);
      }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={styles.modalView}>
          <Typo
            size={24}
            fontWeight={"600"}
            color={colors.white}
            style={{
              marginBottom: verticalScale(20),
            }}
          >
            Log Out?
          </Typo>
          <Typo
            size={18}
            fontWeight={"400"}
            color={colors.white}
            style={{
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            Are you sure you want to logout ?
          </Typo>

          <View style={styles.buttonsContainer}>
            <Button
              style={{ ...styles.button, backgroundColor: colors.white }}
              onPress={() => setModalVisible(false)}
            >
              <Typo color={colors.black} size={15}>
                Cancel
              </Typo>
            </Button>
            <Button style={styles.button} onPress={handleLogout}>
              <Typo color={colors.black} size={15}>
                Logout
              </Typo>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LogoutModal;

const styles = StyleSheet.create({
  buttonsContainer: {
    marginTop: verticalScale(30),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(10),
  },
  button: {
    paddingHorizontal: scale(30),
    height: verticalScale(50),
  },

  cancelButton: {
    backgroundColor: colors.neutral700,
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.neutral800,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
