// Mobile Zone Category Data
export const mobileZoneCategory = {
  categoryName: "Mobile Zone",
  brands: [
    {
      brand: "Vivo",
      products: [
        { model: "Vivo Y05 (4+64)", price: 16999 },
        { model: "Vivo Y05 (4+128)", price: 18999 },
        { model: "Vivo Y11d (4+128)", price: 20999 },
        { model: "Vivo Y21d (6+128)", price: 26999 },
        { model: "Vivo Y21d (8+128)", price: 22999 },
        { model: "Vivo Y31d (6+128)", price: 28999 },
        { model: "Vivo Y31d (8+128)", price: 34999 },
        { model: "Vivo Y31d (8+256)", price: 36999 },
        { model: "Vivo Y500 (6+128)", price: 36999 },
        { model: "Vivo Y500 (6+256)", price: 43999 },
        { model: "Vivo V50 Lite (8GB+128GB)", price: 29999 },
        { model: "Vivo V50 Lite (8GB+256GB)", price: 32999 },
        { model: "Vivo V60 Lite (8GB+256GB)", price: 34999 },
        { model: "Vivo V60 Lite 5G (12GB+256GB)", price: 43999 },
        { model: "Vivo V50 5G (12+256)", price: 62999 },
        { model: "Vivo V60 5G (12+256)", price: 64999 },
        { model: "Vivo V70 FE (8+256)", price: 56999 },
        { model: "Vivo V70 FE (12+512)", price: 65999 },
        { model: "Vivo V70 (8+256)", price: 68999 },
        { model: "Vivo V70 (12+512)", price: 87999 }
      ]
    },
    {
      brand: "Redmi",
      products: [
        { model: "Xiaomi 17T (12+256)", price: 79999 },
        { model: "REDMI Note 15 Pro+ 5G (12+512)", price: 59999 },
        { model: "REDMI Note 15 Pro+ 5G (8+256)", price: 46999 },
        { model: "REDMI Note 15 5G (8+256)", price: 36999 },
        { model: "REDMI Note 15 (8+256)", price: 32999 },
        { model: "REDMI Note 15 (6+128)", price: 27999 },
        { model: "REDMI 17 (6+128)", price: 24999 },
        { model: "REDMI 17 (4+128)", price: 22999 },
        { model: "REDMI 15C (8+256)", price: 20999 },
        { model: "REDMI 15C (6+128)", price: 19999 },
        { model: "REDMI 15C (4+128)", price: 17999 },
        { model: "REDMI A7 Pro (4+64)", price: 16999 },
        { model: "REDMI A7 (3+64)", price: 14999 }
      ]
    },
    {
      brand: "Infinix",
      products: [
        { model: "Infinix Smart 10 (3/64)", price: 13999 },
        { model: "Infinix Smart 20 (4/64)", price: 15999 },
        { model: "Infinix Smart 20 (4/128)", price: 18999 },
        { model: "Infinix Hot 70 (4/128)", price: 20999 },
        { model: "Infinix Hot 70 (6/128)", price: 24999 },
        { model: "Infinix Hot 70 (8/128)", price: 25999 },
        { model: "Infinix Hot 70 Pro (8/128)", price: 36999 },
        { model: "Infinix Note EDGE 5G (8/128)", price: 30999 },
        { model: "Infinix Note EDGE 5G (8/256)", price: 34999 },
        { model: "Infinix Note 60 5G (8/256)", price: 44999 },
        { model: "Infinix Note 60 Pro 5G (8/256)", price: 49999 },
        { model: "Infinix Note 60 Pro+ 5G (12/256)", price: 54999 },
        { model: "Infinix GT 30 (8/256)", price: 30999 },
        { model: "Infinix X-PAD 20 (6/128)", price: 19999 },
        { model: "Infinix X-PAD 20 (8/256)", price: 22999 }
      ]
    }
  ]
};

export interface MobileBrandTab {
  id: string;
  nameBn: string;
  nameEn: string;
  brand: string;
  count: number;
  taglineBn: string;
  taglineEn: string;
  gradient: string;
  badgeBg: string;
}

export const MOBILE_BRAND_TABS: MobileBrandTab[] = [
  {
    id: "all",
    nameBn: "সব ব্র্যান্ড",
    nameEn: "All Brands",
    brand: "All",
    count: 48,
    taglineBn: "Vivo, Redmi ও Infinix-এর সকল মডেল অফিসিয়াল ওয়ারেন্টি সহ",
    taglineEn: "All Vivo, Redmi & Infinix models with official warranty",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    badgeBg: "bg-blue-600"
  },
  {
    id: "vivo",
    nameBn: "Vivo (ভিভো)",
    nameEn: "Vivo",
    brand: "Vivo",
    count: 20,
    taglineBn: "সুপার স্লিম ডিজাইন, অরা লাইট ক্যামেরা ও দীর্ঘস্থায়ী ব্যাটারি",
    taglineEn: "Ultra-slim design, Aura Light camera & long-lasting battery",
    gradient: "from-blue-600 to-cyan-600",
    badgeBg: "bg-blue-600"
  },
  {
    id: "redmi",
    nameBn: "Redmi (রেডমি)",
    nameEn: "Redmi",
    brand: "Redmi",
    count: 13,
    taglineBn: "সেরা পারফরম্যান্স, আল্ট্রা-ক্লিয়ার ক্যামেরা ও টার্বো চার্জিং",
    taglineEn: "Peak performance, ultra-clear display & turbo charging",
    gradient: "from-amber-600 to-orange-600",
    badgeBg: "bg-orange-600"
  },
  {
    id: "infinix",
    nameBn: "Infinix (ইনফিনিক্স)",
    nameEn: "Infinix",
    brand: "Infinix",
    count: 15,
    taglineBn: "স্মার্ট গেমিং স্পিড, বিগ ডিসপ্লে ও বাজেট ফ্রেন্ডলি পাওয়ার",
    taglineEn: "High refresh gaming, monster battery & extreme value",
    gradient: "from-emerald-600 to-teal-700",
    badgeBg: "bg-emerald-600"
  }
];

// Curated smartphone images for high fidelity presentation
const VIVO_IMAGES = [
  "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511707171634-5f897ff02540?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80"
];

const REDMI_IMAGES = [
  "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&auto=format&fit=crop&q=80"
];

const INFINIX_IMAGES = [
  "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80"
];

export interface RawMobileProduct {
  id: string;
  nameBn: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  unitBn: string;
  unitEn: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  image: string;
  rating: number;
  stock: number;
  descriptionBn: string;
  descriptionEn: string;
  isPopular?: boolean;
  isNewArrival?: boolean;
  isBestSelling?: boolean;
  tags: string[];
  specs?: string;
  displayOrder: number;
  order: number;
}

// Convert structured dataset into flat raw product list
export const MOBILE_ZONE_RAW: RawMobileProduct[] = [];

let orderCounter = 1;

mobileZoneCategory.brands.forEach((brandGroup) => {
  const brandName = brandGroup.brand;
  const subcategoryKey = brandName.toLowerCase();

  brandGroup.products.forEach((item, index) => {
    const id = `mob_${subcategoryKey}_${String(index + 1).padStart(2, "0")}`;
    const model = item.model;
    const price = item.price;
    // Suggest a realistic MSRP for originalPrice (5-10% higher for savings display)
    const originalPrice = Math.round((price * 1.07) / 100) * 100 - 1;

    let image = "";
    if (subcategoryKey === "vivo") {
      image = VIVO_IMAGES[index % VIVO_IMAGES.length];
    } else if (subcategoryKey === "redmi") {
      image = REDMI_IMAGES[index % REDMI_IMAGES.length];
    } else {
      // If tablet model (X-PAD), use tablet image
      if (model.toLowerCase().includes("pad")) {
        image = "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80";
      } else {
        image = INFINIX_IMAGES[index % INFINIX_IMAGES.length];
      }
    }

    const is5G = model.includes("5G");
    const isPro = model.includes("Pro");
    const isPad = model.toLowerCase().includes("pad");

    const brandNameBn = brandName === "Vivo" ? "ভিভো" : brandName === "Redmi" ? "রেডমি" : "ইনফিনিক্স";
    const nameBn = `${brandNameBn} ${model}`;

    const descBn = `১০০% অরিজিনাল অফিশিয়াল ${brandName} ব্র্যান্ডের স্মার্টফোন। ১ বছরের অফিশিয়াল ব্র্যান্ড ওয়ারেন্টি এবং অরিজিনাল ফাস্ট চার্জার সহ সিল প্যাক। দ্রুত হোম ডেলিভারি ও চেক করে পেমেন্ট করার সুবিধা।`;
    const descEn = `100% Genuine Official ${brandName} Smartphone. Comes factory sealed with 1-Year Official Brand Warranty, fast charger & full accessories. Fast doorstep delivery available.`;

    MOBILE_ZONE_RAW.push({
      id,
      nameBn,
      nameEn: model,
      model,
      brand: brandName,
      price,
      originalPrice,
      unitBn: isPad ? "১টি ট্যাবলেট" : "১টি স্মার্টফোন",
      unitEn: isPad ? "1 Tablet" : "1 Phone",
      category: "mobile-zone",
      subcategory: subcategoryKey,
      image,
      rating: parseFloat((4.7 + (index % 4) * 0.08).toFixed(1)),
      stock: 12 + (index % 15),
      isPopular: index < 4 || is5G,
      isNewArrival: index === 0 || is5G || isPro,
      isBestSelling: index === 1 || index === 2 || price < 25000,
      descriptionBn: descBn,
      descriptionEn: descEn,
      specs: is5G ? "5G Network" : "4G LTE",
      tags: ["mobile", "smartphone", brandName.toLowerCase(), "mobile-zone", is5G ? "5g" : "4g"],
      displayOrder: orderCounter,
      order: orderCounter
    });

    orderCounter++;
  });
});
