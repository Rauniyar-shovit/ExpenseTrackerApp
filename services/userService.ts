import { firestore } from "@/config/firebase";
import { ResponseType, UserDataType } from "@/types";
import { doc, updateDoc } from "firebase/firestore";

export const updateUser = async (
  uid: string,
  updatedData: UserDataType
): Promise<ResponseType> => {
  try {
    const userRef = doc(firestore, "users", uid);
    await updateDoc(userRef, updatedData);

    // image upload pending
    return { success: true, message: "updated successfully" };
    return {
      success: true,
    };
  } catch (error: any) {
    console.log("error updateing user: ", error);
    return {
      success: false,
      message: error?.message,
    };
  }
};
