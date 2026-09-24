export interface RawVehicleProduct {
  id: string;
  nameBn: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  unitBn: string;
  unitEn: string;
  category: string;
  subcategory: string;
  image: string;
  rating: number;
  stock: number;
  descriptionBn: string;
  descriptionEn: string;
  isPopular?: boolean;
  isNewArrival?: boolean;
  tags: string[];
}

export const VEHICLE_SUBCATEGORIES = [
  { id: "all", nameBn: "সকল যানবাহন", nameEn: "All Vehicles" },
  { id: "ambulance", nameBn: "অ্যাম্বুলেন্স সার্ভিস", nameEn: "Ambulance" },
  { id: "microbus", nameBn: "মাইক্রোবাস সার্ভিস", nameEn: "Microbus" },
  { id: "bus", nameBn: "বাস সার্ভিস", nameEn: "Bus Rental" },
  { id: "auto", nameBn: "অটো সার্ভিস", nameEn: "Battery Auto" },
  { id: "van", nameBn: "ভ্যান সার্ভিস", nameEn: "Van Service" },
  { id: "cng", nameBn: "সিএনজি সার্ভিস", nameEn: "CNG Service" },
  { id: "pickup", nameBn: "মিনি পিক আপ ট্রাক", nameEn: "Mini Pickup Truck" },
  { id: "car", nameBn: "প্রাইভেট কার", nameEn: "Private Sedan" }
];

export const VEHICLES_RAW: RawVehicleProduct[] = [
  {
    id: "veh_01",
    nameBn: "২৪/৭ জরুরি এসি অ্যাম্বুলেন্স সার্ভিস (অক্সিজেন ও আইসিইউ সুবিধা)",
    nameEn: "24/7 Emergency AC Ambulance Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "ambulance",
    image: "https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=600&auto=format&fit=crop&q=80",
    rating: 4.9,
    stock: 12,
    isPopular: true,
    descriptionBn: "সার্বক্ষণিক জরুরি রোগী পরিবহনে মেডিকেল অক্সিজেন সিলিন্ডার, আধুনিক স্ট্রেচার, সম্পূর্ণ এসি ও প্যারামেডিক সাপোর্টসহ অ্যাম্বুলেন্স সার্ভিস। ঢাকা, রাজশাহী, বগুড়া বা দেশের যেকোনো হাসপাতালে দ্রুত ও নিরাপদে পৌঁছে দেওয়ার বিশ্বস্ত সেবা। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "24/7 emergency patient transport with medical oxygen, modern stretcher, and full AC support to any hospital across Bangladesh. Fare is negotiable.",
    tags: ["অ্যাম্বুলেন্স", "জরুরি", "রোগী পরিবহন", "ambulance", "emergency", "vehicles"]
  },
  {
    id: "veh_02",
    nameBn: "নন-এসি জরুরি অ্যাম্বুলেন্স সার্ভিস (সাশ্রয়ী রোগী পরিবহন)",
    nameEn: "Non-AC Emergency Ambulance Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "ambulance",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    stock: 8,
    descriptionBn: "সাশ্রয়ী খরচে স্থানীয় ক্লিনিক ও আঞ্চলিক হাসপাতালে দ্রুত ও নিরাপদ রোগী পরিবহনের জন্য ২৪ ঘণ্টা সার্বক্ষণিক অ্যাম্বুলেন্স। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "Affordable emergency non-AC ambulance service for local and regional patient transfers. Fare negotiable.",
    tags: ["অ্যাম্বুলেন্স", "নন-এসি", "ambulance", "vehicles"]
  },
  {
    id: "veh_03",
    nameBn: "টয়োটা হাইস মাইক্রোবাস সার্ভিস (১১-১৪ সিট, সম্পূর্ণ এসি)",
    nameEn: "Toyota HiAce 11-14 Seater AC Microbus Rental",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "microbus",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80",
    rating: 4.9,
    stock: 15,
    isPopular: true,
    descriptionBn: "পারিবারিক ভ্রমণ, বিয়ের বরযাত্রী, কর্পোরেট সফর বা এয়ারপোর্ট ড্রপ-পিকআপের জন্য সম্পূর্ণ এয়ারকন্ডিশনড বিলাসবহুল হাইস মাইক্রোবাস। দক্ষ ও মার্জিত চালকসহ দেশের যেকোনো রুটে রিজার্ভ। ভাড়া দূরত্ব ও দিন অনুযায়ী আলোচনা সাপেক্ষে।",
    descriptionEn: "Luxury Toyota HiAce 11-14 seater fully air-conditioned microbus for weddings, family tours, and corporate trips with expert driver. Fare is negotiable.",
    tags: ["মাইক্রোবাস", "হাইস", "ট্যুর", "microbus", "hiace", "rental"]
  },
  {
    id: "veh_04",
    nameBn: "টয়োটা নোয়া লাক্সারি মাইক্রোবাস সার্ভিস (৭-৮ সিট, ভিআইপি এসি)",
    nameEn: "Toyota Noah 7-8 Seater Luxury AC Microbus",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "microbus",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80",
    rating: 4.9,
    stock: 10,
    descriptionBn: "ছোট পরিবার বা ভিআইপি ভ্রমণের জন্য ৭-৮ সিটের আরামদায়ক টয়োটা নোয়া এসি মাইক্রোবাস। নরম কুশন সিট ও প্রশান্তিদায়ক যাত্রা। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "Toyota Noah 7-8 seater luxury AC microbus for VIP family and official travel. Fare negotiable.",
    tags: ["নোয়া", "মাইক্রোবাস", "noah", "microbus"]
  },
  {
    id: "veh_05",
    nameBn: "ট্যুর ও পিকনিক লাক্সারি এসি বাস সার্ভিস (৩৬-৪০ সিট)",
    nameEn: "Luxury AC Tour & Picnic Bus Rental (36-40 Seater)",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "bus",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    stock: 6,
    isPopular: true,
    descriptionBn: "শিক্ষা সফর, পিকনিক, পারিবারিক মিলনমেলা বা বড় দলের ভ্রমণের জন্য পুশ-ব্যাক সিট ও ফুল এসি লাক্সারি বাস রিজার্ভ সার্ভিস। দেশের যেকোনো দর্শনীয় স্থানে নিরাপদ ভ্রমণ। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "36-40 seater luxury AC bus with push-back seats for picnic, study tour, and group excursions across Bangladesh. Fare is negotiable.",
    tags: ["বাস", "ট্যুর", "পিকনিক", "bus", "picnic", "rental"]
  },
  {
    id: "veh_06",
    nameBn: "নন-এসি বড় রিজার্ভ বাস সার্ভিস (৪০-৫২ সিট)",
    nameEn: "Non-AC Large Reserve Bus (40-52 Seater)",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "bus",
    image: "https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=600&auto=format&fit=crop&q=80",
    rating: 4.7,
    stock: 8,
    descriptionBn: "ওয়াজ মাহফিল, বিয়ে, ওরস বা দীর্ঘ দূরত্বের বড় দলের যাতায়াতের জন্য নির্ভরযোগ্য নন-এসি বাস রিজার্ভ। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "40-52 seater non-AC bus for wedding parties, religious tours, and large group travels. Fare negotiable.",
    tags: ["বাস", "রিজার্ভ", "bus", "vehicles"]
  },
  {
    id: "veh_07",
    nameBn: "ব্যাটারি চালিত অটো ও ইজিবাইক সার্ভিস (সম্পূর্ণ রিজার্ভ)",
    nameEn: "Battery Auto / Easy Bike Full Reserve Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "auto",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    stock: 30,
    isPopular: true,
    descriptionBn: "চাঁচকৈড় বাজার, গুরুদাসপুর পৌরসভা ও আশেপাশের ইউনিয়নের মধ্যে আত্মীয়ের বাড়ি যাওয়া, বাজার সদাই বা জরুরি যাতায়াতের জন্য সম্পূর্ণ অটো রিজার্ভ বা দিনব্যাপী ভাড়া। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "Local battery auto rickshaw / easy bike reservation for shopping, personal visits, and intra-upazila transport. Fare is negotiable.",
    tags: ["অটো", "ইজিবাইক", "ব্যাটারি অটো", "auto", "easybike"]
  },
  {
    id: "veh_08",
    nameBn: "পণ্য ও মালামাল পরিবহন ভ্যান সার্ভিস (মোটর ও প্যাডেল ভ্যান)",
    nameEn: "Cargo & Goods Transport Van Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "van",
    image: "https://images.unsplash.com/photo-1618767689160-da3fb810aad7?w=600&auto=format&fit=crop&q=80",
    rating: 4.7,
    stock: 25,
    descriptionBn: "দোকানের মালামাল, হাটের কাঁচাবাজার, ধান-চাল, সিমেন্ট বা গৃহস্থালি জিনিসপত্র সহজে স্থানীয়ভাবে পরিবহনের জন্য বিশ্বস্ত ভ্যান সার্ভিস। ভাড়া দূরত্ব অনুযায়ী আলোচনা সাপেক্ষে।",
    descriptionEn: "Motorized and pedal cargo vans for transporting agricultural harvest, shop goods, and heavy items locally. Fare negotiable.",
    tags: ["ভ্যান", "মালামাল", "পণ্য পরিবহন", "van", "cargo"]
  },
  {
    id: "veh_09",
    nameBn: "৪-স্ট্রোক সিএনজি অটোরিকশা সার্ভিস (আন্তঃউপজেলা রিজার্ভ)",
    nameEn: "4-Stroke CNG Auto Rickshaw Reserve Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "cng",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    stock: 18,
    isPopular: true,
    descriptionBn: "নাটোর সদর, বনপাড়া, সিংড়া, বড়াইগ্রাম, পাবনা ও গুরুদাসপুরের মধ্যে দ্রুত এবং সাশ্রয়ী যাতায়াতের জন্য সিএনজি রিজার্ভ ট্রিপ। দ্রুত কল করে বুকিং করুন। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "CNG auto rickshaw reserve trips connecting Natore, Bonpara, Singra, and Gurudaspur smoothly. Fare negotiable.",
    tags: ["সিএনজি", "সিএনজি অটোরিকশা", "cng", "autorickshaw"]
  },
  {
    id: "veh_10",
    nameBn: "১ টন মিনি পিক-আপ ট্রাক (বাসা বদল ও মাঝারি মালামাল পরিবহন)",
    nameEn: "1 Ton Mini Pickup Truck Service (Tata / Mahindra)",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "pickup",
    image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&auto=format&fit=crop&q=80",
    rating: 4.9,
    stock: 16,
    isPopular: true,
    descriptionBn: "বাসা পরিবর্তন, বাণিজ্যিক মালামাল স্থানান্তর, কৃষিজাত ফসল ও হাঁস-মুরগির ফিড বহনের জন্য দ্রুতগামী টাটা/মাহিন্দ্রা মিনি পিকআপ। বৃষ্টি থেকে রক্ষার জন্য ত্রিপল সুবিধাসহ। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "1-ton mini pickup truck for house shifting, crop transport, and business goods with rainproof tarpaulin. Fare is negotiable.",
    tags: ["পিকআপ", "মিনি পিকআপ", "ট্রাক", "pickup", "truck", "shifting"]
  },
  {
    id: "veh_11",
    nameBn: "১.৫ থেকে ২ টন বড় পিক-আপ ট্রাক (দূরপাল্লার মালামাল পরিবহন)",
    nameEn: "1.5 to 2 Ton Heavy Pickup Truck Service",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "pickup",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    stock: 12,
    descriptionBn: "ঢাকা, চট্টগ্রাম ও দেশের যেকোনো জেলায় ভারী বাণিজ্যিক মালামাল ও বাসা পরিবর্তনের জন্য বড় পিক-আপ ট্রাক সার্ভিস। অভিজ্ঞ চালক ও ত্রিপল নিরাপত্তা। ভাড়া আলোচনা সাপেক্ষে।",
    descriptionEn: "1.5 to 2 ton heavy pickup truck service for long distance commercial freight and full home relocation. Fare negotiable.",
    tags: ["পিকআপ ট্রাক", "ভারী মালামাল", "pickup", "truck"]
  },
  {
    id: "veh_12",
    nameBn: "টয়োটা প্রিমিও / এলিয়ন প্রাইভেট কার সার্ভিস (এসি সেডান কার)",
    nameEn: "Toyota Premio / Allion AC Private Car Rental",
    price: 0,
    originalPrice: 0,
    unitBn: "ভাড়া আলোচনা সাপেক্ষে",
    unitEn: "Fare on discussion",
    category: "vehicles",
    subcategory: "car",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80",
    rating: 4.9,
    stock: 10,
    isPopular: true,
    descriptionBn: "বিয়ের বরযাত্রী সাজানো, ভিআইপি অতিথি অভ্যর্থনা, অফিসিয়াল মিটিং বা আরামদায়ক ব্যক্তিগত ভ্রমণের জন্য সম্পূর্ণ এসি প্রাইভেট কার। ভাড়া ট্রিপ ও সময় অনুযায়ী আলোচনা সাপেক্ষে।",
    descriptionEn: "Luxury Toyota sedan private car with driver for weddings, official duties, and personal journeys. Fare negotiable.",
    tags: ["প্রাইভেট কার", "সেডান", "বিয়ে", "car", "sedan", "rental"]
  }
];
