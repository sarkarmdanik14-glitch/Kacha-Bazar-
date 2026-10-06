import { Product } from "../types";

// Raw pharmacy medicine catalog based strictly on official Medicine Price Sheet (132 items)
// No prices specified per user request
const RAW_MEDICINE_ITEMS = [
  // Page 1 - Healthcare (1-21)
  { id: "ph1", name: "Alcet Tablet 5mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph2", name: "Candiril Capsule 150mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph3", name: "Clonatril Tablet 1mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph4", name: "Furotil Tablet 500mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph5", name: "Halonate Ointment 20g", brand: "Healthcare", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph6", name: "Lyric Capsule 25mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph7", name: "Lyric Capsule 50mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph8", name: "Moxivin Eye drop 5ml (0.5% w/v)", brand: "Healthcare", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph9", name: "NFT Capsule 100 mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph10", name: "Novea Tablet 20 mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph11", name: "Reef-DX Tablet", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph12", name: "Renovit Tablet", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph13", name: "Replet Plus Tablet", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph14", name: "Rocal-M Vita Effervescent Tablet", brand: "Healthcare", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph15", name: "Rozith Tablet 500mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph16", name: "Santogen Tablet", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph17", name: "SERGEL CAPSULE 20MG", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph18", name: "SERGEL CAPSULE 40MG", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph19", name: "Sizonil Tablet 1mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph20", name: "Solivo Tablet 375mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph21", name: "Teana AM Tablet 80/5mg", brand: "Healthcare", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },

  // Page 1 - Square Pharma (22-44)
  { id: "ph22", name: "Afun Crm 10g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph23", name: "Alifane Cap 30's", brand: "Square Pharma", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
  { id: "ph24", name: "Almex 400 Tab 48's", brand: "Square Pharma", unitBn: "৪৮ টি ট্যাবলেট", unitEn: "48 tablets" },
  { id: "ph25", name: "Bactrocin 2% Oint 10g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph26", name: "Betameson Crm 20g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph27", name: "Betameson-N Crm 15g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph28", name: "Butocort 200 Cozycap 30's", brand: "Square Pharma", unitBn: "৩০ টি কোজিক্যাপ", unitEn: "30 cozycaps" },
  { id: "ph29", name: "Camlosart 5/20 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph30", name: "Cefotil 500 Tab 12's", brand: "Square Pharma", unitBn: "১২ টি ট্যাবলেট", unitEn: "12 tablets" },
  { id: "ph31", name: "Cefotil Plus 250 Tab 12's", brand: "Square Pharma", unitBn: "১২ টি ট্যাবলেট", unitEn: "12 tablets" },
  { id: "ph32", name: "Ceftron 1g IV Inj", brand: "Square Pharma", unitBn: "১ ভায়াল", unitEn: "1 vial" },
  { id: "ph33", name: "Clotenac Gel 20g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph34", name: "Comet 500 Tab 100's", brand: "Square Pharma", unitBn: "১০০ টি ট্যাবলেট", unitEn: "100 tablets" },
  { id: "ph35", name: "Comet XR 500 Tab 50's", brand: "Square Pharma", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph36", name: "Comprid 80 Tab 60's", brand: "Square Pharma", unitBn: "৬০ টি ট্যাবলেট", unitEn: "60 tablets" },
  { id: "ph37", name: "Contilex TS Tab 20's", brand: "Square Pharma", unitBn: "২০ টি ট্যাবলেট", unitEn: "20 tablets" },
  { id: "ph38", name: "Cozycol 800 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph39", name: "D-Balance 40000 Licap 10's", brand: "Square Pharma", unitBn: "১০ টি লিক্যাপ", unitEn: "10 licaps" },
  { id: "ph40", name: "Epitra 0.5 Tab 50's", brand: "Square Pharma", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph41", name: "Famotack 20 Tab 180's", brand: "Square Pharma", unitBn: "১৮০ টি ট্যাবলেট", unitEn: "180 tablets" },
  { id: "ph42", name: "Feoza 45 Tab 20's", brand: "Square Pharma", unitBn: "২০ টি ট্যাবলেট", unitEn: "20 tablets" },
  { id: "ph43", name: "Fexo 120 Tab 50's", brand: "Square Pharma", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph44", name: "Flexi 200 SR-Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },

  // Page 2 - Square Pharma (45-83)
  { id: "ph45", name: "Fungidal Crm 15g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph46", name: "Fungidal-HC Crm 15g T", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph47", name: "Glysup 1.15 Supp 30's", brand: "Square Pharma", unitBn: "৩০ টি সাপোজিটরি", unitEn: "30 suppositories" },
  { id: "ph48", name: "Ispergud Sachet 15's", brand: "Square Pharma", unitBn: "১৫ টি স্যাচেট", unitEn: "15 sachets" },
  { id: "ph49", name: "Iventi Tab 12's", brand: "Square Pharma", unitBn: "১২ টি ট্যাবলেট", unitEn: "12 tablets" },
  { id: "ph50", name: "K-One MM Inj 6's", brand: "Square Pharma", unitBn: "৬ টি ইনজেকশন", unitEn: "6 injections" },
  { id: "ph51", name: "Lanso D 30 Cap 60's", brand: "Square Pharma", unitBn: "৬০ টি ক্যাপসুল", unitEn: "60 capsules" },
  { id: "ph52", name: "Lubgel 1% E-Drop 10ml", brand: "Square Pharma", unitBn: "১ বোতল (১০ মিলি)", unitEn: "1 bottle (10ml)" },
  { id: "ph53", name: "Maxrin 0.4 Cap 30's", brand: "Square Pharma", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
  { id: "ph54", name: "Metaspray N-Spray 120sprays", brand: "Square Pharma", unitBn: "১ স্প্রে", unitEn: "1 spray" },
  { id: "ph55", name: "Methigic 8 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph56", name: "Migranil 1.5 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph57", name: "Mirapro 15 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph58", name: "Montene 10 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph59", name: "Motigut Tab 100's", brand: "Square Pharma", unitBn: "১০০ টি ট্যাবলেট", unitEn: "100 tablets" },
  { id: "ph60", name: "Moxaclav 1g Tab 12's", brand: "Square Pharma", unitBn: "১২ টি ট্যাবলেট", unitEn: "12 tablets" },
  { id: "ph61", name: "Moxaclav 625 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph62", name: "Neumig 2.5 Tab 20's", brand: "Square Pharma", unitBn: "২০ টি ট্যাবলেট", unitEn: "20 tablets" },
  { id: "ph63", name: "Neurolin 25 Cap 30's", brand: "Square Pharma", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
  { id: "ph64", name: "Nexum 40 Cap 30's", brand: "Square Pharma", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
  { id: "ph65", name: "Nexum MUPS 20 Tab 100's", brand: "Square Pharma", unitBn: "১০০ টি ট্যাবলেট", unitEn: "100 tablets" },
  { id: "ph66", name: "Oxifun Crm 10g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph67", name: "Oxifun Lotion 30ml", brand: "Square Pharma", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph68", name: "Pevitin Crm 15g", brand: "Square Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph69", name: "Phylopen DS Cap 42's", brand: "Square Pharma", unitBn: "৪২ টি ক্যাপসুল", unitEn: "42 capsules" },
  { id: "ph70", name: "QTP 100 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph71", name: "QTP 25 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph72", name: "QTP 50 XR Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph73", name: "Ranolin 500 XR Tab 20's", brand: "Square Pharma", unitBn: "২০ টি ট্যাবলেট", unitEn: "20 tablets" },
  { id: "ph74", name: "Rapimix Inj 3ml 1's", brand: "Square Pharma", unitBn: "১ টি ইনজেকশন", unitEn: "1 injection" },
  { id: "ph75", name: "Rivatig 1.5 Cap 20's", brand: "Square Pharma", unitBn: "২০ টি ক্যাপসুল", unitEn: "20 capsules" },
  { id: "ph76", name: "Seclo 20 Cap 120's", brand: "Square Pharma", unitBn: "১২০ টি ক্যাপসুল", unitEn: "120 capsules" },
  { id: "ph77", name: "Secrin 4 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph78", name: "Sitamax 50 Tab 10's", brand: "Square Pharma", unitBn: "১০ টি ট্যাবলেট", unitEn: "10 tablets" },
  { id: "ph79", name: "Sulprex HFA Refill 200puff", brand: "Square Pharma", unitBn: "১ রিফিল ক্যান", unitEn: "1 refill can" },
  { id: "ph80", name: "Sulprex Nebu Soln 3ml 10's", brand: "Square Pharma", unitBn: "১০ টি রেসপ্যুল", unitEn: "10 respules" },
  { id: "ph81", name: "Telmilock AM 5/80 Tab 30's", brand: "Square Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph82", name: "Ticamet 250 HFA MDI 120puff", brand: "Square Pharma", unitBn: "১ ইনহেলার", unitEn: "1 inhaler" },
  { id: "ph83", name: "Ticamet 250 HFA Refill 120puff", brand: "Square Pharma", unitBn: "১ রিফিল ক্যান", unitEn: "1 refill can" },

  // Page 2 & 3 - Beximco Pharma (84-108)
  { id: "ph84", name: "Bextram Gold Tablet", brand: "Beximco Pharma", unitBn: "১ বোতল / প্যাক", unitEn: "1 pack" },
  { id: "ph85", name: "Bextram Silver Tablet", brand: "Beximco Pharma", unitBn: "১ বোতল / প্যাক", unitEn: "1 pack" },
  { id: "ph86", name: "Bizoran Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph87", name: "D-Rise 2000 IU Oral Sol.", brand: "Beximco Pharma", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph88", name: "Digecid Suspension", brand: "Beximco Pharma", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph89", name: "Evo 500 Tablet-30's", brand: "Beximco Pharma", unitBn: "৩০ টি ট্যাবলেট", unitEn: "30 tablets" },
  { id: "ph90", name: "Empalina 25/5 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph91", name: "Fixolin 200 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph92", name: "Iprasol HFA Inhaler Refill", brand: "Beximco Pharma", unitBn: "১ রিফিল ক্যান", unitEn: "1 refill can" },
  { id: "ph93", name: "Informet XR 500 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph94", name: "Napa One Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph95", name: "Napa Syp", brand: "Beximco Pharma", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph96", name: "Napa Tablet (510's)", brand: "Beximco Pharma", unitBn: "৫১০ টি ট্যাবলেট (বক্স)", unitEn: "510 tablets" },
  { id: "ph97", name: "Neurocare", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph98", name: "Napa Extra Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph99", name: "Nervalin 25 Cap", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph100", name: "Napa Extend Tablet-192's", brand: "Beximco Pharma", unitBn: "১৯২ টি ট্যাবলেট (বক্স)", unitEn: "192 tablets" },
  { id: "ph101", name: "Olmesan-20 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph102", name: "Remmo 20 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph103", name: "Rostil SR Cap", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph104", name: "Terbex Cream (5G)", brand: "Beximco Pharma", unitBn: "১ টিউব", unitEn: "1 tube" },
  { id: "ph105", name: "Tyclav 625 mg Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph106", name: "Tearon Eye Drops", brand: "Beximco Pharma", unitBn: "১ বোতল", unitEn: "1 bottle" },
  { id: "ph107", name: "Vonocab 20 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph108", name: "Zolax 0.25 Tablet", brand: "Beximco Pharma", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },

  // Page 3 - Renata PLC (109-121)
  { id: "ph109", name: "ALGIN 50MG TABS 10X10'S", brand: "Renata PLC", unitBn: "১০০ টি ট্যাবলেট (বক্স)", unitEn: "100 tablets" },
  { id: "ph110", name: "ALPHAPRESS XR 2.5MG 3X10'S", brand: "Renata PLC", unitBn: "৩০ টি ট্যাবলেট (বক্স)", unitEn: "30 tablets" },
  { id: "ph111", name: "ESCILEX FC 5MG TAB 4X10'S", brand: "Renata PLC", unitBn: "৪০ টি ট্যাবলেট (বক্স)", unitEn: "40 tablets" },
  { id: "ph112", name: "FUROCEF 250MG TAB (2X8'S)", brand: "Renata PLC", unitBn: "১৬ টি ট্যাবলেট (বক্স)", unitEn: "16 tablets" },
  { id: "ph113", name: "GLINTA PLUS FC 10/5MG TABS", brand: "Renata PLC", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph114", name: "NORMENS 5MG TAB 10X10'S", brand: "Renata PLC", unitBn: "১০০ টি ট্যাবলেট (বক্স)", unitEn: "100 tablets" },
  { id: "ph115", name: "SERONEX 100MG TAB 3X10'S", brand: "Renata PLC", unitBn: "৩০ টি ট্যাবলেট (বক্স)", unitEn: "30 tablets" },
  { id: "ph116", name: "SERONEX 25MG TAB 5X10'S", brand: "Renata PLC", unitBn: "৫০ টি ট্যাবলেট (বক্স)", unitEn: "50 tablets" },
  { id: "ph117", name: "THYROX 100MCG TAB 60X1'S", brand: "Renata PLC", unitBn: "৬০ টি ট্যাবলেট (বক্স)", unitEn: "60 tablets" },
  { id: "ph118", name: "THYROX 25MCG TAB 3X30'S", brand: "Renata PLC", unitBn: "৯০ টি ট্যাবলেট (বক্স)", unitEn: "90 tablets" },
  { id: "ph119", name: "ULFIX 200ML SUSP 1X1'S", brand: "Renata PLC", unitBn: "১ বোতল (২০০ মিলি)", unitEn: "1 bottle (200ml)" },
  { id: "ph120", name: "XAMIC IM/IV INJ 500MG (1X5'S)", brand: "Renata PLC", unitBn: "৫ টি ইনজেকশন (বক্স)", unitEn: "5 injections" },
  { id: "ph121", name: "ZITHRIN FC 500MG TAB 3X5'S", brand: "Renata PLC", unitBn: "১৫ টি ট্যাবলেট (বক্স)", unitEn: "15 tablets" },

  // Page 3 - Radiant (122-132)
  { id: "ph122", name: "Naprosyn Tab 500mg (50s)", brand: "Radiant", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph123", name: "Neucos-B FC Tab (50s)", brand: "Radiant", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph124", name: "Rivotril Tab 0.5mg (80s)", brand: "Radiant", unitBn: "৮০ টি ট্যাবলেট", unitEn: "80 tablets" },
  { id: "ph125", name: "Xelcom FC Tab 50mg (50s)", brand: "Radiant", unitBn: "৫০ টি ট্যাবলেট", unitEn: "50 tablets" },
  { id: "ph126", name: "Coralcal-DX FC Tab 600mg", brand: "Radiant", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph127", name: "Prelica Cap 50mg (50s)", brand: "Radiant", unitBn: "৫০ টি ক্যাপসুল", unitEn: "50 capsules" },
  { id: "ph128", name: "Naprosyn-Plus Tab 375mg/20mg", brand: "Radiant", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph129", name: "Exium MUPS FC Tab 20mg (80s)", brand: "Radiant", unitBn: "৮০ টি ট্যাবলেট", unitEn: "80 tablets" },
  { id: "ph130", name: "Naprosyn-Plus Tab 500mg/20mg", brand: "Radiant", unitBn: "১ পাতা / প্যাক", unitEn: "1 pack" },
  { id: "ph131", name: "Cranbiotic Cap 400mg (30s)", brand: "Radiant", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
  { id: "ph132", name: "Ubi-Q Cap 100mg (30s)", brand: "Radiant", unitBn: "৩০ টি ক্যাপসুল", unitEn: "30 capsules" },
];

// Clean medical photography images matching various pharmaceutical categories
const MEDICINE_IMAGES = [
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1576073719676-aa955fc1bda9?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=500&q=80"
];

function getAppropriateMedicineImage(name: string, idx: number): string {
  const lower = name.toLowerCase();
  if (lower.includes("crm") || lower.includes("cream") || lower.includes("oint") || lower.includes("gel")) {
    return "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80";
  }
  if (lower.includes("drop") || lower.includes("spray") || lower.includes("syp") || lower.includes("susp") || lower.includes("soln") || lower.includes("oral sol")) {
    return "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=500&q=80";
  }
  if (lower.includes("inj")) {
    return "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=500&q=80";
  }
  if (lower.includes("cap") || lower.includes("licap") || lower.includes("cozycap")) {
    return "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80";
  }
  return MEDICINE_IMAGES[idx % MEDICINE_IMAGES.length];
}

export const PHARMACY_PRODUCTS_RAW: Product[] = RAW_MEDICINE_ITEMS.map((item, idx) => ({
  id: item.id,
  nameBn: item.name,
  nameEn: item.name,
  price: 0,
  unitBn: item.unitBn,
  unitEn: item.unitEn,
  unit: item.unitBn,
  category: "pharmacy",
  categoryId: "pharmacy",
  subcategory: "ঔষধ ও প্রেসক্রিপশন আইটেম",
  image: getAppropriateMedicineImage(item.name, idx),
  inStock: true,
  stock: 100,
  isAvailable: true,
  rating: 4.8,
  reviewCount: 15,
  brand: item.brand,
  descriptionBn: `${item.brand} ফার্মাসিউটিক্যালসের অফিসিয়াল অনুমোদিত ঔষধ।`,
  descriptionEn: `Official approved medicine formulation by ${item.brand}.`,
  displayOrder: idx + 1
}));
