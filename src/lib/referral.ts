import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  setDoc, 
  addDoc, 
  increment, 
  serverTimestamp 
} from "./firebase";

/**
 * Checks all conditions of the Kacha Bazar Refer & Earn reward policy:
 * - The referred user's account must be verified (isVerified == true).
 * - Total value of successfully completed orders (delivered) must be >= ৳500.
 * - Self-referral is not allowed.
 * - Duplicate accounts (by email or phone) are not allowed.
 * - Only triggers once per referred user.
 */
export async function checkAndRewardReferral(referredUserId: string) {
  try {
    console.log(`Checking referral status for referred user: ${referredUserId}`);
    
    // 1. Fetch the referred user details
    const userRef = doc(db, "users", referredUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn("Referred user not found:", referredUserId);
      return;
    }
    const referredUser = userSnap.data();

    // 2. Check if the referred user's account is verified
    if (!referredUser.isVerified) {
      console.log(`Referred user ${referredUserId} is not verified yet. Reward skipped.`);
      return;
    }

    // 3. Find if there is a pending referral where this user is the referred friend
    const refQuery = query(
      collection(db, "referrals"),
      where("referredId", "==", referredUserId),
      where("bonusPaid", "==", false)
    );
    const refSnap = await getDocs(refQuery);
    if (refSnap.empty) {
      console.log(`No pending, unpaid referral found for referred user ${referredUserId}.`);
      return;
    }

    const refDoc = refSnap.docs[0];
    const refData = refDoc.data();
    const referrerId = refData.referrerId;

    // 4. Validate that self-referral is not allowed
    if (referrerId === referredUserId) {
      console.warn(`Self-referral detected and blocked for user: ${referredUserId}`);
      await updateDoc(doc(db, "referrals", refDoc.id), {
        status: "invalid_self_referral",
        updatedAt: serverTimestamp()
      });
      return;
    }

    // 5. Duplicate account check: Check if there is another user with the same phone or email
    let hasDuplicate = false;
    if (referredUser.phoneNumber) {
      const dupPhoneQuery = query(
        collection(db, "users"),
        where("phoneNumber", "==", referredUser.phoneNumber)
      );
      const dupPhoneSnap = await getDocs(dupPhoneQuery);
      if (dupPhoneSnap.docs.some(doc => doc.id !== referredUserId)) {
        hasDuplicate = true;
      }
    }
    if (referredUser.email && !hasDuplicate) {
      const dupEmailQuery = query(
        collection(db, "users"),
        where("email", "==", referredUser.email)
      );
      const dupEmailSnap = await getDocs(dupEmailQuery);
      if (dupEmailSnap.docs.some(doc => doc.id !== referredUserId)) {
        hasDuplicate = true;
      }
    }

    if (hasDuplicate) {
      console.warn(`Duplicate account detected for user: ${referredUserId}. Referral blocked.`);
      await updateDoc(doc(db, "referrals", refDoc.id), {
        status: "invalid_duplicate",
        updatedAt: serverTimestamp()
      });
      return;
    }

    // 6. Calculate total value of successfully completed orders (orderStatus == "delivered")
    const ordersQuery = query(
      collection(db, "orders"),
      where("customerId", "==", referredUserId),
      where("orderStatus", "==", "delivered")
    );
    const ordersSnap = await getDocs(ordersQuery);
    let totalDeliveredAmount = 0;
    ordersSnap.forEach((doc) => {
      const data = doc.data();
      totalDeliveredAmount += Number(data.total || data.totalAmount || data.grandTotal || 0);
    });

    console.log(`Referred user ${referredUserId} total delivered orders value: ৳${totalDeliveredAmount}`);

    // Must reach total of at least ৳500
    if (totalDeliveredAmount < 500) {
      console.log(`Delivered orders total (৳${totalDeliveredAmount}) is less than ৳500 threshold. Reward skipped.`);
      return;
    }

    // 7. Award the bonus! Credit ৳50 to the referrer's Wallet.
    console.log(`All criteria met! Awarding ৳50 referral bonus to referrer ${referrerId} for referring user ${referredUserId}`);

    // Mark referral as completed and bonus paid
    await updateDoc(doc(db, "referrals", refDoc.id), {
      status: "completed",
      bonusPaid: true,
      rewardAmount: 50,
      updatedAt: serverTimestamp()
    });

    // Pay the referrer 50 TK bonus in their wallet
    const referrerWalletRef = doc(db, "wallet", referrerId);
    const referrerWalletSnap = await getDoc(referrerWalletRef);
    if (referrerWalletSnap.exists()) {
      await updateDoc(referrerWalletRef, {
        balance: increment(50),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(referrerWalletRef, {
        userId: referrerId,
        balance: 50,
        updatedAt: serverTimestamp()
      });
    }

    // Log transaction for the referrer
    const txId = "ref_reward_" + referredUserId;
    await setDoc(doc(db, "transactions", txId), {
      id: txId,
      userId: referrerId,
      type: "referral_bonus",
      amount: 50,
      description: `Received ৳50 referral bonus because your referred friend (${referredUser.displayName || "Friend"}) completed their ৳500+ delivered orders milestone!`,
      createdAt: serverTimestamp(),
      referenceId: referredUserId
    });

    // Send system notification to the referrer
    await addDoc(collection(db, "notifications"), {
      userId: referrerId,
      titleBn: "রেফারেল বোনাস অর্জিত!",
      titleEn: "Referral Bonus Earned!",
      messageBn: `আপনার বন্ধু (${referredUser.displayName || "বন্ধু"}) কমপক্ষে ৳৫০০ টাকার সফল অর্ডার সম্পন্ন করায় আপনার ওয়ালেটে ৳৫০ যোগ করা হয়েছে।`,
      messageEn: `৳50 referral reward has been added to your wallet because your friend (${referredUser.displayName || "friend"}) completed ৳500+ of delivered orders.`,
      isRead: false,
      createdAt: serverTimestamp()
    });

    // Send system notification to the referred user (friend)
    await addDoc(collection(db, "notifications"), {
      userId: referredUserId,
      titleBn: "রেফারেল লক্ষ্য সম্পন্ন!",
      titleEn: "Referral Goal Reached!",
      messageBn: "অভিনন্দন! আপনি সফলভাবে কমপক্ষে ৳৫০০ টাকার সফল অর্ডার সম্পন্ন করায় আপনার রেফারেল লক্ষ্য অর্জিত হয়েছে।",
      messageEn: "Congratulations! You have successfully completed ৳500+ of delivered orders, fulfilling your referral milestone.",
      isRead: false,
      createdAt: serverTimestamp()
    });

    console.log("Referral reward successfully processed!");
  } catch (err: any) {
    if (!err?.message?.includes("offline")) {
      console.warn("Notice in checkAndRewardReferral:", err?.message || err);
    }
  }
}
