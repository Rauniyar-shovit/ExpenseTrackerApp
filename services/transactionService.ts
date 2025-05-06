import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import {
  and,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageServices";

export const createOrUpdateTransaction = async (
  transactionData: Partial<TransactionType>
): Promise<ResponseType> => {
  try {
    const {
      id,
      type,
      amount,
      category,
      date,
      description,
      image,
      uid,
      walletId,
    } = transactionData;

    if (!amount || amount <= 0 || !walletId || !type || !date) {
      return {
        success: false,
        message: "Invalid transaction data",
      };
    }

    if (id) {
      // to do update transaction existing
    } else {
      let res = await updateWalletForNewTransaction(
        walletId,
        Number(amount),
        type
      );

      if (!res.success) {
        return res;
      }
    }

    if (image) {
      const imageUploadRes = await uploadFileToCloudinary(
        image,
        "transactions"
      );

      if (!imageUploadRes.success) {
        return {
          success: false,
          message: imageUploadRes.message || "Failed to upload image",
        };
      }

      transactionData.image = imageUploadRes.data;
    }

    const transactionRef = id
      ? doc(firestore, "transaction", id)
      : doc(collection(firestore, "transaction"));

    await setDoc(transactionRef, transactionData, { merge: true });

    return {
      success: true,
      data: { ...transactionData, id: transactionRef.id },
    };
  } catch (error: any) {
    console.log("Error creating or updating transacting", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

const updateWalletForNewTransaction = async (
  walletId: string,
  amount: number,
  type: string
) => {
  try {
    const walletRef = await doc(firestore, "wallets", walletId);
    const walletSnapshot = await getDoc(walletRef);

    if (!walletSnapshot.exists()) {
      console.log("Error updating wallet for new transcation");
      return {
        success: false,
        message: "Wallet not found",
      };
    }

    const walletData = walletSnapshot.data() as WalletType;

    if (type === "expense" && walletData?.amount! - amount < 0) {
      return {
        success: false,
        message: "Not enough balance in wallet",
      };
    }

    const updateWalletType = type === "income" ? "totalIcome" : "totalExpenses";
    const updatedWalletAmount =
      type === "income"
        ? Number(walletData?.amount) + amount
        : Number(walletData?.amount) - amount;

    const updatedWalletTotals =
      type === "income"
        ? Number(walletData?.totalIncome) + amount
        : Number(walletData?.totalExpenses) + amount;

    await updateDoc(walletRef, {
      amount: updatedWalletAmount,
      [updateWalletType]: updatedWalletTotals,
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.log("Error updating wallet for new transcation", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};
