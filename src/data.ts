import { Category, Product, PromoBanner, Recipe, Review } from "./types";
import { CATEGORIES as NEW_CATEGORIES } from "./data/categories";
import { ALL_PRODUCTS } from "./data/all_products";

export const CATEGORIES: Category[] = NEW_CATEGORIES;
export const PRODUCTS: Product[] = ALL_PRODUCTS;

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "b1",
    titleBn: "সরাসরি মাঠ থেকে আপনার রান্নাঘরে",
    titleEn: "Directly from Farms to Your Kitchen",
    subtitleBn: "১০-১৫ মিনিটে দ্রুত ডেলিভারি, একদম সতেজ এবং খাঁটি গ্যারান্টি",
    subtitleEn: "15-minute express delivery of fresh organic produce",
    tagBn: "ফ্ল্যাশ ক্যাম্পেইন",
    tagEn: "FLASH CAMPAIGN",
    discountBn: "২৫% পর্যন্ত মেগা ছাড়",
    discountEn: "UP TO 25% MEGA SAVINGS",
    bgGradient: "from-emerald-700 via-teal-600 to-green-700",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "b2",
    titleBn: "পদ্মার রূপালী ইলিশ উৎসব চলছে!",
    titleEn: "Padma River Hilsha Festival!",
    subtitleBn: "নদী থেকে ধৃত সরাসরি ইলিশ, স্বাদে ও আকৃতিতে শতভাগ খাঁটি",
    subtitleEn: "Authentic river-caught Silver Hilsha with unmatched flavor",
    tagBn: "সরাসরি সোর্স",
    tagEn: "DIRECTLY SOURCED",
    discountBn: "ফ্ল্যাট ১২% সরাসরি ছাড়",
    discountEn: "FLAT 12% INSTANT DISCOUNT",
    bgGradient: "from-indigo-700 via-blue-600 to-cyan-700",
    image: "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "b3",
    titleBn: "রাজশাহীর মিষ্টি হিমসাগর আমমেলা",
    titleEn: "Sweet & Luscious Himsagar Mango Fest",
    subtitleBn: "১০০% ফরমালিন ও রাসায়নিক মুক্ত গাছের পাকা আম",
    subtitleEn: "100% chemicals-free naturally tree-ripened sweet mangoes",
    tagBn: "আমের মৌসুম",
    tagEn: "MANGO MANIA",
    discountBn: "১৮% সরাসরি মূল্যছাড়",
    discountEn: "UP TO 18% DIRECT CUT",
    bgGradient: "from-orange-600 via-amber-500 to-yellow-600",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "b4",
    titleBn: "উইকেন্ড ফ্যামিলি গ্রোসারি মেলা",
    titleEn: "Weekend Family Grocery Fair",
    subtitleBn: "চাল, ডাল, তেল ও ডিমের বাজারে বিশেষ ছাড়",
    subtitleEn: "Massive savings on everyday staple household essentials",
    tagBn: "সাপ্তাহিক বাজার",
    tagEn: "WEEKLY BAZAR",
    discountBn: "সর্বোচ্চ ৩০০ টাকা ক্যাশব্যাক",
    discountEn: "UP TO BDT 300 CASHBACK",
    bgGradient: "from-rose-700 via-red-600 to-pink-700",
    image: "https://images.unsplash.com/photo-1506617498319-3310023a1a01?auto=format&fit=crop&w=800&q=80"
  }
];

export const RECIPES: Recipe[] = [
  {
    id: "r1",
    nameBn: "ঐতিহ্যবাহী সরিষা ইলিশ",
    nameEn: "Traditional Shorshe Ilish",
    prepTimeBn: "২৫ মিনিট",
    prepTimeEn: "25 Mins",
    difficultyBn: "সহজ",
    difficultyEn: "Easy",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    ingredients: [
      { productId: "fi1", nameBn: "পদ্মার ইলিশ মাছ", nameEn: "Padma Hilsha Fish", amountBn: "৫০০ গ্রাম", amountEn: "500g" },
      { productId: "sp2", nameBn: "খাঁটি সয়াবিন/সরিষার তেল", nameEn: "Pure Oil", amountBn: "৪ টেবিল চামচ", amountEn: "4 tbsp" },
      { productId: "sp11", nameBn: "ঝাল কাঁচা মরিচ", nameEn: "Green Chilli", amountBn: "৬-৭ টি", amountEn: "6-7 pcs" }
    ],
    instructionsBn: [
      "প্রথমে ইলিশের টুকরোগুলো ধুয়ে সামান্য হলুদ ও লবণ মেখে রাখুন।",
      "সরিষা দানা, কাঁচা মরিচ এবং এক চিমটি লবণ একসাথে পিষে পেস্ট বানিয়ে নিন।",
      "একটি কড়াইতে সরিষার তেল গরম করে তাতে কালোজিরা ও কাঁচা মরিচের ফোড়ন দিন।",
      "এবার সরিষা পেস্ট এবং সামান্য পানি দিয়ে কষিয়ে মাছের টুকরোগুলো ছাড়ুন।",
      "হালকা আঁচে ১০ মিনিট ঢাকা দিয়ে রান্না করুন। উপরে কাঁচা তেল ও মরিচ ছড়িয়ে নামান।"
    ],
    instructionsEn: [
      "Wash Hilsha steaks and marinate with a pinch of turmeric powder and salt.",
      "Blend mustard seeds, green chillies, and a pinch of salt with water into a smooth paste.",
      "Heat pure mustard oil in a pan, add nigella seeds and green chillies.",
      "Add the mustard paste and a bit of water, then gently place the fish steaks.",
      "Cover and simmer on low-medium heat for 10 minutes. Drizzle fresh oil on top and serve hot."
    ]
  }
];

export const REVIEWS: Review[] = [
  {
    id: "v1",
    userName: "তানজিম আহমেদ",
    rating: 5,
    commentBn: "মাত্র ১২ মিনিটে ধানমন্ডি এলাকায় সতেজ টমেটো ও ইলিশ পেয়েছি! প্যাকেজিং ও ডেলিভারি বয় খুব আন্তরিক ছিল। ৫ স্টারের দাবিদার।",
    commentEn: "Received fresh tomatoes and Hilsha in Dhanmondi in just 12 mins! Superb packaging and extremely courteous rider. 5-stars!",
    date: "July 10, 2026"
  },
  {
    id: "v2",
    userName: "ফারজানা শারমিন",
    rating: 5,
    commentBn: "কাচা বাজার অ্যাপের সরিষা ইলিশ রেসিপির সব উপকরণ এক ক্লিকে অর্ডার করেছি এবং তা দিয়ে চমৎকার রান্না করেছি। এই ফিচারটা খুবই দারুণ!",
    commentEn: "Ordered all Shorshe Ilish ingredients with a single click via their recipe corner. Feature is incredibly convenient and smart!",
    date: "July 11, 2026"
  },
  {
    id: "v3",
    userName: "মাহমুদ হাসান",
    rating: 4,
    commentBn: "হিমসাগর আমগুলো আসলেই মিষ্টি এবং ফরমালিন মুক্ত। তবে ব্রেডের স্টক শেষ হয়ে গিয়েছিল। আশা করি অতি দ্রুত স্টক বৃদ্ধি করা হবে।",
    commentEn: "Mangoes are genuinely sweet and fresh. Highly recommended. Out of stock for brown bread once, but customer support was very helpful.",
    date: "July 12, 2026"
  }
];
