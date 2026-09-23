import { Category } from "../types";

export const CATEGORIES: Category[] = [
  {
    id: "all",
    nameBn: "সব পণ্য",
    nameEn: "All Products",
    iconName: "LayoutGrid",
    colorClass: "bg-slate-50 text-slate-700 hover:bg-slate-100",
    borderColor: "border-slate-100",
    displayOrder: 0
  },
  {
    id: "vegetables",
    nameBn: "তাজা শাকসবজি",
    nameEn: "Fresh Vegetables",
    iconName: "Salad",
    colorClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    borderColor: "border-emerald-100",
    displayOrder: 1
  },
  {
    id: "groceries",
    nameBn: "মুদি পণ্য",
    nameEn: "Groceries",
    iconName: "Wheat",
    colorClass: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    borderColor: "border-amber-100",
    displayOrder: 2,
    image: "https://res.cloudinary.com/upvkzb3p/image/upload/v1784818982/aisure-2f9b0144-2a3f-4bf8-ac23-9bb0efcf7756_r428ci.webp",
    imageUrl: "https://res.cloudinary.com/upvkzb3p/image/upload/v1784818982/aisure-2f9b0144-2a3f-4bf8-ac23-9bb0efcf7756_r428ci.webp"
  },
  {
    id: "fish",
    nameBn: "তাজা মাছ",
    nameEn: "Fresh Fish",
    iconName: "Fish",
    colorClass: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    borderColor: "border-cyan-100",
    displayOrder: 3
  },
  {
    id: "meat",
    nameBn: "মাংস ও পাখির মাংস",
    nameEn: "Meat & Poultry",
    iconName: "Beef",
    colorClass: "bg-red-50 text-red-700 hover:bg-red-100",
    borderColor: "border-red-100",
    displayOrder: 4
  },
  {
    id: "fruits",
    nameBn: "তাজা ফলমূল",
    nameEn: "Fresh Fruits",
    iconName: "Apple",
    colorClass: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    borderColor: "border-amber-100",
    displayOrder: 5
  },
  {
    id: "dairy-eggs",
    nameBn: "ডেইরি ও ডিম",
    nameEn: "Dairy & Eggs",
    iconName: "Egg",
    colorClass: "bg-lime-50 text-lime-700 hover:bg-lime-100",
    borderColor: "border-lime-100",
    displayOrder: 6
  },
  {
    id: "snacks-biscuits",
    nameBn: "স্ন্যাক্স ও বিস্কুট",
    nameEn: "Snacks & Biscuits",
    iconName: "Cookie",
    colorClass: "bg-pink-50 text-pink-700 hover:bg-pink-100",
    borderColor: "border-pink-100",
    displayOrder: 7
  },
  {
    id: "beverages",
    nameBn: "কোমল পানীয় ও জুস",
    nameEn: "Beverages",
    iconName: "Coffee",
    colorClass: "bg-teal-50 text-teal-700 hover:bg-teal-100",
    borderColor: "border-teal-100",
    displayOrder: 8
  },
  {
    id: "frozen",
    nameBn: "ড্রাই ফুড",
    nameEn: "Dry Food",
    iconName: "Package",
    colorClass: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    borderColor: "border-amber-100",
    displayOrder: 9
  },
  {
    id: "personal-care",
    nameBn: "ব্যক্তিগত যত্ন ও প্রসাধন",
    nameEn: "Personal Care",
    iconName: "Heart",
    colorClass: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    borderColor: "border-indigo-100",
    displayOrder: 10
  },
  {
    id: "household",
    nameBn: "চিপস কর্নার",
    nameEn: "Chips Corner",
    iconName: "Droplet",
    colorClass: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    borderColor: "border-blue-100",
    displayOrder: 11,
    image: "https://res.cloudinary.com/upvkzb3p/image/upload/v1785309507/aisure-3561e436-078a-4e79-8f45-3236c76ff2c2_w71g9q.webp",
    imageUrl: "https://res.cloudinary.com/upvkzb3p/image/upload/v1785309507/aisure-3561e436-078a-4e79-8f45-3236c76ff2c2_w71g9q.webp"
  },
  {
    id: "baby-care",
    nameBn: "শিশুর যত্ন ও ডায়াপার",
    nameEn: "Baby Care",
    iconName: "Baby",
    colorClass: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    borderColor: "border-purple-100",
    displayOrder: 12
  },
  {
    id: "bakery-sweets",
    nameBn: "রেস্টুরেন্ট",
    nameEn: "Restaurant",
    iconName: "Utensils",
    colorClass: "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
    borderColor: "border-fuchsia-100",
    displayOrder: 13
  },
  {
    id: "offers",
    nameBn: "অফার ও সেরা বিক্রেতা",
    nameEn: "Offers & Best Sellers",
    iconName: "Tag",
    colorClass: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    borderColor: "border-rose-100",
    displayOrder: 14
  },
  {
    id: "organic-herbal",
    nameBn: "অর্গানিক ও ভেষজ",
    nameEn: "Organic & Herbal",
    iconName: "Sparkles",
    colorClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    borderColor: "border-emerald-100",
    displayOrder: 15
  },
  {
    id: "pet-care",
    nameBn: "শুঁটকি মাছ",
    nameEn: "Dried Fish",
    iconName: "Fish",
    colorClass: "bg-orange-50 text-orange-700 hover:bg-orange-100",
    borderColor: "border-orange-100",
    displayOrder: 16,
    image: "https://res.cloudinary.com/upvkzb3p/image/upload/v1788847049/Gemini_Generated_Image_9fvh39fvh39fvh39_wgoydg.jpg",
    imageUrl: "https://res.cloudinary.com/upvkzb3p/image/upload/v1788847049/Gemini_Generated_Image_9fvh39fvh39fvh39_wgoydg.jpg"
  },
  {
    id: "home-appliances",
    nameBn: "গৃহস্থালি সরঞ্জাম",
    nameEn: "Home & Kitchenware",
    iconName: "Droplet",
    colorClass: "bg-teal-50 text-teal-800 hover:bg-teal-100",
    borderColor: "border-teal-100",
    displayOrder: 17
  }
];
