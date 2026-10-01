import { Product } from "../types";

export interface ConfectioneryItemSeed {
  name: string;
  nameBn: string;
  nameEn: string;
  subCategory: "চকলেট ও ক্যান্ডি" | "বিস্কুট ও কুকিজ" | "কেক, বান ও পাউরুটি";
  unit: string;
  price: number;
  brand: string;
  image: string;
}

export const CONFECTIONERY_ITEMS_SEED: ConfectioneryItemSeed[] = [
  // Sub-Category: চকলেট ও ক্যান্ডি (43 items)
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 80, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 120, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 180, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 300, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 260, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 240, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 350, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameBn: "বিদেশী ক্যাডবোরি ডেইরি মিল্ক", nameEn: "Imported Cadbury Dairy Milk", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 520, brand: "Cadbury", image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { name: "কিটক্যাট চকলেট (India)", nameBn: "কিটক্যাট চকলেট (India)", nameEn: "KitKat Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 30, brand: "KitKat", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিটক্যাট চকলেট (India)", nameBn: "কিটক্যাট চকলেট (India)", nameEn: "KitKat Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 50, brand: "KitKat", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিটক্যাট চকলেট (India)", nameBn: "কিটক্যাট চকলেট (India)", nameEn: "KitKat Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 60, brand: "KitKat", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিটক্যাট চকলেট (India)", nameBn: "কিটক্যাট চকলেট (India)", nameEn: "KitKat Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 80, brand: "KitKat", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিটক্যাট চকলেট (India)", nameBn: "কিটক্যাট চকলেট (India)", nameEn: "KitKat Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 140, brand: "KitKat", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "নেসলে চকলেট", nameBn: "নেসলে চকলেট", nameEn: "Nestle Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 350, brand: "Nestle", image: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80" },
  { name: "নেসলে চকলেট", nameBn: "নেসলে চকলেট", nameEn: "Nestle Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 280, brand: "Nestle", image: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80" },
  { name: "স্নিকার্স চকলেট", nameBn: "স্নিকার্স চকলেট", nameEn: "Snickers Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 100, brand: "Snickers", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "স্নিকার্স চকলেট", nameBn: "স্নিকার্স চকলেট", nameEn: "Snickers Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 80, brand: "Snickers", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "স্নিকার্স চকলেট", nameBn: "স্নিকার্স চকলেট", nameEn: "Snickers Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 70, brand: "Snickers", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "হারশিস মিল্ক চকলেট", nameBn: "হারশিস মিল্ক চকলেট", nameEn: "Hershey's Milk Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 10, brand: "Hershey's", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=500&auto=format&fit=crop&q=80" },
  { name: "দেশী হারশিস মিল্ক চকলেট", nameBn: "দেশী হারশিস মিল্ক চকলেট", nameEn: "Local Hershey's Milk Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 20, brand: "Hershey's", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=500&auto=format&fit=crop&q=80" },
  { name: "দেশী হারশিস মিল্ক চকলেট", nameBn: "দেশী হারশিস মিল্ক চকলেট", nameEn: "Local Hershey's Milk Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 30, brand: "Hershey's", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=500&auto=format&fit=crop&q=80" },
  { name: "দেশী হারশিস মিল্ক চকলেট", nameBn: "দেশী হারশিস মিল্ক চকলেট", nameEn: "Local Hershey's Milk Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 40, brand: "Hershey's", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=500&auto=format&fit=crop&q=80" },
  { name: "দেশী হারশিস মিল্ক চকলেট", nameBn: "দেশী হারশিস মিল্ক চকলেট", nameEn: "Local Hershey's Milk Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 50, brand: "Hershey's", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=500&auto=format&fit=crop&q=80" },
  { name: "লিন্ডট ডার্ক চকলেট (India)", nameBn: "লিন্ডট ডার্ক চকলেট (India)", nameEn: "Lindt Dark Chocolate (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 120, brand: "Lindt", image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&auto=format&fit=crop&q=80" },
  { name: "লিন্ডট ডার্ক চকলেট", nameBn: "লিন্ডট ডার্ক চকলেট", nameEn: "Lindt Dark Chocolate", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 350, brand: "Lindt", image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&auto=format&fit=crop&q=80" },
  { name: "কিন্ডার জয় (দেশী)", nameBn: "কিন্ডার জয় (দেশী)", nameEn: "Kinder Joy (Local)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 30, brand: "Kinder", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিন্ডার জয় (দেশী)", nameBn: "কিন্ডার জয় (দেশী)", nameEn: "Kinder Joy (Local)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 40, brand: "Kinder", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "কিন্ডার জয় (India)", nameBn: "কিন্ডার জয় (India)", nameEn: "Kinder Joy (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 120, brand: "Kinder", image: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=500&auto=format&fit=crop&q=80" },
  { name: "আলপেনলিবে", nameBn: "আলপেনলিবে", nameEn: "Alpenliebe Candy", subCategory: "চকলেট ও ক্যান্ডি", unit: "২ পিছ", price: 5, brand: "Alpenliebe", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "আলপেনলিবে কফি ক্যান্ডি", nameBn: "আলপেনলিবে কফি ক্যান্ডি", nameEn: "Alpenliebe Coffee Candy", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 2, brand: "Alpenliebe", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "আলপেনলিবে চকলেট ক্যান্ডি", nameBn: "আলপেনলিবে চকলেট ক্যান্ডি", nameEn: "Alpenliebe Chocolate Candy", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 2, brand: "Alpenliebe", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "সেন্টার ফ্রেশ", nameBn: "সেন্টার ফ্রেশ", nameEn: "Center Fresh Gum", subCategory: "চকলেট ও ক্যান্ডি", unit: "২ পিছ", price: 5, brand: "Center Fresh", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "সেন্টার ফ্রুট", nameBn: "সেন্টার ফ্রুট", nameEn: "Center Fruit Gum", subCategory: "চকলেট ও ক্যান্ডি", unit: "২ পিছ", price: 5, brand: "Center Fruit", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "সেন্টার ফ্রেশ (India)", nameBn: "সেন্টার ফ্রেশ (India)", nameEn: "Center Fresh (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 40, brand: "Center Fresh", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "সেন্টার ফ্রুট (India)", nameBn: "সেন্টার ফ্রুট (India)", nameEn: "Center Fruit (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 50, brand: "Center Fruit", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "মেন্টোস মিন্ট (দেশী)", nameBn: "মেন্টোস মিন্ট (দেশী)", nameEn: "Mentos Mint (Local)", subCategory: "চকলেট ও ক্যান্ডি", unit: "২ পিছ", price: 30, brand: "Mentos", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "মেন্টোস মিন্ট (India)", nameBn: "মেন্টোস মিন্ট (India)", nameEn: "Mentos Mint (India)", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 50, brand: "Mentos", image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=80" },
  { name: "চুষা চুষাস", nameBn: "চুষা চুষাস", nameEn: "Chupa Chups Lollipop", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 5, brand: "Chupa Chups", image: "https://images.unsplash.com/photo-1527324688151-0e627063f2b1?w=500&auto=format&fit=crop&q=80" },
  { name: "পপলার্স", nameBn: "পপলার্স", nameEn: "Poplars Lollipop", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 2, brand: "Poplars", image: "https://images.unsplash.com/photo-1527324688151-0e627063f2b1?w=500&auto=format&fit=crop&q=80" },
  { name: "হজমোলা টফি", nameBn: "হজমোলা টফি", nameEn: "Hajmola Toffee", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 2, brand: "Dabur Hajmola", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "পোলি টফি", nameBn: "পোলি টফি", nameEn: "Poli Toffee", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 3, brand: "Poli", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "কফি টফি", nameBn: "কফি টফি", nameEn: "Coffee Toffee", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 2, brand: "Coffee Candy", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },
  { name: "আম টফি", nameBn: "আম টফি", nameEn: "Mango Toffee", subCategory: "চকলেট ও ক্যান্ডি", unit: "১ পিছ", price: 1, brand: "Mango Candy", image: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=500&auto=format&fit=crop&q=80" },

  // Sub-Category: বিস্কুট ও কুকিজ (30 items)
  { name: "ওরিও অরিজিনাল", nameBn: "ওরিও অরিজিনাল", nameEn: "Oreo Original Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 30, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ওরিও অরিজিনাল", nameBn: "ওরিও অরিজিনাল", nameEn: "Oreo Original Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 80, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ওরিও অরিজিনাল", nameBn: "ওরিও অরিজিনাল", nameEn: "Oreo Original Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 120, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ওরিও চকলেট বিস্কুট", nameBn: "ওরিও চকলেট বিস্কুট", nameEn: "Oreo Chocolate Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 180, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ওরিও চকলেট বিস্কুট", nameBn: "ওরিও চকলেট বিস্কুট", nameEn: "Oreo Chocolate Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 240, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ওরিও চকলেট বিস্কুট", nameBn: "ওরিও চকলেট বিস্কুট", nameEn: "Oreo Chocolate Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 520, brand: "Oreo", image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80" },
  { name: "ব্রিটানিয়া বার্বন বিস্কুট", nameBn: "ব্রিটানিয়া বার্বন বিস্কুট", nameEn: "Britannia Bourbon Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 5, brand: "Britannia", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80" },
  { name: "ব্রিটানিয়া বার্বন বিস্কুট", nameBn: "ব্রিটানিয়া বার্বন বিস্কুট", nameEn: "Britannia Bourbon Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Britannia", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80" },
  { name: "প্রাণ মিল্ক বিস্কুট", nameBn: "প্রাণ মিল্ক বিস্কুট", nameEn: "Pran Milk Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Pran", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "প্রাণ মার্বেল বিস্কুট", nameBn: "প্রাণ মার্বেল বিস্কুট", nameEn: "Pran Marble Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Pran", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "প্রাণ বাটার কুকিজ", nameBn: "প্রাণ বাটার কুকিজ", nameEn: "Pran Butter Cookies", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Pran", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "প্রাণ ক্রিম বিস্কুট ভ্যানিলা", nameBn: "প্রাণ ক্রিম বিস্কুট ভ্যানিলা", nameEn: "Pran Cream Biscuit Vanilla", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Pran", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "প্রাণ ক্রিম বিস্কুট চকলেট", nameBn: "প্রাণ ক্রিম বিস্কুট চকলেট", nameEn: "Pran Cream Biscuit Chocolate", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Pran", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameBn: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameEn: "Olympic Energy Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 5, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameBn: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameEn: "Olympic Energy Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 10, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameBn: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameEn: "Olympic Energy Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameBn: "অলিম্পিক এনার্জি প্লাস বিস্কুট", nameEn: "Olympic Energy Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 100, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক মিল্ক প্লাস বিস্কুট", nameBn: "অলিম্পিক মিল্ক প্লাস বিস্কুট", nameEn: "Olympic Milk Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 10, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক মিল্ক প্লাস বিস্কুট", nameBn: "অলিম্পিক মিল্ক প্লাস বিস্কুট", nameEn: "Olympic Milk Plus Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক টিপস বিস্কুট", nameBn: "অলিম্পিক টিপস বিস্কুট", nameEn: "Olympic Tips Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 15, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক টিপস বিস্কুট", nameBn: "অলিম্পিক টিপস বিস্কুট", nameEn: "Olympic Tips Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 75, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক বাটার বাইট বিস্কুট", nameBn: "অলিম্পিক বাটার বাইট বিস্কুট", nameEn: "Olympic Butter Bite Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক ক্রিম বিস্কুট", nameBn: "অলিম্পিক ক্রিম বিস্কুট", nameEn: "Olympic Cream Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক কেক", nameBn: "অলিম্পিক কেক", nameEn: "Olympic Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক ফার্স্ট চয়েস বিস্কুট", nameBn: "অলিম্পিক ফার্স্ট চয়েস বিস্কুট", nameEn: "Olympic First Choice Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 20, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "অলিম্পিক ফার্স্ট চয়েস বিস্কুট", nameBn: "অলিম্পিক ফার্স্ট চয়েস বিস্কুট", nameEn: "Olympic First Choice Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Olympic", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "ড্যানিশ মিল্ক বিস্কুট", nameBn: "ড্যানিশ মিল্ক বিস্কুট", nameEn: "Danish Milk Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 20, brand: "Danish", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "ড্যানিশ মিল্ক বিস্কুট", nameBn: "ড্যানিশ মিল্ক বিস্কুট", nameEn: "Danish Milk Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Danish", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "ফ্রেশ চকলেট বিস্কুট", nameBn: "ফ্রেশ চকলেট বিস্কুট", nameEn: "Fresh Chocolate Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 50, brand: "Fresh", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },
  { name: "ফ্রেশ চকলেট বিস্কুট", nameBn: "ফ্রেশ চকলেট বিস্কুট", nameEn: "Fresh Chocolate Biscuit", subCategory: "বিস্কুট ও কুকিজ", unit: "১ প্যাকেট", price: 70, brand: "Fresh", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80" },

  // Sub-Category: কেক, বান ও পাউরুটি (24 items)
  { name: "চকলেট কেক", nameBn: "চকলেট কেক", nameEn: "Chocolate Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 10, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "চকলেট কেক", nameBn: "চকলেট কেক", nameEn: "Chocolate Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 20, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "চকলেট কেক", nameBn: "চকলেট কেক", nameEn: "Chocolate Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 35, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "চকলেট কেক", nameBn: "চকলেট কেক", nameEn: "Chocolate Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 120, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 5, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 10, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 20, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 50, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 60, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 70, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 80, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 100, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "ভ্যানিলা কেক", nameBn: "ভ্যানিলা কেক", nameEn: "Vanilla Cake", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 120, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=500&auto=format&fit=crop&q=80" },
  { name: "মিল্ক বান", nameBn: "মিল্ক বান", nameEn: "Milk Bun", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 50, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80" },
  { name: "মিল্ক বান", nameBn: "মিল্ক বান", nameEn: "Milk Bun", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 80, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80" },
  { name: "মিল্ক বান", nameBn: "মিল্ক বান", nameEn: "Milk Bun", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 100, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 25, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 35, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 50, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 60, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 70, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 80, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" },
  { name: "সাদা পাউরুটি", nameBn: "সাদা পাউরুটি", nameEn: "White Sliced Bread", subCategory: "কেক, বান ও পাউরুটি", unit: "১ প্যাকেট", price: 100, brand: "কাচা বাজার কনফেকশনারি", image: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80" }
];

export const CONFECTIONERY_PRODUCTS_RAW: Product[] = CONFECTIONERY_ITEMS_SEED.map((item, idx) => {
  const numId = String(idx + 1).padStart(2, "0");
  const id = `conf_${numId}`;
  const subId = item.subCategory === "চকলেট ও ক্যান্ডি" 
    ? "sub_conf_chocolate" 
    : (item.subCategory === "বিস্কুট ও কুকিজ" ? "sub_conf_biscuits" : "sub_conf_cakes");

  const enUnit = item.unit.includes("২") ? "2 pcs" : (item.unit.includes("প্যাকেট") ? "1 pack" : "1 pc");

  return {
    id,
    name: item.name,
    nameBn: item.nameBn,
    nameEn: `${item.nameEn} (৳${item.price})`,
    price: item.price,
    originalPrice: item.price,
    unit: item.unit,
    unitBn: item.unit,
    unitEn: enUnit,
    category: "snacks-biscuits",
    categoryId: "snacks-biscuits",
    categoryBn: "কনফেকশনারি",
    categoryEn: "Confectionery",
    subCategory: item.subCategory,
    subcategory: item.subCategory,
    subcategoryId: subId,
    subCategoryId: subId,
    image: item.image,
    imageUrl: item.image,
    inStock: true,
    stock: 100,
    isAvailable: true,
    isDeleted: false,
    deleted: false,
    status: "active",
    rating: 4.8,
    reviewCount: 15,
    brand: item.brand,
    descriptionBn: `${item.nameBn} - তাজা ও সুস্বাদু কনফেকশনারি আইটেম। মূল্য: ৳${item.price} (${item.unit})।`,
    descriptionEn: `${item.nameEn} - Fresh and delicious confectionery item. Price: BDT ${item.price} (${enUnit}).`,
    sku: `KB-CONF-${String(idx + 1).padStart(3, "0")}`,
    displayOrder: idx + 1,
    order: idx + 1
  };
});
