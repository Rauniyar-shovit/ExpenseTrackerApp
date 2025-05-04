import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import { and, doc, getDoc, updateDoc } from "firebase/firestore";

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
      // update wallet for new transaction
    }
    return {
      success: true,
      message: "Transaction created successfully",
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
