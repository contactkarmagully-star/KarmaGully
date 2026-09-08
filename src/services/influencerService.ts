import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  increment,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Influencer, Order } from '../types';
import { dataCache } from '../lib/dataCache';

const COLLECTION_NAME = 'influencers';

export async function getAllInfluencers(): Promise<Influencer[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Influencer;
      return { 
        ...data, 
        id: doc.id,
        code: data.code || doc.id,
        clicks: data.clicks || 0 
      };
    });
  } catch (error) {
    return handleFirestoreError(error, 'list', COLLECTION_NAME);
  }
}

export async function addInfluencer(influencer: Influencer) {
  try {
    const cleanId = influencer.code.trim().toLowerCase();
    const docRef = doc(db, COLLECTION_NAME, cleanId);
    
    // Check if influencer with this code already exists
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      throw new Error(`An influencer with referral code "${cleanId}" already exists.`);
    }

    const newInfluencer: Influencer = {
      ...influencer,
      id: cleanId,
      code: cleanId,
      couponCode: influencer.couponCode.toUpperCase().trim(),
      clicks: 0,
      createdAt: Date.now()
    };

    await setDoc(docRef, newInfluencer);
    dataCache.clear();
  } catch (error) {
    return handleFirestoreError(error, 'create', COLLECTION_NAME);
  }
}

export async function updateInfluencer(id: string, data: Partial<Influencer>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id.toLowerCase());
    const payload = { ...data };
    if (payload.couponCode) {
      payload.couponCode = payload.couponCode.toUpperCase().trim();
    }
    await updateDoc(docRef, payload);
    dataCache.clear();
  } catch (error) {
    return handleFirestoreError(error, 'update', `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteInfluencer(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id.toLowerCase()));
    dataCache.clear();
  } catch (error) {
    return handleFirestoreError(error, 'delete', `${COLLECTION_NAME}/${id}`);
  }
}

export async function getInfluencerByCode(code: string): Promise<Influencer | null> {
  try {
    const cleanCode = code.trim().toLowerCase();
    const docRef = doc(db, COLLECTION_NAME, cleanCode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Influencer;
      return { 
        ...data, 
        id: docSnap.id,
        code: data.code || docSnap.id,
        clicks: data.clicks || 0 
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting influencer:", error);
    return null;
  }
}

export async function trackInfluencerClick(code: string) {
  try {
    const cleanCode = code.trim().toLowerCase();
    const docRef = doc(db, COLLECTION_NAME, cleanCode);
    await updateDoc(docRef, {
      clicks: increment(1)
    });
  } catch (error) {
    console.error("Error incrementing influencer clicks:", error);
  }
}

export interface InfluencerStats {
  salesCount: number;
  totalRevenue: number;
  totalCommission: number;
  unpaidCommission: number;
}

export async function getInfluencerPerformance(code: string): Promise<{ stats: InfluencerStats, orders: Order[] }> {
  try {
    const cleanCode = code.trim().toLowerCase();
    const ordersQuery = query(
      collection(db, 'orders'), 
      where('influencerCode', '==', cleanCode),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(ordersQuery);
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

    let salesCount = 0;
    let totalRevenue = 0;
    let totalCommission = 0;
    let unpaidCommission = 0;

    orders.forEach(order => {
      // Only count successful/pending/delivered orders. Failures are excluded.
      if (order.paymentStatus !== 'Failed') {
        salesCount++;
        totalRevenue += order.totalAmount;
        const comm = order.influencerCommission || 0;
        totalCommission += comm;
        if (!order.influencerCommissionPaid) {
          unpaidCommission += comm;
        }
      }
    });

    return {
      stats: {
        salesCount,
        totalRevenue,
        totalCommission,
        unpaidCommission
      },
      orders
    };
  } catch (error) {
    console.error("Error getting influencer performance:", error);
    return {
      stats: { salesCount: 0, totalRevenue: 0, totalCommission: 0, unpaidCommission: 0 },
      orders: []
    };
  }
}
