import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { TransactionListType, TransactionType } from "@/types";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Typo from "./Typo";
import { FlashList } from "@shopify/flash-list";
import TransactionItem from "./TransactionItem";
import Loading from "./Loading";
import { useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";
const TransactionList = ({
  data,
  title,
  loading,
  emptyListMessage,
}: TransactionListType) => {
  const router = useRouter();

  const handleClick = (item: TransactionType) => {
    router.push({
      pathname: "/(modals)/transactionModal",
      params: {
        id: item?.id,
        type: item?.type,
        amount: item?.amount?.toString(),
        category: item?.category,
        date: (item?.date as Timestamp)?.toDate()?.toISOString(),
        description: item?.description,
        image: item?.image,
        uid: item?.uid,
        walletId: item?.walletId,
      },
    });
  };

  const displayEmptyListMessage = !loading && data?.length === 0 && (
    <Typo
      size={15}
      color={colors.neutral400}
      style={{ textAlign: "center", marginTop: spacingY._15 }}
    >
      {emptyListMessage}
    </Typo>
  );

  const displayLoading = loading && (
    <View style={{ top: verticalScale(100) }}>
      <Loading />
    </View>
  );
  return (
    <View style={styles.container}>
      {title && (
        <Typo size={20} fontWeight="500">
          {title}
        </Typo>
      )}

      <View style={styles.list}>
        <FlashList
          data={data}
          renderItem={({ item, index }) => (
            <TransactionItem
              item={item}
              index={index}
              handleClick={handleClick}
            />
          )}
          estimatedItemSize={60}
        />
      </View>

      {displayEmptyListMessage}

      {displayLoading}
    </View>
  );
};

export default TransactionList;

const styles = StyleSheet.create({
  container: {
    gap: spacingY._17,
  },
  list: {
    minHeight: 3,
  },
});
