import { firestore } from "@/config/firebase";
import { ResponseType, TransactionType, WalletType } from "@/types";
import {
  and,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "./imageServices";
import { createOrUpdateWallet } from "./walletService";
import { getLast12Months, getLast7Days, getYearsRange } from "@/utils/common";
import { transactionTypes } from "@/constants/data";
import { scale } from "@/utils/styling";
import { colors } from "@/constants/theme";

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
    console.log("🚀 ~ revertType:", revertType);
    console.log("🚀 ~ revertIncomeExpense:", revertIncomeExpense);
    console.log("🚀 ~ revertedWalletAmount:", revertedWalletAmount);

    const revertTotalIncomeExpense =
      Number(originalWallet[revertType]) - +oldTransaction.amount;

    const isSameWallet = oldTransaction.walletId === newWalletId;

    console.log("🚀 ~ isSameWallet:", isSameWallet);

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
    }
    return {
      success: true,
      message: "updated",
    };
  } catch (error: any) {
    console.log("Error updating wallet for new transcation", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

export const deleteTransaction = async (
  transactionId: string,
  walletId: string
): Promise<ResponseType> => {
  try {
    const transactionRef = doc(firestore, "transactions", transactionId);
    const transactionSnapshot = await getDoc(transactionRef);
    const transactionData = transactionSnapshot.data() as TransactionType;

    if (!transactionSnapshot.exists()) {
      return {
        success: false,
        message: "Transcation not found",
      };
    }

    const transactionType = transactionData?.type;
    const transactionAmount = transactionData?.amount;

    // fetch the walllet to update amount, totalIncome or totalExpense

    const walletSnapshot = await getDoc(doc(firestore, "wallets", walletId));
    const walletData = walletSnapshot.data() as WalletType;

    // check fields to be updated based on transaction type
    const updateType =
      transactionType === "income" ? "totalIncome" : "totalExpenses";

    const newWalletAmount =
      Number(walletData?.amount) +
      (transactionType === "income" ? -transactionAmount : transactionAmount);

    const newIncomeExpenseAmount = walletData[updateType]! - transactionAmount;

    if (transactionType === "income" && newWalletAmount < 0) {
      return {
        success: false,
        message: "you cannot delete this transaction",
      };
    }

    await createOrUpdateWallet({
      id: walletId,
      amount: newWalletAmount,
      [updateType]: newIncomeExpenseAmount,
    });

    await deleteDoc(transactionRef);

    return { success: true, message: "Transaction Deleted" };
  } catch (error: any) {
    console.log("error ");
    return {
      success: false,
      message: error.message,
    };
  }
};

export const fetchWeeklyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const transactionQuery = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(sevenDaysAgo)),
      where("date", "<=", Timestamp.fromDate(today)),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);

    const weeklyData = getLast7Days();
    const transactions: TransactionType[] = [];

    // mapping each tranasactions
    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;

      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionDate = (transaction.date as Timestamp)
        .toDate()
        .toISOString()
        .split("T")[0]; // as specific date

      const dayData = weeklyData.find((day) => day.date == transactionDate);

      if (dayData) {
        if (transaction.type == "income") {
          dayData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          dayData.expense += transaction.amount;
        }
      }
    });

    // takes each day and creates two entries
    const stats = weeklyData.flatMap((day) => [
      {
        value: day.income,
        label: day.day,
        spacing: scale(4),
        labelWidth: scale(30),
        frontColor: colors.primary,
      },
      {
        value: day.expense,
        frontColor: colors.rose,
      },
    ]);

    return { success: true, data: { stats, transactions } };
  } catch (error: any) {
    console.log("error ");
    return {
      success: false,
      message: error.message,
    };
  }
};

export const fetchMonthlyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setDate(today.getDate() - 7);

    const transactionQuery = query(
      collection(db, "transactions"),
      where("date", ">=", Timestamp.fromDate(twelveMonthsAgo)),
      where("date", "<=", Timestamp.fromDate(today)),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);

    const monthlyData = getLast12Months();
    const transactions: TransactionType[] = [];

    // mapping each tranasactions
    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;

      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionDate = (transaction.date as Timestamp).toDate();

      const monthName = transactionDate.toLocaleString("default", {
        month: "short",
      });
      const shortYear = transactionDate.getFullYear().toString().slice(-2);
      const monthData = monthlyData.find(
        (month) => month.month === `${monthName} ${shortYear}`
      );

      if (monthData) {
        if (transaction.type == "income") {
          monthData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          monthData.expense += transaction.amount;
        }
      }
    });

    // takes each day and creates two entries
    const stats = monthlyData.flatMap((month) => [
      {
        value: month.income,
        label: month.month,
        spacing: scale(4),
        labelWidth: scale(30),
        frontColor: colors.primary,
      },
      {
        value: month.expense,
        frontColor: colors.rose,
      },
    ]);

    return { success: true, data: { stats, transactions } };
  } catch (error: any) {
    console.log("error ");
    return {
      success: false,
      message: error.message,
    };
  }
};

export const fetYearlyStats = async (uid: string): Promise<ResponseType> => {
  try {
    const db = firestore;

    const transactionQuery = query(
      collection(db, "transactions"),
      orderBy("date", "desc"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(transactionQuery);

    const transactions: TransactionType[] = [];

    const firstTransaction = querySnapshot.docs.reduce((earliest, doc) => {
      const transactionDate = doc.data().date.toDate();
      return transactionDate < earliest ? transactionDate : earliest;
    }, new Date());

    const firstYear = firstTransaction.getFullYear();
    const currentYear = new Date().getFullYear();

    const yearlyData = getYearsRange(firstYear, currentYear);

    // mapping each tranasactions
    querySnapshot.forEach((doc) => {
      const transaction = doc.data() as TransactionType;

      transaction.id = doc.id;
      transactions.push(transaction);

      const transactionYear = (transaction.date as Timestamp)
        .toDate()
        .getFullYear();

      const yearData = yearlyData.find(
        (item: any) => item.year === transactionYear.toString()
      );

      if (yearData) {
        if (transaction.type == "income") {
          yearData.income += transaction.amount;
        } else if (transaction.type == "expense") {
          yearData.expense += transaction.amount;
        }
      }
    });

    // takes each day and creates two entries
    const stats = yearlyData.flatMap((year: any) => [
      {
        value: year.income,
        label: year.year,
        spacing: scale(4),
        labelWidth: scale(35),
        frontColor: colors.primary,
      },
      {
        value: year.expense,
        frontColor: colors.rose,
      },
    ]);

    return { success: true, data: { stats, transactions } };
  } catch (error: any) {
    console.log("error ");
    return {
      success: false,
      message: error.message,
    };
  }
};
