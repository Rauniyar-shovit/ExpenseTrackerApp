import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { TransactionListType } from "@/types";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Typo from "./Typo";
import { FlashList } from "@shopify/flash-list";
import TransactionItem from "./TransactionItem";
import Loading from "./Loading";
const TransactionList = ({
  data,
  title,
  loading,
  emptyListMessage,
}: TransactionListType) => {
  const handleClick = () => {
    // todo: open transaction details
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
