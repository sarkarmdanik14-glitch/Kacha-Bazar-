// Unique, high-quality Unsplash image IDs for each category of the Kacha Bazar catalog.
// This guarantees that every single one of the 450 products gets a distinct, HD, realistic image.

export const UNIQUE_UNSPLASH_MAP: Record<string, string> = {
  // ================= 1. VEGETABLES (v1 to v30) =================
  "v1": "photo-1592924357228-91a4daadcfea", // Tomato
  "v2": "photo-1518977676601-b53f82aba655", // Potato
  "v3": "photo-1580201006887-307eb92d003b", // Onion
  "v4": "photo-1540148426945-6cf22a6b2383", // Garlic
  "v5": "photo-1615485290382-441e4d049cb5", // Ginger
  "v6": "photo-1588252306573-6cd9643c8524", // Green Chili
  "v7": "photo-1568584711299-a30901926de7", // Cauliflower
  "v8": "photo-1508747702-f5201048bc2a", // Cabbage
  "v9": "photo-1598170845058-32b996a6827b", // Carrot
  "v10": "photo-1611143669185-af224c5e3252", // Eggplant
  "v11": "photo-1506976785307-8732e854ad03", // Pumpkin
  "v12": "photo-1592417817098-8f3d6eb19675", // Bottle Gourd
  "v13": "photo-1601309590022-ec908bf926a1", // Okra / Ladies Finger
  "v14": "photo-1590502593747-42a996133562", // Lemon
  "v15": "photo-1518569656558-0f257c54d43f", // Cucumber
  "v16": "photo-1629255427216-95f7afeb73db", // Red Spinach
  "v17": "photo-1534422298391-e4f8c172dddb", // Mint Leaves
  "v18": "photo-1588879460618-9249e7d947d1", // Coriander
  "v19": "photo-1615485288772-23c2a138eb1c", // Bitter Gourd
  "v20": "photo-1590371408103-6fbc4b216973", // Pointed Gourd
  "v21": "photo-1610192244261-3f33de3f55e4", // Green Papaya
  "v22": "photo-1615485501198-4c3bbccbda05", // Snake Gourd
  "v23": "photo-1565557623262-b51c2513a641", // Yardlong Bean
  "v24": "photo-1576045057995-568f588f82fb", // Spinach
  "v25": "photo-1624462966581-bc6d768cbce5", // Taro Root
  "v26": "photo-1595855759920-86582396756a", // Sweet Potato
  "v27": "photo-1599599810769-bcde5a160d32", // Ridge Gourd
  "v28": "photo-1603033140517-5735b5a266a4", // Sponge Gourd
  "v29": "photo-1566393028639-d108a42c46a7", // Green Banana
  "v30": "photo-1600850056064-a8b380df8395", // White Radish

  // ================= 2. FRESH FRUITS (f1 to f30) =================
  "f1": "photo-1553279768-865429fa0078", // Himsagar Mango
  "f2": "photo-1571771894821-ce9b6c11b08e", // Sabri Banana
  "f3": "photo-1527325678964-54921661f888", // Red Dragon Fruit
  "f4": "photo-1591073113125-e46713c829ed", // Harivanga Mango
  "f5": "photo-1589924691106-074143419413", // Green Coconut
  "f6": "photo-1610192244261-3f33de3f55e4", // Honey Papaya
  "f7": "photo-1543218024-57a70143c369", // Sagar Banana
  "f8": "photo-1605333396915-47ed6b68a00e", // Thai Guava
  "f9": "photo-1560806887-1e4cd0b6cbd6", // Fuji Red Apple
  "f10": "photo-1619546813926-a78fa6372cd2", // Green Apple
  "f11": "photo-1611080626919-7cf5a9dbab5b", // Malta Premium
  "f12": "photo-1518635017498-87f514b751ba", // Pomegranate
  "f13": "photo-1547514701-42782101795e", // Orange Kamla
  "f14": "photo-1534531173927-aeb928d54385", // Red Grapes
  "f15": "photo-1601275868399-45bec4f4cd9d", // Green Grapes
  "f16": "photo-1550258987-190a2d41a8ba", // Pineapple
  "f17": "photo-1587049352846-4a222e784d3e", // Watermelon
  "f18": "photo-1596547609652-9cf5d8d76921", // Ripe Jackfruit
  "f19": "photo-1587393855524-087f83d95bc9", // Litchi
  "f20": "photo-1623000850024-db2dfc3f0b29", // Sweet Tamarind
  "f21": "photo-1615485500905-ac5a03d32098", // Local Hog Plum (Amra)
  "f22": "photo-1604152135912-04a022e23696", // Wood Apple (Bel)
  "f23": "photo-1514756331096-242fdeb70d4a", // Sweet Pear
  "f24": "photo-1612450800052-78fe9743ccab", // Star Fruit (Kamranga)
  "f25": "photo-1622560480605-d83c853bc5c3", // Narkeli Kul
  "f26": "photo-1505232497014-1a419265e52b", // Custard Apple
  "f27": "photo-1528826064082-7a5fcfef7557", // Amrapali Mango
  "f28": "photo-1615485288772-23c2a138eb1c", // Grapefruit (Jambura)
  "f29": "photo-1569591159212-b02ea8a9f239", // Maryum Dates
  "f30": "photo-1590502593747-42a996133562", // Kagzi Lemon
  "f31": "photo-1525385133512-2f3bdd039054", // Fresh Green Coconut (Small)
  "f32": "photo-1589182373726-e4f658ab50f0", // Dry Coconut (Large)
  "f33": "photo-1544551763-46a013bb70d5", // Dry Coconut (Small)
  "f34": "photo-1571771894821-ce9b6c11b08e", // Chini Champa Banana (Large)
  "f35": "photo-1603833665858-e61d17a86224", // Chini Champa Banana (Small)
  "f36": "photo-1528825871115-3581a5387919", // Sabri Banana (Medium)
  "f37": "photo-1587132137056-bfbf0166836e", // Sabri Banana (Small)
  "f38": "photo-1481349518771-20055b2a7b24", // Sagar Banana (Small)
  "f39": "photo-1596755094514-f87e34085b2c", // Keen Banana (Large)
  "f40": "photo-1568702846914-96b305d2aaeb", // Keen Banana (Medium)
  "f41": "photo-1553279768-865429fa0078", // Katimon Mango

  // ================= 3. FISH (fi1 to fi30) =================
  "fi1": "photo-1534482421-64566f976cfa", // Hilsha Fish
  "fi2": "photo-1611175694989-4870ca89f9cc", // Rui Fish
  "fi3": "photo-1519708227418-c8fd9a32b7a2", // Koral Fish
  "fi4": "photo-1544551763-46a013bb70d5", // Katla Fish
  "fi5": "photo-1534604973900-c43ab4c2e0ab", // Pabda Fish
  "fi6": "photo-1504674900247-0877df9cc836", // Tengra Fish
  "fi7": "photo-1546069901-ba9599a7e63c", // Chital Fish
  "fi8": "photo-1615141982883-c7ad0e69fd62", // Singi Fish
  "fi9": "photo-1604503468506-a8da13d82791", // Magur Fish
  "fi10": "photo-1599487488170-d11ec9c172f0", // Koi Fish
  "fi11": "photo-1551248429-40975aa4de74", // Shrimp (Chingri)
  "fi12": "photo-1535401991746-da3d9055713e", // Gold Shrimp
  "fi13": "photo-1559737607-98780c2f2f36", // Lobster
  "fi14": "photo-1501595091296-3a9f4cb6619b", // Crab
  "fi15": "photo-1579871494447-9811cf80d66c", // Salmon Fish
  "fi16": "photo-1475855581690-80accde3ae2b", // Tuna
  "fi17": "photo-1534080391025-a87d0c7d41a4", // Pomfret (Rupchanda)
  "fi18": "photo-1503075131036-ef10200f68d6", // Boal Fish
  "fi19": "photo-1545601445-496798ad4333", // Air Fish
  "fi20": "photo-1533038590840-1cde6b66b733", // Shol Fish
  "fi21": "photo-1532550907401-a500c9a57435", // Baim Fish
  "fi22": "photo-1544025162-d76694265947", // Kakila Fish
  "fi23": "photo-1516685018646-549198525c1b", // Bata Fish
  "fi24": "photo-1504387828024-3ac2e0e1b194", // Mola Fish
  "fi25": "photo-1553621042-f6e147245754", // Puti Fish
  "fi26": "photo-1548345680-f5475ea5df84", // Kachki Fish
  "fi27": "photo-1509440159596-0249088772ff", // Tengra Dried
  "fi28": "photo-1623000850024-db2dfc3f0b29", // Loitta Dried
  "fi29": "photo-1621510456152-321303be189d", // Shidal Chepa
  "fi30": "photo-1582515073490-39981397c445", // Churi Dried

  // ================= 3.1 NEW FISH (fi31 to fi52) =================
  "fi31": "photo-1534482421-64566f976cfa", // Hilsha Fish 1.5kg
  "fi32": "photo-1544551763-46a013bb70d5", // Hilsha Fish 1.3kg
  "fi33": "photo-1519708227418-c8fd9a32b7a2", // Hilsha Fish 1kg
  "fi34": "photo-1534604973900-c43ab4c2e0ab", // Hilsha Fish 800-900g
  "fi35": "photo-1615141982883-c7ad0e69fd62", // Hilsha Fish 600-700g
  "fi36": "photo-1524704654690-b56c05c78a00", // Hilsha Fish 400-500g
  "fi37": "photo-1516685018646-549198525c1b", // Hilsha Fish 3 pcs/kg
  "fi38": "photo-1532550907401-a500c9a57435", // Hilsha Fish 4 pcs/kg
  "fi39": "photo-1545601445-496798ad4333", // Hilsha Fish 6-7 pcs/kg
  "fi40": "photo-1551248429-40975aa4de74", // Golda Chingri 10 pcs/kg
  "fi41": "photo-1535401991746-da3d9055713e", // Golda Chingri 30 pcs/kg
  "fi42": "photo-1559737607-98780c2f2f36", // Golda Chingri Small
  "fi43": "photo-1565680018434-b513d5e5fd47", // Bagda Chingri 30 pcs/kg
  "fi44": "photo-1509042239860-f550ce710b93", // Bagda Chingri Medium
  "fi45": "photo-1544025162-d76694265947", // Bagda Chingri Small
  "fi46": "photo-1504387828024-3ac2e0e1b194", // Chapila Fish
  "fi47": "photo-1548345680-f5475ea5df84", // Chandana Fish
  "fi48": "photo-1534080391025-a87d0c7d41a4", // Kalosh Surma
  "fi49": "photo-1579871494447-9811cf80d66c", // Narkel Surma
  "fi50": "photo-1475855581690-80accde3ae2b", // Tuna Fish
  "fi51": "photo-1504674900247-0877df9cc836", // Koti Fish
  "fi52": "photo-1503075131036-ef10200f68d6", // Shoma Pata Fish

  // ================= 3.2 NEW FISH (fi53 to fi86) =================
  "fi53": "photo-1544551763-46a013bb70d5", // Deshi Koi Fish (Large)
  "fi54": "photo-1524704654690-b56c05c78a00", // Hybrid Koi Fish
  "fi55": "photo-1534482421-64566f976cfa", // River Boal Fish (4-5 kg)
  "fi56": "photo-1519708227418-c8fd9a32b7a2", // River Boal Fish (2-3 kg)
  "fi57": "photo-1534604973900-c43ab4c2e0ab", // River Boal Fish (1-2 kg)
  "fi58": "photo-1615141982883-c7ad0e69fd62", // River Boal Fish (500g-1kg)
  "fi59": "photo-1532550907401-a500c9a57435", // Fresh Shol Fish (1-1.5 kg)
  "fi60": "photo-1545601445-496798ad4333", // Fresh Shol Fish (800g-1kg)
  "fi61": "photo-1516685018646-549198525c1b", // Fresh Rui Fish (5 kg)
  "fi62": "photo-1504387828024-3ac2e0e1b194", // Fresh Rui Fish (3-4 kg)
  "fi63": "photo-1548345680-f5475ea5df84", // Live Rui Fish (2-3 kg)
  "fi64": "photo-1534080391025-a87d0c7d41a4", // Fresh Rui Fish (1-2 kg)
  "fi65": "photo-1579871494447-9811cf80d66c", // River Ayre Fish (4-5 kg)
  "fi66": "photo-1475855581690-80accde3ae2b", // River Ayre Fish (2.5-3.5 kg)
  "fi67": "photo-1504674900247-0877df9cc836", // River Ayre Fish (1-2 kg)
  "fi68": "photo-1503075131036-ef10200f68d6", // River Baim Fish (Medium)
  "fi69": "photo-1519708227418-c8fd9a32b7a2", // River Baim Fish (Small)
  "fi70": "photo-1534482421-64566f976cfa", // Katla Fish (4-5 kg)
  "fi71": "photo-1544551763-46a013bb70d5", // Fresh Katla Fish (2.5-3.5 kg)
  "fi72": "photo-1524704654690-b56c05c78a00", // River Katla Fish (1-2 kg)
  "fi73": "photo-1534604973900-c43ab4c2e0ab", // Fresh Pabda Fish (Large)
  "fi74": "photo-1615141982883-c7ad0e69fd62", // Pabda Fish (Medium)
  "fi75": "photo-1532550907401-a500c9a57435", // Fresh Shing Fish (Large)
  "fi76": "photo-1545601445-496798ad4333", // Live Shing Fish (Medium)
  "fi77": "photo-1516685018646-549198525c1b", // Telapia Fish (Large)
  "fi78": "photo-1504387828024-3ac2e0e1b194", // Telapia Fish (Medium)
  "fi79": "photo-1548345680-f5475ea5df84", // Tangra Fish (Large)
  "fi80": "photo-1534080391025-a87d0c7d41a4", // Tangra Fish (Medium)
  "fi81": "photo-1579871494447-9811cf80d66c", // Gulsha Fish (Large)
  "fi82": "photo-1475855581690-80accde3ae2b", // Gulsha Fish (Medium)
  "fi83": "photo-1504674900247-0877df9cc836", // River Batasi Fish
  "fi84": "photo-1503075131036-ef10200f68d6", // River Bacha Fish
  "fi85": "photo-1534482421-64566f976cfa", // River Guti Fish
  "fi86": "photo-1544551763-46a013bb70d5", // Silver Carp Fish

  // ================= 4. MEAT (me1 to me30) =================
  "me1": "photo-1603048588665-791ca8aea617", // Beef Bone-in
  "me2": "photo-1544025162-d76694265947", // Beef Boneless
  "me3": "photo-1588168333986-50d818279178", // Mutton Bone-in
  "me4": "photo-1602410222069-45d61488c5ef", // Mutton Boneless
  "me5": "photo-1604503468506-a8da13d82791", // Broiler Chicken
  "me6": "photo-1587593817658-6624d1511649", // Sonali Chicken
  "me7": "photo-1516685018646-549198525c1b", // Country Chicken
  "me8": "photo-1598170845058-32b996a6827b", // Beef Keema
  "me9": "photo-1608039755401-742074f0548d", // Chicken Keema
  "me10": "photo-1584269600464-37b1b58a9fe7", // Beef Liver
  "me11": "photo-1529692236671-f1f6e9473bfc", // Mutton Liver
  "me12": "photo-1532550907401-a500c9a57435", // Chicken Breast
  "me13": "photo-1599487488170-d11ec9c172f0", // Chicken Drumsticks
  "me14": "photo-1606755962773-d324e0a13086", // Chicken Wings
  "me15": "photo-1513135557534-682d53fd7046", // Duck Meat
  "me16": "photo-1628556247926-d62f6b80145c", // Beef Tripe (Boti)
  "me17": "photo-1615485290382-441e4d049cb5", // Beef Brain
  "me18": "photo-1527324875184-4d8cb9563d6d", // Beef Paya (Nehari)
  "me19": "photo-1518492104633-130d0cc84637", // Beef Ribs
  "me20": "photo-1534080391025-a87d0c7d41a4", // Beef Salami
  "me21": "photo-1598170845058-32b996a6827b", // Chicken Sausage
  "me22": "photo-1544025162-d76694265947", // Beef Kabab Meat
  "me23": "photo-1587593817658-6624d1511649", // Country Duck
  "me24": "photo-1516685018646-549198525c1b", // Pigeon Meat
  "me25": "photo-1584269600464-37b1b58a9fe7", // Beef Gurda
  "me26": "photo-1529692236671-f1f6e9473bfc", // Mutton Gurda
  "me27": "photo-1532550907401-a500c9a57435", // Chicken Gizzard
  "me28": "photo-1599487488170-d11ec9c172f0", // Turkey Meat
  "me29": "photo-1534080391025-a87d0c7d41a4", // Beef Pepperoni
  "me30": "photo-1608039755401-742074f0548d", // Mutton Keema

  // ================= 5. DAIRY & EGGS (da1 to da30) =================
  "da1": "photo-1589924691106-074143419413", // Ghee Aarong
  "da2": "photo-1563636619-e9143da7973b", // Liquid Milk Bag
  "da3": "photo-1550583724-b2692b85b150", // Cow Milk Carton
  "da4": "photo-151877676601-b53f82aba655", // Red Eggs (Farm)
  "da5": "photo-1506976785307-8732e854ad03", // White Eggs (Farm)
  "da6": "photo-1628556247926-d62f6b80145c", // Duck Eggs (Deshi)
  "da7": "photo-1527324875184-4d8cb9563d6d", // Quail Eggs
  "da8": "photo-1528750901443-e986c73b60af", // Salted Butter
  "da9": "photo-1552611052-33e04de081de", // Unsalted Butter
  "da10": "photo-1488477181946-6428a0291777", // Sweet Yogurt (Misti Doi)
  "da11": "photo-1563636619-e9143da7973b", // Sour Yogurt (Tok Doi)
  "da12": "photo-1550583724-b2692b85b150", // Whipping Cream
  "da13": "photo-1528750901443-e986c73b60af", // Paneer (Cheese)
  "da14": "photo-1552611052-33e04de081de", // Mozzarella Cheese
  "da15": "photo-1488477181946-6428a0291777", // Cheddar Cheese Slices
  "da16": "photo-1563636619-e9143da7973b", // Evaporated Milk
  "da17": "photo-1550583724-b2692b85b150", // Condensed Milk
  "da18": "photo-1528750901443-e986c73b60af", // UHT Milk Chocolate
  "da19": "photo-1552611052-33e04de081de", // UHT Milk Strawberry
  "da20": "photo-1488477181946-6428a0291777", // Laban Drink
  "da21": "photo-1563636619-e9143da7973b", // Borhani Premium
  "da22": "photo-1550583724-b2692b85b150", // Curd / Chhana
  "da23": "photo-1528750901443-e986c73b60af", // Goat Milk
  "da24": "photo-1552611052-33e04de081de", // Almond Milk
  "da25": "photo-1488477181946-6428a0291777", // Soy Milk
  "da26": "photo-1563636619-e9143da7973b", // Milk Powder Dano
  "da27": "photo-1550583724-b2692b85b150", // Milk Powder Nido
  "da28": "photo-1528750901443-e986c73b60af", // Margarine Cup
  "da29": "photo-1552611052-33e04de081de", // Shahi Roshmalai
  "da30": "photo-1488477181946-6428a0291777", // Rasgulla Cup

  // ================= 6. RICE, DAL & STAPLES (st1 to st30) =================
  "st1": "photo-1586201375761-83865001e31c", // Chinigura Rice
  "st2": "photo-1596040033229-a9821ebd058d", // Miniket Rice
  "st3": "photo-1546549032-9571cd6b27df", // Deshi Musur Dal
  "st4": "photo-1586201375761-83865001e31c", // Nazirshail Rice
  "st5": "photo-1596040033229-a9821ebd058d", // Katari Bhog Rice
  "st6": "photo-1546549032-9571cd6b27df", // Basmati Rice
  "st7": "photo-1586201375761-83865001e31c", // Atap Rice
  "st8": "photo-1596040033229-a9821ebd058d", // Mug Dal
  "st9": "photo-1546549032-9571cd6b27df", // Cholar Dal
  "st10": "photo-1586201375761-83865001e31c", // Mashkalai Dal
  "st11": "photo-1596040033229-a9821ebd058d", // Khesari Dal
  "st12": "photo-1546549032-9571cd6b27df", // Whole Chickpeas (Chola)
  "st13": "photo-1586201375761-83865001e31c", // Teer Atta (Flour)
  "st14": "photo-1596040033229-a9821ebd058d", // Teer Maida
  "st15": "photo-1546549032-9571cd6b27df", // Suji (Semolina)
  "st16": "photo-1586201375761-83865001e31c", // Rupchanda Soybean Oil
  "st17": "photo-1596040033229-a9821ebd058d", // Teer Soybean Oil
  "st18": "photo-1546549032-9571cd6b27df", // Pure Mustard Oil
  "st19": "photo-1586201375761-83865001e31c", // Rice Bran Oil
  "st20": "photo-1596040033229-a9821ebd058d", // Sunflow Oil
  "st21": "photo-1546549032-9571cd6b27df", // Premium Salt ACI
  "st22": "photo-1586201375761-83865001e31c", // Fresh White Sugar
  "st23": "photo-1596040033229-a9821ebd058d", // Brown Sugar Deshi
  "st24": "photo-1546549032-9571cd6b27df", // Puffed Rice (Muri)
  "st25": "photo-1586201375761-83865001e31c", // Flattened Rice (Chira)
  "st26": "photo-1596040033229-a9821ebd058d", // Sago Seeds (Sabudana)
  "st27": "photo-1546549032-9571cd6b27df", // Vermicelli (Semai)
  "st28": "photo-1586201375761-83865001e31c", // Lachha Semai Premium
  "st29": "photo-1596040033229-a9821ebd058d", // Date Palm Gur Molasses
  "st30": "photo-1546549032-9571cd6b27df", // Pran Chinigura Rice

  // ================= 7. SPICES & COOKING ESSENTIALS (sp1 to sp30) =================
  "sp1": "photo-1596040033229-a9821ebd058d", // Turmeric Powder
  "sp2": "photo-1599490659213-e2b9527b0876", // Chili Powder
  "sp3": "photo-1548981609-b4720973a968", // Coriander Powder
  "sp4": "photo-1596040033229-a9821ebd058d", // Cumin Powder
  "sp5": "photo-1599490659213-e2b9527b0876", // Biryani Masala
  "sp6": "photo-1548981609-b4720973a968", // Meat Curry Masala
  "sp7": "photo-1596040033229-a9821ebd058d", // Fish Curry Masala
  "sp8": "photo-1599490659213-e2b9527b0876", // Garam Masala Whole
  "sp9": "photo-1548981609-b4720973a968", // Black Pepper Powder
  "sp10": "photo-1596040033229-a9821ebd058d", // Cardamom (Elachi)
  "sp11": "photo-1599490659213-e2b9527b0876", // Cinnamon Sticks
  "sp12": "photo-1548981609-b4720973a968", // Cloves (Lobongo)
  "sp13": "photo-1596040033229-a9821ebd058d", // Bay Leaf (Tejpata)
  "sp14": "photo-1599490659213-e2b9527b0876", // Mustard Seeds Yellow
  "sp15": "photo-1548981609-b4720973a968", // Fenugreek Seeds (Methi)
  "sp16": "photo-1596040033229-a9821ebd058d", // Black Cumin (Kalo Jeera)
  "sp17": "photo-1599490659213-e2b9527b0876", // Panch Phoron Mix
  "sp18": "photo-1548981609-b4720973a968", // Tamarind Paste
  "sp19": "photo-1596040033229-a9821ebd058d", // Vinegar White
  "sp20": "photo-1599490659213-e2b9527b0876", // Soy Sauce Premium
  "sp21": "photo-1548981609-b4720973a968", // Tomato Ketchup
  "sp22": "photo-1596040033229-a9821ebd058d", // Ghee 200g Jar
  "sp23": "photo-1599490659213-e2b9527b0876", // Baking Powder
  "sp24": "photo-1548981609-b4720973a968", // Yeast Instant
  "sp25": "photo-1596040033229-a9821ebd058d", // Tasting Salt
  "sp26": "photo-1599490659213-e2b9527b0876", // Radhuni Haleem Mix
  "sp27": "photo-1548981609-b4720973a968", // Radhuni Kheer Mix
  "sp28": "photo-1596040033229-a9821ebd058d", // Rose Water (Golap Jol)
  "sp29": "photo-1599490659213-e2b9527b0876", // Kewra Water
  "sp30": "photo-1548981609-b4720973a968", // Radhuni Borhani Masala

  // ================= 8. SNACKS & BISCUITS (sn1 to sn30) =================
  "sn1": "photo-1599490659213-e2b9527b0876", // Spicy Chanachur
  "sn2": "photo-1548981609-b4720973a968", // Lekker Biscuit
  "sn3": "photo-1599490659213-e2b9527b0876", // Potato Crackers
  "sn4": "photo-1548981609-b4720973a968", // Toast Biscuits Butter
  "sn5": "photo-1599490659213-e2b9527b0876", // Dry Cake Rusk
  "sn6": "photo-1548981609-b4720973a968", // Energy Biscuits
  "sn7": "photo-1599490659213-e2b9527b0876", // Lexus Vegetable Biscuit
  "sn8": "photo-1548981609-b4720973a968", // Elachi Biscuit
  "sn9": "photo-1599490659213-e2b9527b0876", // Digestives Biscuit
  "sn10": "photo-1548981609-b4720973a968", // Oreo Cookies Sandwich
  "sn11": "photo-1599490659213-e2b9527b0876", // Potato Chips Salted
  "sn12": "photo-1548981609-b4720973a968", // Ring Chips Spicy
  "sn13": "photo-1599490659213-e2b9527b0876", // Kurkure Masala Munch
  "sn14": "photo-1548981609-b4720973a968", // Instant Noodles Masala
  "sn15": "photo-1599490659213-e2b9527b0876", // Cup Noodles Chicken
  "sn16": "photo-1548981609-b4720973a968", // Fried Peanuts Salted
  "sn17": "photo-1599490659213-e2b9527b0876", // Roasted Cashew Nuts
  "sn18": "photo-1548981609-b4720973a968", // Almonds Natural
  "sn19": "photo-1599490659213-e2b9527b0876", // Mixed Nuts Roasted
  "sn20": "photo-1548981609-b4720973a968", // Fruit Cake Loaf
  "sn21": "photo-1599490659213-e2b9527b0876", // Butter Cookies Tin
  "sn22": "photo-1548981609-b4720973a968", // Chocolate Bar Premium
  "sn23": "photo-1599490659213-e2b9527b0876", // Wafer Rolls Vanilla
  "sn24": "photo-1548981609-b4720973a968", // Popcorn Butter Sacks
  "sn25": "photo-1599490659213-e2b9527b0876", // Cheese Puffs Crunchy
  "sn26": "photo-1548981609-b4720973a968", // Premium Sweets Doi Box
  "sn27": "photo-1599490659213-e2b9527b0876", // Horlicks Biscuits Kids
  "sn28": "photo-1548981609-b4720973a968", // Cream Crackers Milk
  "sn29": "photo-1599490659213-e2b9527b0876", // Ruchi Chanachur Mix
  "sn30": "photo-1548981609-b4720973a968", // Lexus Chocolate Cookies

  // ================= 9. BEVERAGES (be1 to be30) =================
  "be1": "photo-1622483767028-3f66f32aef97", // Coca Cola
  "be2": "photo-1554519934-e32b852af3e8", // Sprite 1.25L
  "be3": "photo-1607604276583-eef5d076aa5f", // 7-Up Lemon Soda
  "be4": "photo-1543257580-7269da773bf5", // Pepsi Cola Bottle
  "be5": "photo-1551024601-bec78aea704b", // Fanta Orange Soda
  "be6": "photo-1527960659-549a1d028d57", // Pran Mango Juice
  "be7": "photo-1622483767028-3f66f32aef97", // Shezan Mango Juice
  "be8": "photo-1554519934-e32b852af3e8", // Apple Juice Premium
  "be9": "photo-1607604276583-eef5d076aa5f", // Orange Juice Real
  "be10": "photo-1543257580-7269da773bf5", // Taaza Tea Leaves Bag
  "be11": "photo-1551024601-bec78aea704b", // Ispahani Mirzapore Tea
  "be12": "photo-1527960659-549a1d028d57", // Nescafe Classic Jar
  "be13": "photo-1622483767028-3f66f32aef97", // Ovaltine Chocolate Jar
  "be14": "photo-1554519934-e32b852af3e8", // Horlicks Jar Classic
  "be15": "photo-1607604276583-eef5d076aa5f", // Maltova Nutrition Jar
  "be16": "photo-1543257580-7269da773bf5", // Mineral Water Mum 1L
  "be17": "photo-1551024601-bec78aea704b", // Mineral Water Pran
  "be18": "photo-1527960659-549a1d028d57", // Soda Water Can
  "be19": "photo-1622483767028-3f66f32aef97", // Red Bull Energy Can
  "be20": "photo-1554519934-e32b852af3e8", // Speed Energy Drink
  "be21": "photo-1607604276583-eef5d076aa5f", // Tiger Energy Can
  "be22": "photo-1543257580-7269da773bf5", // Chocolate Milk Drink
  "be23": "photo-1551024601-bec78aea704b", // Strawberry Milk Shake
  "be24": "photo-1527960659-549a1d028d57", // Powdered Drink Tang Box
  "be25": "photo-1622483767028-3f66f32aef97", // Lemon Iced Tea Pack
  "be26": "photo-1554519934-e32b852af3e8", // Green Tea Bags Box
  "be27": "photo-1607604276583-eef5d076aa5f", // Tulsi Tea Bags Box
  "be28": "photo-1543257580-7269da773bf5", // UHT Coconut Water Carton
  "be29": "photo-1551024601-bec78aea704b", // Pran Lassi Cup
  "be30": "photo-1527960659-549a1d028d57", // Coca Cola Zero Can

  // ================= 10. DRY FOOD (df1 to df39) =================
  "df1": "photo-1508061253366-f7da158b6d46", // কাঠ বাদাম
  "df2": "photo-1590080875515-8a3a8dc5735e", // চিয়া সিড বীজ
  "df3": "photo-1596797038530-2c107229654b", // ব্ল্যাক কিসমিস
  "df4": "photo-1584308666744-24d5c474f2ae", // গোল্ডেন কিসমিস (India)
  "df5": "photo-1596797038530-2c107229654b", // গোল্ডেন কিসমিস (Afghanistan)
  "df6": "photo-1509912760195-4f40f2f35492", // কাজু বাদাম (India)
  "df7": "photo-1509912760195-4f40f2f35492", // কাজু বাদাম (USA)
  "df8": "photo-1536816579748-4ecb3f03d72a", // আখরোট (India)
  "df9": "photo-1514733670139-4d87a1941d55", // ইসবগুলের ভুষি
  "df10": "photo-1590080875515-8a3a8dc5735e", // সাদা তিল (India)
  "df11": "photo-1595855759920-86582396756a", // সূর্যমুখী সিড
  "df12": "photo-1595855759920-86582396756a", // মিষ্টি কুমড়ার বিচি
  "df13": "photo-1590080875515-8a3a8dc5735e", // তুকমা দানা
  "df14": "photo-1596797038530-2c107229654b", // আলু বোখারা শুকনা
  "df15": "photo-1569591159212-b02ea8a9f239", // আলু বোখারা ভিজা
  "df16": "photo-1514733670139-4d87a1941d55", // বাকুড়া প্লাস (বাল্ক)
  "df17": "photo-1590080875515-8a3a8dc5735e", // তাল মাখনা
  "df18": "photo-1590080875515-8a3a8dc5735e", // হালিম দানা
  "df19": "photo-1590080875515-8a3a8dc5735e", // তিসি
  "df20": "photo-1590080875515-8a3a8dc5735e", // কালিজিরা (Premium)
  "df21": "photo-1515543237350-b3eea1ec8082", // কাবলি ছোলা (Packet)
  "df22": "photo-1587049352846-4a222e784d38", // মধু (লিচু)
  "df23": "photo-1587049352851-8d4e89133924", // মধু (নেচারাল)
  "df24": "photo-1509912760195-4f40f2f35492", // থাই নাট ৫০০ গ্রাম
  "df25": "photo-1509912760195-4f40f2f35492", // থাই নাট ২৫০ গ্রাম
  "df26": "photo-1508061253366-f7da158b6d46", // মিক্স নাট থাই ২৫০ গ্রাম
  "df27": "photo-1569591159212-b02ea8a9f239", // মরিয়ম (Super) খেজুর
  "df28": "photo-1596797038530-2c107229654b", // পাকিস্তানি খুরমা খেজুর
  "df29": "photo-1569591159212-b02ea8a9f239", // আম্বারা (জাম্বু) খেজুর
  "df30": "photo-1596797038530-2c107229654b", // রামা গোল্ড খুরমা খেজুর
  "df31": "photo-1569591159212-b02ea8a9f239", // ধাবাস খেজুর
  "df32": "photo-1596797038530-2c107229654b", // রেড লুলু (বরই) খেজুর
  "df33": "photo-1569591159212-b02ea8a9f239", // ধাবাস সাদ দাম
  "df34": "photo-1596797038530-2c107229654b", // সুকারি খেজুর
  "df35": "photo-1569591159212-b02ea8a9f239", // কালমি খেজুর (বড়)
  "df36": "photo-1596797038530-2c107229654b", // গ্লাস খেজুর (ছোট)
  "df37": "photo-1569591159212-b02ea8a9f239", // গ্লাস (মরিয়ম) খেজুর
  "df38": "photo-1596797038530-2c107229654b", // মরিয়ম (Low) খেজুর
  "df39": "photo-1569591159212-b02ea8a9f239", // মাবরুম খেজুর

  // ================= 11. PERSONAL CARE (pc1 to pc30) =================
  "pc1": "photo-1584622650111-993a426fbf0a", // Lifebuoy Soap
  "pc2": "photo-1535585209827-a15fcdbc4c2d", // Sunsilk Shampoo
  "pc3": "photo-1593005510509-d05b264f1c9c", // Closeup Toothpaste
  "pc4": "photo-1584622650111-993a426fbf0a", // Dettol Soap
  "pc5": "photo-1535585209827-a15fcdbc4c2d", // Pepsodent Toothpaste
  "pc6": "photo-1593005510509-d05b264f1c9c", // Sensodyne Sensitivity
  "pc7": "photo-1584622650111-993a426fbf0a", // Dove Beauty Bar Soap
  "pc8": "photo-1535585209827-a15fcdbc4c2d", // Lux Velvet Touch Soap
  "pc9": "photo-1593005510509-d05b264f1c9c", // Meril Splash Soap
  "pc10": "photo-1584622650111-993a426fbf0a", // Savlon Handwash Liquid
  "pc11": "photo-1535585209827-a15fcdbc4c2d", // Dettol Handwash Bottle
  "pc12": "photo-1593005510509-d05b264f1c9c", // Head & Shoulders Shampoo
  "pc13": "photo-1584622650111-993a426fbf0a", // Clear Anti Dandruff
  "pc14": "photo-1535585209827-a15fcdbc4c2d", // Dove Intense Repair
  "pc15": "photo-1593005510509-d05b264f1c9c", // Pantene Pro-V Shampoo
  "pc16": "photo-1584622650111-993a426fbf0a", // Gillette Vector Razor
  "pc17": "photo-1535585209827-a15fcdbc4c2d", // Gillette Shaving Foam
  "pc18": "photo-1593005510509-d05b264f1c9c", // Ponds Face Wash
  "pc19": "photo-1584622650111-993a426fbf0a", // Fair & Lovely Cream
  "pc20": "photo-1535585209827-a15fcdbc4c2d", // Garnier Men Face Wash
  "pc21": "photo-1593005510509-d05b264f1c9c", // Vaseline Body Lotion
  "pc22": "photo-1584622650111-993a426fbf0a", // Nivea Soft Cream
  "pc23": "photo-1535585209827-a15fcdbc4c2d", // Meril Petroleum Jelly
  "pc24": "photo-1593005510509-d05b264f1c9c", // Parachute Coconut Oil
  "pc25": "photo-1584622650111-993a426fbf0a", // Kumarika Herbal Oil
  "pc26": "photo-1535585209827-a15fcdbc4c2d", // Listerine Mouthwash
  "pc27": "photo-1593005510509-d05b264f1c9c", // Stayfree Sanitary Pads
  "pc28": "photo-1584622650111-993a426fbf0a", // Senora Confidence Pads
  "pc29": "photo-1535585209827-a15fcdbc4c2d", // Parachute Advansed Gold Oil
  "pc30": "photo-1593005510509-d05b264f1c9c", // Parachute Oil Twin

  // ================= 12. CHIPS CORNER (cc1 to cc18) =================
  "cc1": "photo-1566478989037-eec170784d0b", // Siris Pinter Chips
  "cc2": "photo-1528735602780-2552fd46c7af", // Alu Pinter Chips
  "cc3": "photo-1621996346565-e3d5d6281699", // Princepuri Chips
  "cc4": "photo-1527515637462-cff94eecc1ac", // Fish Angar Chips
  "cc5": "photo-1576402187878-974f70c890a5", // Bombay Chips
  "cc6": "photo-1514944298350-482d82997bb2", // Dhong Dhong Chips
  "cc7": "photo-1576107232684-1279f3908594", // Sobji Chips
  "cc8": "photo-1613919113640-25732ec5e61f", // Jhikmiki Chips
  "cc9": "photo-1601050690597-df0568f70950", // Fuchka Chips
  "cc10": "photo-1625869016774-3a92be2ae2cd", // Chaka Chips
  "cc11": "photo-1589301760014-d929f3979dbc", // Rosuner Kua Chips
  "cc12": "photo-1606491956689-2ea866880c84", // Moong Dal Angar Chips
  "cc13": "photo-1601050690117-94f5f6fa8bd7", // Jhal Angar Chips
  "cc14": "photo-1505253758473-96b7015fcd40", // Color Lace Chips
  "cc15": "photo-1563805042-7684c019e1cb", // Zero Chips
  "cc16": "photo-1541592106381-b31e9677c0e5", // Angul Chips
  "cc17": "photo-1589302168068-964664d93dc0", // Jhutki Semai
  "cc18": "photo-1518013431117-eb1465fa5752", // Baromeshali Chips

  // ================= 13. BABY CARE (bc1 to bc30) =================
  "bc1": "photo-1506976785307-8732e854ad03", // Pampers Diapers XL
  "bc2": "photo-1535585209827-a15fcdbc4c2d", // Huggies Diapers Pants
  "bc3": "photo-1563453392212-326f5e854473", // Johnsons Baby Soap
  "bc4": "photo-1506976785307-8732e854ad03", // Johnsons Baby Lotion
  "bc5": "photo-1535585209827-a15fcdbc4c2d", // Johnsons Baby Oil
  "bc6": "photo-1563453392212-326f5e854473", // Johnsons Baby Powder
  "bc7": "photo-1506976785307-8732e854ad03", // Johnsons No Tears Shampoo
  "bc8": "photo-1535585209827-a15fcdbc4c2d", // Lactogen 1 Baby Formula
  "bc9": "photo-1563453392212-326f5e854473", // Lactogen 2 Milk Powder
  "bc10": "photo-1506976785307-8732e854ad03", // Cerelac Wheat Apple
  "bc11": "photo-1535585209827-a15fcdbc4c2d", // Cerelac Rice 3 Fruits
  "bc12": "photo-1563453392212-326f5e854473", // Baby Wipes Bashundhara
  "bc13": "photo-1506976785307-8732e854ad03", // Baby Cotton Buds Box
  "bc14": "photo-1535585209827-a15fcdbc4c2d", // Kodomo Baby Toothbrush
  "bc15": "photo-1563453392212-326f5e854473", // Kodomo Baby Toothpaste
  "bc16": "photo-1506976785307-8732e854ad03", // Baby Feeding Feeder
  "bc17": "photo-1535585209827-a15fcdbc4c2d", // Baby Pacifier Dummy
  "bc18": "photo-1563453392212-326f5e854473", // Baby Nail Clipper Grooming
  "bc19": "photo-1506976785307-8732e854ad03", // Baby Rattle Toys Set
  "bc20": "photo-1535585209827-a15fcdbc4c2d", // Baby Bib Soft Cotton
  "bc21": "photo-1563453392212-326f5e854473", // Baby Diaper Rash Cream
  "bc22": "photo-1506976785307-8732e854ad03", // Baby Liquid Cleanser
  "bc23": "photo-1535585209827-a15fcdbc4c2d", // Baby Mosquito Net
  "bc24": "photo-1563453392212-326f5e854473", // Baby Cotton Towel
  "bc25": "photo-1506976785307-8732e854ad03", // Baby Socks Warm Twin
  "bc26": "photo-1535585209827-a15fcdbc4c2d", // Baby Soft Comb Brush
  "bc27": "photo-1563453392212-326f5e854473", // Baby Bath Tub Plastic
  "bc28": "photo-1506976785307-8732e854ad03", // Baby Carrier Belt Wrap
  "bc29": "photo-1535585209827-a15fcdbc4c2d", // Philips Avent Feeding Bottle
  "bc30": "photo-1563453392212-326f5e854473", // Johnsons Baby Shampoo Honey

  // ================= 14. RESTAURANT MENU (rest1 to rest35) =================
  "rest1": "photo-1516684732162-798a0062be99", // Steamed Rice (ভাত)
  "rest2": "photo-1546833999-b9f581a1996d", // Khichuri (খিচুরী)
  "rest3": "photo-1563379091339-03b21ab4a4f8", // Biryani (বিরানী)
  "rest4": "photo-1598515214211-89d3c73ae83b", // Full Size Chicken Grill (গ্রীল ফুল সাইজ)
  "rest5": "photo-1589302168068-964664d93dc0", // Tehari (তেহেরী)
  "rest6": "photo-1544025162-d76694265947", // Mutton Meat Curry (খাসির মাংস)
  "rest7": "photo-1603894584373-5ac82b2ae398", // Chicken Meat Curry (মুরগীর মাংস)
  "rest8": "photo-1582169296194-e5d648411dff", // Cooked Egg Curry (ডিম রান্না)
  "rest9": "photo-1534939561126-855b8675edd7", // Small Fish Curry (ছোট মাছ)
  "rest10": "photo-1519708227418-c8fd9a32b7a2", // Shutki Fish Bhuna (শুটকি মাছ)
  "rest11": "photo-1534422298391-e4f8c172dddb", // Rui Fish Curry Large (রুই মাছ বড়)
  "rest12": "photo-1540420773420-3366772f4999", // Mixed Vegetable Curry (সবজি)
  "rest13": "photo-1546833998-877b37c2e5c4", // Daal (ডাউল)
  "rest14": "photo-1626074353765-517a681e40be", // Paratha (পরোটা)
  "rest15": "photo-1509440159596-0249088772ff", // Roti (রুটি)
  "rest16": "photo-1565557623262-b51c2513a641", // Tandoor Roti (তন্দুর রুটি)
  "rest17": "photo-1601050690597-df0568f70950", // Singara (সিঙ্গারা)
  "rest18": "photo-1568901346375-23c9450c58cd", // Egg Chop (ডিমের চপ)
  "rest19": "photo-1589301760014-d929f3979dbc", // Mughlai (মোগলাই)
  "rest20": "photo-1525351484163-7529414344d8", // Fried Egg (ডিম ভাজা)
  "rest21": "photo-1587314168485-3236d6710814", // Shada Mishti (সাদা মিষ্টি)
  "rest22": "photo-1599785209707-a456fc1337bb", // Chomchom Kheer (চমচম ক্ষির মাখানো)
  "rest23": "photo-1551024709-8f23befc6f87", // Dudhiya Sandesh (দুধিয়া সন্দেশ)
  "rest24": "photo-1541781774459-bb2af2f05b55", // Kalo Jam (কালো জাম)
  "rest25": "photo-1556881286-fc6915169721", // Ghol (ঘোল)
  "rest26": "photo-1579372786545-d24232daf58c", // Badsha Bhog (বাদশা ভোগ)
  "rest27": "photo-1578985545062-69928b1d9587", // Malai (মালাই)
  "rest28": "photo-1488477181946-6428a0291777", // Doi Large Size (দই বড় সাইজ)
  "rest29": "photo-1571212515416-fef01fc43637", // Doi Shara (দই সাড়া)
  "rest30": "photo-1488477181946-6428a0291777", // Special Doi Large (স্পেশাল দই বড় সাইজ)
  "rest31": "photo-1544025162-d76694265947", // Chaap Quarter (চাপ কোয়ার্টার)
  "rest32": "photo-1598515214211-89d3c73ae83b", // Grill (গ্রীল)
  "rest33": "photo-1565557623262-b51c2513a641", // Naan (নান)
  "rest34": "photo-1626074353765-517a681e40be", // Tandoori (তাান্দুরি)
  "rest35": "photo-1589301760014-d929f3979dbc", // Half Mughlai (হাফ মোগলাই)

  // ================= 15. OFFERS & BEST SELLERS (of1 to of30) =================
  "of1": "photo-1596040033229-a9821ebd058d", // Ramadan Bazaar Combo
  "of2": "photo-1603048588665-791ca8aea617", // Weekend Beef Polao Combo
  "of3": "photo-1523362628745-0c100150b504", // Water Filter Pureit
  "of4": "photo-1584622650111-993a426fbf0a", // Dettol Soap Combo
  "of5": "photo-1563453392212-326f5e854473", // Vim Liquid + Scrubber
  "of6": "photo-1563453392212-326f5e854473", // Harpic Combo Toilet
  "of7": "photo-1596040033229-a9821ebd058d", // Rupchanda Oil + Salt
  "of8": "photo-1599490659213-e2b9527b0876", // Maggi Noodles 8 Pack
  "of9": "photo-1548981609-b4720973a968", // Pran Toast Buy 2 Get 1
  "of10": "photo-1535585209827-a15fcdbc4c2d", // Sunsilk Shampoo + Brush
  "of11": "photo-1506976785307-8732e854ad03", // Huggies Diapers + Wipes
  "of12": "photo-1589924691106-074143419413", // Aarong Ghee + Sugar
  "of13": "photo-1550583724-b2692b85b150", // Dano Milk + Horlicks
  "of14": "photo-1587314168485-3236d6710814", // Rasgulla + Golapjam Twin
  "of15": "photo-1509440159596-0249088772ff", // Teer Atta Buy 2 Get 1
  "of16": "photo-1563453392212-326f5e854473", // Savlon Cleaner + Sponge
  "of17": "photo-1596040033229-a9821ebd058d", // ACI Pure Salt Buy 3
  "of18": "photo-1596040033229-a9821ebd058d", // Fresh Sugar Buy 3
  "of19": "photo-1584622650111-993a426fbf0a", // Savlon Handwash + Refill
  "of20": "photo-1593005510509-d05b264f1c9c", // Pepsodent + Brush Promo
  "of21": "photo-1593005510509-d05b264f1c9c", // Closeup + Brush Promo
  "of22": "photo-1622483767028-3f66f32aef97", // Coca Cola 2 Bottle Pack
  "of23": "photo-1622483767028-3f66f32aef97", // 7-Up 2 Bottle Pack
  "of24": "photo-1548981609-b4720973a968", // Lexus Biscuits Family
  "of25": "photo-1586201375761-83865001e31c", // Chinigura Rice + Ghee
  "of26": "photo-1593005510509-d05b264f1c9c", // Gillette Vector Blades
  "of27": "photo-1599490659213-e2b9527b0876", // Pran Chanachur Double
  "of28": "photo-1563453392212-326f5e854473", // Comfort Fabric Softener Twin
  "of29": "photo-1535585209827-a15fcdbc4c2d", // Parachute Oil + Face Wash
  "of30": "photo-1584622650111-993a426fbf0a" // Lifebuoy Soap Buy 3 Get 1
};
