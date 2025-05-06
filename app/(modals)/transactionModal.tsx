import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ImageUpload from "@/components/ImageUpload";
import ModalWrapper from "@/components/ModalWrapper";
import Typo from "@/components/Typo";
import { expenseCategories, transactionTypes } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import useFetchData from "@/hooks/useFetchData";
import { deleteWallet } from "@/services/walletService";
import { TransactionType, WalletType } from "@/types";
import { scale, verticalScale } from "@/utils/styling";
import { useLocalSearchParams, useRouter } from "expo-router";
import { orderBy, where } from "firebase/firestore";
import * as Icons from "phosphor-react-native";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import DatePicker from "react-native-date-picker";
import Input from "@/components/Input";
import { createOrUpdateTransaction } from "@/services/transactionService";

const TransactionModal = () => {
  const { user } = useAuth();

  const {
    data: wallets,
    loading: walletLoading,
    error: walletError,
  } = useFetchData<WalletType>("wallets", [
    where("uid", "==", user?.uid),
    orderBy("created", "desc"),
  ]);

  const [transaction, setTransaction] = useState<TransactionType>({
    type: "expense",
    amount: 0,
    category: "",
    date: new Date(),
    description: "",
    image: null,
    walletId: "",
  });

  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const oldTransaction: {
    name: string;
    image: string;
    id: string;
  } = useLocalSearchParams();

  const walletDropdownList = wallets.map((wallet) => ({
    label: `${wallet?.name} ($${wallet?.amount})`,
    value: wallet?.id,
  }));

  //   useEffect(() => {
  //     if (oldTransaction?.id) {
  //       setTransaction({ ...oldTransaction });
  //     }
  //   }, []);

  const onSubmit = async () => {
    const { type, amount, description, date, category, walletId, image } =
      transaction;

    if (!walletId || !date || (type === "expense" && !category)) {
      Alert.alert("Transaction", "Please fill all the fields");
      return;
    }

    console.log("Good to go");

    let transactionData: TransactionType = {
      ...transaction,
      uid: user?.uid,
    };
    console.log("transactionData", transactionData);

    // to dod include transaction id for updateing

    setLoading(true);
    const res = await createOrUpdateTransaction(transactionData);
    setLoading(false);
    if (res.success) {
      router.back();
    } else {
      Alert.alert("Transaction", res?.message);
    }
  };

  const onDateChange = (selectedDate: Date) => {
    const currentDate = selectedDate || transaction.date;
    setTransaction((prev) => ({ ...prev, date: currentDate }));

    setShowDatePicker(false);
  };

  const onDelete = async () => {
    if (!oldTransaction?.id) return;
    setLoading(true);
    const res = await deleteWallet(oldTransaction?.id);
    setLoading(false);
    if (res.success) {
      router.back();
    } else {
      Alert.alert("Wallet ", res.message);
    }
  };

  //todo  refactor to a modal
  const showDelteAlert = () => {
    Alert.alert(
      "Confirm",
      "Are you sure you want to delete this wallet?\nThis action will remove all the transactions realted to this wallet",
      [
        {
          text: "Cancel",
          onPress: () => console.log("cancel de;lete"),
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => onDelete(),
          style: "destructive",
        },
      ]
    );
  };
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={oldTransaction?.id ? "Update Transaction" : "Add Transaction"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />
        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          {/* transaction type */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Transaction Type
            </Typo>

            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              //   placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropdownIcon}
              data={transactionTypes}
              maxHeight={300}
              labelField="label"
              valueField="value"
              searchPlaceholder="Search..."
              value={transaction.type}
              onChange={(item) => {
                setTransaction((prev) => ({ ...prev, type: item.value }));
              }}
              //   placeholder={!isFocus ? "Select item" : "..."}
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
            />
          </View>

          {/* wallet */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Wallet
            </Typo>

            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropdownIcon}
              data={walletDropdownList}
              maxHeight={300}
              labelField="label"
              valueField="value"
              searchPlaceholder="Search..."
              value={transaction.walletId}
              onChange={(item) => {
                setTransaction((prev) => ({ ...prev, walletId: item.value }));
              }}
              placeholder={"Select wallet"}
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
            />
          </View>

          {/* expense category */}
          {transaction.type === "expense" && (
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200} size={16}>
                Expense Category
              </Typo>

              <Dropdown
                style={styles.dropdownContainer}
                activeColor={colors.neutral700}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelectedText}
                iconStyle={styles.dropdownIcon}
                data={Object.values(expenseCategories)}
                maxHeight={300}
                labelField="label"
                valueField="value"
                searchPlaceholder="Search..."
                value={transaction.category}
                onChange={(item) => {
                  setTransaction((prev) => ({ ...prev, category: item.value }));
                }}
                placeholder={"Select category"}
                itemTextStyle={styles.dropdownItemText}
                itemContainerStyle={styles.dropdownItemContainer}
                containerStyle={styles.dropdownListContainer}
              />
            </View>
          )}

          {/* date picker  */}

          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Date
            </Typo>
            {/* date input */}
            {!showDatePicker && (
              <Pressable
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Typo size={14}>
                  {(transaction.date as Date).toLocaleDateString()}
                </Typo>
              </Pressable>
            )}
            {showDatePicker && (
              <View style={Platform.OS === "ios" && styles.iosDatePicker}>
                <DatePicker
                  theme="dark"
                  mode="date"
                  maximumDate={new Date()}
                  modal
                  open={showDatePicker}
                  date={new Date(transaction.date as Date)}
                  onConfirm={onDateChange}
                  onCancel={() => {
                    setShowDatePicker(false);
                  }}
                  title={"Select transaction Date"}
                />
              </View>
            )}

            {/* amount */}
            <View style={styles.inputContainer}>
              <Typo color={colors.neutral200} size={16}>
                Amount
              </Typo>
              <Input
                keyboardType="numeric"
                value={transaction.amount?.toString()}
                onChangeText={(value) => {
                  setTransaction((prev) => ({
                    ...prev,
                    amount: Number(value.replace(/[^0-9]/g, "")),
                  }));
                }}
              />
            </View>

            {/* description */}
            <View style={styles.inputContainer}>
              <View style={styles.flexRow}>
                <Typo color={colors.neutral200} size={16}>
                  Description
                </Typo>
                <Typo color={colors.neutral200} size={14}>
                  (optional)
                </Typo>
              </View>

              <Input
                multiline
                containerStyle={{
                  flexDirection: "row",
                  height: verticalScale(100),
                  alignItems: "flex-start",
                  paddingVertical: 15,
                }}
                value={transaction.description}
                onChangeText={(value) => {
                  setTransaction((prev) => ({
                    ...prev,
                    description: value,
                  }));
                }}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>
              Receipt
            </Typo>
            {/* image input */}
            <ImageUpload
              placeholder="Upload Image"
              onClear={() =>
                setTransaction((prev) => ({ ...prev, image: null }))
              }
              file={transaction.image}
              onSelect={(file) =>
                setTransaction((prev) => ({ ...prev, image: file }))
              }
            />
          </View>
        </ScrollView>
      </View>
      <View style={styles.footer}>
        {oldTransaction?.id && !loading && (
          <Button
            onPress={showDelteAlert}
            style={{
              backgroundColor: colors.rose,
              paddingHorizontal: spacingX._15,
            }}
          >
            <Icons.Trash
              color={colors.white}
              size={verticalScale(24)}
              weight="bold"
            />
          </Button>
        )}
        <Button loading={loading} style={{ flex: 1 }} onPress={onSubmit}>
          <Typo color={colors.black} fontWeight={"700"}>
            {oldTransaction?.id ? "Update" : "Submit"}
          </Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

export default TransactionModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  form: {
    gap: spacingY._20,
    paddingVertical: spacingY._15,
    paddingBottom: spacingY._40,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },
  inputContainer: {
    gap: spacingY._10,
  },
  iosDropDown: {
    flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
    fontSize: verticalScale(14),
    borderWidth: 1,
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
  },
  androidDropDown: {
    // flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    fontSize: verticalScale(14),
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    // paddingHorizontal: spacingX._15,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  dateInput: {
    flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
  },
  iosDatePicker: {
    // backgroundColor: "red",
  },
  datePickerButton: {
    backgroundColor: colors.neutral700,
    alignSelf: "flex-end",
    padding: spacingY._7,
    marginRight: spacingX._7,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._10,
  },
  dropdownContainer: {
    height: verticalScale(54),
    borderWidth: 1,
    borderColor: colors.neutral300,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._15,
    borderCurve: "continuous",
  },
  dropdownItemText: {
    color: colors.white,
  },
  dropdownSelectedText: {
    color: colors.white,
    fontSize: verticalScale(14),
  },
  dropdownListContainer: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderCurve: "continuous",
    paddingVertical: spacingY._7,
    top: 5,
    borderColor: colors.neutral500,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  dropdownPlaceholder: {
    color: colors.white,
  },
  dropdownItemContainer: {
    borderRadius: radius._15,
    marginHorizontal: spacingX._7,
  },
  dropdownIcon: {
    height: verticalScale(30),
    tintColor: colors.neutral300,
  },
});
