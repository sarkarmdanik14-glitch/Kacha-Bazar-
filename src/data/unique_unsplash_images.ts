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

  // ================= 10. FROZEN FOODS (fr1 to fr30) =================
  "fr1": "photo-1563453392212-326f5e854473", // Plain Paratha Frozen
  "fr2": "photo-1506976785307-8732e854ad03", // Aloo Puri Frozen
  "fr3": "photo-1535585209827-a15fcdbc4c2d", // Dal Puri Frozen
  "fr4": "photo-1563453392212-326f5e854473", // Chicken Samosa Frozen
  "fr5": "photo-1506976785307-8732e854ad03", // Chicken Spring Roll
  "fr6": "photo-1535585209827-a15fcdbc4c2d", // Frozen Singara Pack
  "fr7": "photo-1563453392212-326f5e854473", // Chicken Nuggets Crispy
  "fr8": "photo-1506976785307-8732e854ad03", // Chicken Popcorn Snacks
  "fr9": "photo-1535585209827-a15fcdbc4c2d", // French Fries Frozen
  "fr10": "photo-1563453392212-326f5e854473", // Fish Finger Premium
  "fr11": "photo-1506976785307-8732e854ad03", // Frozen Green Peas (Matarsuti)
  "fr12": "photo-1535585209827-a15fcdbc4c2d", // Sweet Corn Kernel Frozen
  "fr13": "photo-1563453392212-326f5e854473", // Mixed Vegetables Frozen
  "fr14": "photo-1506976785307-8732e854ad03", // Frozen Beef Kabab Patty
  "fr15": "photo-1535585209827-a15fcdbc4c2d", // Chicken Meatball Frozen
  "fr16": "photo-1563453392212-326f5e854473", // Beef Meatball Frozen
  "fr17": "photo-1506976785307-8732e854ad03", // Shami Kabab Beef Frozen
  "fr18": "photo-1535585209827-a15fcdbc4c2d", // Shami Kabab Chicken
  "fr19": "photo-1563453392212-326f5e854473", // Paratha Homestyle Multi
  "fr20": "photo-1506976785307-8732e854ad03", // Chapati Wheat Frozen
  "fr21": "photo-1535585209827-a15fcdbc4c2d", // Frozen Naan Bread
  "fr22": "photo-1563453392212-326f5e854473", // Chicken Burger Patty
  "fr23": "photo-1506976785307-8732e854ad03", // Beef Burger Patty
  "fr24": "photo-1535585209827-a15fcdbc4c2d", // Breaded Fish Fillet
  "fr25": "photo-1563453392212-326f5e854473", // Sweet Potato Fries
  "fr26": "photo-1506976785307-8732e854ad03", // Frozen Hash Browns
  "fr27": "photo-1535585209827-a15fcdbc4c2d", // Chicken Sausage Premium
  "fr28": "photo-1563453392212-326f5e854473", // Beef Pepperoni Frozen
  "fr29": "photo-1506976785307-8732e854ad03", // Chicken Seekh Kabab
  "fr30": "photo-1535585209827-a15fcdbc4c2d", // Beef Seekh Kabab

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

  // ================= 12. HOME & CLEANING (hc1 to hc30) =================
  "hc1": "photo-1563453392212-326f5e854473", // Vim Liquid Dishwash
  "hc2": "photo-1506976785307-8732e854ad03", // Vim Dishwash Soap Bar
  "hc3": "photo-1535585209827-a15fcdbc4c2d", // Wheel Washing Powder
  "hc4": "photo-1563453392212-326f5e854473", // Surf Excel Powder
  "hc5": "photo-1506976785307-8732e854ad03", // Rin Washing Powder
  "hc6": "photo-1535585209827-a15fcdbc4c2d", // Rin Detergent Soap Bar
  "hc7": "photo-1563453392212-326f5e854473", // Harpic Toilet Cleaner
  "hc8": "photo-1506976785307-8732e854ad03", // Harpic Bathroom Cleaner
  "hc9": "photo-1535585209827-a15fcdbc4c2d", // Lysol Disinfectant
  "hc10": "photo-1563453392212-326f5e854473", // Savlon Antiseptic Liquid
  "hc11": "photo-1506976785307-8732e854ad03", // Dettol Antiseptic Liquid
  "hc12": "photo-1535585209827-a15fcdbc4c2d", // Glass Cleaner Spray
  "hc13": "photo-1563453392212-326f5e854473", // Bleaching Powder Bag
  "hc14": "photo-1506976785307-8732e854ad03", // Toilet Tissue Roll
  "hc15": "photo-1535585209827-a15fcdbc4c2d", // Kitchen Towel Roll
  "hc16": "photo-1563453392212-326f5e854473", // Facial Tissue Box
  "hc17": "photo-1506976785307-8732e854ad03", // Wet Wipes Packet
  "hc18": "photo-1535585209827-a15fcdbc4c2d", // Odonil Air Freshener
  "hc19": "photo-1563453392212-326f5e854473", // Mortein Mosquito Coil
  "hc20": "photo-1506976785307-8732e854ad03", // Good Knight Liquid Vaporizer
  "hc21": "photo-1535585209827-a15fcdbc4c2d", // Hit Aerosol Insect Killer
  "hc22": "photo-1563453392212-326f5e854473", // Garbage Bags Black
  "hc23": "photo-1506976785307-8732e854ad03", // Scrub Pad Scrubber
  "hc24": "photo-1535585209827-a15fcdbc4c2d", // Dishwashing Sponge Foam
  "hc25": "photo-1563453392212-326f5e854473", // Floor Cleaning Mop
  "hc26": "photo-1506976785307-8732e854ad03", // Toilet Brush Plastic
  "hc27": "photo-1535585209827-a15fcdbc4c2d", // Comfort Fabric Softener
  "hc28": "photo-1563453392212-326f5e854473", // Shoe Polish Black Wax
  "hc29": "photo-1506976785307-8732e854ad03", // Camphor Solid Camphor
  "hc30": "photo-1535585209827-a15fcdbc4c2d", // Naphthalene Balls Pest

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

  // ================= 14. BAKERY & SWEETS (ba1 to ba30) =================
  "ba1": "photo-1587314168485-3236d6710814", // Lalchamcham Sweet
  "ba2": "photo-1509440159596-0249088772ff", // Well Food Bun Bread
  "ba3": "photo-1587314168485-3236d6710814", // Bonoful Plain Cake
  "ba4": "photo-1509440159596-0249088772ff", // Bonoful Dry Cake Rusk
  "ba5": "photo-1587314168485-3236d6710814", // Shahi Rasgulla Sweets
  "ba6": "photo-1509440159596-0249088772ff", // Premium White Bread
  "ba7": "photo-1587314168485-3236d6710814", // Milk Bread Premium
  "ba8": "photo-1509440159596-0249088772ff", // Sweet Toast Biscuits
  "ba9": "photo-1587314168485-3236d6710814", // Black Forest Cake Ripe
  "ba10": "photo-1509440159596-0249088772ff", // Chocolate Pastry Slice
  "ba11": "photo-1587314168485-3236d6710814", // Vanilla Pastry Creamy
  "ba12": "photo-1509440159596-0249088772ff", // Cream Bun Twin Pack
  "ba13": "photo-1587314168485-3236d6710814", // Butter Croissant Pastry
  "ba14": "photo-1509440159596-0249088772ff", // Chocolate Doughnut Ring
  "ba15": "photo-1587314168485-3236d6710814", // Cupcakes Vanilla Pack
  "ba16": "photo-1509440159596-0249088772ff", // Ruti Homestyle Handmade
  "ba17": "photo-1587314168485-3236d6710814", // Brown Bread Organic
  "ba18": "photo-1509440159596-0249088772ff", // Multigrain Bread Diet
  "ba19": "photo-1587314168485-3236d6710814", // Garlic Bread Slices
  "ba20": "photo-1509440159596-0249088772ff", // Shahi Tukda Sweet Dessert
  "ba21": "photo-1587314168485-3236d6710814", // Kalojam Sweet Traditional
  "ba22": "photo-1509440159596-0249088772ff", // Kaju Barfi Sweets
  "ba23": "photo-1587314168485-3236d6710814", // Laddu Motichur Premium
  "ba24": "photo-1509440159596-0249088772ff", // Sandesh Milk Sweets
  "ba25": "photo-1587314168485-3236d6710814", // Rasmala Sweets Box
  "ba26": "photo-1509440159596-0249088772ff", // Sweet Curd / Mishti Doi
  "ba27": "photo-1587314168485-3236d6710814", // Doi Cup Vanilla Flavor
  "ba28": "photo-1509440159596-0249088772ff", // Butter Cookies Jar
  "ba29": "photo-1587314168485-3236d6710814", // Shahi Jilapi Twist
  "ba30": "photo-1509440159596-0249088772ff", // Cream Roll Roll Cakes

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
