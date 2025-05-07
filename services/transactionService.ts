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
import { createOrUpdateWallet } from "./walletService";

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
      const oldTransactionSnapshot = await getDoc(
        doc(firestore, "transactions", id)
      );
      const oldTransaction = oldTransactionSnapshot.data() as TransactionType;

      const shouldRevertOriginal =
        oldTransaction.type !== type ||
        oldTransaction.walletId !== walletId ||
        oldTransaction.amount !== amount;

      if (shouldRevertOriginal) {
        let res = await revertAndUpdateWallets(
          oldTransaction,
          +amount,
          type,
          walletId
        );

        if (!res?.success) return res;
      }
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
    } else {
      transactionData.image = "";
    }

    const transactionRef = id
      ? doc(firestore, "transactions", id)
      : doc(collection(firestore, "transactions"));

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

    const updateWalletType =
      type === "income" ? "totalIncome" : "totalExpenses";
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

const revertAndUpdateWallets = async (
  oldTransaction: TransactionType,
  newTransactionAmount: number,
  newTransactionType: string,
  newWalletId: string
) => {
  try {
    // wallets reference
    const originalWalletSnapshot = await getDoc(
      doc(firestore, "wallets", oldTransaction.walletId)
    );

    const originalWallet = originalWalletSnapshot.data() as WalletType;

    let newWalletSnapshot = await getDoc(
      doc(firestore, "wallets", newWalletId)
    );

    let newWallet = newWalletSnapshot.data() as WalletType;

    // reverting the amount in wallets
    const revertType =
      oldTransaction.type === "income" ? "totalIncome" : "totalExpenses";

    const revertIncomeExpense: number =
      oldTransaction.type === "income"
        ? -Number(oldTransaction.amount)
        : Number(oldTransaction.amount);

    const revertedWalletAmount =
      Number(originalWallet.amount) + revertIncomeExpense;

    //wallet amount after the transaction is remvoed

    const revertTotalIncomeExpense =
      Number(originalWallet[revertType]) - +oldTransaction.amount;

    const isSameWallet = oldTransaction.walletId === newWalletId;

    if (newTransactionType === "expense") {
      //user  tries to conver income to expenses on the same wallet
      // if user  trues to increse the amount and dont have enough balace

      if (isSameWallet && revertedWalletAmount < newTransactionAmount) {
        return {
          success: false,
          message: "The selected wallet doesnt have enough balance",
        };
      }

      if (!isSameWallet && Number(newWallet.amount) < newTransactionAmount) {
        console.log("here");
        return {
          success: false,
          message: "The selected wallet doesnt have enough balance",
        };
      }

      // revert first
      await createOrUpdateWallet({
        id: oldTransaction.walletId,
        amount: revertedWalletAmount,
        [revertType]: revertTotalIncomeExpense,
      });

      // ///////////////////////////////////////////////

      // refetch the new wallet because might be updated recently
      newWalletSnapshot = await getDoc(doc(firestore, "wallets", newWalletId));

      newWallet = newWalletSnapshot.data() as WalletType;

      const updateType =
        newTransactionType === ("income" as any)
          ? "totalIncome"
          : "totalExpenses";

      const updatedTransactionAmount: number =
        newTransactionType === ("income" as any)
          ? Number(newTransactionAmount)
          : -Number(newTransactionAmount);

      const newWalletAmount =
        Number(newWallet.amount) + updatedTransactionAmount;

      const newTotalsIncomeExpense =
        Number(newWallet[updateType]) + Number(newTransactionAmount);

      await createOrUpdateWallet({
        id: newWalletId,
        amount: newWalletAmount,
        [updateType]: newTotalsIncomeExpense,
      });

      return {
        success: true,
        message: "updated",
      };
    }
  } catch (error: any) {
    console.log("Error updating wallet for new transcation", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};
